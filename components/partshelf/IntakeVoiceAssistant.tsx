"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send, Sparkles, Volume2 } from "lucide-react";
import { PartRecord, mockAnalyzeEvidence } from "@/lib/partshelf";

interface SpeechAlternative {
  transcript: string;
}

interface SpeechResult {
  isFinal: boolean;
  0: SpeechAlternative;
}

interface SpeechEvent {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechResult };
}

interface BrowserRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

interface Props {
  photoCount: number;
  onFill: (patch: Partial<PartRecord>, transcript: string) => void;
}

function analyzeVoice(text: string, photoCount: number): Partial<PartRecord> {
  const result = mockAnalyzeEvidence(text, photoCount).record;
  const lower = text.toLowerCase();
  const patch: Partial<PartRecord> = { ...result };

  if (/tested and working|working|works|يعمل|شغال/.test(lower)) {
    patch.testingStatus = "Tested and working";
  } else if (/tested and faulty|faulty|not working|معطل|لا يعمل/.test(lower)) {
    patch.testingStatus = "Tested and faulty";
  } else if (/not tested|untested|غير مفحوص/.test(lower)) {
    patch.testingStatus = "Not tested";
  } else if (/not possible|cannot test|تعذر الفحص/.test(lower)) {
    patch.testingStatus = "Testing not possible";
  }

  if (/new|جديد/.test(lower)) patch.usedOrNew = "New";
  else if (/used|مستعمل/.test(lower)) patch.usedOrNew = "Used";
  else if (/unknown|غير معروف/.test(lower)) patch.usedOrNew = "Unknown";

  if (/left|يسار/.test(lower)) patch.side = "Left";
  else if (/right|يمين/.test(lower)) patch.side = "Right";

  const storage = text.match(/(?:shelf|location|رف|الموقع)\s*([\w-]+)/i);
  if (storage) patch.storageLocation = `Shelf ${storage[1]}`;

  const weight = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilograms?|كيلو)/i);
  if (weight) patch.weight = `${weight[1]} kg`;

  const packedSize = text.match(/(\d+\s*[x×]\s*\d+\s*[x×]\s*\d+\s*(?:cm)?)/i);
  if (packedSize) patch.packedSize = `${packedSize[1]} cm`;

  return patch;
}

export default function IntakeVoiceAssistant({ photoCount, onFill }: Props) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [message, setMessage] = useState(
    "Tell me about the part and I will fill the record. You can speak English or Arabic.",
  );
  const recognitionRef = useRef<BrowserRecognition | null>(null);
  const photoCountRef = useRef(photoCount);
  const onFillRef = useRef(onFill);

  useEffect(() => {
    photoCountRef.current = photoCount;
    onFillRef.current = onFill;
  }, [photoCount, onFill]);

  const fill = (transcript: string) => {
    if (!transcript.trim()) return;
    const patch = analyzeVoice(transcript, photoCountRef.current);
    onFillRef.current(patch, transcript);
    setMessage("I updated the fields I could confirm. Please review the colored fields before posting.");
  };

  useEffect(() => {
    const w = window as typeof window & {
      SpeechRecognition?: new () => BrowserRecognition;
      webkitSpeechRecognition?: new () => BrowserRecognition;
    };
    const API = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!API) return;

    const recognition = new API();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setText(transcript);
      fill(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setMessage("I could not hear that. You can type your answer instead.");
    };
    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // no active recognition
      }
    };
  // The recognition instance reads the current photo count from the latest callback action.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setMessage("Voice input is not available in this browser. Type your information below instead.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      return;
    }
    try {
      recognitionRef.current.start();
      setListening(true);
      setMessage("Listening… describe the part, condition, testing, location or measurements.");
    } catch {
      setMessage("Voice input is already active. Please finish your answer.");
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {open ? (
        <section className="w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-2xl">
          <header className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50 px-4 py-3">
            <div className="flex h-14 w-14 items-end justify-center overflow-hidden rounded-2xl bg-white">
              <img src="/assistant/clove-assistant-idle.png" alt="PartShelf AI assistant" className="h-20 w-16 object-contain object-bottom" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">PartShelf AI assistant</p>
              <p className="text-[11px] text-emerald-700">مساعد الذكاء الاصطناعي</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 text-xs font-medium text-slate-500 hover:bg-white">Close / إغلاق</button>
          </header>
          <div className="space-y-3 p-4">
            <p className="rounded-2xl rounded-tl-sm border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">{message}</p>
            <p className="text-xs text-slate-400">صف القطعة وحالتها وفحصها وموقعها أو القياسات. سأملأ النموذج من كلامك.</p>
            <div className="flex gap-2">
              <button onClick={toggleListening} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white ${listening ? "bg-red-500 hover:bg-red-600" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {listening ? "Stop / إيقاف" : "Speak / تحدث"}
              </button>
              <button onClick={() => window.speechSynthesis?.speak(new SpeechSynthesisUtterance(message))} className="rounded-xl border border-slate-200 px-3 text-slate-600 hover:bg-slate-50" aria-label="Read assistant message"><Volume2 className="h-4 w-4" /></button>
            </div>
            <div className="flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type instead / اكتب هنا" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
              <button onClick={() => fill(text)} disabled={!text.trim()} className="rounded-xl bg-slate-900 px-3 text-white disabled:opacity-40" aria-label="Analyze voice note"><Send className="h-4 w-4" /></button>
            </div>
          </div>
        </section>
      ) : (
        <button onClick={() => setOpen(true)} className="group relative flex h-60 w-40 items-end justify-center transition-transform hover:scale-105 sm:h-72 sm:w-48" aria-label="Open AI voice assistant">
          <img src="/assistant/clove-assistant-idle.png" alt="AI voice assistant" className="h-full w-full object-contain object-bottom drop-shadow-xl" />
          <span className="absolute bottom-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg"><Sparkles className="h-3.5 w-3.5" />AI voice / صوت AI</span>
        </button>
      )}
    </div>
  );
}
