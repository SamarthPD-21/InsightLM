# NotebookLM RAG Clone

A full-stack RAG (Retrieval-Augmented Generation) powered application inspired by Google NotebookLM. Upload any PDF document and have an AI-powered conversation with it — answers are grounded strictly in the document content with source citations.

## 🏗️ Architecture

```
Frontend (Next.js 16 + Tailwind CSS)
        ↓
Backend API (Node.js + Express)
        ↓
RAG Pipeline:
  1. PDF Upload → multer
  2. Parse → LangChain PDFLoader
  3. Chunk → RecursiveCharacterTextSplitter (800 chars, 150 overlap)
  4. Embed → OpenAI text-embedding-3-large
  5. Store → Qdrant Vector Database
  6. Retrieve → Similarity Search (Top-K)
  7. Generate → GPT-4.1-mini with grounded prompt
  8. Return → Answer + Source Citations
```

## 📁 Project Structure

```
project/
├── backend/
│   ├── index.js              # Express server entry point
│   ├── routes/
│   │   ├── upload.js          # PDF upload & ingestion pipeline
│   │   ├── chat.js            # RAG query endpoint (standard + streaming)
│   │   └── documents.js       # Document management (list, delete)
│   ├── services/
│   │   ├── pdfService.js      # PDF parsing with LangChain
│   │   ├── embeddingService.js # Embedding generation & Qdrant storage
│   │   └── ragService.js      # Full RAG pipeline (retrieve → prompt → generate)
│   └── utils/
│       ├── chunking.js        # Chunking strategy (documented)
│       ├── promptTemplates.js # Grounded generation prompts
│       └── fileUtils.js       # File system utilities
├── client/
│   ├── app/
│   │   ├── page.tsx           # Main application page
│   │   ├── layout.tsx         # Root layout with SEO
│   │   └── globals.css        # Design system & animations
│   ├── components/
│   │   ├── FileUpload.tsx     # Drag & drop upload with progress
│   │   ├── ChatInterface.tsx  # Chat UI with streaming & suggestions
│   │   ├── Sidebar.tsx        # Document management sidebar
│   │   └── SourceCitation.tsx # Source citation display
│   └── lib/
│       └── api.ts             # API client with TypeScript types
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker (for Qdrant)
- OpenAI API Key

### 1. Start Qdrant

```bash
docker run -p 6333:6333 qdrant/qdrant
```

### 2. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your OpenAI API key
npm run dev
```

### 3. Setup Frontend

```bash
cd client
npm install
npm run dev
```

The app will be available at http://localhost:3000

## 🔧 Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | Required |
| `QDRANT_URL` | Qdrant server URL | `http://localhost:6333` |
| `QDRANT_COLLECTION_NAME` | Qdrant collection name | `notebooklm-docs` |
| `PORT` | Backend server port | `8000` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

## 📋 Chunking Strategy

**Strategy**: `RecursiveCharacterTextSplitter`

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `chunkSize` | 800 | Balance between retrieval accuracy and context |
| `chunkOverlap` | 150 | Prevents information loss at boundaries |
| `separators` | `["\n\n", "\n", ". ", " ", ""]` | Natural boundary splitting |

The splitter tries to split on natural boundaries (paragraphs → sentences → words) before falling back to character-level splits. Overlap ensures sentences spanning chunk boundaries are captured in both adjacent chunks.

## 🔑 Key Features

- **Full RAG Pipeline**: Document → Chunk → Embed → Store → Retrieve → Generate
- **Grounded Answers**: LLM answers ONLY from document content
- **Source Citations**: Page numbers cited for every answer
- **Streaming Responses**: Real-time token streaming for better UX
- **Multi-Document Support**: Upload and switch between multiple PDFs
- **"Not Found" Responses**: Explicitly states when info isn't in the document
- **Dark Mode UI**: Premium glassmorphism design with animations
- **Suggested Questions**: Pre-built questions to get started quickly

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload & process a PDF document |
| `POST` | `/api/chat` | Ask a question (supports streaming) |
| `GET` | `/api/documents` | List all uploaded documents |
| `DELETE` | `/api/documents/:id` | Delete a document |
| `GET` | `/api/health` | Health check |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, Tailwind CSS 4, TypeScript |
| Backend | Node.js, Express.js |
| LLM | OpenAI GPT-4.1-mini |
| Embeddings | text-embedding-3-large |
| Vector DB | Qdrant |
| PDF Parsing | LangChain PDFLoader |
| Chunking | LangChain RecursiveCharacterTextSplitter |
