/**
 * Shared type definitions for SalvageAI.
 * These mirror the Drizzle schema but provide the union types for enums
 * that the UI and business logic depend on.
 */

export const EVIDENCE_STATUSES = [
  "reported",
  "corroborated",
  "conflicting",
  "missing",
  "seller_confirmed",
  "reference_supported",
  "unverified",
] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

export const EVIDENCE_STATUS_META: Record<
  EvidenceStatus,
  { label: string; color: string; description: string }
> = {
  reported: {
    label: "Reported",
    color: "gray",
    description: "One seller source, unchecked",
  },
  corroborated: {
    label: "Corroborated",
    color: "blue",
    description: "2+ seller inputs agree (not proof)",
  },
  conflicting: {
    label: "Conflicting",
    color: "red",
    description: "Sources disagree, unresolved",
  },
  missing: {
    label: "Missing",
    color: "amber",
    description: "Required, no usable evidence",
  },
  seller_confirmed: {
    label: "Seller-confirmed",
    color: "green",
    description: "Noor explicitly chose it",
  },
  reference_supported: {
    label: "Reference-supported",
    color: "teal",
    description: "Matches local reference, within its coverage",
  },
  unverified: {
    label: "Unverified",
    color: "purple",
    description: "Insufficient evidence, excluded or qualified in draft",
  },
};

export const READINESS_STATUSES = [
  "ready",
  "info_missing",
  "specialist_review",
] as const;
export type ReadinessStatus = (typeof READINESS_STATUSES)[number];

export const READINESS_STATUS_META: Record<
  ReadinessStatus,
  { label: string; description: string }
> = {
  ready: { label: "Ready for seller review", description: "All checks passed" },
  info_missing: {
    label: "Information missing",
    description: "Some required fields need evidence",
  },
  specialist_review: {
    label: "Specialist review required",
    description: "Conflicts or critical gaps remain",
  },
};

export type SourceType = "photo" | "csv" | "xlsx" | "note";

export type ExtractionStatus = "extracted" | "failed" | "uncertain";

export type UncertaintyLevel = "low" | "medium" | "high";

export type AssessmentType =
  | "conflict"
  | "missing"
  | "uncertain"
  | "reference_check";

export type Severity = "info" | "warning" | "error";

export type EventType =
  | "source_added"
  | "claim_extracted"
  | "decision"
  | "recompute"
  | "draft_updated"
  | "approval"
  | "verification";

/** A question in the resolution queue. */
export interface Question {
  id: string;
  partId: string;
  attribute: string;
  impact: "conflict" | "missing_required" | "uncertain";
  title: string;
  whyItMatters: string;
  conflictingSources: string[]; // source IDs
  candidates: QuestionCandidate[];
  howToCheck: string;
}

export interface QuestionCandidate {
  value: string;
  sourceId?: string;
  label: string;
  unverified: boolean;
}

/** The normalized part record that feeds listing + readiness. */
export interface PartRecord {
  partId: string;
  attributes: Record<string, {
    value: string | null;
    evidenceStatus: EvidenceStatus;
    claimCount: number;
  }>;
}

/** Listing draft structure. */
export interface ListingDraft {
  title: string;
  category: string;
  itemSpecifics: Record<string, string>;
  description: string;
  disclosureBlock: string;
}

// ─── Readiness checklist (Box 7) ─────────────────────────────────────────────

export interface ReadinessItem {
  id: string;
  label: string;
  description: string;
  attributes: string[];
  status: "pass" | "fail";
  detail: string;
  /** Blocking items gate the approval of a listing draft. */
  blocking: boolean;
}

export interface ReadinessReport {
  partId: string;
  status: ReadinessStatus;
  checklistVersion: string;
  items: ReadinessItem[];
  passedItems: string[];
  failedItems: string[];
  /** Failed blocking items — these prevent approval. */
  blockingFailures: string[];
  nextActions: string[];
  requiredNextSteps: string[];
}

// ─── Listing draft with optimisation metadata (Box 6) ───────────────────────

export interface ExcludedClaim {
  attribute: string;
  value: string;
  reason: string;
}

export interface ListingDraftDetail {
  partId: string;
  version: number;
  title: string;
  category: string;
  itemSpecifics: Record<string, string>;
  description: string;
  disclosureBlock: string;
  excludedClaims: ExcludedClaim[];
  optimizationNotes: string[];
  isApproved: boolean;
}

// ─── Chat (Box 5) ────────────────────────────────────────────────────────────

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  questionId?: string;
  attribute?: string;
  createdAt: string;
}

export interface ChatQuestion {
  id: string;
  partId: string;
  attribute: string;
  impact: "conflict" | "missing_required" | "uncertain";
  title: string;
  whyItMatters: string;
  conflictingSources: string[];
  candidates: { value: string; sourceId?: string; label: string; unverified: boolean }[];
  howToCheck: string;
}

export interface DetectedIssue {
  attribute: string;
  type: string;
  severity: string;
  detail: string;
}
