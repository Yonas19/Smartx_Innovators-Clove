"use client";

import ErrorFallback from "@/components/ErrorFallback";

export default function PartsError({
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
      title="Part workspace failed to load"
      message="We couldn't load this part. It may have been removed, or the data could be temporarily unavailable."
    />
  );
}
