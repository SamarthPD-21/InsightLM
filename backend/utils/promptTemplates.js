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

  return `You are an intelligent AI assistant that answers questions based STRICTLY on the provided document context.

## RULES — You MUST follow these:
1. **ONLY** answer using information found in the provided context below.
2. **NEVER** use your general knowledge or training data to answer.
3. If the answer is NOT present in the context, respond with:
   "I could not find this information in the uploaded document. Please try rephrasing your question or uploading a document that contains this information."
4. When answering, **cite the source** by mentioning the page number(s).
   Example: "According to the document (Page 3), ..."
5. Be concise, clear, and well-structured in your responses.
6. Use markdown formatting for better readability (bullet points, bold, code blocks when appropriate).
7. If multiple sources are relevant, synthesize them and cite all page numbers.

## CONTEXT FROM DOCUMENT:
${formattedContext}

## REMEMBER:
- You are grounded to the document ONLY.
- If unsure, say you could not find the answer rather than guessing.
- Always cite page numbers in your response.`;
}

/**
 * Build user message for chat
 */
export function buildUserMessage(question) {
  return question;
}
