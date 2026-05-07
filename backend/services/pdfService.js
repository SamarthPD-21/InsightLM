import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

/**
 * Load and parse a PDF file
 * @param {string} filePath - Path to the PDF file
 * @returns {Array} Array of document objects with text and metadata
 */
export async function loadPDF(filePath) {
  const loader = new PDFLoader(filePath, {
    splitPages: true, // Split by pages for better page tracking
  });

  const documents = await loader.load();
  
  console.log(`📄 Loaded PDF: ${documents.length} pages extracted`);
  
  return documents;
}
