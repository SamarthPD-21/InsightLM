import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InsightLM — Document Chat with Citations",
  description:
    "Upload PDFs or text files and ask InsightLM questions grounded in your documents, with clean responses and source citations.",
  keywords: "InsightLM, RAG, document chat, AI, PDF, text files, source citations, vector search",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
