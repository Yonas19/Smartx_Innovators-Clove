import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ─── Parts ───────────────────────────────────────────────────────────────────
export const parts = sqliteTable("parts", {
  id: text("id").primaryKey(), // stable, human-friendly: e.g. "MIR-0001"
  partType: text("part_type").notNull().default("mirror"),
  displayName: text("display_name"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ─── Sources (immutable) ──────────────────────────────────────────────────────
export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(), // immutable source ID
  partId: text("part_id")
    .notNull()
    .references(() => parts.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "photo" | "csv" | "xlsx" | "note"
  // original storage: file path for uploads, raw text for notes
  filePath: text("file_path"), // content-hash named under data/uploads/
  originalText: text("original_text"), // for notes / CSV row text
  language: text("language").default("unknown"), // "en" | "ar" | "unknown"
  detectedFormat: text("detected_format"), // e.g. "image/jpeg", "text/csv"
  contentHash: text("content_hash"), // for dedup / integrity
  // location metadata for linking (e.g. row number in CSV)
  locationMeta: text("location_meta"), // JSON string
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ─── Claims (field-level, each traced to a source) ────────────────────────────
export const claims = sqliteTable("claims", {
  id: text("id").primaryKey(),
  partId: text("part_id")
    .notNull()
    .references(() => parts.id, { onDelete: "cascade" }),
  attribute: text("attribute").notNull(), // e.g. "donorYear", "partNumber", "side"
  value: text("value"), // extracted value
  sourceId: text("source_id")
    .notNull()
    .references(() => sources.id, { onDelete: "cascade" }),
  originalText: text("original_text"), // the exact text the claim was extracted from
  language: text("language").default("unknown"), // "en" | "ar"
  translation: text("translation"), // English translation if original is Arabic
  extractionStatus: text("extraction_status").notNull().default("extracted"), // "extracted" | "failed" | "uncertain"
  evidenceStatus: text("evidence_status").notNull().default("reported"), // see EvidenceStatus enum
  // location: where in the source this claim came from
  location: text("location"), // JSON: { file, row, photoRegion, textSpan }
  uncertainty: text("uncertainty").default("low"), // "low" | "medium" | "high"
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ─── Decisions (append-only) ──────────────────────────────────────────────────
export const decisions = sqliteTable("decisions", {
  id: text("id").primaryKey(),
  partId: text("part_id")
    .notNull()
    .references(() => parts.id, { onDelete: "cascade" }),
  questionId: text("question_id"), // links to the resolved question (not a FK since questions are derived)
  attribute: text("attribute").notNull(),
  answer: text("answer").notNull(), // the chosen value
  answerType: text("answer_type").notNull().default("free_entry"), // "candidate" | "free_entry" | "skip"
  isVerified: integer("is_verified", { mode: "boolean" }).notNull().default(false),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ─── Assessments (internal verification results) ─────────────────────────────
export const assessments = sqliteTable("assessments", {
  id: text("id").primaryKey(),
  partId: text("part_id")
    .notNull()
    .references(() => parts.id, { onDelete: "cascade" }),
  attribute: text("attribute").notNull(),
  assessmentType: text("assessment_type").notNull(), // "conflict" | "missing" | "uncertain" | "reference_check"
  severity: text("severity").notNull().default("info"), // "info" | "warning" | "error"
  detail: text("detail").notNull(),
  relatedClaimIds: text("related_claim_ids"), // JSON array of claim IDs
  referenceId: text("reference_id"), // if from reference check
  referenceDatasetVersion: text("reference_dataset_version"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ─── Listing Drafts (versioned) ───────────────────────────────────────────────
export const listingDrafts = sqliteTable("listing_drafts", {
  id: text("id").primaryKey(),
  partId: text("part_id")
    .notNull()
    .references(() => parts.id, { onDelete: "cascade" }),
  version: integer("version").notNull(), // increments on each recompute
  title: text("title"),
  category: text("category"),
  itemSpecifics: text("item_specifics"), // JSON
  description: text("description"),
  disclosureBlock: text("disclosure_block"),
  isApproved: integer("is_approved", { mode: "boolean" }).notNull().default(false),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ─── Readiness Results ────────────────────────────────────────────────────────
export const readinessResults = sqliteTable("readiness_results", {
  id: text("id").primaryKey(),
  partId: text("part_id")
    .notNull()
    .references(() => parts.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // "ready" | "info_missing" | "specialist_review"
  checklistVersion: text("checklist_version").notNull(),
  passedItems: text("passed_items"), // JSON array
  failedItems: text("failed_items"), // JSON array
  nextActions: text("next_actions"), // JSON array
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ─── Events (audit log) ───────────────────────────────────────────────────────
export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  partId: text("part_id")
    .notNull()
    .references(() => parts.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // "source_added" | "claim_extracted" | "decision" | "recompute" | "draft_updated" | "approval" | "verification"
  payload: text("payload"), // JSON string with event-specific data
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
