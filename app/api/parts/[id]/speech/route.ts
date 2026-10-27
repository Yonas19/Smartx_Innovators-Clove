import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/parts/[id]/speech
 *
 * Generates the spoken confirmation script that the browser reads back to the
 * seller before they approve the collected answers.
 *
 * Uses Claude when ANTHROPIC_API_KEY is configured, and falls back to a
 * deterministic local generator so the feature always works offline.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: partId } = await params;
    const body = (await req.json()) as {
      answers?: Record<string, string>;
      partName?: string;
    };

    const answers = body.answers ?? {};
    const db = getDb();
    const part = db.select().from(schema.parts).all().find((p) => p.id === partId);
    const partName = body.partName || part?.displayName || partId;

    const lines = Object.entries(answers).map(([attribute, value]) => ({
      attribute,
      label: humanize(attribute),
      value,
    }));

    const fallback = buildLocalScript(partName, lines);

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return NextResponse.json({ text: fallback, source: "local" });
    }

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-latest",
          max_tokens: 180,
          system:
            "You write very brief spoken confirmations for a seller reviewing car part details. " +
            "Use plain, friendly English. No markdown, no lists, no bullet characters. " +
            "Keep it under 35 words. State the supplied values and end with: Is that correct?",
          messages: [
            {
              role: "user",
              content:
                `Confirm these details for the part "${partName}". ` +
                lines
                  .map((l) => `${l.label}: ${l.value}`)
                  .join(". ") +
                ".",
            },
          ],
        }),
      });

      if (!res.ok) {
        return NextResponse.json({ text: fallback, source: "local" });
      }

      const data = (await res.json()) as {
        content?: { type: string; text?: string }[];
      };
      const text = (data.content ?? [])
        .filter((c) => c.type === "text" && typeof c.text === "string")
        .map((c) => c.text as string)
        .join(" ")
        .trim();

      return NextResponse.json({
        text: text || fallback,
        source: text ? "ai" : "local",
      });
    } catch {
      return NextResponse.json({ text: fallback, source: "local" });
    }
  } catch (error) {
    console.error("Speech generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate the spoken summary" },
      { status: 500 },
    );
  }
}

function humanize(attribute: string): string {
  return attribute
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function buildLocalScript(
  partName: string,
  lines: { label: string; value: string }[],
): string {
  if (lines.length === 0) {
    return `No new details for ${partName}. Please review the record.`;
  }

  const spoken = lines
    .map((l) => `${l.label}: ${l.value}`)
    .join(". ");

  return `${partName}. ${spoken}. Is that correct?`;
}
