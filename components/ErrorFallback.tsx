"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

type ErrorFallbackProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  message?: string;
  homeHref?: string;
  homeLabel?: string;
};

/**
 * Shared fallback UI used by every route-segment error boundary.
 * Kept presentational so it can be rendered from both `error.tsx`
 * and `global-error.tsx` (the latter cannot use the root layout).
 */
export default function ErrorFallback({
  error,
  reset,
  title = "Something went wrong",
  message,
  homeHref = "/",
  homeLabel = "Go home",
}: ErrorFallbackProps) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {message ||
            error.message ||
            "An unexpected error occurred while rendering this page."}
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-slate-400">
            Error ID: {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href={homeHref}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Home className="h-4 w-4" />
            {homeLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
