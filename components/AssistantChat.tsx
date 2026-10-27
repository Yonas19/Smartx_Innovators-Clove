"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  User,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react";
import type {
  ChatMessage,
  ChatQuestion,
  DetectedIssue,
} from "@/lib/types";
import { isArabic } from "@/lib/utils";

interface Props {
  partId: string;
  initialMessages: ChatMessage[];
  initialQuestions: ChatQuestion[];
  initialIssues: DetectedIssue[];
  onResolved?: () => void;
}

const issueIcon = {
  conflict: XCircle,
  missing: AlertTriangle,
  uncertain: Info,
  reference_check: CheckCircle2,
};

export default function AssistantChat({
  partId,
  initialMessages,
  initialQuestions,
  initialIssues,
  onResolved,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [questions, setQuestions] = useState<ChatQuestion[]>(initialQuestions);
  const [issues, setIssues] = useState<DetectedIssue[]>(initialIssues);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIssues, setShowIssues] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/parts/${partId}/chat`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages);
        }
        if (Array.isArray(data.pendingQuestions)) {
          setQuestions(data.pendingQuestions);
        }
        if (Array.isArray(data.detectedIssues)) {
          setIssues(data.detectedIssues);
        }
      } catch {
        // Non-fatal - keep the server-rendered state.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [partId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      setInput("");
      setError(null);
      setIsSending(true);

      const optimistic: ChatMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        text: trimmed,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        const res = await fetch(`/api/parts/${partId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to send message");
        }

        const data = await res.json();

        if (Array.isArray(data.messages)) setMessages(data.messages);
        if (Array.isArray(data.pendingQuestions)) {
          setQuestions(data.pendingQuestions);
        }
        if (Array.isArray(data.detectedIssues)) setIssues(data.detectedIssues);

        if (data.appliedAttribute) onResolved?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message");
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      } finally {
        setIsSending(false);
        inputRef.current?.focus();
      }
    },
    [partId, isSending, onResolved],
  );

  const answerQuestion = useCallback(
    async (question: ChatQuestion, value: string, label: string) => {
      await sendMessage(value || label);
    },
    [sendMessage],
  );

  const inputIsArabic = input.length > 0 && isArabic(input);
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-emerald-50 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">AI Assistant</p>
            <p className="text-[11px] text-slate-500">
              {questions.length === 0
                ? "All questions resolved"
                : `${questions.length} question${
                    questions.length !== 1 ? "s" : ""
                  } pending`}
            </p>
          </div>
        </div>
        {issues.length > 0 && (
          <button
            onClick={() => setShowIssues((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm hover:text-slate-900"
          >
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            {issues.length} issue{issues.length !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showIssues && issues.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-slate-200 bg-amber-50/70"
          >
            <div className="custom-scroll max-h-48 space-y-2 overflow-y-auto p-3">
              {issues.map((issue, i) => {
                const Icon =
                  issueIcon[issue.type as keyof typeof issueIcon] ?? Info;
                return (
                  <div
                    key={`${issue.attribute}-${i}`}
                    className="flex items-start gap-2 rounded-lg bg-white/80 p-2"
                  >
                    <Icon
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                        issue.severity === "error"
                          ? "text-red-500"
                          : "text-amber-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800">
                        {issue.attribute}
                      </p>
                      <p className="text-xs text-slate-600">{issue.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={scrollRef}
        className="custom-scroll flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4"
      >
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2.5 ${
                message.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  message.role === "user"
                    ? "bg-slate-700 text-white"
                    : "bg-emerald-600 text-white"
                }`}
              >
                {message.role === "user" ? (
                  <User className="h-3.5 w-3.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
              </div>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                  message.role === "user"
                    ? "rounded-tr-sm bg-slate-700 text-white"
                    : "rounded-tl-sm border border-slate-200 bg-white text-slate-700"
                }`}
                dir={isArabic(message.text) ? "rtl" : "ltr"}
              >
                {message.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isSending && (
          <div className="flex gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3.5 py-2.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
              <span className="text-xs text-slate-400">Thinking...</span>
            </div>
          </div>
        )}
      </div>
      {questions.length > 0 && (
        <div className="border-t border-slate-200 bg-white px-3 py-2.5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Quick answers
          </p>
          <div className="flex flex-wrap gap-1.5">
            {questions[0].candidates
              .filter((c) => c.value)
              .map((candidate, i) => (
                <button
                  key={`${candidate.value}-${i}`}
                  onClick={() =>
                    answerQuestion(
                      questions[0],
                      candidate.value,
                      candidate.label,
                    )
                  }
                  disabled={isSending}
                  className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
                >
                  {candidate.label}
                </button>
              ))}
            <button
              onClick={() => answerQuestion(questions[0], "", "skip")}
              disabled={isSending}
              className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="border-t border-slate-200 bg-white p-3">
        <div className="flex items-end gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            dir={inputIsArabic ? "rtl" : "ltr"}
            placeholder={
              questions.length > 0
                ? "Answer the question, or type skip..."
                : "Ask about this part..."
            }
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isSending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            aria-label="Send message"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Press Enter to send. Arabic input is detected automatically.
        </p>
      </div>
    </div>
  );
}