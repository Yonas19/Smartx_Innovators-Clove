"use client";

import { motion } from "framer-motion";
import { ActionItem, PartRecord, validateField } from "@/lib/partshelf";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";

interface Props {
  items: ActionItem[];
  record: PartRecord;
  onToggle: (id: string) => void;
}

export default function ActionPlan({ items, record, onToggle }: Props) {
  const getStatus = (item: ActionItem) => {
    if (item.field && validateField(record, item.field) === "valid") {
      return "done";
    }
    return item.done ? "done" : "open";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-4 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-900">
          Prioritised action plan
        </h3>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          All checks passed. Ready to post.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const status = getStatus(item);
            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 transition-colors ${
                  status === "done"
                    ? "border-green-200 bg-green-50/50"
                    : item.priority === 1
                      ? "border-red-200 bg-red-50/40"
                      : item.priority === 2
                        ? "border-amber-200 bg-amber-50/30"
                        : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => onToggle(item.id)}
                    className="mt-0.5 shrink-0"
                  >
                    {status === "done" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-300" />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          item.priority === 1
                            ? "bg-red-100 text-red-700"
                            : item.priority === 2
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        P{item.priority}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          status === "done"
                            ? "text-green-700 line-through"
                            : "text-slate-900"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
