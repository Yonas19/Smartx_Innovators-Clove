"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Volume2,
  X,
  Check,
  Loader2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

/* --- Minimal typings for the Web Speech API (no extra dependencies) --- */

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

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

/* --- Data shapes --- */

interface GuideCandidate {
  value: string;
  sourceId?: string;
  label: string;
  unverified: boolean;
}

interface GuideQuestion {
  id: string;
  attribute: string;
  impact: "conflict" | "missing_required" | "uncertain";
  title: string;
  whyItMatters: string;
  howToCheck: string;
  candidates: GuideCandidate[];
  conflictingSources: string[];
  spokenPrompt: string;
}

interface GuidePayload {
  partId: string;
  partName: string;
  questions: GuideQuestion[];
  readiness: { status: string; nextActions: string[] };
}

const IMPACT_LABEL: Record<GuideQuestion["impact"], string> = {
  conflict: "Conflict",
  missing_required: "Missing detail",
  uncertain: "Uncertain",
};

const IMPACT_CLASS: Record<GuideQuestion["impact"], string> = {
  conflict: "bg-red-100 text-red-700",
  missing_required: "bg-amber-100 text-amber-700",
  uncertain: "bg-sky-100 text-sky-700",
};

function humanize(attribute: string): string {
  return attribute
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

export default function GuidedDetailsWizard({
  partId,
  partName,
  open,
  onClose,
}: {
  partId: string | null;
  partName: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<GuideQuestion[]>([]);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"questions" | "review">("questions");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [candidatePicks, setCandidatePicks] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const openedForRef = useRef<string | null>(null);

  const current = questions[step] ?? null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setVoiceAvailable(Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition));
  }, []);

  /* --- Speech synthesis (read the guide aloud) --- */

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !text) return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    try {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      synth.speak(utterance);
    } catch {
      setSpeaking(false);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
    setSpeaking(false);
  }, []);

  /* --- Speech recognition (capture the seller's answer) --- */

  const startListening = useCallback(() => {
    if (typeof window === "undefined" || !current) return;

    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) {
      setError(
        "Voice input is not supported in this browser. Please type your answer instead.",
      );
      return;
    }

    try {
      const recognition = new Recognition();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result && result[0]) transcript += result[0].transcript;
        }
        const text = transcript.trim();
        if (text) {
          setAnswers((prev) => ({ ...prev, [current.attribute]: text }));
          setCandidatePicks((prev) => ({ ...prev, [current.attribute]: false }));
        }
      };

      recognition.onerror = (event) => {
        setListening(false);
        if (event.error !== "aborted" && event.error !== "no-speech") {
          setError(`Voice input failed (${event.error}). You can type your answer.`);
        }
      };

      recognition.onend = () => setListening(false);

      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
      setError(null);
    } catch {
      setListening(false);
      setError("Could not start the microphone. Please type your answer instead.");
    }
  }, [current]);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  /* --- Load the guide when the wizard opens --- */

  useEffect(() => {
    if (!open || !partId) return;
    if (openedForRef.current === partId && questions.length > 0) return;

    let cancelled = false;
    openedForRef.current = partId;

    (async () => {
      setLoading(true);
      setError(null);
      setPhase("questions");
      setStep(0);
      setAnswers({});
      setCandidatePicks({});

      try {
        const res = await fetch(`/api/parts/${partId}/guide`, { cache: "no-store" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Could not load the guided checklist");
        }
        const data = (await res.json()) as GuidePayload;
        if (cancelled) return;
        setQuestions(data.questions ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load the guided checklist",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, partId, questions.length]);

  /* --- Read the current question aloud whenever it changes --- */

  useEffect(() => {
    if (!open || phase !== "questions" || !current) return;
    const timer = window.setTimeout(() => speak(current.spokenPrompt), 350);
    return () => window.clearTimeout(timer);
  }, [open, phase, current, speak]);

  /* --- Cleanup on unmount --- */

  useEffect(() => {
    return () => {
      stopSpeaking();
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, [stopSpeaking]);

  /* --- Save one answer --- */

  const saveAnswer = useCallback(
    async (question: GuideQuestion, answer: string) => {
      const res = await fetch(`/api/parts/${partId}/decisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attribute: question.attribute,
          answer,
          answerType: candidatePicks[question.attribute] ? "candidate" : "free_entry",
          questionId: question.id,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not save the answer");
      }
    },
    [partId, candidatePicks],
  );

  const goToReview = useCallback(async () => {
    setPhase("review");
    setError(null);
    try {
      const res = await fetch(`/api/parts/${partId}/speech`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, partName }),
      });
      const body = await res.json().catch(() => ({}));
      const text = typeof body.text === "string" ? body.text : "";
      if (text) window.setTimeout(() => speak(text), 400);
    } catch {
      /* the on-screen list is the source of truth */
    }
  }, [answers, partId, partName, speak]);

  const handleNext = useCallback(async () => {
    if (!current) return;

    const answer = (answers[current.attribute] ?? "").trim();
    if (!answer) {
      setError("Choose Yes or No, pick a value, or type your answer first.");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      await saveAnswer(current, answer);

      if (step < questions.length - 1) {
        setStep((s) => s + 1);
      } else {
        await goToReview();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the answer");
    } finally {
      setSaving(false);
    }
  }, [answers, current, goToReview, questions.length, saveAnswer, step]);

  const handleConfirm = useCallback(
    async (correct: boolean) => {
      if (!correct) {
        setPhase("questions");
        setStep(0);
        setError(null);
        return;
      }

      setSaving(true);
      try {
        await fetch(`/api/parts/${partId}/decisions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attribute: "sellerConfirmation",
            answer: "confirmed",
            answerType: "free_entry",
          }),
        });
      } catch {
        /* confirmation is advisory - do not block the flow */
      } finally {
        setSaving(false);
        stopSpeaking();
        router.refresh();
        onClose();
      }
    },
    [onClose, partId, router, stopSpeaking],
  );

  const answeredList = useMemo(
    () =>
      questions
        .map((q) => ({ question: q, value: answers[q.attribute] }))
        .filter((row) => Boolean(row.value)),
    [answers, questions],
  );

  const progress = questions.length > 0 ? ((step + 1) / questions.length) * 100 : 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              Guided details
            </p>
            <h2 className="truncate text-lg font-semibold text-slate-900">{partName}</h2>
            {phase === "questions" && questions.length > 0 && (
              <p className="mt-0.5 text-xs text-slate-500">
                Question {step + 1} of {questions.length}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        {phase === "questions" && questions.length > 0 && (
          <div className="h-1 w-full bg-slate-100">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading your checklist...</span>
            </div>
          )}

          {!loading && error && !current && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div className="text-sm text-red-800">
                <p className="font-medium">Something went wrong</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && questions.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-7 w-7 text-emerald-600" />
              </div>
              <p className="text-base font-semibold text-slate-900">
                Everything is already complete
              </p>
              <p className="max-w-sm text-sm text-slate-500">
                There are no missing details or conflicts for this part. You can close
                this and approve the listing draft.
              </p>
            </div>
          )}

          {!loading && current && phase === "questions" && (
            <div>
              <div className="flex items-start gap-2">
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${IMPACT_CLASS[current.impact]}`}
                >
                  {IMPACT_LABEL[current.impact]}
                </span>
                <h3 className="text-base font-semibold leading-snug text-slate-900">
                  {current.title}
                </h3>
              </div>

              {current.whyItMatters && (
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {current.whyItMatters}
                </p>
              )}

              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  How to check
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">
                  {current.howToCheck}
                </p>
              </div>

              {current.candidates.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pick a value
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {current.candidates.map((candidate) => {
                      const selected = answers[current.attribute] === candidate.value;
                      return (
                        <button
                          key={`${current.attribute}-${candidate.value}`}
                          onClick={() => {
                            setAnswers((prev) => ({
                              ...prev,
                              [current.attribute]: candidate.value,
                            }));
                            setCandidatePicks((prev) => ({
                              ...prev,
                              [current.attribute]: true,
                            }));
                            setError(null);
                          }}
                          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                            selected
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100"
                              : "border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50"
                          }`}
                        >
                          {candidate.label}
                          {candidate.unverified && (
                            <span className="ml-1.5 text-[11px] text-amber-600">
                              unverified
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Quick answer
                </p>
                <div className="mt-2 flex gap-2">
                  {[
                    { label: "Yes", value: "yes" },
                    { label: "No", value: "no" },
                  ].map((option) => {
                    const selected = answers[current.attribute] === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          setAnswers((prev) => ({
                            ...prev,
                            [current.attribute]: option.value,
                          }));
                          setCandidatePicks((prev) => ({
                            ...prev,
                            [current.attribute]: false,
                          }));
                          setError(null);
                        }}
                        className={`min-w-[92px] rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${
                          selected
                            ? "border-indigo-500 bg-indigo-600 text-white shadow-sm"
                            : "border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="guide-answer"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Or type / speak your answer
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    id="guide-answer"
                    type="text"
                    value={answers[current.attribute] ?? ""}
                    onChange={(event) => {
                      setAnswers((prev) => ({
                        ...prev,
                        [current.attribute]: event.target.value,
                      }));
                      setCandidatePicks((prev) => ({
                        ...prev,
                        [current.attribute]: false,
                      }));
                      setError(null);
                    }}
                    placeholder="e.g. 87910-42020"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    onClick={listening ? stopListening : startListening}
                    disabled={!voiceAvailable}
                    title={
                      !voiceAvailable
                        ? "Voice input requires Chrome or Edge with microphone permission"
                        : listening
                          ? "Stop listening"
                          : "Speak your answer"
                    }
                    aria-label={listening ? "Stop listening" : "Speak your answer"}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                      listening
                        ? "animate-pulse bg-red-500 text-white"
                        : "border border-slate-300 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-600"
                    }`}
                  >
                    {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => speak(current.spokenPrompt)}
                    title="Read the question aloud"
                    aria-label="Read the question aloud"
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-all ${
                      speaking
                        ? "border-indigo-400 bg-indigo-50 text-indigo-600"
                        : "border-slate-300 bg-white text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
                    }`}
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
                {listening && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">
                    Listening... say your answer out loud.
                  </p>
                )}
                {!voiceAvailable && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Voice input is available in Chrome or Edge after allowing microphone access.
                  </p>
                )}
              </div>

              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p className="text-xs text-amber-800">{error}</p>
                </div>
              )}
            </div>
          )}

          {!loading && phase === "review" && (
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Let&apos;s confirm everything is correct
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Here is everything you told us. I read it back so you can double check
                it.
              </p>

              <div className="mt-4 space-y-2">
                {answeredList.map((row) => (
                  <div
                    key={row.question.attribute}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {humanize(row.question.attribute)}
                    </span>
                    <span className="text-right text-sm font-medium text-slate-900">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  const text = `Here is a summary of the details for ${partName}. ${answeredList
                    .map((row) => `${humanize(row.question.attribute)} is ${row.value}`)
                    .join(". ")}. Is everything correct?`;
                  speak(text);
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
              >
                <Volume2 className="h-4 w-4" />
                {speaking ? "Reading..." : "Read it back to me"}
              </button>

              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p className="text-xs text-amber-800">{error}</p>
                </div>
              )}

              <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Is everything correct?
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => handleConfirm(true)}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Yes, it&apos;s correct
                </button>
                <button
                  onClick={() => handleConfirm(false)}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"
                >
                  <RotateCcw className="h-4 w-4" />
                  No, let me change something
                </button>
              </div>
            </div>
          )}
        </div>

        {phase === "questions" && current && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
            <button
              onClick={() => {
                setStep((s) => Math.max(0, s - 1));
                setError(null);
              }}
              disabled={step === 0 || saving}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>

            <button
              onClick={handleNext}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {step < questions.length - 1 ? "Next" : "Review answers"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
