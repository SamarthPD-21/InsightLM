"use client";

import React, { useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { type Source } from "@/lib/api";

interface SourceCitationProps {
  sources: Source[];
}

export default function SourceCitation({ sources }: SourceCitationProps) {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "none", border: "none", color: "var(--accent-light)",
          fontSize: "12px", fontWeight: 600, cursor: "pointer", padding: 0,
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
            <div key={i} style={{
              padding: "10px 12px", background: "rgba(124, 58, 237, 0.06)",
              borderRadius: "var(--radius-sm)", border: "1px solid rgba(124, 58, 237, 0.12)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span className="badge badge-accent" style={{ fontSize: "11px", padding: "2px 8px" }}>
                  Page {source.pageNumber}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{source.filename}</span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                {source.preview}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
