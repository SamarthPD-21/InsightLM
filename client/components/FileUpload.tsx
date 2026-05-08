"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { uploadDocument, type UploadResponse } from "@/lib/api";

interface FileUploadProps {
  onUploadSuccess: (response: UploadResponse) => void;
}

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{name: string, size: number} | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate
      if (!file.name.endsWith(".pdf") && !file.name.endsWith(".txt")) {
        setError("Only PDF and TXT files are supported");
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        setError("File size must be under 20MB");
        return;
      }

      setUploading(true);
      setError(null);
      setSuccess(null);
      setProgress(0);
      setFileMeta({ name: file.name, size: file.size });
      let progressInterval: ReturnType<typeof setInterval> | null = null;

      try {
        // Simulate progress stages based on typical RAG pipeline timing
        progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 99) return prev;

            let delta = 0.2 + Math.random() * 0.3;
            if (prev < 70) {
              delta = 1 + Math.random() * 0.8;
            } else if (prev < 90) {
              delta = 0.6 + Math.random() * 0.6;
            } else if (prev < 98) {
              delta = 0.2 + Math.random() * 0.4;
            }

            return Math.min(99, prev + delta);
          });
        }, 80);

        const response = await uploadDocument(file);

        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        setProgress(100);
        setSuccess(response.message);
        setUploading(false);

        // Give the success state a brief moment before switching to chat.
        setTimeout(() => {
          setProgress(0);
          setSuccess(null);
          setFileMeta(null);
          onUploadSuccess(response);
        }, 700);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Upload failed. Please try again.";
        setError(errorMessage);
        setProgress(0);
        setFileMeta(null);
        if (progressInterval) {
          clearInterval(progressInterval);
        }
      } finally {
        setUploading(false);
      }
    },
    [onUploadSuccess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="animate-fade-in-up" style={{ animationDelay: "0.2s", opacity: 0 }}>
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? "active" : ""}`}
        style={{
          opacity: uploading ? 0.8 : 1,
          cursor: uploading ? "not-allowed" : "pointer",
          position: "relative",
          overflow: "hidden",
          border: uploading ? "2px solid var(--accent-primary)" : "",
          boxShadow: uploading ? "0 0 20px rgba(124, 58, 237, 0.15)" : "",
          transform: isDragActive ? "scale(1.02)" : "scale(1)",
        }}
      >
        <input {...getInputProps()} id="file-upload-input" />

        {/* Animated background gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: isDragActive || uploading
              ? "radial-gradient(circle at center, rgba(124, 58, 237, 0.1) 0%, transparent 70%)"
              : "transparent",
            transition: "all 0.5s ease",
            pointerEvents: "none",
            animation: uploading ? "pulse-glow 2s infinite" : "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          {uploading ? (
            <div className="animate-fade-in">
              <div className="upload-loader" aria-hidden="true">
                <div className="upload-loader-ring" />
                <div className="upload-loader-core">
                  <Sparkles size={22} className="animate-none" />
                </div>
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <span className="badge badge-accent">Processing</span>
              </div>
            </div>
          ) : success ? (
            <CheckCircle2
              size={56}
              style={{ color: "var(--success)", margin: "0 auto 16px" }}
              className="animate-fade-in"
            />
          ) : (
            <div style={{ display: "inline-block" }}>
              <Upload
                size={56}
                style={{
                  color: isDragActive ? "var(--accent-primary)" : "var(--text-muted)",
                  margin: "0 auto 16px",
                  transition: "color 0.3s ease",
                }}
              />
            </div>
          )}

          <h3
            style={{
              fontSize: "18px",
              fontWeight: 600,
              marginBottom: "8px",
              color: isDragActive || uploading ? "var(--accent-light)" : "var(--text-primary)",
              transition: "color 0.3s ease",
            }}
          >
            {uploading
              ? "Preparing your file..."
              : success
              ? "Ready to chat"
              : isDragActive
              ? "Drop your file here"
              : "Drag and drop your file"}
          </h3>

          {!uploading && !success && (
            <>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "16px" }}>
                or click to browse
              </p>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                <span className="badge badge-accent"><FileText size={12} /> PDF</span>
                <span className="badge badge-accent"><FileText size={12} /> TXT</span>
                <span style={{ color: "var(--text-muted)", fontSize: "12px", alignSelf: "center" }}>Max 20MB</span>
              </div>
            </>
          )}

          {/* Uploading File Details & Progress */}
          {(uploading || success) && fileMeta && (
            <div className="animate-fade-in-up" style={{ marginTop: "24px", maxWidth: "400px", margin: "24px auto 0" }}>
              <div style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-accent)",
                borderRadius: "var(--radius-md)",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}>
                <div style={{
                  background: "rgba(124, 58, 237, 0.1)",
                  padding: "10px",
                  borderRadius: "8px",
                  color: "var(--accent-primary)"
                }}>
                  <FileText size={24} />
                </div>
                <div style={{ flex: 1, textAlign: "left", overflow: "hidden" }}>
                  <p style={{ fontSize: "14px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--text-primary)" }}>
                    {fileMeta.name}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                    {formatSize(fileMeta.size)}
                  </p>
                </div>
                {success && <CheckCircle2 size={20} color="var(--success)" />}
              </div>

              {progress > 0 && !success && (
                <div style={{ marginTop: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>
                      {progress < 30
                        ? "Reading file"
                        : progress < 60
                        ? "Chunking content"
                        : progress < 90
                        ? "Creating embeddings"
                        : "Saving index"}
                    </span>
                    <span style={{ fontSize: "13px", color: "var(--accent-light)", fontWeight: 600 }}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="progress-bar progress-bar-loading">
                    <div
                      className="progress-bar-fill progress-bar-fill-loading"
                      style={{
                        width: `${progress}%`,
                        transition: "width 0.25s ease-out"
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="animate-fade-in"
          style={{
            marginTop: "16px",
            padding: "12px 16px",
            background: "var(--error-bg)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <AlertCircle size={18} style={{ color: "var(--error)", flexShrink: 0 }} />
          <span style={{ color: "var(--error)", fontSize: "14px", fontWeight: 500 }}>{error}</span>
        </div>
      )}
    </div>
  );
}
