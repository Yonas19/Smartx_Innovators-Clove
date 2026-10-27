/**
 * ingest.ts — Handles ingestion of uploaded sources into the database.
 * Photos and CSV/XLSX files are saved to data/uploads/ with content-hash names.
 * Notes are stored as raw text.
 */

import { getDb, schema } from "./db/client";
import { generateSourceId, isArabic } from "./utils";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function contentHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
}

export interface IngestedSource {
  id: string;
  type: "photo" | "csv" | "xlsx" | "note";
  filePath?: string;
  originalText?: string;
  language: string;
  detectedFormat?: string;
  contentHash?: string;
}

/**
 * Ingest a photo file (from a Buffer — typically from a multipart upload).
 */
export function ingestPhoto(partId: string, buffer: Buffer, originalName: string, mimeType: string): IngestedSource {
  ensureUploadsDir();
  const hash = contentHash(buffer);
  const ext = path.extname(originalName) || ".jpg";
  const fileName = `${hash}${ext}`;
  const filePath = path.join(UPLOADS_DIR, fileName);
  const relativePath = `data/uploads/${fileName}`;

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, buffer);
  }

  const sourceId = generateSourceId();
  const db = getDb();
  const now = new Date();

  db.insert(schema.sources).values({
    id: sourceId,
    partId,
    type: "photo",
    filePath: relativePath,
    language: "unknown",
    detectedFormat: mimeType,
    contentHash: hash,
    locationMeta: JSON.stringify({ originalName }),
    createdAt: now,
  }).run();

  db.insert(schema.events).values({
    id: `EVT-${sourceId}`,
    partId,
    eventType: "source_added",
    payload: JSON.stringify({ sourceId, type: "photo", originalName }),
    createdAt: now,
  }).run();

  return {
    id: sourceId,
    type: "photo",
    filePath: relativePath,
    language: "unknown",
    detectedFormat: mimeType,
    contentHash: hash,
  };
}

/**
 * Ingest a CSV or XLSX file buffer and parse its rows.
 */
export function ingestSpreadsheet(
  partId: string,
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): IngestedSource & { rowData: Record<string, string> } {
  ensureUploadsDir();
  const hash = contentHash(buffer);
  const ext = path.extname(originalName);
  const fileName = `${hash}${ext}`;
  const filePath = path.join(UPLOADS_DIR, fileName);
  const relativePath = `data/uploads/${fileName}`;

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, buffer);
  }

  // Parse the spreadsheet
  let rowData: Record<string, string> = {};
  const isCsv = mimeType.includes("csv") || ext === ".csv";

  if (isCsv) {
    // Parse CSV with papaparse
    const Papa = require("papaparse");
    const text = buffer.toString("utf-8");
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
    if (result.data && result.data.length > 0) {
      rowData = result.data[0] as Record<string, string>;
    }
  } else {
    // Parse XLSX
    const XLSX = require("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet);
    if (json.length > 0) {
      rowData = json[0] as Record<string, string>;
    }
  }

  const sourceType = isCsv ? "csv" : "xlsx";
  const sourceId = generateSourceId();
  const db = getDb();
  const now = new Date();

  const rowText = Object.entries(rowData)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");

  db.insert(schema.sources).values({
    id: sourceId,
    partId,
    type: sourceType,
    filePath: relativePath,
    originalText: rowText,
    language: "en",
    detectedFormat: mimeType,
    contentHash: hash,
    locationMeta: JSON.stringify({ originalName, row: 2 }),
    createdAt: now,
  }).run();

  db.insert(schema.events).values({
    id: `EVT-${sourceId}`,
    partId,
    eventType: "source_added",
    payload: JSON.stringify({ sourceId, type: sourceType, originalName }),
    createdAt: now,
  }).run();

  return {
    id: sourceId,
    type: sourceType,
    filePath: relativePath,
    originalText: rowText,
    language: "en",
    detectedFormat: mimeType,
    contentHash: hash,
    rowData,
  };
}

/**
 * Ingest a text note (Arabic or English).
 */
export function ingestNote(partId: string, text: string): IngestedSource {
  const arabic = isArabic(text);
  const language = arabic ? "ar" : "en";
  const hash = contentHash(Buffer.from(text, "utf-8"));
  const sourceId = generateSourceId();
  const db = getDb();
  const now = new Date();

  db.insert(schema.sources).values({
    id: sourceId,
    partId,
    type: "note",
    originalText: text,
    language,
    detectedFormat: "text/plain",
    contentHash: hash,
    createdAt: now,
  }).run();

  db.insert(schema.events).values({
    id: `EVT-${sourceId}`,
    partId,
    eventType: "source_added",
    payload: JSON.stringify({ sourceId, type: "note", language }),
    createdAt: now,
  }).run();

  return {
    id: sourceId,
    type: "note",
    originalText: text,
    language,
    detectedFormat: "text/plain",
    contentHash: hash,
  };
}
