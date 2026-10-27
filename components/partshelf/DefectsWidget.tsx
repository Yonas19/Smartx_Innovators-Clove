"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Trash2, Plus, AlertTriangle } from "lucide-react";

/* --- Minimal Web Speech API typings (matches GuidedDetailsWizard) --- */
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}

interface DefectSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

interface DefectItem {
  id: string;
  component: string;
  defect: string;
  testingStatus: string;
}

interface Props {
  items: DefectItem[];
  onChange: (items: DefectItem[]) => void;
}

export default function DefectsWidget({ items, onChange }: Props) {
  const [listeningFor, setListeningFor] = useState<string | null>(null);
  const recognitionRef = useRef<DefectSpeechRecognition | null>(null);
  const listeningIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as typeof window & {
      SpeechRecognition?: new () => DefectSpeechRecognition;
      webkitSpeechRecognition?: new () => DefectSpeechRecognition;
    };
    const SpeechRecognitionAPI =
      w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const rec = new SpeechRecognitionAPI();
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (event: SpeechRecognitionEventLike) => {
      const text = event.results[0][0].transcript;
      if (listeningIdRef.current) {
        updateItem(listeningIdRef.current, { defect: text });
      }
      setListeningFor(null);
      listeningIdRef.current = null;
    };
    rec.onerror = () => {
      setListeningFor(null);
      listeningIdRef.current = null;
    };
    rec.onend = () => {
      setListeningFor(null);
      listeningIdRef.current = null;
    };
    recognitionRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  const startListening = (id: string) => {
    if (!recognitionRef.current) return;
    listeningIdRef.current = id;
    setListeningFor(id);
    try {
      recognitionRef.current.start();
    } catch {
      // already started
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setListeningFor(null);
    listeningIdRef.current = null;
  };

  const addItem = () => {
    onChange([
      ...items,
      {
        id: `defect-${Date.now()}`,
        component: "",
        defect: "",
        testingStatus: "",
      },
    ]);
  };

  const removeItem = (id: string) => {
    onChange(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, patch: Partial<DefectItem>) => {
    onChange(
      items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-slate-900">Defects</h3>
        </div>
        <button
          onClick={addItem}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <Plus className="h-3 w-3" />
          Add item
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-slate-400">
            No defects recorded. Add one or state &quot;None visible&quot; above.
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_140px_auto]"
          >
            <input
              type="text"
              value={item.component}
              onChange={(e) =>
                updateItem(item.id, { component: e.target.value })
              }
              placeholder="Component"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
            <div className="relative">
              <input
                type="text"
                value={item.defect}
                onChange={(e) =>
                  updateItem(item.id, { defect: e.target.value })
                }
                placeholder="Defect description"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-9 text-sm outline-none focus:border-slate-400"
              />
              <button
                onClick={() =>
                  listeningFor === item.id
                    ? stopListening()
                    : startListening(item.id)
                }
                className={`absolute right-2 top-1/2 -translate-y-1/2 ${
                  listeningFor === item.id ? "text-red-500" : "text-slate-400"
                }`}
                title="Fill with voice"
              >
                {listeningFor === item.id ? (
                  <MicOff className="h-3.5 w-3.5" />
                ) : (
                  <Mic className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <select
              value={item.testingStatus}
              onChange={(e) =>
                updateItem(item.id, { testingStatus: e.target.value })
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="">Testing status / حالة الفحص</option>
              <option value="Tested and working">Tested and working / مفحوص ويعمل</option>
              <option value="Tested and faulty">Tested and faulty / مفحوص ومعطل</option>
              <option value="Not tested">Not tested / غير مفحوص</option>
              <option value="Testing not possible">Testing not possible / تعذر الفحص</option>
            </select>
            <button
              onClick={() => removeItem(item.id)}
              className="flex h-9 w-9 items-center justify-center self-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
