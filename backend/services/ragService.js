import { HfInference } from "@huggingface/inference";
import { retrieveChunks } from "./embeddingService.js";
import {
  buildSystemPrompt,
  buildQueryRewritePrompt,
  buildChunkJudgePrompt,
} from "../utils/promptTemplates.js";

const hf = new HfInference(process.env.HF_TOKEN);
const ANSWER_MODEL = process.env.RAG_ANSWER_MODEL || "Qwen/Qwen2.5-7B-Instruct";
const QUERY_MODEL = process.env.RAG_QUERY_MODEL || ANSWER_MODEL;
const JUDGE_MODEL = process.env.RAG_JUDGE_MODEL || QUERY_MODEL;
const RETRIEVAL_TOP_K = Number(process.env.RAG_TOP_K || 8);
const CANDIDATE_MULTIPLIER = Number(process.env.RAG_CANDIDATE_MULTIPLIER || 2);
const MAX_REWRITE_ATTEMPTS = Number(process.env.RAG_MAX_REWRITE_ATTEMPTS || 2);
const MIN_RELEVANT_CHUNKS = Number(process.env.RAG_MIN_RELEVANT_CHUNKS || 2);
const JUDGE_BATCH_SIZE = Number(process.env.RAG_JUDGE_BATCH_SIZE || 8);
const MAX_CONTEXT_CHUNKS = Number(process.env.RAG_MAX_CONTEXT_CHUNKS || 6);

/**
 * Full RAG pipeline: retrieve → prompt → generate
 * @param {string} question - User's question
 * @param {string} docId - Optional document ID to scope the search
 * @param {Array} chatHistory - Previous messages for context
 * @returns {Object} { answer, sources }
 */
export async function ragQuery(question, docId = null, chatHistory = []) {
  const retrieval = await runCragRetrieval(question, docId);
  const chunks = retrieval.chunks;

  if (chunks.length === 0) {
    return {
      answer: "I could not find any relevant information in the uploaded document. Please make sure a document has been uploaded and try rephrasing your question.",
      sources: [],
    };
  }

  // Step 2: Build grounded prompt
  const systemPrompt = buildSystemPrompt(chunks);

  // Step 3: Build messages array
  const messages = [{ role: "system", content: systemPrompt }];

  // Add recent chat history (last 6 messages)
  const recentHistory = chatHistory.slice(-6);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    });
  }

  // Add the current question
  messages.push({ role: "user", content: question });

  // Step 4: Generate answer
  const response = await hf.chatCompletion({
    model: ANSWER_MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 1500,
  });

  const answer = response.choices[0].message.content;

  // Step 5: Extract source citations
  const sources = chunks.map((chunk) => ({
    pageNumber: chunk.metadata?.pageNumber || "Unknown",
    filename: chunk.metadata?.filename || "Unknown",
    preview: chunk.pageContent.substring(0, 150) + "...",
  }));

  // Deduplicate sources by page number + filename
  const uniqueSources = sources.filter(
    (source, index, self) =>
      index === self.findIndex(
        (s) => s.pageNumber === source.pageNumber && s.filename === source.filename
      )
  );

  return { answer, sources: uniqueSources };
}

/**
 * RAG query with streaming response (SSE)
 * @param {string} question - User's question
 * @param {string} docId - Optional document ID
 * @param {Array} chatHistory - Previous messages
 * @param {Object} res - Express response object for streaming
 */
export async function ragQueryStream(question, docId = null, chatHistory = [], res) {
  const retrieval = await runCragRetrieval(question, docId);
  const chunks = retrieval.chunks;

  if (chunks.length === 0) {
    res.write(`data: ${JSON.stringify({ type: "sources", sources: [] })}\n\n`);
    res.write(`data: ${JSON.stringify({
      type: "content",
      content: "I could not find any relevant information in the uploaded document. Please make sure a document has been uploaded and try rephrasing your question.",
    })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
    return;
  }

  // Step 2: Send sources first
  const sources = chunks.map((chunk) => ({
    pageNumber: chunk.metadata?.pageNumber || "Unknown",
    filename: chunk.metadata?.filename || "Unknown",
    preview: chunk.pageContent.substring(0, 150) + "...",
  }));

  const uniqueSources = sources.filter(
    (source, index, self) =>
      index === self.findIndex(
        (s) => s.pageNumber === source.pageNumber && s.filename === source.filename
      )
  );

  res.write(`data: ${JSON.stringify({ type: "sources", sources: uniqueSources })}\n\n`);

  // Step 3: Build prompt
  const systemPrompt = buildSystemPrompt(chunks);
  const messages = [{ role: "system", content: systemPrompt }];

  const recentHistory = chatHistory.slice(-6);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role === "assistant" ? "assistant" : "user", content: msg.content });
  }
  messages.push({ role: "user", content: question });

  // Step 4: Stream response
  const stream = hf.chatCompletionStream({
    model: ANSWER_MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 1500,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      res.write(`data: ${JSON.stringify({ type: "content", content })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
  res.end();
}

async function runCragRetrieval(question, docId) {
  let feedback = "";

  for (let attempt = 0; attempt < MAX_REWRITE_ATTEMPTS; attempt += 1) {
    const rewrittenQuery = await rewriteQuery(question, feedback);
    const candidateCount = Math.max(RETRIEVAL_TOP_K, RETRIEVAL_TOP_K * CANDIDATE_MULTIPLIER);
    const candidates = await retrieveChunks(rewrittenQuery, candidateCount, docId);

    if (candidates.length === 0) {
      feedback = "No chunks were retrieved. Rephrase the query using terms that are likely to appear in the uploaded documents.";
      continue;
    }

    const relevantChunks = await filterRelevantChunks(question, rewrittenQuery, candidates);
    const trimmedChunks = relevantChunks.slice(0, MAX_CONTEXT_CHUNKS);

    if (trimmedChunks.length >= MIN_RELEVANT_CHUNKS || attempt === MAX_REWRITE_ATTEMPTS - 1) {
      return {
        chunks: trimmedChunks,
        rewrittenQuery,
        candidates,
      };
    }

    feedback = `Only ${trimmedChunks.length} relevant chunk(s) were found out of ${candidates.length}. The previous retrieval was too broad or used the wrong terminology. Focus on words and phrases that are likely to appear in the uploaded documents.`;
  }

  return { chunks: [], rewrittenQuery: question, candidates: [] };
}

async function rewriteQuery(question, feedback = "") {
  const prompt = buildQueryRewritePrompt(question, feedback);
  const candidates = [QUERY_MODEL, ANSWER_MODEL].filter(Boolean);

  for (const model of candidates) {
    try {
      const response = await hf.chatCompletion({
        model,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        temperature: 0,
        max_tokens: 128,
      });

      const rewritten = response.choices[0]?.message?.content?.trim();
      if (rewritten) {
        return rewritten;
      }
    } catch (error) {
      console.warn(`Query rewrite failed with ${model}:`, error.message);
    }
  }

  return question;
}

async function filterRelevantChunks(question, rewrittenQuery, chunks) {
  const scoredChunks = [];

  for (let offset = 0; offset < chunks.length; offset += JUDGE_BATCH_SIZE) {
    const batch = chunks.slice(offset, offset + JUDGE_BATCH_SIZE);
    const judged = await judgeChunkBatch(question, rewrittenQuery, batch);

    for (let batchIndex = 0; batchIndex < batch.length; batchIndex += 1) {
      const chunk = batch[batchIndex];
      const isRelevant = judged.get(batchIndex + 1) ?? overlapHeuristic(question, rewrittenQuery, chunk);

      if (isRelevant) {
        scoredChunks.push(chunk);
      }
    }
  }

  return scoredChunks;
}

async function judgeChunkBatch(question, rewrittenQuery, chunkBatch) {
  if (chunkBatch.length === 0) {
    return new Map();
  }

  const prompt = buildChunkJudgePrompt(question, rewrittenQuery, chunkBatch);
  const candidates = [JUDGE_MODEL, ANSWER_MODEL].filter(Boolean);

  for (const model of candidates) {
    try {
      const response = await hf.chatCompletion({
        model,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        temperature: 0,
        max_tokens: 512,
      });

      const rawContent = response.choices[0]?.message?.content || "";
      const parsed = parseJudgeResults(rawContent);
      if (!parsed) {
        continue;
      }

      const results = new Map();
      for (const item of parsed.results || []) {
        if (typeof item?.index === "number") {
          results.set(item.index, Boolean(item.relevant));
        }
      }
      return results;
    } catch (error) {
      console.warn(`Chunk judge failed with ${model}:`, error.message);
    }
  }

  return new Map();
}

function parseJudgeResults(rawContent) {
  const trimmed = rawContent.trim();
  const candidates = [];

  candidates.push(trimmed);

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    candidates.push(fencedMatch[1].trim());
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && Array.isArray(parsed.results)) {
        return parsed;
      }
    } catch {
      // keep trying fallback parses
    }
  }

  return null;
}

function overlapHeuristic(question, rewrittenQuery, chunk) {
  const queryTokens = tokenize(`${question} ${rewrittenQuery}`);
  if (queryTokens.length === 0) {
    return false;
  }

  const chunkTokens = new Set(tokenize(chunk.pageContent));
  let overlap = 0;
  for (const token of queryTokens) {
    if (chunkTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap >= 2 || (queryTokens.some((token) => token.length >= 7) && overlap >= 1);
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "what",
  "when",
  "where",
  "why",
  "how",
  "are",
  "was",
  "were",
  "can",
  "could",
  "should",
  "would",
  "about",
  "into",
  "your",
  "you",
  "use",
  "used",
  "using",
  "how",
]);
