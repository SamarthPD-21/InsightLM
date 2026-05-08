import "dotenv/config";
import express from "express";
import cors from "cors";
import uploadRouter from "./routes/upload.js";
import chatRouter from "./routes/chat.js";
import documentsRouter from "./routes/documents.js";

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
const rawAllowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",")
  : ["http://localhost:3000"];

const allowedOrigins = rawAllowedOrigins
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) =>
    origin.startsWith("http://") || origin.startsWith("https://")
      ? origin
      : `https://${origin}`
  );

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, origin);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/upload", uploadRouter);
app.use("/api/chat", chatRouter);
app.use("/api/documents", documentsRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "NotebookLM RAG Backend is running" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
