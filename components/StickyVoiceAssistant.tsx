"use client";

import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";

export default function StickyVoiceAssistant({
  speaking,
  onReplay,
}: {
  speaking: boolean;
  onReplay: () => void;
}) {
  const [frame, setFrame] = useState(false);

  useEffect(() => {
    if (!speaking) {
      setFrame(false);
      return;
    }

    const timer = window.setInterval(() => setFrame((value) => !value), 220);
    return () => window.clearInterval(timer);
  }, [speaking]);

  return (
    <aside className="fixed bottom-3 right-3 z-[60] flex items-end gap-2 sm:bottom-5 sm:right-6">
      <div className="hidden max-w-[160px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-lg sm:block">
        <p className="font-semibold text-emerald-700">
          {speaking ? "Clove is speaking..." : "Your voice guide"}
        </p>
        <p className="mt-0.5">Tap Clove to repeat the question.</p>
      </div>

      <button
        type="button"
        onClick={onReplay}
        className="group relative flex h-52 w-36 items-end justify-center transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:h-64 sm:w-44"
        aria-label="Repeat the current voice guide"
        title="Repeat the current voice guide"
      >
        <img
          src={
            speaking && frame
              ? "/assistant/clove-assistant-speaking.png"
              : "/assistant/clove-assistant-idle.png"
          }
          alt="Clove voice guide"
          className={`h-full w-full object-contain object-bottom drop-shadow-xl transition-transform duration-150 ${
            speaking ? "scale-[1.04]" : "scale-100"
          }`}
        />
        <span className="absolute bottom-1 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
          <Volume2 className={`h-3.5 w-3.5 ${speaking ? "animate-pulse" : ""}`} />
          {speaking ? "Speaking" : "Repeat"}
        </span>
      </button>
    </aside>
  );
}
