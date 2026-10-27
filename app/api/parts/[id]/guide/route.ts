import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db/client";
import { generateQuestions } from "@/lib/questions";
import { computeReadiness } from "@/lib/readiness";

export const dynamic = "force-dynamic";

/**
 * GET /api/parts/[id]/guide
 *
 * Returns everything the guided details wizard needs for a part:
 * the open question queue, the readiness summary and the spoken prompt
 * for each question.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: partId } = await params;
    const db = getDb();

    const part = db.select().from(schema.parts).all().find((p) => p.id === partId);
    if (!part) {
      return NextResponse.json({ error: `Part ${partId} not found` }, { status: 404 });
    }

    const questions = generateQuestions(partId);
    const readiness = computeReadiness(partId);

    return NextResponse.json({
      partId,
      partName: part.displayName || part.id,
      questions: questions.map((q, index) => ({
        id: q.id,
        attribute: q.attribute,
        impact: q.impact,
        title: q.title,
        whyItMatters: q.whyItMatters,
        howToCheck: q.howToCheck,
        candidates: q.candidates,
        conflictingSources: q.conflictingSources,
        spokenPrompt: buildSpokenPrompt(q.title, index + 1),
      })),
      readiness: {
        status: readiness.status,
        nextActions: readiness.nextActions,
      },
    });
  } catch (error) {
    console.error("Guide failed:", error);
    return NextResponse.json(
      { error: "Failed to load the guided checklist" },
      { status: 500 },
    );
  }
}

/**
 * Turns a question into a natural sentence the browser can read aloud.
 */
function buildSpokenPrompt(title: string, index: number): string {
  const clean = title.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();
  return `Question ${index}. ${clean}. Please answer.`;
}
