import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db/client";
import {
  getChatState,
  buildAssistantReply,
  applyChatReply,
} from "@/lib/chat";

/**
 * AI assistant chat endpoint (Box 5).
 *
 * GET  — returns the current chat state and the assistant's opening message.
 * POST — accepts a seller reply, records it as a decision when it resolves a
 *        question, and returns the assistant's next message.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: partId } = await params;
    const db = getDb();

    const allParts = db.select().from(schema.parts).all();
    if (!allParts.some((p) => p.id === partId)) {
      return NextResponse.json(
        { error: `Part ${partId} not found` },
        { status: 404 },
      );
    }

    const state = getChatState(partId);
    const greeting = buildAssistantReply(state);

    return NextResponse.json({
      ...state,
      messages: [...state.messages, greeting],
    });
  } catch (error) {
    console.error("Failed to load chat:", error);
    return NextResponse.json(
      { error: "Failed to load chat" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: partId } = await params;
    const db = getDb();

    const allParts = db.select().from(schema.parts).all();
    if (!allParts.some((p) => p.id === partId)) {
      return NextResponse.json(
        { error: `Part ${partId} not found` },
        { status: 404 },
      );
    }

    const body = (await req.json()) as { message?: string };

    if (!body.message || !body.message.trim()) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      );
    }

    // Apply the reply — records a decision if it resolves a question
    const { state: updatedState, appliedAttribute, skipped } = applyChatReply(
      partId,
      body.message,
    );

    const reply = buildAssistantReply(updatedState, body.message);

    const userMessage = {
      id: `CHAT-U-${Date.now()}`,
      role: "user" as const,
      text: body.message.trim(),
      createdAt: new Date().toISOString(),
    };

    // Recompute downstream state when a decision was applied
    if (appliedAttribute) {
      const { verifyPart } = await import("@/lib/verify");
      const { computeAndStoreReadiness } = await import("@/lib/readiness");
      const { generateAndStoreListingDraft } = await import("@/lib/listing");

      verifyPart(partId);
      computeAndStoreReadiness(partId);
      generateAndStoreListingDraft(partId);

      db.update(schema.parts).set({ updatedAt: new Date() }).run();
    }

    return NextResponse.json({
      ...updatedState,
      messages: [...updatedState.messages, userMessage, reply],
      appliedAttribute: appliedAttribute ?? null,
      skipped,
    });
  } catch (error) {
    console.error("Chat failed:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
