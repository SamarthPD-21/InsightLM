"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, BookOpen, Sparkles, MessageSquare } from "lucide-react";
import { sendMessageStream, type Source, type ChatMessage } from "@/lib/api";
import SourceCitation from "./SourceCitation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  timestamp: Date;
}

interface ChatInterfaceProps {
  docId: string;
  filename: string;
}

const SUGGESTED_QUESTIONS = [
  "What are the main topics covered in this document?",
  "Summarize the key points of this document.",
  "What are the most important concepts explained?",
  "Give me a detailed overview of the content.",
];

export default function ChatInterface({ docId, filename }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingSources, setStreamingSources] = useState<Source[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const handleSend = async (questionText?: string) => {
    const question = questionText || input.trim();
    if (!question || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");
    setStreamingSources([]);

    try {
      // Build chat history for context
      const chatHistory: ChatMessage[] = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let accumulatedContent = "";
      let capturedSources: Source[] = [];

      await sendMessageStream(
        question,
        docId,
        chatHistory,
        (content) => {
          accumulatedContent += content;
          setStreamingContent(accumulatedContent);
        },
        (sources) => {
          capturedSources = sources;
          setStreamingSources(sources);
        },
        () => {
          // Done - add complete message
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: accumulatedContent,
            sources: capturedSources,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setStreamingContent("");
          setStreamingSources([]);
          setIsLoading(false);
        }
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `❌ Error: ${errorMessage}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setIsLoading(false);
      setStreamingContent("");
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
          <h3 style={{ fontSize: "15px", fontWeight: 600 }}>
            Chat with Document
          </h3>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            {filename}
          </p>
        </div>
        <span className="badge badge-success" style={{ marginLeft: "auto" }}>
          Active
        </span>
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
              Ask anything about your document
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
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px 16px",
                    color: "var(--text-secondary)",
                    fontSize: "13px",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    lineHeight: "1.4",
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
                    : "var(--bg-card)",
                border:
                  message.role === "user"
                    ? "none"
                    : "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              {message.role === "assistant" ? (
                <div className="markdown-content">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              ) : (
                <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
                  {message.content}
                </p>
              )}

              {/* Source Citations */}
              {message.sources && message.sources.length > 0 && (
                <SourceCitation sources={message.sources} />
              )}
            </div>
          </div>
        ))}

        {/* Streaming response */}
        {isLoading && (
          <div
            className="animate-slide-left"
            style={{
              display: "flex",
              gap: "12px",
            }}
          >
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

            <div
              style={{
                maxWidth: "75%",
                padding: "16px 20px",
                borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              {streamingContent ? (
                <div className="markdown-content">
                  <ReactMarkdown>{streamingContent}</ReactMarkdown>
                  <span
                    style={{
                      display: "inline-block",
                      width: "8px",
                      height: "16px",
                      background: "var(--accent-primary)",
                      marginLeft: "2px",
                      animation: "typing 1s infinite",
                      borderRadius: "1px",
                    }}
                  />
                </div>
              ) : (
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}

              {streamingSources.length > 0 && (
                <SourceCitation sources={streamingSources} />
              )}
            </div>
          </div>
        )}

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
            placeholder="Ask a question about your document..."
            className="input-field"
            rows={1}
            disabled={isLoading}
            style={{
              resize: "none",
              minHeight: "44px",
              maxHeight: "120px",
            }}
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
          Answers are generated from your uploaded document only • Not from general AI knowledge
        </p>
      </div>
    </div>
  );
}
