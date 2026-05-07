import { Router } from "express";
import { documentStore } from "./upload.js";
import { deleteDocumentVectors } from "../services/embeddingService.js";

const router = Router();

/**
 * GET /api/documents
 * List all uploaded documents
 */
router.get("/", (req, res) => {
  const documents = Array.from(documentStore.values());
  res.json({
    success: true,
    documents,
    total: documents.length,
  });
});

/**
 * DELETE /api/documents/:id
 * Delete a document and its vectors
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!documentStore.has(id)) {
      return res.status(404).json({ error: "Document not found" });
    }

    const doc = documentStore.get(id);

    // Delete vectors from Qdrant
    await deleteDocumentVectors(id);

    // Remove from store
    documentStore.delete(id);

    console.log(`🗑️ Deleted document: ${doc.filename}`);

    res.json({
      success: true,
      message: `Document "${doc.filename}" deleted successfully`,
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      error: "Failed to delete document",
      message: error.message,
    });
  }
});

export default router;
