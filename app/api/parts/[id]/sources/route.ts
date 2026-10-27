import { NextRequest, NextResponse } from "next/server";
import { ingestPhoto, ingestNote, ingestSpreadsheet, type IngestedSource } from "@/lib/ingest";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: partId } = await params;
    const formData = await req.formData();

    const ingestedSources: IngestedSource[] = [];

    // Process files
    const files = formData.getAll("files");
    for (const file of files) {
      if (!(file instanceof File)) continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type;
      const name = file.name;

      if (mimeType.startsWith("image/")) {
        const source = ingestPhoto(partId, buffer, name, mimeType);
        ingestedSources.push(source);
      } else if (mimeType.includes("csv") || name.endsWith(".csv")) {
        const source = ingestSpreadsheet(partId, buffer, name, "text/csv");
        ingestedSources.push(source);
      } else if (
        mimeType.includes("spreadsheet") ||
        name.endsWith(".xlsx") ||
        name.endsWith(".xls")
      ) {
        const source = ingestSpreadsheet(
          partId,
          buffer,
          name,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        ingestedSources.push(source);
      } else {
        // Unknown file type — try as photo if it has image extension
        if (name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          const source = ingestPhoto(partId, buffer, name, "image/jpeg");
          ingestedSources.push(source);
        }
      }
    }

    // Process notes (text)
    const note = formData.get("note") as string | null;
    if (note && note.trim()) {
      const source = ingestNote(partId, note.trim());
      ingestedSources.push(source);
    }

    return NextResponse.json({
      sources: ingestedSources,
      count: ingestedSources.length,
    });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      { error: "Failed to upload sources" },
      { status: 500 },
    );
  }
}
