"use client";

import { Step } from "@/lib/partshelf";

interface Props {
  step: Step;
}

const STEPS: { id: Step; label: string }[] = [
  { id: "photos", label: "PHOTOS / صور" },
  { id: "questions", label: "QUESTIONS / أسئلة" },
  { id: "table", label: "TABLE / جدول" },
];

export default function Stepper({ step }: Props) {
  const index = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="flex items-center justify-center gap-4 text-xs font-semibold tracking-wider text-slate-400">
      {STEPS.map((s, i) => {
        const active = i === index;
        const done = i < index;
        return (
          <div key={s.id} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                  active || done
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 text-slate-400"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={active || done ? "text-slate-900" : "text-slate-400"}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className="text-slate-300">—</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
