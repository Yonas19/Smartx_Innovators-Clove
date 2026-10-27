import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Generate a stable part ID like "MIR-0011" */
export function generatePartId(existing: string[] = []): string {
  let max = 0;
  for (const id of existing) {
    const match = id.match(/MIR-(\d+)/);
    if (match) {
      max = Math.max(max, parseInt(match[1], 10));
    }
  }
  return `MIR-${String(max + 1).padStart(4, "0")}`;
}

/** Generate a stable source ID */
let sourceCounter = 0;
export function generateSourceId(): string {
  sourceCounter++;
  return `SRC-${Date.now()}-${sourceCounter}`;
}

/** Generate a stable claim ID */
let claimCounter = 0;
export function generateClaimId(): string {
  claimCounter++;
  return `CLM-${Date.now()}-${claimCounter}`;
}

/** Detect if text is Arabic (basic Unicode range check) */
export function isArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
    text,
  );
}

/** Get text direction based on content */
export function getTextDirection(text: string): "ltr" | "rtl" {
  return isArabic(text) ? "rtl" : "ltr";
}

/** Format a timestamp for display */
export function formatTime(ts: Date | number): string {
  const d = typeof ts === "number" ? new Date(ts) : ts;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
