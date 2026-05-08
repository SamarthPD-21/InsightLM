import { Router } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { loadDocument } from "../services/pdfService.js";
import { chunkDocuments } from "../utils/chunking.js";
import { storeEmbeddings } from "../services/embeddingService.js";
const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "text/csv",
      "application/csv",
      "application/vnd.ms-excel",
      "application/json",
      "text/json",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, TXT, CSV, and JSON files are allowed"), false);
    }
  },
});

// In-memory document store (for tracking uploaded docs)
// In production, use a proper database
export const documentStore = new Map();
export const documentFileStore = new Map();

/**
 * POST /api/upload
 * Upload a PDF, process it through the RAG pipeline:
 * Parse → Chunk → Embed → Store in Qdrant
 */
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const docId = uuidv4();
    const filename = req.file.originalname;
    const fileBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;
    const fileUrl = `/api/documents/${docId}/file`;

    console.log(`\n📁 Processing: ${filename}`);
    console.log(`   Document ID: ${docId}`);

    // Step 1: Load PDF
    console.log("   Step 1/3: Loading PDF...");
    const documents = await loadDocument(fileBuffer, filename, mimeType);

    // Step 2: Chunk documents
    console.log("   Step 2/3: Chunking documents...");
    const chunks = await chunkDocuments(documents, docId, filename);
    console.log(`   Created ${chunks.length} chunks`);

    // Step 3: Generate embeddings and store in Qdrant
    console.log("   Step 3/3: Generating embeddings & storing...");
    await storeEmbeddings(chunks);

    // Store document metadata
    documentStore.set(docId, {
      id: docId,
      filename,
      uploadedAt: new Date().toISOString(),
      totalPages: documents.length,
      totalChunks: chunks.length,
      fileSize: req.file.size,
      fileUrl,
      mimeType,
    });

    documentFileStore.set(docId, {
      buffer: fileBuffer,
      mimeType,
      filename,
    });

    console.log(`   ✅ Document processed successfully!\n`);

    res.json({
      success: true,
      document: {
        id: docId,
        filename,
        totalPages: documents.length,
        totalChunks: chunks.length,
        fileUrl,
        mimeType,
      },
      message: `Document "${filename}" processed successfully. ${chunks.length} chunks indexed.`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      error: "Failed to process document",
      message: error.message,
    });
  }
});

export default router;
