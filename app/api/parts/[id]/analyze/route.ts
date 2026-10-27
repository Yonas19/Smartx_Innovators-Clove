import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db/client";
import { extractClaims } from "@/lib/extraction";
import { verifyPart } from "@/lib/verify";
import { computeAndStoreReadiness } from "@/lib/readiness";
import { generateAndStoreListingDraft } from "@/lib/listing";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: partId } = await params;
    const db = getDb();

    // Verify the part exists
    const allParts = db.select().from(schema.parts).all();
    const part = allParts.find((p) => p.id === partId);
    if (!part) {
      return NextResponse.json(
        { error: `Part ${partId} not found` },
        { status: 404 },
      );
    }

    // Get all sources for this part
    const allSources = db
      .select()
      .from(schema.sources)
      .all()
      .filter((s) => s.partId === partId);

    if (allSources.length === 0) {
      return NextResponse.json(
        { error: "No sources to analyze. Upload photos, CSV, or notes first." },
        { status: 400 },
      );
    }

    // Map DB sources to the IngestedSource shape
    const sources = allSources.map((s) => ({
      id: s.id,
      type: s.type as "photo" | "csv" | "xlsx" | "note",
      filePath: s.filePath || undefined,
      originalText: s.originalText || undefined,
      language: s.language || "unknown",
      detectedFormat: s.detectedFormat || undefined,
      contentHash: s.contentHash || undefined,
    }));

    // Extract claims
    const extractedClaims = extractClaims(partId, sources);

    // Run verification
    const verification = verifyPart(partId);

    // Generate and persist the listing draft first, so the readiness checklist
    // can verify that the draft carries a defect disclosure block.
    const draft = generateAndStoreListingDraft(partId);

    // Compute and persist the readiness checklist
    const readiness = computeAndStoreReadiness(partId);

    // Update part updatedAt
    db.update(schema.parts)
      .set({ updatedAt: new Date() })
      .run();

    return NextResponse.json({
      partId,
      claimsExtracted: extractedClaims.length,
      assessments: verification.assessments.length,
      conflicts: verification.conflicts.length,
      missing: verification.missing.length,
      readiness: {
        status: readiness.status,
        passed: readiness.passedItems.length,
        failed: readiness.failedItems.length,
        nextActions: readiness.nextActions,
      },
      listingDraft: {
        version: draft.version,
        title: draft.title,
        excludedClaims: draft.excludedClaims.length,
      },
      status: "complete",
    });
  } catch (error) {
    console.error("Analysis failed:", error);
    return NextResponse.json(
      { error: "Failed to analyze sources" },
      { status: 500 },
    );
  }
}
