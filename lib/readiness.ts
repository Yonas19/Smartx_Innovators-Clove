/**
 * readiness.ts - Shipping and Listing Readiness checklist.
 *
 * Implements Box 7 of the architecture: checks a part against the readiness
 * checklist and the eBay/UAE-to-UK requirements, then produces a status
 * (ready / info_missing / specialist_review) plus the actions the seller must
 * take next.
 *
 * The blocking rules come from `data/checklist.v1.json` (the authoritative
 * spec). The diagram's additional requirements - packaged dimensions/weight
 * and the UAE-to-UK shipping keys - are appended as supplementary items.
 */

import fs from "fs";
import path from "path";
import { getDb, schema } from "./db/client";
import { eq } from "drizzle-orm";
import type { ReadinessStatus } from "./types";

export const CHECKLIST_VERSION = "readiness-v1";

export interface ChecklistItem {
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
  items: ChecklistItem[];
  passedItems: string[];
  failedItems: string[];
  /** Failed blocking items - these prevent approval. */
  blockingFailures: string[];
  nextActions: string[];
  requiredNextSteps: string[];
}

interface ChecklistSpecItem {
  id: string;
  label: string;
  attribute?: string;
  check: string;
  blocking: boolean;
}

interface ChecklistSpec {
  version: string;
  description: string;
  items: ChecklistSpecItem[];
}

let cachedSpec: ChecklistSpec | null = null;

function loadChecklistSpec(): ChecklistSpec {
  if (cachedSpec) return cachedSpec;

  const specPath = path.join(process.cwd(), "data", "checklist.v1.json");
  const raw = fs.readFileSync(specPath, "utf-8");
  cachedSpec = JSON.parse(raw) as ChecklistSpec;
  return cachedSpec;
}

export interface ResolvedAttribute {
  value: string | null;
  sourceId: string | null;
  sourceType: string | null;
  evidenceStatus: string | null;
  conflicting: boolean;
  fromPhoto: boolean;
}

export interface ResolvedAttributes {
  values: Record<string, ResolvedAttribute>;
  conflicting: Set<string>;
}

const PHOTO_SOURCE_TYPES = new Set(["photo", "image"]);

export function resolveAttributes(partId: string): ResolvedAttributes {
  const db = getDb();

  const claims = db
    .select()
    .from(schema.claims)
    .all()
    .filter((c) => c.partId === partId);

  const decisions = db
    .select()
    .from(schema.decisions)
    .all()
    .filter((d) => d.partId === partId);

  const sources = db.select().from(schema.sources).all();
  const sourceTypeById = new Map(sources.map((s) => [s.id, s.type]));

  const values: Record<string, ResolvedAttribute> = {};
  const conflicting = new Set<string>();

  const byAttribute: Record<string, typeof claims> = {};
  for (const claim of claims) {
    if (!byAttribute[claim.attribute]) byAttribute[claim.attribute] = [];
    byAttribute[claim.attribute].push(claim);
  }

  for (const [attr, attrClaims] of Object.entries(byAttribute)) {
    const distinct = new Set(
      attrClaims
        .map((c) => (c.value ?? "").trim().toLowerCase())
        .filter(Boolean),
    );

    const preferred =
      attrClaims.find((c) => c.evidenceStatus === "seller_confirmed") ??
      attrClaims.find((c) => c.evidenceStatus === "reference_supported") ??
      attrClaims.find((c) => c.value);

    const sourceType = preferred
      ? (sourceTypeById.get(preferred.sourceId) ?? null)
      : null;

    values[attr] = {
      value: preferred?.value ?? null,
      sourceId: preferred?.sourceId ?? null,
      sourceType,
      evidenceStatus: preferred?.evidenceStatus ?? null,
      conflicting: distinct.size > 1,
      fromPhoto: sourceType ? PHOTO_SOURCE_TYPES.has(sourceType) : false,
    };

    if (distinct.size > 1) conflicting.add(attr);
  }

  // Seller decisions override everything
  for (const decision of decisions) {
    if (decision.answerType === "skip") continue;
    values[decision.attribute] = {
      value: decision.answer,
      sourceId: null,
      sourceType: "seller",
      evidenceStatus: "seller_confirmed",
      conflicting: false,
      fromPhoto: false,
    };
    conflicting.delete(decision.attribute);
  }

  return { values, conflicting };
}
interface ReferenceRow {
  partNumber: string;
  donorMake: string;
  donorModel: string;
  donorYear: string;
  side: string;
  functions: string;
  fitmentNotes: string;
}

let cachedReference: ReferenceRow[] | null = null;

function loadReferenceRows(): ReferenceRow[] {
  if (cachedReference) return cachedReference;

  const csvPath = path.join(process.cwd(), "data", "reference_fitment.csv");
  if (!fs.existsSync(csvPath)) {
    cachedReference = [];
    return cachedReference;
  }

  const lines = fs
    .readFileSync(csvPath, "utf-8")
    .split("\n")
    .filter((l) => l.trim());
  if (lines.length < 2) {
    cachedReference = [];
    return cachedReference;
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: ReferenceRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = cells[j] || "";
    });
    rows.push(row as unknown as ReferenceRow);
  }

  cachedReference = rows;
  return cachedReference;
}

function findReference(partNumber: string | null): ReferenceRow | undefined {
  if (!partNumber) return undefined;
  const rows = loadReferenceRows();
  return rows.find(
    (r) =>
      (r.partNumber || "").toLowerCase() === partNumber.trim().toLowerCase(),
  );
}

interface CheckContext {
  partId: string;
  resolved: ResolvedAttributes;
  reference: ReferenceRow | undefined;
  draftDescription: string | null;
  draftDisclosure: string | null;
  fitmentMarkedUnverified: boolean;
  currentAttribute?: string;
}

type CheckFn = (ctx: CheckContext) => { pass: boolean; detail: string };

const CHECKS: Record<string, CheckFn> = {
  non_empty: (ctx) => {
    const attr = ctx.currentAttribute;
    const entry = attr ? ctx.resolved.values[attr] : undefined;
    if (!entry || !entry.value || !entry.value.trim()) {
      return {
        pass: false,
        detail: `No value has been recorded for "${attr}".`,
      };
    }
    if (entry.conflicting) {
      return {
        pass: false,
        detail: `Sources disagree on "${attr}" - resolve the conflict before continuing.`,
      };
    }
    return { pass: true, detail: `Recorded value: "${entry.value}".` };
  },

  reference_match_or_unverified: (ctx) => {
    const attr = ctx.currentAttribute;
    const entry = attr ? ctx.resolved.values[attr] : undefined;
    const partNumber = entry?.value ?? null;

    if (!partNumber) {
      return {
        pass: false,
        detail: "No part number to verify against the reference dataset.",
      };
    }
    if (ctx.fitmentMarkedUnverified) {
      return {
        pass: true,
        detail:
          "Part number is not in the reference dataset, but the seller explicitly marked fitment as unverified.",
      };
    }
    if (ctx.reference) {
      return {
        pass: true,
        detail: `Matched in reference dataset - ${
          ctx.reference.fitmentNotes || "fitment confirmed"
        }.`,
      };
    }
    return {
      pass: false,
      detail:
        "Part number was not matched in the reference dataset and fitment has not been explicitly marked unverified.",
    };
  },

  no_conflicts: (ctx) => {
    const conflicts = [...ctx.resolved.conflicting];
    if (conflicts.length === 0) {
      return { pass: true, detail: "No unresolved conflicts on required fields." };
    }
    return {
      pass: false,
      detail: `Unresolved conflicts on: ${conflicts.join(", ")}.`,
    };
  },

  not_unknown: (ctx) => {
    const attr = ctx.currentAttribute;
    const entry = attr ? ctx.resolved.values[attr] : undefined;
    const value = (entry?.value || "").trim().toLowerCase();

    if (!value) {
      return { pass: false, detail: `"${attr}" has not been recorded at all.` };
    }
    if (value === "unknown" || value === "unspecified") {
      return {
        pass: false,
        detail: `"${attr}" is still "unknown" - it must be stated explicitly.`,
      };
    }
    return { pass: true, detail: `"${attr}" is "${entry?.value}".` };
  },

  not_photo_inferred: (ctx) => {
    const attr = ctx.currentAttribute;
    const entry = attr ? ctx.resolved.values[attr] : undefined;

    if (!entry) {
      return { pass: false, detail: `"${attr}" has not been recorded at all.` };
    }
    if (entry.fromPhoto) {
      return {
        pass: false,
        detail:
          `"${attr}" was inferred from a photo. It must be confirmed by a physical test, not from an image.`,
      };
    }
    return { pass: true, detail: `"${attr}" was not inferred from a photo.` };
  },

  defect_disclosure: (ctx) => {
    if (!ctx.draftDisclosure || !ctx.draftDisclosure.trim()) {
      return {
        pass: false,
        detail: "The listing draft has no defect disclosure block.",
      };
    }
    const text = ctx.draftDisclosure.toLowerCase();
    if (!text.includes("condition") && !text.includes("test")) {
      return {
        pass: false,
        detail:
          "The disclosure block does not state the condition or the testing status.",
      };
    }
    return {
      pass: true,
      detail: "The listing draft carries a defect and testing disclosure.",
    };
  },

  no_unsafe_promises: (ctx) => {
    const text = `${ctx.draftDescription || ""} ${ctx.draftDisclosure || ""}`.toLowerCase();

    const forbidden: { pattern: RegExp; label: string }[] = [
      { pattern: /\bguaranteed\s+fit\b/, label: "guaranteed fitment" },
      { pattern: /\bfits\s+all\b/, label: "fits all vehicles" },
      { pattern: /\bcustoms\s+cleared\b/, label: "customs cleared" },
      { pattern: /\bgenuine\s+oe\b/, label: "guaranteed genuine OE" },
      { pattern: /\boriginal\s+oe\b/, label: "original OE claim" },
      { pattern: /\bno\s+problems?\b/, label: "no-problems claim" },
      { pattern: /\bperfect\b/, label: "perfect condition claim" },
    ];

    const hits = forbidden.filter((f) => f.pattern.test(text));
    if (hits.length > 0) {
      return {
        pass: false,
        detail: `The draft contains unsafe promises: ${hits
          .map((h) => h.label)
          .join(", ")}.`,
      };
    }
    return {
      pass: true,
      detail: "The draft contains no fitment, customs or authenticity promises.",
    };
  },
};
const SUPPLEMENTARY_ITEMS: {
  id: string;
  label: string;
  description: string;
  attributes: string[];
  blocking: boolean;
  check: (ctx: CheckContext) => { pass: boolean; detail: string };
}[] = [
  {
    id: "CL-S01",
    label: "Packaged dimensions and weight",
    description:
      "Needed to calculate shipping cost and quote the item accurately.",
    attributes: ["packagedDimensions", "packagedWeight"],
    blocking: false,
    check: (ctx) => {
      const dims = ctx.resolved.values.packagedDimensions?.value;
      const weight = ctx.resolved.values.packagedWeight?.value;
      if (!dims && !weight) {
        return {
          pass: false,
          detail:
            "Packaged dimensions and weight are missing - shipping cost cannot be quoted.",
        };
      }
      if (!dims || !weight) {
        return {
          pass: false,
          detail: `Missing ${!dims ? "packaged dimensions" : "packaged weight"}.`,
        };
      }
      return { pass: true, detail: `Packaged ${dims} cm, ${weight} kg.` };
    },
  },
  {
    id: "CL-S02",
    label: "UAE-to-UK shipping requirements",
    description:
      "Declared value, origin description and condition are required for cross-border shipping.",
    attributes: ["price", "brand", "visibleDamage"],
    blocking: false,
    check: (ctx) => {
      const gaps: string[] = [];
      if (!ctx.resolved.values.price?.value) gaps.push("declared value");
      if (!ctx.resolved.values.brand?.value) {
        gaps.push("brand/origin description");
      }
      if (!ctx.resolved.values.visibleDamage?.value) {
        gaps.push("condition description");
      }

      if (gaps.length > 0) {
        return {
          pass: false,
          detail: `UAE-to-UK shipping paperwork needs: ${gaps.join(", ")}.`,
        };
      }
      return {
        pass: true,
        detail:
          "Declared value, origin description and condition are all present for UAE-to-UK shipping.",
      };
    },
  },
  {
    id: "CL-S03",
    label: "Separate donor vehicle info from compatibility",
    description:
      "Donor vehicle details must not be presented as verified compatibility.",
    attributes: ["donorMake", "donorModel", "donorYear"],
    blocking: true,
    check: (ctx) => {
      const make = ctx.resolved.values.donorMake?.value;
      const model = ctx.resolved.values.donorModel?.value;
      const year = ctx.resolved.values.donorYear?.value;

      if (!make && !model && !year) {
        return {
          pass: false,
          detail: "Donor vehicle information has not been recorded.",
        };
      }
      return {
        pass: true,
        detail: `Donor vehicle recorded as ${[make, model, year]
          .filter(Boolean)
          .join(" ")} and presented separately from fitment.`,
      };
    },
  },
];

function latestDraft(partId: string) {
  const db = getDb();
  const drafts = db
    .select()
    .from(schema.listingDrafts)
    .all()
    .filter((d) => d.partId === partId)
    .sort((a, b) => b.version - a.version);
  return drafts[0] ?? null;
}

export function computeReadiness(partId: string): ReadinessReport {
  const db = getDb();
  const resolved = resolveAttributes(partId);
  const spec = loadChecklistSpec();

  const referenceEntry = resolved.values.partNumber;
  const reference = findReference(referenceEntry?.value ?? null);

  const draft = latestDraft(partId);
  const draftDescription = draft?.description ?? null;
  const draftDisclosure = draft?.disclosureBlock ?? null;

  const decisions = db
    .select()
    .from(schema.decisions)
    .all()
    .filter((d) => d.partId === partId);
  const fitmentMarkedUnverified = decisions.some(
    (d) =>
      (d.attribute === "fitmentStatus" && /unverified/i.test(d.answer)) ||
      (d.attribute === "partNumber" && d.answerType === "skip"),
  );

  const baseCtx: CheckContext = {
    partId,
    resolved,
    reference,
    draftDescription,
    draftDisclosure,
    fitmentMarkedUnverified,
  };

  const items: ChecklistItem[] = [];

  for (const specItem of spec.items) {
    const fn = CHECKS[specItem.check];
    const ctx: CheckContext = { ...baseCtx, currentAttribute: specItem.attribute };

    const result = fn
      ? fn(ctx)
      : { pass: false, detail: `Unknown check "${specItem.check}".` };

    items.push({
      id: specItem.id,
      label: specItem.label,
      description: `Checklist ${spec.version} rule "${specItem.check}".`,
      attributes: specItem.attribute ? [specItem.attribute] : [],
      status: result.pass ? "pass" : "fail",
      detail: result.detail,
      blocking: specItem.blocking,
    });
  }

  for (const extra of SUPPLEMENTARY_ITEMS) {
    const result = extra.check(baseCtx);
    items.push({
      id: extra.id,
      label: extra.label,
      description: extra.description,
      attributes: extra.attributes,
      status: result.pass ? "pass" : "fail",
      detail: result.detail,
      blocking: extra.blocking,
    });
  }

  const passedItems = items.filter((i) => i.status === "pass").map((i) => i.id);
  const failedItems = items.filter((i) => i.status === "fail").map((i) => i.id);
  const blockingFailures = items
    .filter((i) => i.status === "fail" && i.blocking)
    .map((i) => i.label);

  const nextActions = items
    .filter((i) => i.status === "fail")
    .map((i) => `${i.label}: ${i.detail}`);

  const requiredNextSteps: string[] = [];
  let status: ReadinessStatus;

  if (blockingFailures.length > 0 || resolved.conflicting.size > 0) {
    status = "specialist_review";
    requiredNextSteps.push(
      "Resolve every blocking checklist item listed under Next actions.",
    );
    if (resolved.conflicting.size > 0) {
      requiredNextSteps.push(
        "Resolve all conflicts between sources before publishing.",
      );
    }
    requiredNextSteps.push(
      "Have a specialist confirm fitment before publishing the listing.",
    );
  } else if (failedItems.length > 0) {
    status = "info_missing";
    requiredNextSteps.push(
      "Supply the missing information listed under Next actions.",
    );
  } else {
    status = "ready";
    requiredNextSteps.push("Review and approve the listing draft.");
  }

  return {
    partId,
    status,
    checklistVersion: `${CHECKLIST_VERSION} (${spec.version})`,
    items,
    passedItems,
    failedItems,
    blockingFailures,
    nextActions,
    requiredNextSteps,
  };
}

export function computeAndStoreReadiness(partId: string): ReadinessReport {
  const db = getDb();
  const report = computeReadiness(partId);
  const now = new Date();

  const stale = db
    .select()
    .from(schema.readinessResults)
    .all()
    .filter((r) => r.partId === partId);

  for (const row of stale) {
    db.delete(schema.readinessResults)
      .where(eq(schema.readinessResults.id, row.id))
      .run();
  }

  db.insert(schema.readinessResults)
    .values({
      id: `RDY-${partId}-${Date.now()}`,
      partId,
      status: report.status,
      checklistVersion: report.checklistVersion,
      passedItems: JSON.stringify(report.passedItems),
      failedItems: JSON.stringify(report.failedItems),
      nextActions: JSON.stringify(report.nextActions),
      createdAt: now,
    })
    .run();

  db.insert(schema.events)
    .values({
      id: `EVT-READINESS-${partId}-${Date.now()}`,
      partId,
      eventType: "recompute",
      payload: JSON.stringify({
        action: "readiness_computed",
        status: report.status,
        passed: report.passedItems.length,
        failed: report.failedItems.length,
      }),
      createdAt: now,
    })
    .run();

  return report;
}