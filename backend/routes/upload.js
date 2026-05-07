import { Router } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { unlinkSync } from "fs";
import { loadPDF } from "../services/pdfService.js";
import { chunkDocuments } from "../utils/chunking.js";
import { storeEmbeddings } from "../services/embeddingService.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: join(__dirname, "..", "uploads"),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.mimetype === "text/plain") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and TXT files are allowed"), false);
    }
  },
});

// In-memory document store (for tracking uploaded docs)
// In production, use a proper database
export const documentStore = new Map();

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
    const filePath = req.file.path;

    console.log(`\n📁 Processing: ${filename}`);
    console.log(`   Document ID: ${docId}`);

    // Step 1: Load PDF
    console.log("   Step 1/3: Loading PDF...");
    const documents = await loadPDF(filePath);

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
    });

    // Clean up temporary file
    try {
      unlinkSync(filePath);
    } catch (e) {
      console.warn("Could not delete temp file:", e.message);
    }

    console.log(`   ✅ Document processed successfully!\n`);

    res.json({
      success: true,
      document: {
        id: docId,
        filename,
        totalPages: documents.length,
        totalChunks: chunks.length,
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
