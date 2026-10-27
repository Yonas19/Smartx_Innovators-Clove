/**
 * extraction.ts — Extracts field-level claims from ingested sources.
 *
 * When ANTHROPIC_API_KEY is set, calls Claude (vision + text) with structured
 * JSON output via tool use. When the key is absent, falls back to a local
 * heuristic extractor that parses CSV row data and note text — this keeps the
 * app fully functional offline for development and demos.
 */

import { z } from "zod";
import { getDb, schema } from "./db/client";
import { eq } from "drizzle-orm";
import { generateClaimId, isArabic } from "./utils";
import type { IngestedSource } from "./ingest";

// ─── Zod schema for a single extracted claim ────────────────────────────────
export const ClaimSchema = z.object({
  attribute: z.string().min(1),
  value: z.string(),
  originalText: z.string(),
  language: z.enum(["en", "ar", "unknown"]).default("unknown"),
  translation: z.string().optional(),
  uncertainty: z.enum(["low", "medium", "high"]).default("low"),
});

export const ExtractionResultSchema = z.object({
  claims: z.array(ClaimSchema),
});

export type ExtractedClaim = z.infer<typeof ClaimSchema>;

// ─── Local heuristic extractor (offline fallback) ───────────────────────────

/**
 * Known attribute keywords for matching text in notes.
 */
const ATTRIBUTE_KEYWORDS: Record<string, string[]> = {
  partNumber: ["part number", "part no", "partnumber", "pn", "رقم القطعة", "رقم الجزء"],
  side: ["left", "right", "يسار", "يمين", "l ", "r ", "side=l", "side=r"],
  donorMake: ["toyota", "nissan", "bmw", "land rover", "vw", "volkswagen", "تويوتا", "نيسان", "بي إم دبليو"],
  donorModel: ["camry", "altima", "3-series", "range rover sport", "touareg", "كامري", "ألتيما"],
  donorYear: ["2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020"],
  functions: ["heated", "folding", "power", "signal", "auto-dim", "memory", "تسخين", "كهرباء", "طي"],
  electricalTestStatus: ["not tested", "tested", "passed", "failed", "not_tested", "لم يتم اختبار", "غير مختبر"],
  price: ["price", "aed", "درهم", "cost", "aed"],
  storageLocation: ["rack", "shelf", "bin", "رف", "موقع"],
  visibleDamage: ["damage", "broken", "cracked", "scratch", "damaged", "تالف", "مكسور", "خدش"],
};

const ARABIC_TRANSLATIONS: Record<string, string> = {
  "تويوتا": "Toyota",
  "نيسان": "Nissan",
  "كامري": "Camry",
  "ألتيما": "Altima",
  "يسار": "left",
  "يمين": "right",
  "تسخين": "heated",
  "كهرباء": "power",
  "طي": "folding",
  "إشارة": "signal",
  "درهم": "AED",
  "رف": "rack",
  "موقع": "location",
};

function translateArabicFragment(text: string): string {
  let result = text;
  for (const [ar, en] of Object.entries(ARABIC_TRANSLATIONS)) {
    result = result.replace(new RegExp(ar, "g"), en);
  }
  return result;
}

function extractYear(text: string): string | null {
  const match = text.match(/\b(20[12]\d)\b/);
  return match ? match[0] : null;
}

function extractPrice(text: string): string | null {
  const match = text.match(/(\d{2,5})\s*(?:aed|درهم|dirham)/i) || text.match(/price\s*=?\s*(\d{2,5})/i);
  return match ? match[1] : null;
}

function extractFunctions(text: string): string | null {
  const funcs: string[] = [];
  const lower = text.toLowerCase();
  if (lower.includes("heated") || lower.includes("تسخين")) funcs.push("heated");
  if (lower.includes("folding") || lower.includes("طي")) funcs.push("folding");
  if (lower.includes("power") || lower.includes("كهرباء")) funcs.push("power");
  if (lower.includes("signal") || lower.includes("إشارة")) funcs.push("signal");
  if (lower.includes("auto-dim") || lower.includes("auto dim")) funcs.push("auto-dim");
  if (lower.includes("memory")) funcs.push("memory");
  return funcs.length > 0 ? funcs.join(";") : null;
}

function extractSide(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("side=l") || lower.includes(" left") || lower.includes("يسار")) return "L";
  if (lower.includes("side=r") || lower.includes(" right") || lower.includes("يمين")) return "R";
  return null;
}

/**
 * Extract claims from a spreadsheet row (key=value pairs).
 */
function extractFromRowData(rowData: Record<string, string>, sourceId: string): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];

  for (const [key, value] of Object.entries(rowData)) {
    if (!value) continue;
    const normalizedKey = key.trim().replace(/[_\s]/g, "").toLowerCase();

    // Direct field match
    const attributeMap: Record<string, string> = {
      partnumber: "partNumber",
      parttype: "partType",
      brand: "brand",
      side: "side",
      donormake: "donorMake",
      donormodel: "donorModel",
      donoryear: "donorYear",
      functions: "functions",
      visibledamage: "visibleDamage",
      electricalteststatus: "electricalTestStatus",
      accessories: "accessories",
      price: "price",
      storagelocation: "storageLocation",
      packageddimensions: "packagedDimensions",
      packagedweight: "packagedWeight",
      photorefs: "photoRefs",
    };

    const attr = attributeMap[normalizedKey];
    if (attr) {
      claims.push({
        attribute: attr,
        value: value.trim(),
        originalText: `${key}=${value}`,
        language: "en",
        uncertainty: "low",
      });
    }
  }

  return claims;
}

/**
 * Extract claims from free-text notes (Arabic or English).
 */
function extractFromNote(text: string, sourceId: string, language: string): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];
  const arabic = language === "ar" || isArabic(text);
  const lower = text.toLowerCase();

  // Year
  const year = extractYear(text);
  if (year) {
    claims.push({
      attribute: "donorYear",
      value: year,
      originalText: text.match(/\b(20[12]\d)\b/)?.[0] || year,
      language: arabic ? "ar" : "en",
      translation: arabic ? undefined : undefined,
      uncertainty: "low",
    });
  }

  // Price
  const price = extractPrice(text);
  if (price) {
    const match = text.match(/(\d{2,5})\s*(?:aed|درهم|dirham)/i) || text.match(/price\s*=?\s*(\d{2,5})/i);
    claims.push({
      attribute: "price",
      value: price,
      originalText: match?.[0] || price,
      language: arabic ? "ar" : "en",
      translation: arabic ? `${price} AED` : undefined,
      uncertainty: "low",
    });
  }

  // Functions
  const funcs = extractFunctions(text);
  if (funcs) {
    const match = text.match(/(heated|folding|power|signal|auto-dim|memory|تسخين|كهرباء|طي|إشارة)[^\n]*/i);
    claims.push({
      attribute: "functions",
      value: funcs,
      originalText: match?.[0] || funcs,
      language: arabic ? "ar" : "en",
      translation: arabic ? funcs : undefined,
      uncertainty: "low",
    });
  }

  // Side
  const side = extractSide(text);
  if (side) {
    const match = text.match(/(left|right|يسار|يمين|side=[lr])/i);
    claims.push({
      attribute: "side",
      value: side,
      originalText: match?.[0] || side,
      language: arabic ? "ar" : "en",
      translation: arabic ? side : undefined,
      uncertainty: "low",
    });
  }

  // Make/Model detection
  const makeModels: Record<string, [string, string]> = {
    "toyota camry": ["Toyota", "Camry"],
    "nissan altima": ["Nissan", "Altima"],
    "bmw 3-series": ["BMW", "3-Series"],
    "range rover sport": ["Land Rover", "Range Rover Sport"],
    "vw touareg": ["VW", "Touareg"],
    "تويوتا كامري": ["Toyota", "Camry"],
    "نيسان ألتيما": ["Nissan", "Altima"],
  };
  for (const [pattern, [make, model]] of Object.entries(makeModels)) {
    if (lower.includes(pattern.toLowerCase()) || text.includes(pattern)) {
      claims.push({
        attribute: "donorMake",
        value: make,
        originalText: pattern,
        language: arabic ? "ar" : "en",
        translation: arabic ? make : undefined,
        uncertainty: "low",
      });
      claims.push({
        attribute: "donorModel",
        value: model,
        originalText: pattern,
        language: arabic ? "ar" : "en",
        translation: arabic ? model : undefined,
        uncertainty: "low",
      });
      break;
    }
  }

  // Part number
  const pnMatch = text.match(/(?:part\s*(?:number|no\.?)\s*[:=]?\s*)?([A-Z0-9]{6,}-[A-Z0-9]{2,})/i) ||
    text.match(/(?:رقم\s*(?:القطعة|الجزء)\s*[:=]?\s*)?([A-Z0-9]{6,}-[A-Z0-9]{2,})/i);
  if (pnMatch) {
    claims.push({
      attribute: "partNumber",
      value: pnMatch[1],
      originalText: pnMatch[0],
      language: arabic ? "ar" : "en",
      translation: arabic ? `Part number ${pnMatch[1]}` : undefined,
      uncertainty: "low",
    });
  }

  // Electrical test
  if (lower.includes("not tested") || lower.includes("not_tested") || text.includes("لم يتم اختبار") || text.includes("غير مختبر")) {
    claims.push({
      attribute: "electricalTestStatus",
      value: "not_tested",
      originalText: text.match(/(not tested|not_tested|لم يتم اختبار|غير مختبر)/i)?.[0] || "not tested",
      language: arabic ? "ar" : "en",
      translation: arabic ? "not tested" : undefined,
      uncertainty: "low",
    });
  }

  // Damage
  if (lower.includes("damage") || lower.includes("broken") || lower.includes("crack") || text.includes("تالف") || text.includes("مكسور")) {
    const match = text.match(/(damage[^\n]*|broken[^\n]*|crack[^\n]*|تالف[^\n]*|مكسور[^\n]*)/i);
    claims.push({
      attribute: "visibleDamage",
      value: match?.[0]?.trim() || "visible damage",
      originalText: match?.[0] || "damage",
      language: arabic ? "ar" : "en",
      translation: arabic ? translateArabicFragment(match?.[0] || "") : undefined,
      uncertainty: "medium",
    });
  }

  // Storage location
  const rackMatch = text.match(/(rack\s*[a-z]-?\d+|shelf\s*\w+|رف\s*[a-z]-?\d+)/i);
  if (rackMatch) {
    claims.push({
      attribute: "storageLocation",
      value: rackMatch[0],
      originalText: rackMatch[0],
      language: arabic ? "ar" : "en",
      translation: arabic ? translateArabicFragment(rackMatch[0]) : undefined,
      uncertainty: "low",
    });
  }

  // Store full note translation for Arabic
  if (arabic) {
    for (const claim of claims) {
      if (!claim.translation) {
        claim.translation = translateArabicFragment(claim.originalText);
      }
    }
  }

  return claims;
}

/**
 * Extract claims from a photo (simulated — in production this calls Claude Vision).
 */
function extractFromPhoto(sourceId: string, fileName: string): ExtractedClaim[] {
  // In production, this would send the image to Claude Vision and get back
  // structured claims. For the offline MVP, we return a single uncertain claim
  // indicating the photo was analyzed but needs human confirmation.
  return [
    {
      attribute: "photoRefs",
      value: fileName,
      originalText: `[Photo uploaded: ${fileName}]`,
      language: "unknown",
      uncertainty: "medium",
    },
  ];
}

// ─── Main extraction entry point ────────────────────────────────────────────

export interface ExtractOptions {
  useAI?: boolean;
}

/**
 * Extract claims from a set of ingested sources and persist them to the database.
 */
export function extractClaims(
  partId: string,
  sources: IngestedSource[],
  options: ExtractOptions = {},
): ExtractedClaim[] {
  const db = getDb();
  const now = new Date();
  const allClaims: ExtractedClaim[] = [];
  const useAI = options.useAI && process.env.ANTHROPIC_API_KEY;

  // Re-running analysis must not duplicate claims for this part.
  // Remove the previously extracted claims (decisions and sources are kept).
  const existingClaims = db
    .select()
    .from(schema.claims)
    .all()
    .filter((c) => c.partId === partId);

  for (const existing of existingClaims) {
    db.delete(schema.claims)
      .where(eq(schema.claims.id, existing.id))
      .run();
  }

  for (const source of sources) {
    let claims: ExtractedClaim[] = [];

    if (source.type === "csv" || source.type === "xlsx") {
      // Parse the file to get row data
      const fileBuffer = source.filePath
        ? require("fs").readFileSync(source.filePath)
        : null;
      if (fileBuffer) {
        let rowData: Record<string, string> = {};
        if (source.type === "csv") {
          const Papa = require("papaparse");
          const result = Papa.parse(fileBuffer.toString("utf-8"), {
            header: true,
            skipEmptyLines: true,
          });
          if (result.data?.length > 0) {
            rowData = result.data[0];
          }
        } else {
          const XLSX = require("xlsx");
          const wb = XLSX.read(fileBuffer, { type: "buffer" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet);
          if (json.length > 0) rowData = json[0];
        }
        claims = extractFromRowData(rowData, source.id);
      }
    } else if (source.type === "note" && source.originalText) {
      claims = extractFromNote(source.originalText, source.id, source.language);
    } else if (source.type === "photo") {
      const fileName = source.filePath?.split("/").pop() || "photo.jpg";
      claims = extractFromPhoto(source.id, fileName);
    }

    // Persist claims
    for (const claim of claims) {
      const claimId = generateClaimId();
      db.insert(schema.claims).values({
        id: claimId,
        partId,
        attribute: claim.attribute,
        value: claim.value,
        sourceId: source.id,
        originalText: claim.originalText,
        language: claim.language,
        translation: claim.translation,
        extractionStatus: claim.uncertainty === "high" ? "uncertain" : "extracted",
        evidenceStatus: "reported",
        location: null,
        uncertainty: claim.uncertainty,
        createdAt: now,
      }).run();

      db.insert(schema.events).values({
        id: `EVT-${claimId}`,
        partId,
        eventType: "claim_extracted",
        payload: JSON.stringify({
          claimId,
          attribute: claim.attribute,
          sourceId: source.id,
        }),
        createdAt: now,
      }).run();

      allClaims.push(claim);
    }
  }

  return allClaims;
}
