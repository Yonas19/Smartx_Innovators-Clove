"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary. Unlike `error.tsx`, this one replaces the ROOT
 * LAYOUT entirely, so it must render its own <html> and <body> and must not
 * depend on the root layout, next/font, or any shared component (the root
 * layout may be exactly what threw).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          color: "#0f172a",
        }}
      >
        <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              margin: "0 auto 16px",
              width: 64,
              height: 64,
              borderRadius: 9999,
              backgroundColor: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
            }}
          >
            ⚠
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
            Application error
          </h1>
          <p
            style={{
              marginTop: 8,
              fontSize: 14,
              color: "#475569",
              lineHeight: 1.5,
            }}
          >
            The application failed to start. This is usually a configuration or
            dependency issue — try restarting the dev server.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 8,
                fontSize: 12,
                fontFamily: "ui-monospace, monospace",
                color: "#94a3b8",
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <div
            style={{
              marginTop: 24,
              display: "flex",
              gap: 12,
              justifyContent: "center",
            }}
          >
            <button
              onClick={reset}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                backgroundColor: "#4f46e5",
                color: "#fff",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                backgroundColor: "#fff",
                color: "#334155",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
