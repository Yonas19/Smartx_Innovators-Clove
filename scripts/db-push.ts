/**
 * db-push.ts — creates all tables from the Drizzle schema directly (no migration files needed for MVP).
 * Run with: npm run db:push
 */
import { getRawDb } from "../lib/db/client";
import { sql } from "drizzle-orm";

const rawDb = getRawDb();

const createStatements = [
  `CREATE TABLE IF NOT EXISTS parts (
    id TEXT PRIMARY KEY,
    part_type TEXT NOT NULL DEFAULT 'mirror',
    display_name TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    part_id TEXT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    file_path TEXT,
    original_text TEXT,
    language TEXT DEFAULT 'unknown',
    detected_format TEXT,
    content_hash TEXT,
    location_meta TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    part_id TEXT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    attribute TEXT NOT NULL,
    value TEXT,
    source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    original_text TEXT,
    language TEXT DEFAULT 'unknown',
    translation TEXT,
    extraction_status TEXT NOT NULL DEFAULT 'extracted',
    evidence_status TEXT NOT NULL DEFAULT 'reported',
    location TEXT,
    uncertainty TEXT DEFAULT 'low',
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS decisions (
    id TEXT PRIMARY KEY,
    part_id TEXT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    question_id TEXT,
    attribute TEXT NOT NULL,
    answer TEXT NOT NULL,
    answer_type TEXT NOT NULL DEFAULT 'free_entry',
    is_verified INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS assessments (
    id TEXT PRIMARY KEY,
    part_id TEXT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    attribute TEXT NOT NULL,
    assessment_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    detail TEXT NOT NULL,
    related_claim_ids TEXT,
    reference_id TEXT,
    reference_dataset_version TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS listing_drafts (
    id TEXT PRIMARY KEY,
    part_id TEXT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title TEXT,
    category TEXT,
    item_specifics TEXT,
    description TEXT,
    disclosure_block TEXT,
    is_approved INTEGER NOT NULL DEFAULT 0,
    approved_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS readiness_results (
    id TEXT PRIMARY KEY,
    part_id TEXT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    checklist_version TEXT NOT NULL,
    passed_items TEXT,
    failed_items TEXT,
    next_actions TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    part_id TEXT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload TEXT,
    created_at INTEGER NOT NULL
  )`,
];

console.log("Creating tables...");
for (const stmt of createStatements) {
  rawDb.exec(stmt);
}
console.log("✓ All tables created successfully.");
rawDb.close();
