import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db/client";
import { textToSpeech } from "@/lib/tts";

export const dynamic = "force-dynamic";

/**
 * POST /api/parts/[id]/speech?audio=1
 *
 * Generates the spoken confirmation script that the seller hears before they
 * approve the collected answers.
 *
 * With ?audio=1 the script is rendered with ElevenLabs and returned as MP3.
 * Without it the route returns the script text (plus an AI-written variant when
 * ANTHROPIC_API_KEY is configured) so the browser can fall back to its own
 * speech synthesis when ElevenLabs is unavailable.
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
      /** When provided, this exact script is rendered instead of a summary. */
      script?: string;
    };

    const answers = body.answers ?? {};
    const db = getDb();
    const part = db.select().from(schema.parts).all().find((p) => p.id === partId);
    const partName = body.partName || part?.displayName || partId;
    const wantsAudio = req.nextUrl.searchParams.get("audio") === "1";

    const inlineScript = (body.script ?? "").trim();
    if (inlineScript) {
      if (wantsAudio) {
        const speech = await textToSpeech(inlineScript);
        if (speech.audio) {
          return new NextResponse(new Uint8Array(speech.audio), {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "no-store",
            },
          });
        }
      }

      return NextResponse.json({ text: inlineScript, source: "inline" });
    }

    const lines = Object.entries(answers).map(([attribute, value]) => ({
      attribute,
      label: humanize(attribute),
      value,
    }));

    const fallback = buildLocalScript(partName, lines);

    // Realistic voice first; the browser synthesizer is the fallback.
    if (wantsAudio) {
      const speech = await textToSpeech(fallback);
      if (speech.audio) {
        return new NextResponse(new Uint8Array(speech.audio), {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      }

      return NextResponse.json(
        { text: fallback, source: "browser_fallback" },
        { status: 200 },
      );
    }

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
