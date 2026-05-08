"use client";

import React, { useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { type Source } from "@/lib/api";

interface SourceCitationProps {
  sources: Source[];
  onSelectSource?: (pageNumber: number) => void;
}

export default function SourceCitation({ sources, onSelectSource }: SourceCitationProps) {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: "rgba(124, 58, 237, 0.08)", border: "1px solid rgba(124, 58, 237, 0.16)", color: "var(--accent-light)",
          fontSize: "12px", fontWeight: 600, cursor: "pointer", padding: "8px 10px", borderRadius: "999px",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <FileText size={14} />
        {sources.length} Source{sources.length > 1 ? "s" : ""} Referenced
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="animate-fade-in" style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {sources.map((source, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                const pageNumber = Number(source.pageNumber);
                if (onSelectSource && Number.isFinite(pageNumber)) {
                  onSelectSource(pageNumber);
                }
              }}
              style={{
                padding: "12px 12px",
                background: "rgba(124, 58, 237, 0.06)",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(124, 58, 237, 0.12)",
                cursor: onSelectSource ? "pointer" : "default",
                textAlign: "left",
                width: "100%",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span className="badge badge-accent" style={{ fontSize: "11px", padding: "2px 8px" }}>
                  Page {source.pageNumber}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{source.filename}</span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                {source.preview}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
