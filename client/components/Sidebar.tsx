"use client";

import React from "react";
import { FileText, Trash2, BookOpen, Clock, Layers } from "lucide-react";
import { type DocumentInfo, deleteDocument } from "@/lib/api";

interface SidebarProps {
  documents: DocumentInfo[];
  activeDocId: string | null;
  onSelectDoc: (docId: string) => void;
  onDocumentDeleted: (docId: string) => void;
  onNewUpload: () => void;
}

export default function Sidebar({
  documents,
  activeDocId,
  onSelectDoc,
  onDocumentDeleted,
  onNewUpload,
}: SidebarProps) {
  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!confirm("Delete this document and its embeddings?")) return;
    try {
      await deleteDocument(docId);
      onDocumentDeleted(docId);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "var(--radius-sm)",
            background: "var(--gradient-primary)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <BookOpen size={20} color="white" />
          </div>
          <div>
            <h1 className="brand-display" style={{ fontSize: "16px", fontWeight: 700 }}>
              <span className="gradient-text">Insight</span>LM
            </h1>
          </div>
        </div>
      </div>

      {/* New Upload Button */}
      <div style={{ padding: "16px" }}>
        <button onClick={onNewUpload} className="btn-primary" style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        }}>
          <FileText size={16} /> Upload Document
        </button>
      </div>

      {/* Documents List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>
        <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", padding: "4px 8px 8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Documents ({documents.length})
        </p>

        {documents.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-muted)", fontSize: "13px" }}>
            <FileText size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p>No documents yet</p>
            <p style={{ fontSize: "12px", marginTop: "4px" }}>Upload a PDF to get started</p>
          </div>
        )}

        {documents.map((doc) => (
          <div
            key={doc.id}
            onClick={() => onSelectDoc(doc.id)}
            className="animate-fade-in"
            style={{
              padding: "12px", marginBottom: "6px", borderRadius: "var(--radius-md)",
              cursor: "pointer", transition: "all 0.2s ease",
              background: activeDocId === doc.id ? "var(--bg-hover)" : "transparent",
              border: activeDocId === doc.id ? "1px solid var(--border-accent)" : "1px solid transparent",
            }}
            onMouseOver={(e) => {
              if (activeDocId !== doc.id)
                (e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)";
            }}
            onMouseOut={(e) => {
              if (activeDocId !== doc.id)
                (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <div style={{ display: "flex", alignItems: "start", gap: "10px" }}>
              <FileText size={18} style={{ color: "var(--accent-primary)", flexShrink: 0, marginTop: "2px" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: "13px", fontWeight: 600, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{doc.filename}</p>
                <div style={{ display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "3px" }}>
                    <Layers size={10} /> {doc.totalChunks} chunks
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "3px" }}>
                    <Clock size={10} /> {formatDate(doc.uploadedAt)}
                  </span>
                </div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {doc.totalPages} pages • {formatSize(doc.fileSize)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, doc.id)}
                  aria-label="Delete document"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: "4px",
                    borderRadius: "6px",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "var(--error)";
                    (e.currentTarget as HTMLElement).style.background = "var(--error-bg)";
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: "16px", borderTop: "1px solid var(--border)", textAlign: "center" }}>
        <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          Powered by InsightLM
        </p>
        <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
          Clean answers • Citations • Source-aware chat
        </p>
      </div>
    </div>
  );
}
