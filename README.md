# InsightLM

InsightLM is a powerful document intelligence workspace inspired by NotebookLM. It allows you to upload PDFs or text files, chat with your documents to get grounded answers, and seamlessly jump to cited pages using an integrated in-app document viewer.

![InsightLM](https://img.shields.io/badge/Status-Active-success)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

- **Grounded Chat with Citations**: Get accurate answers with page-level sources and direct quotes.
- **Streaming Responses**: Enjoy a fast, "letter-by-letter" response stream via Server-Sent Events (SSE).
- **Side-by-Side Workspace**: A highly productive layout with chat on the left and a document preview on the right.
- **Clickable Citations**: Instantly jump the document viewer to the exact referenced page.
- **Multi-Document Support**: Manage multiple documents via a collapsible sidebar and toggle between them.
- **Format Support**: Upload and process both PDF and TXT files.

## 🏗️ Architecture & Tech Stack

InsightLM is built with a modern, decoupled architecture:

### Client
- **Framework**: Next.js (React 19)
- **Styling**: Tailwind CSS
- **Features**: Streams chat, renders markdown, embedded document viewer.

### Backend
- **Framework**: Express.js API
- **Capabilities**: File parsing (multer), document chunking, embeddings generation, RAG retrieval.
- **Vector Database**: Qdrant (stores high-dimensional embeddings for fast retrieval).

### AI Models (Hugging Face Inference)
- **Embeddings**: `BAAI/bge-large-en-v1.5`
- **Chat Model**: `Qwen/Qwen2.5-7B-Instruct`

## 📂 Project Structure

```text
backend/
├── index.js             # Entry point
├── routes/              # API endpoints (upload, chat, documents)
├── services/            # Core logic (ragService, embeddingService, pdfService)
└── utils/               # Helpers (chunking, promptTemplates, fileUtils)

client/
├── app/                 # Next.js app router (layout, page, globals)
├── components/          # UI Components (Sidebar, FileUpload, ChatInterface, DocumentViewer)
└── lib/                 # API client and types
```

## 🚀 Getting Started (Local Development)

### Prerequisites

- Node.js 18+
- Docker (for running Qdrant locally)
- A Hugging Face token with Inference API access

### 1) Start Qdrant Vector DB

Run Qdrant using Docker:

```bash
docker run -p 6333:6333 qdrant/qdrant
```

### 2) Setup & Run Backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
HF_TOKEN=your_hugging_face_token_here
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION_NAME=insightlm-docs
FRONTEND_URL=http://localhost:3000
PORT=8000
```

Start the backend development server:

```bash
npm run dev
```
The backend will be running at `http://localhost:8000`.

### 3) Setup & Run Client

```bash
cd client
npm install
```

Start the frontend development server:

```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|:---:|---|
| `HF_TOKEN` | ✅ | Hugging Face token for embeddings and chat inference |
| `QDRANT_URL` | ✅ | Qdrant URL (local default `http://localhost:6333`) |
| `QDRANT_API_KEY` | ❌ | Set if using a protected Qdrant instance |
| `QDRANT_COLLECTION_NAME`| ❌ | Collection name (default `notebooklm-docs`) |
| `PORT` | ❌ | Express port (default `8000`) |
| `FRONTEND_URL` | ❌ | CORS allowed origin (default `http://localhost:3000`) |

### Client

| Variable | Required | Description |
|---|:---:|---|
| `NEXT_PUBLIC_API_URL` | ❌ | Backend API base URL (default `http://localhost:8000/api`) |

## 📡 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/upload` | Upload and index a PDF/TXT document |
| `POST` | `/api/chat` | Ask a question (supports SSE streaming) |
| `GET` | `/api/documents` | List all uploaded documents |
| `GET` | `/api/documents/:id/file` | Stream an uploaded document's raw file |
| `DELETE` | `/api/documents/:id` | Delete a document and its vectors |
| `GET` | `/api/health` | Backend health check |

## ⚠️ Notes & Limitations

- **In-Memory Document Store**: The backend currently uses an in-memory map for the document list (`documentStore`) and file buffers. If the server restarts, the document list in the UI will reset, although vectors in Qdrant will persist.
- **File Serving**: Uploaded source files are served directly from memory via `GET /api/documents/:id/file` for rendering in the client-side document viewer.
