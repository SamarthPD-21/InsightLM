"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import FileUpload from "@/components/FileUpload";
import ChatInterface from "@/components/ChatInterface";
import DocumentViewer from "@/components/DocumentViewer";
import { getDocuments, type DocumentInfo, type UploadResponse } from "@/lib/api";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";

type View = "landing" | "chat";

export default function Home() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [view, setView] = useState<View>("landing");
  const [selectedPage, setSelectedPage] = useState(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isViewerVisible, setIsViewerVisible] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadDocuments = async () => {
      try {
        const res = await getDocuments();
        if (isActive) {
          setDocuments(res.documents);
        }
      } catch {
        // Backend might not be running
      }
    };

    loadDocuments();

    return () => {
      isActive = false;
    };
  }, []);

  const handleUploadSuccess = (response: UploadResponse) => {
    const newDoc: DocumentInfo = {
      id: response.document.id,
      filename: response.document.filename,
      uploadedAt: new Date().toISOString(),
      totalPages: response.document.totalPages,
      totalChunks: response.document.totalChunks,
      fileSize: 0,
      fileUrl: response.document.fileUrl,
      mimeType: response.document.mimeType,
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setActiveDocId(response.document.id);
    setSelectedPage(1);
    setIsViewerVisible(true);
    setView("chat");
  };

  const handleSelectDoc = (docId: string) => {
    setActiveDocId(docId);
    setSelectedPage(1);
    setIsViewerVisible(true);
    setView("chat");
  };

  const handleToggleViewer = (docId: string) => {
    if (docId !== activeDocId) {
      handleSelectDoc(docId);
      return;
    }
    setIsViewerVisible((prev) => !prev);
  };

  const handleDocDeleted = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    if (activeDocId === docId) {
      setActiveDocId(null);
      setView("landing");
    }
  };

  const handleSourceClick = (pageNumber: number) => {
    setSelectedPage(pageNumber);
    setIsViewerVisible(true);
    setView("chat");
  };

  const activeDoc = documents.find((d) => d.id === activeDocId);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <div className="bg-pattern" />

      <aside className={`sidebar-shell ${isSidebarCollapsed ? "is-collapsed" : ""}`} aria-label="Sidebar">
        <div className="sidebar-content" aria-hidden={isSidebarCollapsed}>
          <Sidebar
            documents={documents}
            activeDocId={activeDocId}
            onSelectDoc={handleSelectDoc}
            onDocumentDeleted={handleDocDeleted}
            onNewUpload={() => setView("landing")}
          />
        </div>
        <button
          type="button"
          className="sidebar-toggle glass"
          aria-label={isSidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          aria-pressed={isSidebarCollapsed}
          onClick={() => setIsSidebarCollapsed((prev) => !prev)}
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0, overflow: "hidden" }}>
        {view === "landing" ? (
          <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px", display: "flex", justifyContent: "center" }}>
            <div style={{ maxWidth: "820px", width: "100%" }}>
              <div className="hero-panel animate-fade-in-up" style={{ padding: "28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "18px", flexWrap: "wrap" }}>
                  <div style={{
                    width: "64px", height: "64px", borderRadius: "22px",
                    background: "var(--gradient-primary)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    boxShadow: "var(--shadow-glow)",
                  }}>
                    <BookOpen size={30} color="white" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "clamp(34px, 6vw, 52px)", fontWeight: 800, lineHeight: 1.02, marginBottom: "10px" }}>
                      Upload a document.
                    </h3>
                    <p style={{ fontSize: "16px", color: "var(--text-secondary)", lineHeight: "1.7", maxWidth: "680px" }}>
                      Clean answers, page citations, and a reading experience that stays easy to scan.
                    </p>
                  </div>
                </div>

                <FileUpload onUploadSuccess={handleUploadSuccess} />
              </div>
            </div>
          </div>
        ) : activeDoc ? (
          <div className={`workspace-split ${isViewerVisible ? "" : "viewer-hidden"}`} style={{ flex: 1, minHeight: 0 }}>
            <section
              className="hero-panel"
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              <ChatInterface
                docId={activeDoc.id}
                filename={activeDoc.filename}
                isViewerVisible={isViewerVisible}
                onToggleViewer={() => handleToggleViewer(activeDoc.id)}
                onSourceClick={handleSourceClick}
              />
            </section>
            <div className="viewer-pane" aria-hidden={!isViewerVisible}>
              <DocumentViewer
                document={activeDoc}
                pageNumber={selectedPage}
                onPageChange={setSelectedPage}
              />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            Select a document or upload a new one
          </div>
        )}
      </main>
    </div>
  );
}
