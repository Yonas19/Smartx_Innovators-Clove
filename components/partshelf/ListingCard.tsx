"use client";

import { motion } from "framer-motion";
import { PartRecord, validateRow } from "@/lib/partshelf";
import { CheckCircle2, AlertTriangle, Package } from "lucide-react";

interface Props {
  record: PartRecord;
  onPost: () => void;
}

export default function ListingCard({ record, onPost }: Props) {
  const status = validateRow(record);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900">
            Listing preview
          </h3>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            status === "valid"
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {status === "valid" ? "Ready to post" : "Needs attention"}
        </span>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="text-lg font-bold text-slate-900">
          {record.partType || "Part"} — {record.manufacturer || "Unknown"}{" "}
          {record.donorVehicle || ""}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {record.condition || "Condition not recorded"} ·{" "}
          {record.usedOrNew || "—"} · {record.side || "—"}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-slate-400">Part number</span>
            <p className="font-medium text-slate-700">
              {record.partNumber || "—"}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Storage</span>
            <p className="font-medium text-slate-700">
              {record.storageLocation || "—"}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Testing</span>
            <p className="font-medium text-slate-700">
              {record.testingStatus || "—"}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Package</span>
            <p className="font-medium text-slate-700">
              {record.packedSize || "—"} · {record.weight || "—"}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={onPost}
        className="mt-4 w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 active:scale-[0.98]"
      >
        Post the product / نشر المنتج
      </button>

      {status !== "valid" && (
        <div className="mt-3 flex items-start gap-2 text-xs text-amber-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Fix the red or yellow fields before posting to avoid misleading buyers.
        </div>
      )}
    </motion.div>
  );
}
