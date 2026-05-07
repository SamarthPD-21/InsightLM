import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NotebookLM — RAG-Powered Document Chat",
  description:
    "Upload any PDF and have an AI-powered conversation with it. Get accurate, grounded answers with source citations using a full RAG pipeline.",
  keywords: "NotebookLM, RAG, document chat, AI, PDF, OpenAI, vector search",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
