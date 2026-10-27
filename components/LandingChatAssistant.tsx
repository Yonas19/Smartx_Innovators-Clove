"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";

type Message = {
  role: "assistant" | "user";
  text: string;
  href?: string;
  linkLabel?: string;
};

const welcome: Message = {
  role: "assistant",
  text: "Hi, I’m Clove. I can help you upload a part, explain the checks, or open your dashboard.",
};

function replyFor(message: string): Message {
  const text = message.toLowerCase();

  if (/(upload|start|new part|add part)/.test(text)) {
    return {
      role: "assistant",
      text: "Start by adding photos, a spreadsheet, or notes. Clove will extract the details and ask for anything missing.",
      href: "/intake",
      linkLabel: "Upload a part",
    };
  }

  if (/(dashboard|part|missing|detail|question)/.test(text)) {
    return {
      role: "assistant",
      text: "Your dashboard shows every part and its open questions. Use the guided helper to complete details one at a time.",
      href: "/dashboard",
      linkLabel: "Open dashboard",
    };
  }

  if (/(how|work|check|verify|evidence|safe)/.test(text)) {
    return {
      role: "assistant",
      text: "Clove keeps each extracted detail tied to its source. Conflicts and missing fields are highlighted before a listing is approved.",
    };
  }

  return {
    role: "assistant",
    text: "I can help you upload a part, review missing details, or explain how Clove checks evidence. What would you like to do?",
  };
}

export default function LandingChatAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([welcome]);

  const send = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    setMessages((current) => [
      ...current,
      { role: "user", text: clean },
      replyFor(clean),
    ]);
    setInput("");
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send(input);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open ? (
        <section className="flex h-[420px] w-[min(360px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-2xl">
          <header className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50 px-4 py-3">
            <div className="flex h-9 w-9 items-end justify-center overflow-hidden rounded-xl bg-white">
              <img
                src="/assistant/clove-assistant-idle.png"
                alt="Clove assistant"
                className="h-12 w-10 object-contain object-bottom"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">Clove Assistant</p>
              <p className="text-[11px] text-emerald-700">Here to help</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-slate-900"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "rounded-br-sm bg-emerald-600 text-white"
                      : "rounded-bl-sm border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {message.text}
                  {message.href && message.linkLabel && (
                    <Link
                      href={message.href}
                      className="mt-2 inline-flex rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                    >
                      {message.linkLabel}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 bg-white p-3">
            <div className="mb-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => send("How do I upload a part?")}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
              >
                Upload a part
              </button>
              <button
                type="button"
                onClick={() => send("Open my dashboard")}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
              >
                Dashboard
              </button>
            </div>
            <form onSubmit={onSubmit} className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask Clove..."
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative flex h-64 w-44 items-end justify-center transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:h-80 sm:w-56"
          aria-label="Open Clove assistant"
          title="Ask Clove"
        >
          <img
            src="/assistant/clove-assistant-idle.png"
            alt="Clove assistant"
            className="h-full w-full object-contain object-bottom drop-shadow-xl"
          />
          <span className="absolute bottom-1 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition-colors group-hover:bg-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            Ask Clove
          </span>
        </button>
      )}
    </div>
  );
}
