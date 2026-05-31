/**
 * Prompt Templates for Grounded Generation
 * 
 * Key principle: The LLM must ONLY answer from the provided context.
 * This prevents hallucination and ensures grounded answers.
 */

/**
 * System prompt for RAG-based question answering
 * @param {Array} contextChunks - Retrieved document chunks
 * @returns {string} Formatted system prompt
 */
export function buildSystemPrompt(contextChunks) {
  const formattedContext = contextChunks
    .map((chunk, i) => {
      const page = chunk.metadata?.pageNumber || "Unknown";
      const source = chunk.metadata?.filename || "Unknown";
      return `[Source ${i + 1} | Page ${page} | File: ${source}]\n${chunk.pageContent}`;
    })
    .join("\n\n---\n\n");

  return `You are an intelligent AI assistant that answers questions based STRICTLY on the provided uploaded document context.

## RULES — You MUST follow these:
1. **ONLY** answer using information found in the provided context below.
2. **NEVER** use your general knowledge, prior training, or outside context to answer.
3. If the answer is NOT present in the context, respond with:
   "I could not find this information in the uploaded document. Please try rephrasing your question or uploading a document that contains this information."
4. When answering, **cite the source** by mentioning the page number(s).
   Example: "According to the document (Page 3), ..."
5. Be concise, clear, and well-structured in your responses.
6. Use clean markdown formatting that is easy to read on screen.
7. Prefer short paragraphs, bullet points, and bold labels over dense blocks of text.
8. If multiple sources are relevant, synthesize them and cite all page numbers.
9. When the answer is detailed, start with a one-line summary, then a short structured breakdown.
10. Avoid tables unless they materially improve readability.
11. Treat any chat history as conversational only; never use it as factual evidence unless the same information is also present in the provided document context.

## CONTEXT FROM DOCUMENT:
${formattedContext}

## REMEMBER:
- You are grounded to the uploaded document(s) ONLY.
- If unsure, say you could not find the answer rather than guessing.
- Always cite page numbers in your response.`;
}

/**
 * Build user message for chat
 */
export function buildUserMessage(question) {
  return question;
}

/**
 * Prompt for query rewriting before retrieval
 */
export function buildQueryRewritePrompt(question, feedback = "") {
  return {
    system: `You are a query optimisation assistant.
Given a user query that may contain typos or be vague:
1. Fix all spelling errors and typos.
2. Expand the query with relevant technical terms to improve search recall.
3. Keep the query anchored to uploaded document retrieval.
4. Return ONLY the improved query — no explanation.`,
    user: feedback
      ? `Original query: ${question}\n\nRetrieval feedback: ${feedback}`
      : `Original query: ${question}`,
  };
}

/**
 * Prompt for chunk relevance judging
 */
export function buildChunkJudgePrompt(question, rewrittenQuery, chunkBatch) {
  const chunksText = chunkBatch
    .map((chunk, index) => {
      const page = chunk.metadata?.pageNumber || "Unknown";
      const source = chunk.metadata?.filename || "Unknown";
      return `Chunk ${index + 1}\nFile: ${source}\nPage: ${page}\nText:\n${chunk.pageContent}`;
    })
    .join("\n\n---\n\n");

  return {
    system: `You are a strict relevance judge for retrieval-augmented generation.
Decide whether each chunk can help answer the user's question using only the chunk text.
Return ONLY valid JSON in this shape:
{"results":[{"index":1,"relevant":true},{"index":2,"relevant":false}]}
No markdown, no code fences, no extra keys, no explanation.`,
    user: `User question: ${question}\nRewritten retrieval query: ${rewrittenQuery}\n\nEvaluate the following chunks:\n\n${chunksText}`,
  };
}
