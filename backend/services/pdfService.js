import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { extname } from "path";

/**
 * Load a PDF or text file and normalize it into page-like documents.
 * @param {Buffer} fileBuffer - Uploaded file contents
 * @param {string} originalName - Original filename
 * @param {string} mimeType - MIME type reported by multer
 * @returns {Array} Array of document objects with text and metadata
 */
export async function loadDocument(fileBuffer, originalName, mimeType) {
  const lowerName = originalName.toLowerCase();
  const isJson = mimeType === "application/json" || mimeType === "text/json" || lowerName.endsWith(".json");
  const isCsv =
    mimeType === "text/csv" ||
    mimeType === "application/csv" ||
    mimeType === "application/vnd.ms-excel" ||
    lowerName.endsWith(".csv");
  const isTextFile = mimeType === "text/plain" || lowerName.endsWith(".txt") || isJson || isCsv;

  if (isTextFile) {
    const rawText = fileBuffer.toString("utf8");
    let text = rawText;
    let sourceType = "text";

    if (isJson) {
      sourceType = "json";
      try {
        const parsed = JSON.parse(rawText);
        text = JSON.stringify(parsed, null, 2);
      } catch {
        text = rawText;
      }
    } else if (isCsv) {
      sourceType = "csv";
      const rows = rawText
        .replace(/\r\n/g, "\n")
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => line.split(",").map((cell) => cell.trim()));
      text = rows.map((cells) => cells.join(" | ")).join("\n");
    }

    console.log(`📄 Loaded ${sourceType} file: 1 page extracted`);

    return [
      {
        pageContent: text,
        metadata: {
          loc: { pageNumber: 0 },
          page: 0,
          sourceType,
        },
      },
    ];
  }

  const pages = [];

  await pdfParse(fileBuffer, {
    pagerender: async (pageData) => {
      const textContent = await pageData.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      pages.push(pageText);
      return pageText;
    },
  });

  if (pages.length === 0) {
    const fallback = await pdfParse(fileBuffer);
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
