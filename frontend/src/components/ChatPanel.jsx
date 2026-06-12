import { Bot, Loader2, Send, UserRound } from "lucide-react";
import React, { useState } from "react";

import { apiErrorMessage, askDocument } from "../api.js";

export default function ChatPanel({ documentId }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    const userMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setError("");
    setIsLoading(true);

    try {
      const response = await askDocument(documentId, trimmed);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.answer,
          sources: response.sources || [],
        },
      ]);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">Ask Your Document</h2>
      </div>
      <div className="max-h-[520px] min-h-72 space-y-4 overflow-y-auto p-5">
        {!messages.length && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Ask a question after the document has embeddings.
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" && <Avatar icon={Bot} tone="assistant" />}
            <div
              className={[
                "max-w-[85%] rounded-lg px-4 py-3 text-sm leading-6",
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-800",
              ].join(" ")}
            >
              <div>{message.content}</div>
              {!!message.sources?.length && (
                <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-xs text-slate-500">
                  {message.sources.map((source) => (
                    <div key={source.chunk_index}>
                      Chunk {source.chunk_index}
                      {typeof source.score === "number" ? ` · score ${source.score.toFixed(3)}` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {message.role === "user" && <Avatar icon={UserRound} tone="user" />}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Thinking
          </div>
        )}
      </div>

      {error && (
        <div className="mx-5 mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-3 border-t border-slate-200 p-4">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          placeholder="Ask a question"
        />
        <button
          type="submit"
          disabled={!question.trim() || isLoading}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          title="Send"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

function Avatar({ icon: Icon, tone }) {
  const classes =
    tone === "user" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700";
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${classes}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </div>
  );
}
