"use client";

import { FormEvent, useMemo, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const starterPrompts = [
  "What is the arrival time requirement?",
  "Explain the umpire and scoring responsibilities.",
  "What happens if a team is late?",
  "Summarize the batting and bowling rules."
];

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ask me about the NPL BLAST 2026 cricket rules. I will answer from the uploaded rules context and call out when the document does not contain enough detail."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading]);

  async function sendQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          history: nextMessages.slice(-8)
        })
      });

      const payload = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "The chatbot could not answer right now.");
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: payload.answer || "I could not find a grounded answer." }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "Something went wrong."
        }
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendQuestion(input);
  }

  return (
    <main className="page">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              NPL
            </div>
            <div>
              <h1 className="brand-title">NPL BLAST Rules Chatbot</h1>
              <p className="brand-subtitle">Grounded in the uploaded Cricket Rules document</p>
            </div>
          </div>
          <div className="status-pill">Context: Criket_Rules.docx</div>
        </div>
      </header>

      <section className="shell">
        <div className="chat-panel">
          <div className="messages" aria-live="polite">
            {messages.map((message, index) => (
              <article className={`message ${message.role}`} key={`${message.role}-${index}`}>
                <div className="label">{message.role === "user" ? "You" : "Rules Bot"}</div>
                <div className="bubble">{message.content}</div>
              </article>
            ))}
            {isLoading ? (
              <article className="message assistant">
                <div className="label">Rules Bot</div>
                <div className="bubble">Checking the rules context...</div>
              </article>
            ) : null}
          </div>

          <form className="composer" onSubmit={onSubmit}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a rule question..."
              aria-label="Ask a rule question"
            />
            <div className="composer-actions">
              <span className="hint">Answers are limited to the document context.</span>
              <button className="send-button" type="submit" disabled={!canSend}>
                {isLoading ? "Answering" : "Send"}
              </button>
            </div>
          </form>
        </div>

        <aside className="side-panel" aria-label="Suggested questions and deployment note">
          <section>
            <h2>Suggested Questions</h2>
            <div className="quick-list">
              {starterPrompts.map((prompt) => (
                <button
                  className="quick-button"
                  key={prompt}
                  type="button"
                  onClick={() => void sendQuestion(prompt)}
                  disabled={isLoading}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>
          <section className="notice">
            <h2>Model Setup</h2>
            <p>
              Add a Gemini API key in Vercel for natural-language answers. Without it, the app
              returns the most relevant rules excerpts.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
