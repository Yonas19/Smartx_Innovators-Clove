"use client";

import { motion } from "framer-motion";
import {
  PartRecord,
  UsedOrNew,
  TestingStatus,
} from "@/lib/partshelf";
import { Sparkles, Info } from "lucide-react";

interface Props {
  record: PartRecord;
  summary: string;
  photos: { preview: string }[];
  onChange: (record: PartRecord) => void;
  onNext: () => void;
}

export default function QuestionsStep({
  record,
  summary,
  photos,
  onChange,
  onNext,
}: Props) {
  const update = (patch: Partial<PartRecord>) => {
    onChange({ ...record, ...patch });
  };

  const optionLabel: Record<string, string> = {
    Used: "Used / مستعمل",
    New: "New / جديد",
    Unknown: "Unknown / غير معروف",
    "Tested and working": "Tested and working / مفحوص ويعمل",
    "Tested and faulty": "Tested and faulty / مفحوص ومعطل",
    "Not tested": "Not tested / غير مفحوص",
    "Testing not possible": "Testing not possible / تعذر الفحص",
  };

  const questionCard = (
    number: number,
    title: string,
    description: string,
    required: boolean,
    children: React.ReactNode,
  ) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: number * 0.05 }}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-400">
        <span className="tabular-nums">{String(number).padStart(2, "0")}</span>
        <span>
          {title}
          {required && <span className="ml-1 text-red-500">*</span>}
        </span>
      </div>
      <p className="mb-4 text-sm text-slate-500">{description}</p>
      {children}
    </motion.div>
  );

  const chipButton = (
    value: string,
    current: string,
    setter: (v: string) => void,
  ) => (
    <button
      key={value}
      onClick={() => setter(value)}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
        current === value
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
      }`}
    >
      {optionLabel[value] || value}
    </button>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {questionCard(
          0,
          "What the photos show",
          "AI summary from the images and note. Appearance only — this is not a test result.",
          false,
          <div className="flex gap-3 rounded-xl bg-slate-50 p-4">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p className="text-sm leading-relaxed text-slate-700">{summary}</p>
          </div>,
        )}

        {questionCard(
          1,
          "Is this part used or new?",
          "State what you can verify. Unknown is a real answer.",
          true,
          <div className="flex flex-wrap gap-2">
            {(["Used", "New", "Unknown"] as UsedOrNew[]).map((opt) =>
              chipButton(opt, record.usedOrNew, (v) =>
                update({ usedOrNew: v as UsedOrNew }),
              ),
            )}
          </div>,
        )}

        {questionCard(
          2,
          "Defects and damage",
          "Cracks, wear, corrosion, missing tabs or broken clips. Write \"None visible\" if nothing is obvious — that still is not a test result.",
          true,
          <textarea
            value={record.defects}
            onChange={(e) => update({ defects: e.target.value })}
            placeholder="Type what you can confirm"
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />,
        )}

        {questionCard(
          3,
          "Testing status",
          "Only choose \"Tested and working\" if the part was actually run on a bench or in a vehicle. Looking undamaged does not count.",
          true,
          <div className="flex flex-wrap gap-2">
            {(
              [
                "Tested and working",
                "Tested and faulty",
                "Not tested",
                "Testing not possible",
              ] as TestingStatus[]
            ).map((opt) =>
              chipButton(opt, record.testingStatus, (v) =>
                update({ testingStatus: v as TestingStatus }),
              ),
            )}
          </div>,
        )}

        {questionCard(
          4,
          "Condition grade",
          "How it presents, in your words — e.g. \"Good, light scuffs\" or \"Fair, heavy surface wear\".",
          true,
          <textarea
            value={record.condition}
            onChange={(e) => update({ condition: e.target.value })}
            placeholder="Type what you can confirm"
            rows={2}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />,
        )}

        {questionCard(
          5,
          "Identifiers and part numbers",
          "Every number, casting code, label or sticker you can read on the part.",
          true,
          <textarea
            value={record.identifiers}
            onChange={(e) => update({ identifiers: e.target.value })}
            placeholder="Type what you can confirm"
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />,
        )}

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onNext}
          className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Continue to table entry
        </motion.button>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Photos
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {photos.map((p, i) => (
              <img
                key={i}
                src={p.preview}
                alt={`Photo ${i + 1}`}
                className="aspect-square rounded-xl object-cover"
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Required answers are marked with a dot. If you cannot confirm
            something, say so — &quot;Unknown&quot; is a valid answer.
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          When a part type normally requires a VIN or OEM, you will be asked for
          it on the next screen.
        </div>
      </div>
    </div>
  );
}
