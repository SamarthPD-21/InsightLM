"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, FileText } from "lucide-react";
import { resolveFileUrl, type DocumentInfo } from "@/lib/api";

interface DocumentViewerProps {
  document: DocumentInfo;
  pageNumber: number;
  onPageChange: (pageNumber: number) => void;
}

export default function DocumentViewer({ document, pageNumber, onPageChange }: DocumentViewerProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  const isTextFile = document.mimeType === "text/plain";
  const isPdf = !isTextFile;
  const resolvedUrl = resolveFileUrl(document.fileUrl);
  const safePageNumber = Math.max(1, pageNumber || 1);

  const viewerSrc = useMemo(() => {
    if (!resolvedUrl) return "";
    return isPdf ? `${resolvedUrl}#page=${safePageNumber}&view=FitH` : resolvedUrl;
  }, [isPdf, resolvedUrl, safePageNumber]);

  const isLoaded = Boolean(viewerSrc) && loadedSrc === viewerSrc;

  return (
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
      <div
        className="glass-strong"
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "var(--radius-sm)",
              background: "var(--gradient-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FileText size={18} color="white" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
              <h3 className="panel-title" style={{ fontSize: "15px", fontWeight: 700 }}>
                Document preview
              </h3>
              <span className="badge badge-accent">{isPdf ? "PDF" : "Text"}</span>
              <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                {isPdf ? `${document.totalPages} pages` : "Plain text"}
              </span>
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={document.filename}
            >
              {document.filename}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {isPdf && document.totalPages > 1 && (
            <div className="surface-card" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px" }}>
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, safePageNumber - 1))}
                disabled={safePageNumber <= 1}
                className="btn-secondary"
                style={{ padding: "6px 8px", borderRadius: "10px" }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", minWidth: "68px", textAlign: "center" }}>
                Page {safePageNumber} / {document.totalPages}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(Math.min(document.totalPages, safePageNumber + 1))}
                disabled={safePageNumber >= document.totalPages}
                className="btn-secondary"
                style={{ padding: "6px 8px", borderRadius: "10px" }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          <a
            href={resolvedUrl}
            target="_blank"
            rel="noreferrer"
            className="badge badge-accent"
            style={{ textDecoration: "none" }}
          >
            <ExternalLink size={12} /> Open file
          </a>
        </div>
      </div>

      <div style={{ position: "relative", flex: 1, minHeight: 0, background: "var(--bg-primary)" }}>
        {!isLoaded && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              zIndex: 1,
              background: "linear-gradient(180deg, rgba(10, 10, 15, 0.72), rgba(10, 10, 15, 0.92))",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div className="upload-loader" style={{ width: "64px", height: "64px" }} aria-hidden="true">
                <div className="upload-loader-ring" />
                <div className="upload-loader-core" style={{ width: "38px", height: "38px" }}>
                  <FileText size={16} />
                </div>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Loading document preview</p>
            </div>
          </div>
        )}

        <iframe
          key={viewerSrc}
          src={viewerSrc}
          title={`Preview of ${document.filename}`}
          onLoad={() => setLoadedSrc(viewerSrc)}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            background: "var(--bg-primary)",
          }}
        />
      </div>

      <div
        className="glass-strong"
        style={{
          padding: "16px 24px",
          borderTop: "1px solid var(--border)",
          color: "var(--text-muted)",
          fontSize: "12px",
          flexShrink: 0,
        }}
      >
        {isPdf
          ? "Click a citation in chat to jump to that page."
          : "Text files are shown directly in the preview pane."}
      </div>
    </section>
  );
}