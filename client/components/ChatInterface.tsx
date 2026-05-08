"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, BookOpen, Sparkles, MessageSquare, Eye, EyeOff } from "lucide-react";
import { sendMessageStream, type Source, type ChatMessage } from "@/lib/api";
import SourceCitation from "./SourceCitation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatInterfaceProps {
  docId: string;
  filename: string;
  isViewerVisible: boolean;
  onToggleViewer: () => void;
  onSourceClick?: (pageNumber: number) => void;
}

const SUGGESTED_QUESTIONS = [
  "What are the main topics covered in this document?",
  "Summarize the key points of this document.",
  "What are the most important concepts explained?",
  "Give me a detailed overview of the content.",
];

export default function ChatInterface({
  docId,
  filename,
  isViewerVisible,
  onToggleViewer,
  onSourceClick,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageIdRef = useRef(0);
  const streamingMessageIdRef = useRef<string | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingStreamRef = useRef("");
  const displayedStreamRef = useRef("");
  const fullStreamRef = useRef("");
  const streamDoneRef = useRef(false);
  const sourcesRef = useRef<Source[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, []);

  const stopTypingTimer = () => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  };

  const finalizeStream = () => {
    const messageId = streamingMessageIdRef.current;
    if (!messageId) return;

    displayedStreamRef.current = fullStreamRef.current;
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? {
              ...message,
              content: fullStreamRef.current,
              sources: sourcesRef.current,
              isStreaming: false,
            }
          : message
      )
    );

    streamingMessageIdRef.current = null;
    streamDoneRef.current = false;
    pendingStreamRef.current = "";
    stopTypingTimer();
  };

  const startTyping = () => {
    if (typingTimerRef.current) return;

    typingTimerRef.current = setInterval(() => {
      const messageId = streamingMessageIdRef.current;
      if (!messageId) {
        stopTypingTimer();
        return;
      }

      if (pendingStreamRef.current.length === 0) {
        if (streamDoneRef.current) {
          finalizeStream();
        }
        return;
      }

      const pending = pendingStreamRef.current;
      const chunkSize = pending.length > 200 ? 3 : pending.length > 80 ? 2 : 1;
      const nextChunk = pending.slice(0, chunkSize);

      pendingStreamRef.current = pending.slice(chunkSize);
      displayedStreamRef.current += nextChunk;

      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? { ...message, content: displayedStreamRef.current }
            : message
        )
      );
    }, 16);
  };

  const handleSend = async (questionText?: string) => {
    const question = questionText || input.trim();
    if (!question || isLoading) return;

    const nextMessageId = () => {
      messageIdRef.current += 1;
      return `message-${messageIdRef.current}`;
    };

    const userMessageId = nextMessageId();
    const assistantMessageId = nextMessageId();

    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      content: question,
      timestamp: new Date(),
    };

    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      sources: [],
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Build chat history for context
      const chatHistory: ChatMessage[] = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      streamingMessageIdRef.current = assistantMessageId;
      pendingStreamRef.current = "";
      displayedStreamRef.current = "";
      fullStreamRef.current = "";
      streamDoneRef.current = false;
      sourcesRef.current = [];

      await sendMessageStream(
        question,
        docId,
        chatHistory,
        (content) => {
          fullStreamRef.current += content;
          pendingStreamRef.current += content;
          startTyping();
        },
        (sources) => {
          sourcesRef.current = sources;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId
                ? { ...message, sources }
                : message
            )
          );
        },
        () => {
          streamDoneRef.current = true;
          setIsLoading(false);
          startTyping();
        }
      );
    } catch (err: unknown) {
      streamingMessageIdRef.current = null;
      streamDoneRef.current = false;
      pendingStreamRef.current = "";
      stopTypingTimer();

      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: `Sorry, I could not complete that request. ${errorMessage}`,
                isStreaming: false,
              }
            : message
        )
      );
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Chat Header */}
      <div
        className="glass-strong"
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-sm)",
            background: "var(--gradient-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BookOpen size={18} color="white" />
        </div>
        <div>
          <h3 className="panel-title" style={{ fontSize: "15px", fontWeight: 700 }}>
            InsightLM chat
          </h3>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            {filename}
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onToggleViewer}
            className="btn-secondary"
            aria-pressed={isViewerVisible}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 10px" }}
          >
            {isViewerVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            {isViewerVisible ? "Hide PDF viewer" : "Show PDF viewer"}
          </button>
          <span className="badge badge-success">Active</span>
          <span className="badge badge-accent">Grounded</span>
        </div>
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          minHeight: 0,
        }}
      >
        {/* Welcome message if no messages */}
        {messages.length === 0 && !isLoading && (
          <div
            className="animate-fade-in-up"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              textAlign: "center",
              padding: "40px 20px",
            }}
          >
            <div
              className="animate-float"
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "var(--radius-lg)",
                background: "var(--gradient-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              <Sparkles size={28} color="white" />
            </div>
            <h3
              style={{
                fontSize: "20px",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Ask InsightLM anything about your document
            </h3>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "14px",
                maxWidth: "400px",
                lineHeight: "1.6",
                marginBottom: "32px",
              }}
            >
              Your document has been processed and indexed. Ask questions and get
              answers grounded directly from the document content.
            </p>

            {/* Suggested Questions */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "10px",
                width: "100%",
                maxWidth: "560px",
              }}
            >
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="animate-fade-in"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    opacity: 0,
                    background: "linear-gradient(180deg, rgba(22, 22, 42, 0.96), rgba(17, 17, 29, 0.96))",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "14px 16px",
                    color: "var(--text-secondary)",
                    fontSize: "13px",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    lineHeight: "1.4",
                    boxShadow: "var(--shadow-sm)",
                  }}
                  onMouseOver={(e) => {
                    (e.target as HTMLElement).style.borderColor = "var(--border-accent)";
                    (e.target as HTMLElement).style.color = "var(--text-primary)";
                    (e.target as HTMLElement).style.background = "var(--bg-hover)";
                  }}
                  onMouseOut={(e) => {
                    (e.target as HTMLElement).style.borderColor = "var(--border)";
                    (e.target as HTMLElement).style.color = "var(--text-secondary)";
                    (e.target as HTMLElement).style.background = "var(--bg-card)";
                  }}
                >
                  <MessageSquare
                    size={14}
                    style={{ marginBottom: "6px", color: "var(--accent-primary)" }}
                  />
                  <br />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === "user" ? "animate-slide-right" : "animate-slide-left"}
            style={{
              display: "flex",
              justifyContent: message.role === "user" ? "flex-end" : "flex-start",
              gap: "12px",
            }}
          >
            {message.role === "assistant" && (
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--gradient-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "4px",
                }}
              >
                <Sparkles size={16} color="white" />
              </div>
            )}

            <div
              style={{
                maxWidth: "75%",
                padding: message.role === "user" ? "12px 18px" : "16px 20px",
                borderRadius:
                  message.role === "user"
                    ? "var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)"
                    : "var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px",
                background:
                  message.role === "user"
                    ? "var(--gradient-primary)"
                    : "linear-gradient(180deg, rgba(22, 22, 42, 0.98), rgba(16, 16, 28, 0.98))",
                border:
                  message.role === "user"
                    ? "none"
                    : "1px solid var(--border)",
                color: "var(--text-primary)",
                position: "relative",
              }}
              className={`message-bubble ${message.role === "user" ? "user-bubble" : "assistant-bubble"}`}
            >
              {message.role === "assistant" ? (
                <div className="markdown-content">
                  <ReactMarkdown>{message.content || ""}</ReactMarkdown>
                  {message.isStreaming && <span className="streaming-cursor" aria-hidden="true" />}
                </div>
              ) : (
                <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
                  {message.content}
                </p>
              )}

              {/* Source Citations */}
              {message.sources && message.sources.length > 0 && (
                <SourceCitation sources={message.sources} onSelectSource={onSourceClick} />
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        className="glass-strong"
        style={{
          padding: "16px 24px",
          borderTop: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "flex-end",
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          <textarea
            ref={inputRef}
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="input-field"
            rows={1}
            disabled={isLoading}
            style={{
              resize: "none",
              minHeight: "44px",
              maxHeight: "120px",
            }}
            placeholder="Ask InsightLM about this document..."
          />
          <button
            id="send-button"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="btn-primary"
            style={{
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "48px",
              height: "44px",
              flexShrink: 0,
            }}
          >
            {isLoading ? (
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
        <p
          style={{
            textAlign: "center",
            fontSize: "11px",
            color: "var(--text-muted)",
            marginTop: "10px",
          }}
        >
          Answers are generated from your uploaded document only • formatted for easier reading
        </p>
      </div>
    </div>
  );
}
