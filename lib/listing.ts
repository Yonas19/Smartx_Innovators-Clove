/**
 * listing.ts — eBay listing draft generation.
 *
 * Implements Box 6 of the architecture: turns the verified part record into an
 * optimised, editable eBay listing draft.
 *
 * Two hard rules from the architecture:
 *  1. Clear condition disclosure — never hide a defect or an untested state.
 *  2. No unsupported claims — any claim that is unverified or contradicted is
 *     excluded from the draft body and pushed into a separate disclosure.
 *  3. Donor vehicle information is kept separate from verified compatibility.
 */

import { getDb, schema } from "./db/client";
import { eq } from "drizzle-orm";
import { resolveAttributes } from "./readiness";
import { EVIDENCE_STATUS_META } from "./types";

export const LISTING_CATEGORY =
  "eBay Motors > Parts & Accessories > Car & Truck Parts > Exterior Parts & Accessories > Mirrors";

export interface ListingDraftResult {
  partId: string;
  version: number;
  title: string;
  category: string;
  itemSpecifics: Record<string, string>;
  description: string;
  disclosureBlock: string;
  /** Claims deliberately kept out of the draft body. */
  excludedClaims: { attribute: string; value: string; reason: string }[];
  /** Optimisation notes surfaced to the seller. */
  optimizationNotes: string[];
  isApproved: boolean;
}

const EBAY_TITLE_MAX = 80;

/** Attributes that are safe to publish as "item specifics". */
const SPECIFIC_LABEL: Record<string, string> = {
  brand: "Brand",
  partNumber: "Manufacturer Part Number",
  side: "Side",
  donorMake: "Donor Vehicle Make",
  donorModel: "Donor Vehicle Model",
  donorYear: "Donor Vehicle Year",
  functions: "Features",
  packagedDimensions: "Package Dimensions",
  packagedWeight: "Package Weight",
  accessories: "Accessories Included",
};

function titleCase(value: string): string {
  return value
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(", ");
}

/**
 * Build a title that is optimised for eBay search and stays within limits.
 */
function buildTitle(values: Record<string, string | null>): {
  title: string;
  notes: string[];
} {
  const notes: string[] = [];
  const side = values.side;
  const sideText = side === "L" ? "Left" : side === "R" ? "Right" : "";

  const core = [
    values.brand,
    values.donorMake,
    values.donorModel,
    values.donorYear,
    sideText,
    "Side View Mirror",
  ]
    .filter(Boolean)
    .join(" ");

  let title = core.replace(/\s+/g, " ").trim();
  const pn = values.partNumber;

  if (pn) {
    if (title.length + pn.length + 1 <= EBAY_TITLE_MAX) {
      title = `${title} ${pn}`;
    } else {
      notes.push(
        `Part number "${pn}" was not added to the title — it would exceed the ${EBAY_TITLE_MAX}-character eBay limit. It is still included in the item specifics.`,
      );
    }
  }

  if (title.length > EBAY_TITLE_MAX) {
    title = title.slice(0, EBAY_TITLE_MAX - 1).trim();
    notes.push(
      `Title was shortened to fit the ${EBAY_TITLE_MAX}-character eBay limit.`,
    );
  }

  if (!values.brand) {
    notes.push(
      "Brand is missing from the title — adding a brand significantly improves eBay search ranking.",
    );
  }

  return { title, notes };
}

/**
 * Compute the disclosure block. This always states the true condition.
 */
function buildDisclosure(
  values: Record<string, string | null>,
  excluded: { attribute: string; value: string; reason: string }[],
): string {
  const lines: string[] = [];

  const damage = values.visibleDamage;
  if (damage && damage !== "—") {
    lines.push(`Condition: ${damage}.`);
  } else {
    lines.push(
      "Condition: no visible damage has been reported — please inspect the photos carefully.",
    );
  }

  const testStatus = values.electricalTestStatus;
  switch (testStatus) {
    case "passed":
      lines.push("Electrical functions were tested and confirmed working.");
      break;
    case "failed":
      lines.push(
        "Electrical functions were tested and are NOT working. This part is sold as a known defect.",
      );
      break;
    case "not_tested":
      lines.push(
        "Electrical functions have NOT been tested. This part is sold as-is with no electrical guarantee.",
      );
      break;
    default:
      lines.push(
        "Electrical test status is unknown. This part is sold as-is with no electrical guarantee.",
      );
  }

  const functions = values.functions;
  if (functions) {
    lines.push(`Listed features (as reported): ${functions.split(";").join(", ")}.`);
  }

  if (excluded.length > 0) {
    lines.push(
      "Some attributes could not be confirmed from your evidence and have been left out of the listing. They are listed below so nothing is hidden from you:",
    );
    for (const item of excluded) {
      lines.push(`  • ${item.attribute}: ${item.value} — ${item.reason}`);
    }
  }

  return lines.join("\n");
}

/**
 * Build the description body.
 */
function buildDescription(
  values: Record<string, string | null>,
  disclosure: string,
): string {
  const make = values.donorMake;
  const model = values.donorModel;
  const year = values.donorYear;
  const sideText =
    values.side === "L" ? "left" : values.side === "R" ? "right" : "";
  const functions = values.functions;
  const storage = values.storageLocation;
  const accessories = values.accessories;
  const dims = values.packagedDimensions;
  const weight = values.packagedWeight;

  const parts: string[] = [];

  const vehicle = [make, model, year].filter(Boolean).join(" ");
  parts.push(
    vehicle
      ? `Used ${vehicle} ${sideText} side-view mirror, supplied as a genuine used part.`
      : `Used side-view mirror, supplied as a genuine used part.`,
  );

  if (functions) {
    parts.push(
      `Reported features: ${functions.split(";").join(", ")}. Please confirm the functions you need against the photos and the item specifics before purchasing.`,
    );
  }

  if (accessories) {
    parts.push(`Included with the part: ${accessories}.`);
  }

  if (storage) {
    parts.push(`Held at our yard at ${storage}.`);
  }

  parts.push(disclosure);

  if (dims || weight) {
    const packaging = [
      dims ? `dimensions ${dims} cm` : null,
      weight ? `weight ${weight} kg` : null,
    ]
      .filter(Boolean)
      .join(", ");
    parts.push(
      `Packaged ${packaging}.`,
    );
  }

  parts.push(
    "Photos show the actual item you will receive. Please verify compatibility with your vehicle using the manufacturer part number before purchasing — fitment is not guaranteed by the description alone.",
  );

  parts.push(
    "This part is sold as a used component from a salvaged vehicle. Any known condition issues are listed above.",
  );

  return parts.join("\n\n");
}

/**
 * Generate the listing draft for a part.
 */
export function generateListingDraft(
  partId: string,
): ListingDraftResult {
  const db = getDb();
  const resolved = resolveAttributes(partId);
  const conflicting = resolved.conflicting;

  // Flatten to a plain attribute -> value map for the draft builders.
  const values: Record<string, string | null> = {};
  for (const [attr, entry] of Object.entries(resolved.values)) {
    values[attr] = entry.value;
  }

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

  // ─── Determine which claims are publishable ───────────────────────────────
  const excludedClaims: ListingDraftResult["excludedClaims"] = [];

  for (const claim of claims) {
    if (!claim.value) continue;

    if (conflicting.has(claim.attribute)) {
      excludedClaims.push({
        attribute: claim.attribute,
        value: claim.value,
        reason: "sources disagree on this value — it was not published",
      });
      continue;
    }

    if (
      claim.evidenceStatus === "unverified" ||
      claim.evidenceStatus === "missing"
    ) {
      excludedClaims.push({
        attribute: claim.attribute,
        value: claim.value,
        reason: EVIDENCE_STATUS_META[claim.evidenceStatus]?.description ?? "not verified",
      });
      continue;
    }
  }

  // De-duplicate exclusions per attribute, keeping the first
  const seen = new Set<string>();
  const uniqueExcluded = excludedClaims.filter((e) => {
    if (seen.has(e.attribute)) return false;
    seen.add(e.attribute);
    return true;
  });

  // ─── Build item specifics from supported attributes only ─────────────────
  const itemSpecifics: Record<string, string> = {};
  const optimizationNotes: string[] = [];

  for (const [attr, label] of Object.entries(SPECIFIC_LABEL)) {
    const value = values[attr];
    if (!value || conflicting.has(attr)) continue;

    if (attr === "functions") {
      itemSpecifics[label] = titleCase(value);
    } else if (attr === "side") {
      itemSpecifics[label] = value === "L" ? "Left" : value === "R" ? "Right" : value;
    } else {
      itemSpecifics[label] = value;
    }
  }

  // Price is a specific on eBay Motors
  if (values.price) {
    itemSpecifics["Price"] = `${values.price} AED`;
  }

  // ─── Build the draft ──────────────────────────────────────────────────────
  const { title, notes: titleNotes } = buildTitle(values);
  optimizationNotes.push(...titleNotes);

  const disclosure = buildDisclosure(values, uniqueExcluded);
  const description = buildDescription(values, disclosure);

  // ─── Version handling ─────────────────────────────────────────────────────
  const existingDrafts = db
    .select()
    .from(schema.listingDrafts)
    .all()
    .filter((d) => d.partId === partId);
  const version = existingDrafts.length + 1;

  if (existingDrafts.length === 0) {
    optimizationNotes.push(
      "Draft v1 generated. Edit and approve it before publishing to eBay.",
    );
  } else {
    optimizationNotes.push(
      `Draft v${version} generated from the current evidence.`,
    );
  }

  if (uniqueExcluded.length > 0) {
    optimizationNotes.push(
      `${uniqueExcluded.length} claim${uniqueExcluded.length !== 1 ? "s" : ""} were excluded from the listing because they are not fully supported by evidence.`,
    );
  }

  const decisionsCount = decisions.length;
  if (decisionsCount > 0) {
    optimizationNotes.push(
      `${decisionsCount} seller decision${decisionsCount !== 1 ? "s" : ""} applied to this draft.`,
    );
  }

  return {
    partId,
    version,
    title,
    category: LISTING_CATEGORY,
    itemSpecifics,
    description,
    disclosureBlock: disclosure,
    excludedClaims: uniqueExcluded,
    optimizationNotes,
    isApproved: false,
  };
}

/**
 * Generate the listing draft and persist it as a new version.
 */
export function generateAndStoreListingDraft(
  partId: string,
): ListingDraftResult {
  const db = getDb();
  const draft = generateListingDraft(partId);
  const now = new Date();

  db.insert(schema.listingDrafts)
    .values({
      id: `DRF-${partId}-v${draft.version}-${Date.now()}`,
      partId,
      version: draft.version,
      title: draft.title,
      category: draft.category,
      itemSpecifics: JSON.stringify(draft.itemSpecifics),
      description: draft.description,
      disclosureBlock: draft.disclosureBlock,
      isApproved: false,
      createdAt: now,
    })
    .run();

  db.insert(schema.events)
    .values({
      id: `EVT-DRAFT-${partId}-${Date.now()}`,
      partId,
      eventType: "draft_updated",
      payload: JSON.stringify({
        action: "listing_draft_generated",
        version: draft.version,
        title: draft.title,
      }),
      createdAt: now,
    })
    .run();

  return draft;
}

/**
 * Approve the latest draft. Refuses when the part is not ready.
 */
export function approveLatestDraft(
  partId: string,
): { ok: boolean; error?: string; version?: number } {
  const db = getDb();

  const drafts = db
    .select()
    .from(schema.listingDrafts)
    .all()
    .filter((d) => d.partId === partId)
    .sort((a, b) => b.version - a.version);

  if (drafts.length === 0) {
    return { ok: false, error: "There is no listing draft to approve yet." };
  }

  const latest = drafts[0];

  // Approval gate — re-check readiness at approval time
  const assessments = db
    .select()
    .from(schema.assessments)
    .all()
    .filter((a) => a.partId === partId);

  const hasError = assessments.some((a) => a.severity === "error");
  const hasConflict = assessments.some((a) => a.assessmentType === "conflict");

  if (hasError || hasConflict) {
    return {
      ok: false,
      error:
        "Cannot approve — resolve all conflicts and missing required fields first.",
    };
  }

  const now = new Date();
  db.update(schema.listingDrafts)
    .set({ isApproved: true, approvedAt: now })
    .where(eq(schema.listingDrafts.id, latest.id))
    .run();

  db.insert(schema.events)
    .values({
      id: `EVT-APPROVE-${partId}-${Date.now()}`,
      partId,
      eventType: "approval",
      payload: JSON.stringify({
        action: "draft_approved",
        version: latest.version,
      }),
      createdAt: now,
    })
    .run();

  return { ok: true, version: latest.version };
}
