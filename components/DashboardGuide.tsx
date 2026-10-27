"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, X } from "lucide-react";
import GuidedDetailsWizard from "./GuidedDetailsWizard";

interface GuidePart {
  id: string;
  name: string;
  openQuestions: number;
}

const DISMISS_KEY = "clove-guide-dismissed";

export default function DashboardGuide(props: {
  parts: GuidePart[];
  initialGuide?: string;
}) {
  const parts = props.parts;
  const initialGuide = props.initialGuide;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const suggested = useMemo(() => {
    const incomplete = parts.filter((p) => p.openQuestions > 0);
    if (incomplete.length === 0) return null;
    return incomplete.reduce((best, p) =>
      p.openQuestions > best.openQuestions ? p : best,
    );
  }, [parts]);

  useEffect(() => {
    if (initialGuide) {
      setSelectedId(initialGuide);
      setOpen(true);
      return;
    }
    if (!suggested) return;
    let dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      dismissed = false;
    }
    if (!dismissed) {
      setSelectedId(suggested.id);
      setOpen(true);
    }
  }, [initialGuide, suggested]);

  const close = () => {
    setOpen(false);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const selected = parts.find((p) => p.id === selectedId) ?? null;

  return (
    <>
      {suggested && !open ? (
        <>
          <div className="mx-auto mb-4 flex max-w-6xl items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div className="flex-1 text-sm text-emerald-900">
              <p className="font-semibold">
                {suggested.openQuestions} detail
                {suggested.openQuestions !== 1 ? "s" : ""} still need your input
              </p>
              <p className="mt-0.5 text-emerald-700">
                Answer them one by one - type, tap Yes/No, or just speak your answer.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedId(suggested.id);
                setOpen(true);
              }}
              className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              Start
            </button>
            <button
              onClick={close}
              aria-label="Dismiss"
              className="shrink-0 rounded-lg p-1 text-emerald-500 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setSelectedId(suggested.id);
              setOpen(true);
            }}
            className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 hover:bg-emerald-700"
            aria-label="Open guided details"
          >
            <Sparkles className="h-4 w-4" />
            Complete details
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
              {suggested.openQuestions}
            </span>
          </button>
        </>
      ) : null}

      <GuidedDetailsWizard
        partId={selectedId}
        partName={selected ? selected.name : "Part"}
        open={open}
        onClose={close}
      />
    </>
  );
}
