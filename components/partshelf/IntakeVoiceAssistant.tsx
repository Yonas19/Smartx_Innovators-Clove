"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Mic, MicOff, Volume2 } from "lucide-react";
import { PartRecord } from "@/lib/partshelf";

interface SpeechAlternative { transcript: string; }
interface SpeechResult { isFinal: boolean; 0: SpeechAlternative; }
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

interface VoiceQuestion {
  key: keyof PartRecord;
  title: string;
  arabic: string;
  prompt: string;
  placeholder: string;
  choices?: string[];
}

const QUESTIONS: VoiceQuestion[] = [
  { key: "partType", title: "What type of part is this?", arabic: "ما نوع هذه القطعة؟", prompt: "What type of automotive part is this?", placeholder: "e.g. side mirror / مرآة جانبية" },
  { key: "manufacturer", title: "Who is the manufacturer?", arabic: "ما هي الشركة المصنعة؟", prompt: "What is the manufacturer or vehicle make?", placeholder: "e.g. Toyota / تويوتا" },
  { key: "partNumber", title: "What is the part number?", arabic: "ما هو رقم القطعة؟", prompt: "Please read the part number from the label or casting, if available.", placeholder: "e.g. 81110-06B20" },
  { key: "donorVehicle", title: "What is the donor vehicle?", arabic: "ما هي مركبة التبرع؟", prompt: "What year, make and model did this part come from?", placeholder: "e.g. 2017 Toyota Corolla" },
  { key: "usedOrNew", title: "Is it used, new, or unknown?", arabic: "هل هي مستعملة أم جديدة أم غير معروفة؟", prompt: "Is the part used, new, or unknown?", placeholder: "Used / New / Unknown", choices: ["Used", "New", "Unknown"] },
  { key: "defects", title: "What defects or damage can you confirm?", arabic: "ما العيوب أو الأضرار التي يمكنك تأكيدها؟", prompt: "Describe cracks, wear, corrosion, missing tabs or broken clips. Say none visible only if you inspected it.", placeholder: "e.g. Light surface scratches / خدوش خفيفة" },
  { key: "testingStatus", title: "What is the testing status?", arabic: "ما هي حالة الفحص؟", prompt: "Was it tested and working, tested and faulty, not tested, or testing not possible? Do not say working only because it looks undamaged.", placeholder: "Choose testing status", choices: ["Tested and working", "Tested and faulty", "Not tested", "Testing not possible"] },
  { key: "side", title: "Is it left or right?", arabic: "هل هي يسار أم يمين؟", prompt: "Is this part for the left side or the right side?", placeholder: "Left / Right", choices: ["Left", "Right"] },
  { key: "storageLocation", title: "Where is it stored?", arabic: "أين تم تخزينها؟", prompt: "What is the storage location or shelf?", placeholder: "e.g. Shelf A-12 / الرف A-12" },
  { key: "packedSize", title: "What is the packed size?", arabic: "ما هو حجم التغليف؟", prompt: "What are the packed dimensions? You can answer later if they are not available.", placeholder: "e.g. 40 × 25 × 20 cm" },
  { key: "weight", title: "What is the packed weight?", arabic: "ما هو وزن التغليف؟", prompt: "What is the packed weight? You can answer later if it is not available.", placeholder: "e.g. 2.4 kg" },
];

function normaliseAnswer(key: keyof PartRecord, value: string): string {
  const input = value.trim();
  const lower = input.toLowerCase();
  if (key === "usedOrNew") {
    if (/new|جديد/.test(lower)) return "New";
    if (/unknown|غير معروف/.test(lower)) return "Unknown";
    if (/used|مستعمل/.test(lower)) return "Used";
  }
  if (key === "testingStatus") {
    if (/faulty|not working|معطل|لا يعمل/.test(lower)) return "Tested and faulty";
    if (/not tested|untested|غير مفحوص/.test(lower)) return "Not tested";
    if (/not possible|cannot test|تعذر الفحص/.test(lower)) return "Testing not possible";
    if (/working|works|يعمل|شغال/.test(lower)) return "Tested and working";
  }
  if (key === "side") {
    if (/left|يسار/.test(lower)) return "Left";
    if (/right|يمين/.test(lower)) return "Right";
  }
  return input;
}

interface Props {
  record: PartRecord;
  onAnswer: (patch: Partial<PartRecord>, transcript: string) => void;
}

export default function IntakeVoiceAssistant({ record, onAnswer }: Props) {
  const [index, setIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [answer, setAnswer] = useState("");
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [notice, setNotice] = useState("I will ask one question at a time and fill your record as you answer.");
  const [frameIndex, setFrameIndex] = useState(0);
  const recognitionRef = useRef<BrowserRecognition | null>(null);
  const answerRef = useRef("");
  const recordRef = useRef(record);
  recordRef.current = record;
  const current = QUESTIONS[index];
  const talkingFrames = Array.from({ length: 50 }, (_, frame) => `/assistant/talking-frames-transparent/ezgif-frame-${String(frame + 1).padStart(3, "0")}.png`);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = /[\u0600-\u06FF]/.test(text) ? "ar-SA" : "en-US";
    utterance.rate = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const readQuestion = useCallback(() => {
    const question = QUESTIONS[index];
    if (!question) return;
    speak(language === "ar" ? question.arabic : question.prompt);
  }, [index, language, speak]);

  useEffect(() => {
    setAnswer(recordRef.current[current.key] || "");
    setNotice("Answer by voice, choose an option, or type your answer. I will save it in the correct field.");
    const timer = window.setTimeout(readQuestion, 350);
    return () => window.clearTimeout(timer);
  }, [current.key, index, readQuestion]);

  useEffect(() => {
    if (!speaking) {
      setFrameIndex(0);
      return;
    }
    const timer = window.setInterval(() => setFrameIndex((frame) => (frame + 1) % talkingFrames.length), 85);
    return () => window.clearInterval(timer);
  }, [speaking, talkingFrames.length]);

  const saveAnswer = useCallback((raw = answerRef.current) => {
    const value = normaliseAnswer(current.key, raw);
    if (!value) {
      setNotice("Please say, select, or type an answer before continuing.");
      return false;
    }
    const patch: Partial<PartRecord> = {
      [current.key]: value,
      source: "Voice answer / إجابة صوتية",
      sourceTooltip: `Voice assistant — ${current.title}: ${value}`,
    };
    onAnswer(patch, raw);
    setNotice("Saved. I have updated your record.");
    return true;
  }, [current.key, current.title, onAnswer]);

  const next = () => {
    if (!saveAnswer(answer)) return;
    if (index < QUESTIONS.length - 1) setIndex((step) => step + 1);
    else {
      setNotice("All guided questions are complete. Review the color-coded table and add any remaining identifiers or components.");
      speak("All guided questions are complete. Please review the table.");
    }
  };

  const previous = () => {
    if (index > 0) setIndex((step) => step - 1);
  };

  const startListening = () => {
    const w = window as typeof window & { SpeechRecognition?: new () => BrowserRecognition; webkitSpeechRecognition?: new () => BrowserRecognition; };
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) {
      setNotice("Voice input is not supported in this browser. Please type or choose an answer.");
      return;
    }
    try {
      const recognition = new Recognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language === "ar" ? "ar-SA" : "en-US";
      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) transcript += event.results[i][0]?.transcript || "";
        setAnswer(transcript);
        answerRef.current = transcript;
      };
      recognition.onerror = () => {
        setListening(false);
        setNotice("I could not hear that. Please try again or type your answer.");
      };
      recognition.onend = () => {
        setListening(false);
        if (answerRef.current.trim()) {
          saveAnswer(answerRef.current);
          setNotice("Voice answer captured. Tap next for my next question.");
        }
      };
      recognitionRef.current = recognition;
      answerRef.current = "";
      recognition.start();
      setListening(true);
      setNotice("Listening… answer the current question.");
    } catch {
      setNotice("Microphone is already active. Finish your answer first.");
    }
  };

  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  };

  return (
    <aside className="fixed bottom-3 right-3 z-[60] flex max-w-[calc(100vw-1.5rem)] items-end gap-2 sm:bottom-5 sm:right-6">
      <div className="w-[min(360px,calc(100vw-7.5rem))] rounded-2xl bg-white/95 p-3 backdrop-blur-sm sm:w-[360px]">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Clove voice guide · المساعد الصوتي</p>
            <h2 className="mt-1 text-sm font-bold text-slate-900">{index + 1}. {current.title}</h2>
            <p className="text-xs text-slate-500">{current.arabic}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setLanguage("en")} className={`rounded-md px-1.5 py-1 text-[10px] font-bold ${language === "en" ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>EN</button>
            <button onClick={() => setLanguage("ar")} className={`rounded-md px-1.5 py-1 text-[10px] font-bold ${language === "ar" ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>ع</button>
            <button onClick={readQuestion} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50" aria-label="Repeat question"><Volume2 className={`h-4 w-4 ${speaking ? "animate-pulse" : ""}`} /></button>
          </div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">{notice}</p>
        {current.choices ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {current.choices.map((choice) => <button key={choice} onClick={() => { setAnswer(choice); answerRef.current = choice; onAnswer({ [current.key]: choice } as Partial<PartRecord>, choice); }} className={`rounded-full border px-2.5 py-1.5 text-xs font-semibold ${answer === choice ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 text-slate-600 hover:border-emerald-300"}`}>{choice}</button>)}
          </div>
        ) : (
          <input value={answer} onChange={(event) => { setAnswer(event.target.value); answerRef.current = event.target.value; }} placeholder={current.placeholder} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
        )}
        <div className="mt-3 flex items-center gap-2">
          <button onClick={listening ? stopListening : startListening} className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-white ${listening ? "bg-red-500" : "bg-emerald-600 hover:bg-emerald-700"}`}>{listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}{listening ? "Stop / إيقاف" : "Answer by voice / أجب صوتياً"}</button>
          <button onClick={previous} disabled={index === 0} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 disabled:opacity-30" aria-label="Previous question"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={next} className="rounded-xl bg-slate-900 p-2.5 text-white" aria-label="Save answer and continue">{index === QUESTIONS.length - 1 ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>
        </div>
      </div>
      <button type="button" onClick={readQuestion} className="group relative flex h-40 w-28 shrink-0 items-end justify-center transition-transform hover:scale-105 sm:h-56 sm:w-40" aria-label="Clove repeats the current question">
        <img src={speaking ? talkingFrames[frameIndex] : "/assistant/clove-assistant-idle.png"} alt="Clove AI voice assistant" className={`h-full w-full object-contain object-bottom drop-shadow-xl ${speaking ? "scale-[1.04]" : ""}`} />
        <span className="absolute bottom-1 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white shadow-lg"><Volume2 className={`h-3 w-3 ${speaking ? "animate-pulse" : ""}`} />{speaking ? "Clove talks" : "Tap Clove"}</span>
      </button>
    </aside>
  );
}
