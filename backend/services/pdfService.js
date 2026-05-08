import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { readFile } from "fs/promises";
import { extname } from "path";

/**
 * Load a PDF or text file and normalize it into page-like documents.
 * @param {string} filePath - Path to the uploaded file
 * @param {string} mimeType - MIME type reported by multer
 * @returns {Array} Array of document objects with text and metadata
 */
export async function loadDocument(filePath, mimeType) {
  const isTextFile = mimeType === "text/plain" || extname(filePath).toLowerCase() === ".txt";

  if (isTextFile) {
    const text = await readFile(filePath, "utf8");

    console.log(`📄 Loaded text file: 1 page extracted`);

    return [
      {
        pageContent: text,
        metadata: {
          loc: { pageNumber: 0 },
          page: 0,
          sourceType: "text",
        },
      },
    ];
  }

  const loader = new PDFLoader(filePath, {
    splitPages: true, // Split by pages for better page tracking
  });

  const documents = await loader.load();

  console.log(`📄 Loaded PDF: ${documents.length} pages extracted`);

  return documents;
}
