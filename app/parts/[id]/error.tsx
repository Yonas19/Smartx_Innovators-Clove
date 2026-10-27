"use client";

import ErrorFallback from "@/components/ErrorFallback";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Failed to load part"
      message={error.message || "An error occurred while loading this part."}
      homeHref="/dashboard"
      homeLabel="Back to dashboard"
    />
  );
}
