"use client";

import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import FileUpload from "@/components/FileUpload";
import ChatInterface from "@/components/ChatInterface";
import { getDocuments, type DocumentInfo, type UploadResponse } from "@/lib/api";
import { BookOpen, Zap, Shield, FileSearch } from "lucide-react";

type View = "landing" | "chat";

export default function Home() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [view, setView] = useState<View>("landing");

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await getDocuments();
      setDocuments(res.documents);
    } catch {
      // Backend might not be running
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUploadSuccess = (response: UploadResponse) => {
    const newDoc: DocumentInfo = {
      id: response.document.id,
      filename: response.document.filename,
      uploadedAt: new Date().toISOString(),
      totalPages: response.document.totalPages,
      totalChunks: response.document.totalChunks,
      fileSize: 0,
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setActiveDocId(response.document.id);
    setView("chat");
  };

  const handleSelectDoc = (docId: string) => {
    setActiveDocId(docId);
    setView("chat");
  };

  const handleDocDeleted = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    if (activeDocId === docId) {
      setActiveDocId(null);
      setView("landing");
    }
  };

  const activeDoc = documents.find((d) => d.id === activeDocId);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <div className="bg-pattern" />

      <Sidebar
        documents={documents}
        activeDocId={activeDocId}
        onSelectDoc={handleSelectDoc}
        onDocumentDeleted={handleDocDeleted}
        onNewUpload={() => setView("landing")}
      />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        {view === "landing" ? (
          <div style={{ flex: 1, overflowY: "auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ maxWidth: "680px", width: "100%", padding: "40px 24px" }}>
              {/* Hero */}
              <div className="animate-fade-in-up" style={{ textAlign: "center", marginBottom: "40px" }}>
                <div className="animate-float" style={{
                  width: "72px", height: "72px", borderRadius: "var(--radius-xl)",
                  background: "var(--gradient-primary)", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  margin: "0 auto 24px", boxShadow: "var(--shadow-glow)",
                }}>
                  <BookOpen size={36} color="white" />
                </div>
                <h1 style={{ fontSize: "36px", fontWeight: 800, marginBottom: "12px", letterSpacing: "-0.5px" }}>
                  Chat with your <span className="gradient-text">Documents</span>
                </h1>
                <p style={{ fontSize: "16px", color: "var(--text-secondary)", lineHeight: "1.6", maxWidth: "480px", margin: "0 auto" }}>
                  Upload any PDF document and ask questions. Get accurate, grounded answers with source citations — powered by RAG.
                </p>
              </div>

              {/* Upload */}
              <FileUpload onUploadSuccess={handleUploadSuccess} />

              {/* Features */}
              <div className="animate-fade-in-up" style={{ animationDelay: "0.4s", opacity: 0, marginTop: "48px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                  {[
                    { icon: <Zap size={20} />, title: "RAG Pipeline", desc: "Chunk → Embed → Retrieve → Generate" },
                    { icon: <Shield size={20} />, title: "Grounded Answers", desc: "Answers come only from your document" },
                    { icon: <FileSearch size={20} />, title: "Source Citations", desc: "See exact pages used for each answer" },
                  ].map((f, i) => (
                    <div key={i} className="card" style={{ textAlign: "center", padding: "20px 16px" }}>
                      <div style={{
                        color: "var(--accent-primary)", marginBottom: "10px",
                        display: "flex", justifyContent: "center",
                      }}>{f.icon}</div>
                      <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>{f.title}</h3>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.4" }}>{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : activeDoc ? (
          <ChatInterface docId={activeDoc.id} filename={activeDoc.filename} />
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            Select a document or upload a new one
          </div>
        )}
      </main>
    </div>
  );
}
