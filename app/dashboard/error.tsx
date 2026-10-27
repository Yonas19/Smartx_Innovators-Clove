"use client";

import ErrorFallback from "@/components/ErrorFallback";

export default function DashboardError({
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
      title="Dashboard failed to load"
      message="We couldn't load the dashboard data. It may be a transient database or network issue."
    />
  );
}
