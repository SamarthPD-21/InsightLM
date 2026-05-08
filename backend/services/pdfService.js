import pdf from "pdf-parse";
import { extname } from "path";

/**
 * Load a PDF or text file and normalize it into page-like documents.
 * @param {Buffer} fileBuffer - Uploaded file contents
 * @param {string} originalName - Original filename
 * @param {string} mimeType - MIME type reported by multer
 * @returns {Array} Array of document objects with text and metadata
 */
export async function loadDocument(fileBuffer, originalName, mimeType) {
  const isTextFile = mimeType === "text/plain" || extname(originalName).toLowerCase() === ".txt";

  if (isTextFile) {
    const text = fileBuffer.toString("utf8");

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

  const pages = [];

  await pdf(fileBuffer, {
    pagerender: async (pageData) => {
      const textContent = await pageData.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      pages.push(pageText);
      return pageText;
    },
  });

  if (pages.length === 0) {
    const fallback = await pdf(fileBuffer);
    if (fallback.text?.trim()) {
      pages.push(fallback.text);
    }
  }

  const documents = pages.map((pageContent, index) => ({
    pageContent,
    metadata: {
      loc: { pageNumber: index },
      page: index,
      sourceType: "pdf",
    },
  }));

  console.log(`📄 Loaded PDF: ${documents.length} pages extracted`);

  return documents;
}
