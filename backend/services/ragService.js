import { HfInference } from "@huggingface/inference";
import { retrieveChunks } from "./embeddingService.js";
import { buildSystemPrompt } from "../utils/promptTemplates.js";

const hf = new HfInference(process.env.HF_TOKEN);
const MODEL = "Qwen/Qwen2.5-7B-Instruct";
const DEFAULT_TOP_K = Number(process.env.RAG_TOP_K || 8);

/**
 * Full RAG pipeline: retrieve → prompt → generate
 * @param {string} question - User's question
 * @param {string} docId - Optional document ID to scope the search
 * @param {Array} chatHistory - Previous messages for context
 * @returns {Object} { answer, sources }
 */
export async function ragQuery(question, docId = null, chatHistory = []) {
  // Step 1: Retrieve relevant chunks
  const chunks = await retrieveChunks(question, DEFAULT_TOP_K, docId);

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
    model: MODEL,
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
  // Step 1: Retrieve relevant chunks
  const chunks = await retrieveChunks(question, DEFAULT_TOP_K, docId);

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
    model: MODEL,
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
