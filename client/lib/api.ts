const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
export const FILE_BASE = API_BASE.replace(/\/api$/, "");

export function resolveFileUrl(fileUrl: string): string {
  if (!fileUrl) return "";
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) return fileUrl;
  return `${FILE_BASE}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
}

/**
 * Upload a PDF file to the backend
 */
export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Upload failed");
  }

  return response.json();
}

/**
 * Send a chat question (non-streaming)
 */
export async function sendMessage(
  question: string,
  docId?: string,
  chatHistory?: ChatMessage[]
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, docId, chatHistory, stream: false }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Chat failed");
  }

  return response.json();
}

/**
 * Send a chat question with streaming response
 */
export async function sendMessageStream(
  question: string,
  docId?: string,
  chatHistory?: ChatMessage[],
  onContent: (content: string) => void = () => {},
  onSources: (sources: Source[]) => void = () => {},
  onDone: () => void = () => {}
): Promise<void> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, docId, chatHistory, stream: true }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Chat failed");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === "content") {
            onContent(data.content);
          } else if (data.type === "sources") {
            onSources(data.sources);
          } else if (data.type === "done") {
            onDone();
          }
        } catch {
          // skip invalid JSON
        }
      }
    }
  }
}

/**
 * Get all uploaded documents
 */
export async function getDocuments(): Promise<DocumentsResponse> {
  const response = await fetch(`${API_BASE}/documents`);
  if (!response.ok) throw new Error("Failed to fetch documents");
  return response.json();
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/documents/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete document");
}

/**
 * Check backend health
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

// ======= Types =======

export interface UploadResponse {
  success: boolean;
  document: {
    id: string;
    filename: string;
    totalPages: number;
    totalChunks: number;
    fileUrl: string;
    mimeType: string;
  };
  message: string;
}

export interface Source {
  pageNumber: number | string;
  filename: string;
  preview: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  success: boolean;
  answer: string;
  sources: Source[];
}

export interface DocumentInfo {
  id: string;
  filename: string;
  uploadedAt: string;
  totalPages: number;
  totalChunks: number;
  fileSize: number;
  fileUrl: string;
  mimeType: string;
}

export interface DocumentsResponse {
  success: boolean;
  documents: DocumentInfo[];
  total: number;
}
