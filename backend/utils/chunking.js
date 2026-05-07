/**
 * Chunking Strategy Documentation
 * ================================
 * 
 * Strategy: RecursiveCharacterTextSplitter
 * 
 * Parameters:
 *   - chunkSize: 800 characters
 *   - chunkOverlap: 150 characters
 * 
 * Why this strategy?
 * 1. RecursiveCharacterTextSplitter tries to split on natural boundaries
 *    (paragraphs → sentences → words) before falling back to character splits.
 * 
 * 2. Chunk size of 800 provides a good balance between:
 *    - Specificity: small enough for accurate retrieval
 *    - Context: large enough to contain meaningful information
 * 
 * 3. Overlap of 150 characters ensures:
 *    - No information is lost at chunk boundaries
 *    - Sentences split across chunks are captured in both
 *    - Better retrieval for queries that span chunk boundaries
 * 
 * 4. Page-aware metadata is preserved so we can cite sources.
 * 
 * Alternative strategies considered:
 *   - Fixed-size chunking: Too rigid, breaks mid-sentence
 *   - Semantic chunking: More complex, requires additional models
 *   - Heading-based: Not all PDFs have clear headings
 */

import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 800,
  chunkOverlap: 150,
  separators: ["\n\n", "\n", ". ", " ", ""],
  lengthFunction: (text) => text.length,
});

/**
 * Split documents into chunks while preserving metadata
 * @param {Array} documents - Array of LangChain Document objects
 * @param {string} docId - Unique document identifier
 * @param {string} filename - Original filename
 * @returns {Array} Array of chunked documents with enhanced metadata
 */
export async function chunkDocuments(documents, docId, filename) {
  // Clean and prepare documents
  const cleanedDocs = documents.map(doc => ({
    ...doc,
    pageContent: cleanText(doc.pageContent),
  }));

  const chunks = await textSplitter.splitDocuments(cleanedDocs);

  // Enhance metadata for each chunk
  return chunks.map((chunk, index) => ({
    ...chunk,
    metadata: {
      ...chunk.metadata,
      docId,
      filename,
      chunkIndex: index,
      // page number from PDFLoader is 0-indexed, display as 1-indexed
      pageNumber: (chunk.metadata?.loc?.pageNumber || chunk.metadata?.page || 0) + 1,
    },
  }));
}

/**
 * Clean raw PDF text
 */
function cleanText(text) {
  return text
    .replace(/\r\n/g, "\n")       // normalize line endings
    .replace(/\n{3,}/g, "\n\n")   // remove excessive blank lines
    .replace(/\s{2,}/g, " ")      // remove multiple spaces
    .replace(/-\n/g, "")          // fix hyphenated line breaks
    .trim();
}
