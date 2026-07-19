import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NPL BLAST Rules Chatbot",
  description: "A context-grounded chatbot for NPL BLAST cricket rules."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
