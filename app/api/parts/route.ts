import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db/client";
import { generatePartId } from "@/lib/utils";

export async function GET() {
  const db = getDb();
  const allParts = db.select().from(schema.parts).all();
  return NextResponse.json({ parts: allParts });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();

    // Generate a stable part ID
    const existingParts = db.select().from(schema.parts).all();
    const partId = body.id || generatePartId(existingParts.map((p) => p.id));

    // Check if part already exists
    if (existingParts.some((p) => p.id === partId)) {
      return NextResponse.json(
        { error: `Part ${partId} already exists` },
        { status: 409 },
      );
    }

    const now = new Date();
    const displayName = body.displayName || `Mirror ${partId}`;

    db.insert(schema.parts).values({
      id: partId,
      partType: body.partType || "mirror",
      displayName,
      createdAt: now,
      updatedAt: now,
    }).run();

    db.insert(schema.events).values({
      id: `EVT-CREATE-${partId}-${Date.now()}`,
      partId,
      eventType: "source_added",
      payload: JSON.stringify({ action: "part_created", displayName }),
      createdAt: now,
    }).run();

    return NextResponse.json({ id: partId, displayName }, { status: 201 });
  } catch (error) {
    console.error("Failed to create part:", error);
    return NextResponse.json(
      { error: "Failed to create part" },
      { status: 500 },
    );
  }
}
