# InsightLM

InsightLM is a document intelligence workspace: upload PDFs or text files, chat with grounded answers, and jump to cited pages in an in-app document viewer.

## What you get

- **Grounded chat with citations** (page-level sources)
- **Streaming responses** (SSE “letter-by-letter” feel)
- **Side-by-side workspace**: chat (left) + document preview (right)
- **Clickable citations**: jump the viewer to the referenced page
- **Multi-document sidebar** (collapsible) + per-file viewer toggle
- **PDF + TXT support**

## Architecture

```
Next.js client (React 19)
        └─ streams chat + renders markdown + document viewer

Express API
        ├─ /api/upload     (multer → parse → chunk → embed → store)
        ├─ /api/chat       (RAG retrieve → grounded prompt → stream response)
        ├─ /api/documents  (list/delete)
        └─ /uploads/*      (serves original uploaded files for the viewer)

Qdrant
        └─ stores embeddings for retrieval

Hugging Face Inference
        ├─ embeddings: BAAI/bge-large-en-v1.5
        └─ chat model: Qwen/Qwen2.5-7B-Instruct
```

## Project structure

```
backend/
        index.js
        routes/ (upload, chat, documents)
        services/ (ragService, embeddingService, pdfService)
        utils/ (chunking, promptTemplates, fileUtils)

client/
        app/ (layout, page, globals)
        components/ (Sidebar, FileUpload, ChatInterface, DocumentViewer, SourceCitation)
        lib/ (api client + types)
```

## Getting started (local)

### Prerequisites

- Node.js 18+
- Docker (for Qdrant)
- A Hugging Face token with Inference access

### 1) Start Qdrant

```bash
docker run -p 6333:6333 qdrant/qdrant
```

### 2) Backend

```bash
cd backend
npm install

# Create backend/.env
cat > .env <<'EOF'
HF_TOKEN=YOUR_HF_TOKEN
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION_NAME=insightlm-docs
FRONTEND_URL=http://localhost:3000
EOF

npm run dev
```

Backend runs at `http://localhost:8000`.

### 3) Client

```bash
cd client
npm install

# Optional (defaults to http://localhost:8000/api)
export NEXT_PUBLIC_API_URL=http://localhost:8000/api

npm run dev
```

Open `http://localhost:3000`.

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---:|---|
| `HF_TOKEN` | ✅ | Hugging Face token used for embeddings + chat inference |
| `QDRANT_URL` | ✅ | Qdrant URL (local default `http://localhost:6333`) |
| `QDRANT_API_KEY` | ❌ | Set if using Qdrant Cloud / protected instance |
| `QDRANT_COLLECTION_NAME` | ❌ | Collection name (default `notebooklm-docs` in code) |
| `PORT` | ❌ | Express port (default `8000`) |
| `FRONTEND_URL` | ❌ | CORS origin (default `http://localhost:3000`) |

### Client

| Variable | Required | Description |
|---|---:|---|
| `NEXT_PUBLIC_API_URL` | ❌ | Backend API base (default `http://localhost:8000/api`) |

## Notes / limitations

- The backend uses an **in-memory document store**. If the server restarts, the document list resets (Qdrant vectors and uploaded files may still exist).
- Uploaded source files are served from `backend/uploads` via `GET /uploads/*` so the in-app viewer can render them.

## API (quick reference)

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/upload` | Upload + index PDF/TXT |
| `POST` | `/api/chat` | Ask a question (supports streaming) |
| `GET` | `/api/documents` | List documents |
| `DELETE` | `/api/documents/:id` | Delete document (vectors + file) |
| `GET` | `/api/health` | Health check |
