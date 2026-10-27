"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/partshelf/Header";
import Stepper from "@/components/partshelf/Stepper";
import PhotoStep, { PhotoFile } from "@/components/partshelf/PhotoStep";
import QuestionsStep from "@/components/partshelf/QuestionsStep";
import TableStep from "@/components/partshelf/TableStep";
import DefectsWidget from "@/components/partshelf/DefectsWidget";
import ActionPlan from "@/components/partshelf/ActionPlan";
import ListingCard from "@/components/partshelf/ListingCard";
import Confetti from "@/components/partshelf/Confetti";
import IntakeVoiceAssistant from "@/components/partshelf/IntakeVoiceAssistant";
import {
  PartRecord,
  Step,
  defaultPartRecord,
  mockAnalyzeEvidence,
  buildActionPlan,
  STORAGE_KEY,
  ActionItem,
  PostedProduct,
  savePostedProduct,
  newPartId,
} from "@/lib/partshelf";

interface DefectItem {
  id: string;
  component: string;
  defect: string;
  testingStatus: string;
}

interface SavedDraft {
  step: Step;
  record: PartRecord;
  summary: string;
  note: string;
  defects: DefectItem[];
  actionPlan: ActionItem[];
  photoKeys: string[];
}

export default function IntakePage() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("photos");
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [note, setNote] = useState("");
  const [record, setRecord] = useState<PartRecord>(defaultPartRecord());
  const [summary, setSummary] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defects, setDefects] = useState<DefectItem[]>([]);
  const [actionPlan, setActionPlan] = useState<ActionItem[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasPosted, setHasPosted] = useState(false);

  // Load saved draft from localStorage on mount.
  useEffect(() => {
    setMounted(true);
    if (searchParams.get("new") === "1") {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const draft: SavedDraft = JSON.parse(raw);
        setStep(draft.step);
        setRecord(draft.record);
        setSummary(draft.summary || "");
        setNote(draft.note || "");
        setDefects(draft.defects || []);
        setActionPlan(draft.actionPlan || []);
      }
    } catch {
      // ignore corrupt storage
    }
  }, [searchParams]);

  // Persist draft on every meaningful change.
  useEffect(() => {
    if (!mounted) return;
    const draft: SavedDraft = {
      step,
      record,
      summary,
      note,
      defects,
      actionPlan,
      photoKeys: photos.map((p) => p.id),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [mounted, step, record, summary, note, defects, actionPlan, photos]);

  // Recompute action plan when record changes.
  useEffect(() => {
    const next = buildActionPlan(record);
    setActionPlan((prev) =>
      next.map((item) => {
        const existing = prev.find((p) => p.id === item.id);
        return existing ? { ...item, done: existing.done } : item;
      }),
    );
  }, [record]);

  const handleAnalyze = useCallback(() => {
    if (photos.length === 0) return;
    setError(null);
    setIsAnalyzing(true);

    setTimeout(() => {
      const result = mockAnalyzeEvidence(note, photos.length);
      const id = newPartId();
      const merged: PartRecord = {
        ...defaultPartRecord(id),
        ...result.record,
        // Keep seller-entered note as the source tooltip.
        sourceTooltip:
          note.trim() || result.record.sourceTooltip || "Uploaded photos",
      };
      setRecord(merged);
      setSummary(result.summary);
      setIsAnalyzing(false);
      setStep("questions");
    }, 1200);
  }, [note, photos.length]);

  const handleRecordChange = (next: PartRecord) => {
    setRecord((prev) => {
      const base = next;
      // Keep defects text in sync with the defects widget.
      const defectText = defects
        .filter((d) => d.component || d.defect)
        .map(
          (d) =>
            `${d.component}: ${d.defect} (${d.testingStatus || "no test status"})`,
        )
        .join("; ");
      return defectText ? { ...base, defects: defectText } : base;
    });
  };

  const handleDefectsChange = (items: DefectItem[]) => {
    setDefects(items);
    const defectText = items
      .filter((d) => d.component || d.defect)
      .map((d) => `${d.component}: ${d.defect} (${d.testingStatus || "no test status"})`)
      .join("; ");
    setRecord((prev) => ({ ...prev, defects: defectText }));
  };

  const toggleActionItem = (id: string) => {
    setActionPlan((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    );
  };

  const handleVoiceFill = (patch: Partial<PartRecord>, transcript: string) => {
    setRecord((current) => ({
      ...current,
      ...patch,
      source: "Voice, image, donor note",
      sourceTooltip: `Voice input: ${transcript}`,
    }));
    if (step === "photos") setStep("questions");
  };

  const handlePost = () => {
    const productId = record.id || newPartId();
    const product: PostedProduct = {
      id: productId,
      record: { ...record, id: productId },
      defects,
      postedAt: new Date().toISOString(),
      status: "Posted",
    };
    savePostedProduct(product);
    localStorage.removeItem(STORAGE_KEY);
    setHasPosted(true);
    setShowConfetti(true);
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header active="intake" />

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <div className="mb-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight text-slate-900"
          >
            Log a part properly the first time. / سجّل القطعة بشكل صحيح من المرة الأولى.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mx-auto mt-2 max-w-xl text-sm text-slate-500"
          >
            Photograph the part. The assistant reads what is visible, asks the
            questions an honest listing needs, and turns your answers into one
            clean inventory row. / صف مخزون واضح.
          </motion.p>
        </div>

        <div className="mb-10">
          <Stepper step={step} />
        </div>

        <AnimatePresence mode="wait">
          {step === "photos" && (
            <motion.div
              key="photos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <PhotoStep
                photos={photos}
                note={note}
                onPhotosChange={setPhotos}
                onNoteChange={setNote}
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
                error={error}
              />
            </motion.div>
          )}

          {step === "questions" && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <QuestionsStep
                record={record}
                summary={summary}
                photos={photos}
                onChange={handleRecordChange}
                onNext={() => setStep("table")}
              />
            </motion.div>
          )}

          {step === "table" && (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <TableStep record={record} onChange={handleRecordChange} />

              <DefectsWidget items={defects} onChange={handleDefectsChange} />

              <div className="grid gap-6 lg:grid-cols-2">
                <ActionPlan
                  items={actionPlan}
                  record={record}
                  onToggle={toggleActionItem}
                />
                <div className="space-y-3">
                  <ListingCard record={record} onPost={handlePost} />
                  {hasPosted && (
                    <div className="flex flex-col gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 sm:flex-row">
                      <a href="/intake?new=1" className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-slate-800">Add another product / إضافة منتج</a>
                      <a href="/dashboard" className="flex-1 rounded-xl border border-green-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-green-700 hover:bg-green-100">Open inventory / فتح المخزون</a>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <IntakeVoiceAssistant
        record={record}
        onAnswer={handleVoiceFill}
      />

      <Confetti
        active={showConfetti}
        onDone={() => setShowConfetti(false)}
      />
    </div>
  );
}
