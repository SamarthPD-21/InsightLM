import { Router } from "express";
import { ragQuery, ragQueryStream } from "../services/ragService.js";

const router = Router();

/**
 * POST /api/chat
 * Ask a question about uploaded documents
 * Body: { question, docId?, chatHistory?, stream? }
 */
router.post("/", async (req, res) => {
  try {
    const { question, docId, chatHistory = [], stream = false } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: "Question is required" });
    }

    console.log(`\n💬 Question: "${question.substring(0, 80)}..."`);

    if (stream) {
      // Streaming response using Server-Sent Events
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      await ragQueryStream(question, docId, chatHistory, res);
    } else {
      // Standard response
      const result = await ragQuery(question, docId, chatHistory);

      console.log(`   ✅ Answer generated (${result.sources.length} sources cited)`);

      res.json({
        success: true,
        answer: result.answer,
        sources: result.sources,
      });
    }
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      error: "Failed to generate answer",
      message: error.message,
    });
  }
});

export default router;
