/**
 * seed.ts — Seeds the SalvageAI database with 10 synthetic mirror records.
 *
 * Includes:
 * - One planted 2017 vs 2018 conflict (acceptance test 2)
 * - One missing part number (acceptance test 1)
 * - One possible damaged mounting tab (acceptance test 3)
 *
 * Run with: npm run seed  (assumes tables already created via npm run db:push)
 */
import { getDb, schema } from "../lib/db/client";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";

const db = getDb();

// ─── Synthetic data definitions ──────────────────────────────────────────────
interface SeedPart {
  id: string;
  displayName: string;
}

interface SeedSource {
  id: string;
  type: "photo" | "csv" | "xlsx" | "note";
  filePath?: string;
  originalText?: string;
  language: string;
  detectedFormat?: string;
  contentHash?: string;
  locationMeta?: string;
  translation?: string;
}

interface SeedClaim {
  id: string;
  attribute: string;
  value: string;
  sourceId: string;
  originalText: string;
  language: string;
  translation?: string;
  extractionStatus: "extracted" | "failed" | "uncertain";
  evidenceStatus: string;
  uncertainty: string;
  location?: string;
}

interface SeedAssessment {
  id: string;
  attribute: string;
  assessmentType: string;
  severity: string;
  detail: string;
  relatedClaimIds?: string[];
  referenceId?: string;
  referenceDatasetVersion?: string;
}

interface SeedMirror {
  part: SeedPart;
  sources: SeedSource[];
  claims: SeedClaim[];
  assessments?: SeedAssessment[];
}

// ─── Helper: generate content-hash-like strings for seed data ────────────────
function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return "sha256_" + Math.abs(h).toString(16).padStart(8, "0");
}

// ─── 10 Synthetic Mirrors ────────────────────────────────────────────────────
const mirrors: SeedMirror[] = [
  // Mirror 1: Toyota Camry 2017 L mirror — clean record, reference match
  {
    part: { id: "MIR-0001", displayName: "Toyota Camry 2017 Left Mirror" },
    sources: [
      { id: "SRC-0001-01", type: "photo", filePath: "data/uploads/seed/mir-0001-photo1.jpg", language: "unknown", detectedFormat: "image/jpeg", contentHash: hash("mir0001photo1"), locationMeta: JSON.stringify({ index: 1 }) },
      { id: "SRC-0001-02", type: "csv", originalText: "partNumber=81110-06B20,side=L,donorMake=Toyota,donorModel=Camry,donorYear=2017,price=350", language: "en", detectedFormat: "text/csv", contentHash: hash("mir0001csv"), locationMeta: JSON.stringify({ row: 2 }) },
      { id: "SRC-0001-03", type: "note", originalText: "Toyota Camry left mirror, good condition, heated, power. 350 AED.", language: "en", detectedFormat: "text/plain", contentHash: hash("mir0001note") },
    ],
    claims: [
      { id: "CLM-0001-01", attribute: "partNumber", value: "81110-06B20", sourceId: "SRC-0001-02", originalText: "partNumber=81110-06B20", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 2, field: "partNumber" }) },
      { id: "CLM-0001-02", attribute: "side", value: "L", sourceId: "SRC-0001-02", originalText: "side=L", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 2, field: "side" }) },
      { id: "CLM-0001-03", attribute: "donorMake", value: "Toyota", sourceId: "SRC-0001-02", originalText: "donorMake=Toyota", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 2, field: "donorMake" }) },
      { id: "CLM-0001-04", attribute: "donorModel", value: "Camry", sourceId: "SRC-0001-02", originalText: "donorModel=Camry", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 2, field: "donorModel" }) },
      { id: "CLM-0001-05", attribute: "donorYear", value: "2017", sourceId: "SRC-0001-02", originalText: "donorYear=2017", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 2, field: "donorYear" }) },
      { id: "CLM-0001-06", attribute: "functions", value: "heated;power", sourceId: "SRC-0001-03", originalText: "heated, power", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0001-07", attribute: "price", value: "350", sourceId: "SRC-0001-02", originalText: "price=350", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 2, field: "price" }) },
    ],
  },

  // Mirror 2: PLANTED CONFLICT — CSV says 2017, Arabic note says 2018 (acceptance test 2)
  {
    part: { id: "MIR-0002", displayName: "Toyota Camry 2017/2018 Left Mirror (CONFLICT)" },
    sources: [
      { id: "SRC-0002-01", type: "photo", filePath: "data/uploads/seed/mir-0002-photo1.jpg", language: "unknown", detectedFormat: "image/jpeg", contentHash: hash("mir0002photo1"), locationMeta: JSON.stringify({ index: 1 }) },
      { id: "SRC-0002-02", type: "csv", originalText: "partNumber=81110-06B20,side=L,donorMake=Toyota,donorModel=Camry,donorYear=2017,price=300", language: "en", detectedFormat: "text/csv", contentHash: hash("mir0002csv"), locationMeta: JSON.stringify({ row: 3 }) },
      { id: "SRC-0002-03", type: "note", originalText: "مرآة تويوتا كامري 2018 يسار، تسخين وكهرباء، السعر 300 درهم", language: "ar", detectedFormat: "text/plain", contentHash: hash("mir0002note"), translation: "Toyota Camry 2018 left mirror, heated and power, price 300 AED" },
    ],
    claims: [
      { id: "CLM-0002-01", attribute: "partNumber", value: "81110-06B20", sourceId: "SRC-0002-02", originalText: "partNumber=81110-06B20", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 3, field: "partNumber" }) },
      { id: "CLM-0002-02", attribute: "donorYear", value: "2017", sourceId: "SRC-0002-02", originalText: "donorYear=2017", language: "en", extractionStatus: "extracted", evidenceStatus: "conflicting", uncertainty: "low", location: JSON.stringify({ row: 3, field: "donorYear" }) },
      { id: "CLM-0002-03", attribute: "donorYear", value: "2018", sourceId: "SRC-0002-03", originalText: "مرآة تويوتا كامري 2018 يسار", language: "ar", translation: "Toyota Camry 2018 left mirror", extractionStatus: "extracted", evidenceStatus: "conflicting", uncertainty: "low" },
      { id: "CLM-0002-04", attribute: "side", value: "L", sourceId: "SRC-0002-02", originalText: "side=L", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 3, field: "side" }) },
      { id: "CLM-0002-05", attribute: "functions", value: "heated;power", sourceId: "SRC-0002-03", originalText: "تسخين وكهرباء", language: "ar", translation: "heated and power", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0002-06", attribute: "price", value: "300", sourceId: "SRC-0002-03", originalText: "السعر 300 درهم", language: "ar", translation: "price 300 AED", extractionStatus: "extracted", evidenceStatus: "corroborated", uncertainty: "low" },
      { id: "CLM-0002-07", attribute: "price", value: "300", sourceId: "SRC-0002-02", originalText: "price=300", language: "en", extractionStatus: "extracted", evidenceStatus: "corroborated", uncertainty: "low", location: JSON.stringify({ row: 3, field: "price" }) },
    ],
    assessments: [
      { id: "ASM-0002-01", attribute: "donorYear", assessmentType: "conflict", severity: "error", detail: "CSV says 2017 but Arabic note says 2018. Cannot auto-select — seller must resolve.", relatedClaimIds: ["CLM-0002-02", "CLM-0002-03"] },
    ],
  },

  // Mirror 3: MISSING PART NUMBER (acceptance test 1) — asks for sharper label photo
  {
    part: { id: "MIR-0003", displayName: "Nissan Altima 2017 Right Mirror (MISSING PN)" },
    sources: [
      { id: "SRC-0003-01", type: "photo", filePath: "data/uploads/seed/mir-0003-photo1.jpg", language: "unknown", detectedFormat: "image/jpeg", contentHash: hash("mir0003photo1"), locationMeta: JSON.stringify({ index: 1 }) },
      { id: "SRC-0003-02", type: "note", originalText: "Nissan Altima right mirror, folding and power with signal, 2017. No part number visible on label.", language: "en", detectedFormat: "text/plain", contentHash: hash("mir0003note") },
    ],
    claims: [
      { id: "CLM-0003-01", attribute: "donorMake", value: "Nissan", sourceId: "SRC-0003-02", originalText: "Nissan Altima right mirror", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0003-02", attribute: "donorModel", value: "Altima", sourceId: "SRC-0003-02", originalText: "Nissan Altima right mirror", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0003-03", attribute: "donorYear", value: "2017", sourceId: "SRC-0003-02", originalText: "2017", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0003-04", attribute: "side", value: "R", sourceId: "SRC-0003-02", originalText: "right mirror", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0003-05", attribute: "functions", value: "folding;power;signal", sourceId: "SRC-0003-02", originalText: "folding and power with signal", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0003-06", attribute: "partNumber", value: "", sourceId: "SRC-0003-01", originalText: "No part number visible on label", language: "en", extractionStatus: "failed", evidenceStatus: "missing", uncertainty: "high" },
    ],
    assessments: [
      { id: "ASM-0003-01", attribute: "partNumber", assessmentType: "missing", severity: "error", detail: "Part number is required but no readable label was found. Ask Noor for a sharper photo of the part label/sticker.", relatedClaimIds: ["CLM-0003-06"] },
    ],
  },

  // Mirror 4: POSSIBLE DAMAGED MOUNTING TAB (acceptance test 3)
  {
    part: { id: "MIR-0004", displayName: "BMW 3-Series 2016 Right Mirror (POSSIBLE DAMAGED TAB)" },
    sources: [
      { id: "SRC-0004-01", type: "photo", filePath: "data/uploads/seed/mir-0004-photo1.jpg", language: "unknown", detectedFormat: "image/jpeg", contentHash: hash("mir0004photo1"), locationMeta: JSON.stringify({ index: 1 }) },
      { id: "SRC-0004-02", type: "photo", filePath: "data/uploads/seed/mir-0004-photo2.jpg", language: "unknown", detectedFormat: "image/jpeg", contentHash: hash("mir0004photo2"), locationMeta: JSON.stringify({ index: 2 }) },
      { id: "SRC-0004-03", type: "csv", originalText: "partNumber=5134925AG,side=R,donorMake=BMW,donorModel=3-Series,donorYear=2016,functions=heated;folding;power;auto-dim,price=800", language: "en", detectedFormat: "text/csv", contentHash: hash("mir0004csv"), locationMeta: JSON.stringify({ row: 4 }) },
    ],
    claims: [
      { id: "CLM-0004-01", attribute: "partNumber", value: "5134925AG", sourceId: "SRC-0004-03", originalText: "partNumber=5134925AG", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 4, field: "partNumber" }) },
      { id: "CLM-0004-02", attribute: "side", value: "R", sourceId: "SRC-0004-03", originalText: "side=R", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 4, field: "side" }) },
      { id: "CLM-0004-03", attribute: "donorMake", value: "BMW", sourceId: "SRC-0004-03", originalText: "donorMake=BMW", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 4, field: "donorMake" }) },
      { id: "CLM-0004-04", attribute: "donorModel", value: "3-Series", sourceId: "SRC-0004-03", originalText: "donorModel=3-Series", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 4, field: "donorModel" }) },
      { id: "CLM-0004-05", attribute: "donorYear", value: "2016", sourceId: "SRC-0004-03", originalText: "donorYear=2016", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 4, field: "donorYear" }) },
      { id: "CLM-0004-06", attribute: "functions", value: "heated;folding;power;auto-dim", sourceId: "SRC-0004-03", originalText: "functions=heated;folding;power;auto-dim", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 4, field: "functions" }) },
      { id: "CLM-0004-07", attribute: "visibleDamage", value: "possible broken mounting tab", sourceId: "SRC-0004-01", originalText: "[Vision: mounting tab area appears cracked in photo 1]", language: "en", extractionStatus: "uncertain", evidenceStatus: "unverified", uncertainty: "high" },
      { id: "CLM-0004-08", attribute: "price", value: "800", sourceId: "SRC-0004-03", originalText: "price=800", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 4, field: "price" }) },
    ],
    assessments: [
      { id: "ASM-0004-01", attribute: "visibleDamage", assessmentType: "uncertain", severity: "warning", detail: "Photo analysis suggests a possible broken mounting tab. Noor must confirm or deny before this goes into the draft.", relatedClaimIds: ["CLM-0004-07"] },
    ],
  },

  // Mirror 5: NO ELECTRICAL TEST — draft should say "not tested" (acceptance test 4)
  {
    part: { id: "MIR-0005", displayName: "Land Rover Range Rover Sport 2015 Left Mirror (NOT TESTED)" },
    sources: [
      { id: "SRC-0005-01", type: "photo", filePath: "data/uploads/seed/mir-0005-photo1.jpg", language: "unknown", detectedFormat: "image/jpeg", contentHash: hash("mir0005photo1"), locationMeta: JSON.stringify({ index: 1 }) },
      { id: "SRC-0005-02", type: "note", originalText: "Range Rover Sport 2015 left mirror, heated folding power memory, looks good but not tested electrically yet.", language: "en", detectedFormat: "text/plain", contentHash: hash("mir0005note") },
    ],
    claims: [
      { id: "CLM-0005-01", attribute: "donorMake", value: "Land Rover", sourceId: "SRC-0005-02", originalText: "Range Rover Sport 2015 left mirror", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0005-02", attribute: "donorModel", value: "Range Rover Sport", sourceId: "SRC-0005-02", originalText: "Range Rover Sport", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0005-03", attribute: "donorYear", value: "2015", sourceId: "SRC-0005-02", originalText: "2015", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0005-04", attribute: "side", value: "L", sourceId: "SRC-0005-02", originalText: "left mirror", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0005-05", attribute: "functions", value: "heated;folding;power;memory", sourceId: "SRC-0005-02", originalText: "heated folding power memory", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0005-06", attribute: "electricalTestStatus", value: "not_tested", sourceId: "SRC-0005-02", originalText: "not tested electrically yet", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
    ],
  },

  // Mirror 6: WIDE COMPATIBILITY CLAIM WITHOUT REFERENCE (acceptance test 5)
  {
    part: { id: "MIR-0006", displayName: "VW Touareg 2014 Right Mirror (UNVERIFIED FITMENT)" },
    sources: [
      { id: "SRC-0006-01", type: "photo", filePath: "data/uploads/seed/mir-0006-photo1.jpg", language: "unknown", detectedFormat: "image/jpeg", contentHash: hash("mir0006photo1"), locationMeta: JSON.stringify({ index: 1 }) },
      { id: "SRC-0006-02", type: "note", originalText: "VW Touareg right mirror 2014, fits all Touareg 2010-2017. Heated power auto-dim. Part number 7P1-857-501B.", language: "en", detectedFormat: "text/plain", contentHash: hash("mir0006note") },
    ],
    claims: [
      { id: "CLM-0006-01", attribute: "partNumber", value: "7P1-857-501B", sourceId: "SRC-0006-02", originalText: "Part number 7P1-857-501B", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0006-02", attribute: "donorMake", value: "VW", sourceId: "SRC-0006-02", originalText: "VW Touareg", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0006-03", attribute: "donorModel", value: "Touareg", sourceId: "SRC-0006-02", originalText: "VW Touareg", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0006-04", attribute: "donorYear", value: "2014", sourceId: "SRC-0006-02", originalText: "2014", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0006-05", attribute: "side", value: "R", sourceId: "SRC-0006-02", originalText: "right mirror", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0006-06", attribute: "functions", value: "heated;power;auto-dim", sourceId: "SRC-0006-02", originalText: "Heated power auto-dim", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0006-07", attribute: "fitmentClaim", value: "fits all Touareg 2010-2017", sourceId: "SRC-0006-02", originalText: "fits all Touareg 2010-2017", language: "en", extractionStatus: "extracted", evidenceStatus: "unverified", uncertainty: "high" },
    ],
    assessments: [
      { id: "ASM-0006-01", attribute: "fitmentClaim", assessmentType: "reference_check", severity: "warning", detail: "Wide compatibility claim (2010-2017) exceeds reference coverage (2011-2017). Marked unverified, blocked from fitment text.", relatedClaimIds: ["CLM-0006-07"] },
    ],
  },

  // Mirror 7: Toyota Camry 2018 L — clean reference match
  {
    part: { id: "MIR-0007", displayName: "Toyota Camry 2018 Left Mirror" },
    sources: [
      { id: "SRC-0007-01", type: "photo", filePath: "data/uploads/seed/mir-0007-photo1.jpg", language: "unknown", detectedFormat: "image/jpeg", contentHash: hash("mir0007photo1"), locationMeta: JSON.stringify({ index: 1 }) },
      { id: "SRC-0007-02", type: "csv", originalText: "partNumber=81110-06B21,side=L,donorMake=Toyota,donorModel=Camry,donorYear=2018,functions=heated;power,price=400", language: "en", detectedFormat: "text/csv", contentHash: hash("mir0007csv"), locationMeta: JSON.stringify({ row: 5 }) },
    ],
    claims: [
      { id: "CLM-0007-01", attribute: "partNumber", value: "81110-06B21", sourceId: "SRC-0007-02", originalText: "partNumber=81110-06B21", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 5, field: "partNumber" }) },
      { id: "CLM-0007-02", attribute: "side", value: "L", sourceId: "SRC-0007-02", originalText: "side=L", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 5, field: "side" }) },
      { id: "CLM-0007-03", attribute: "donorYear", value: "2018", sourceId: "SRC-0007-02", originalText: "donorYear=2018", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 5, field: "donorYear" }) },
      { id: "CLM-0007-04", attribute: "functions", value: "heated;power", sourceId: "SRC-0007-02", originalText: "functions=heated;power", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 5, field: "functions" }) },
      { id: "CLM-0007-05", attribute: "price", value: "400", sourceId: "SRC-0007-02", originalText: "price=400", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 5, field: "price" }) },
    ],
  },

  // Mirror 8: Nissan Altima 2017 L — clean reference match, Arabic note
  {
    part: { id: "MIR-0008", displayName: "Nissan Altima 2017 Left Mirror (AR note)" },
    sources: [
      { id: "SRC-0008-01", type: "photo", filePath: "data/uploads/seed/mir-0008-photo1.jpg", language: "unknown", detectedFormat: "image/jpeg", contentHash: hash("mir0008photo1"), locationMeta: JSON.stringify({ index: 1 }) },
      { id: "SRC-0008-02", type: "note", originalText: "مرآة نيسان ألتيما 2017 يسار، طي كهربائي إشارة، رقم القطعة 96300-CN001، السعر 450 درهم، الموقع رف A-5", language: "ar", detectedFormat: "text/plain", contentHash: hash("mir0008note"), translation: "Nissan Altima 2017 left mirror, folding power signal, part number 96300-CN001, price 450 AED, location rack A-5" },
    ],
    claims: [
      { id: "CLM-0008-01", attribute: "partNumber", value: "96300-CN001", sourceId: "SRC-0008-02", originalText: "رقم القطعة 96300-CN001", language: "ar", translation: "part number 96300-CN001", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0008-02", attribute: "donorMake", value: "Nissan", sourceId: "SRC-0008-02", originalText: "نيسان ألتيما", language: "ar", translation: "Nissan Altima", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0008-03", attribute: "donorYear", value: "2017", sourceId: "SRC-0008-02", originalText: "2017", language: "ar", translation: "2017", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0008-04", attribute: "side", value: "L", sourceId: "SRC-0008-02", originalText: "يسار", language: "ar", translation: "left", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0008-05", attribute: "functions", value: "folding;power;signal", sourceId: "SRC-0008-02", originalText: "طي كهربائي إشارة", language: "ar", translation: "folding power signal", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0008-06", attribute: "price", value: "450", sourceId: "SRC-0008-02", originalText: "السعر 450 درهم", language: "ar", translation: "price 450 AED", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
      { id: "CLM-0008-07", attribute: "storageLocation", value: "Rack A-5", sourceId: "SRC-0008-02", originalText: "الموقع رف A-5", language: "ar", translation: "location rack A-5", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low" },
    ],
  },

  // Mirror 9: Land Rover RRS 2015 R — clean
  {
    part: { id: "MIR-0009", displayName: "Land Rover Range Rover Sport 2015 Right Mirror" },
    sources: [
      { id: "SRC-0009-01", type: "photo", filePath: "data/uploads/seed/mir-0009-photo1.jpg", language: "unknown", detectedFormat: "image/jpeg", contentHash: hash("mir0009photo1"), locationMeta: JSON.stringify({ index: 1 }) },
      { id: "SRC-0009-02", type: "csv", originalText: "partNumber=GV8R-17K707-AB,side=R,donorMake=Land Rover,donorModel=Range Rover Sport,donorYear=2015,functions=heated;folding;power;memory;signal,price=1200", language: "en", detectedFormat: "text/csv", contentHash: hash("mir0009csv"), locationMeta: JSON.stringify({ row: 6 }) },
    ],
    claims: [
      { id: "CLM-0009-01", attribute: "partNumber", value: "GV8R-17K707-AB", sourceId: "SRC-0009-02", originalText: "partNumber=GV8R-17K707-AB", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 6, field: "partNumber" }) },
      { id: "CLM-0009-02", attribute: "side", value: "R", sourceId: "SRC-0009-02", originalText: "side=R", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 6, field: "side" }) },
      { id: "CLM-0009-03", attribute: "donorMake", value: "Land Rover", sourceId: "SRC-0009-02", originalText: "donorMake=Land Rover", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 6, field: "donorMake" }) },
      { id: "CLM-0009-04", attribute: "donorModel", value: "Range Rover Sport", sourceId: "SRC-0009-02", originalText: "donorModel=Range Rover Sport", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 6, field: "donorModel" }) },
      { id: "CLM-0009-05", attribute: "donorYear", value: "2015", sourceId: "SRC-0009-02", originalText: "donorYear=2015", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 6, field: "donorYear" }) },
      { id: "CLM-0009-06", attribute: "functions", value: "heated;folding;power;memory;signal", sourceId: "SRC-0009-02", originalText: "functions=heated;folding;power;memory;signal", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 6, field: "functions" }) },
      { id: "CLM-0009-07", attribute: "price", value: "1200", sourceId: "SRC-0009-02", originalText: "price=1200", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 6, field: "price" }) },
    ],
  },

  // Mirror 10: VW Touareg 2014 L — clean
  {
    part: { id: "MIR-0010", displayName: "VW Touareg 2014 Left Mirror" },
    sources: [
      { id: "SRC-0010-01", type: "photo", filePath: "data/uploads/seed/mir-0010-photo1.jpg", language: "unknown", detectedFormat: "image/jpeg", contentHash: hash("mir0010photo1"), locationMeta: JSON.stringify({ index: 1 }) },
      { id: "SRC-0010-02", type: "csv", originalText: "partNumber=7P1-857-501A,side=L,donorMake=VW,donorModel=Touareg,donorYear=2014,functions=heated;power;auto-dim,price=350,storageLocation=Rack C-2", language: "en", detectedFormat: "text/csv", contentHash: hash("mir0010csv"), locationMeta: JSON.stringify({ row: 7 }) },
    ],
    claims: [
      { id: "CLM-0010-01", attribute: "partNumber", value: "7P1-857-501A", sourceId: "SRC-0010-02", originalText: "partNumber=7P1-857-501A", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 7, field: "partNumber" }) },
      { id: "CLM-0010-02", attribute: "side", value: "L", sourceId: "SRC-0010-02", originalText: "side=L", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 7, field: "side" }) },
      { id: "CLM-0010-03", attribute: "donorMake", value: "VW", sourceId: "SRC-0010-02", originalText: "donorMake=VW", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 7, field: "donorMake" }) },
      { id: "CLM-0010-04", attribute: "donorModel", value: "Touareg", sourceId: "SRC-0010-02", originalText: "donorModel=Touareg", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 7, field: "donorModel" }) },
      { id: "CLM-0010-05", attribute: "donorYear", value: "2014", sourceId: "SRC-0010-02", originalText: "donorYear=2014", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 7, field: "donorYear" }) },
      { id: "CLM-0010-06", attribute: "functions", value: "heated;power;auto-dim", sourceId: "SRC-0010-02", originalText: "functions=heated;power;auto-dim", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 7, field: "functions" }) },
      { id: "CLM-0010-07", attribute: "price", value: "350", sourceId: "SRC-0010-02", originalText: "price=350", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 7, field: "price" }) },
      { id: "CLM-0010-08", attribute: "storageLocation", value: "Rack C-2", sourceId: "SRC-0010-02", originalText: "storageLocation=Rack C-2", language: "en", extractionStatus: "extracted", evidenceStatus: "reported", uncertainty: "low", location: JSON.stringify({ row: 7, field: "storageLocation" }) },
    ],
  },
];

// ─── Seed execution ──────────────────────────────────────────────────────────
async function seed() {
  console.log("🌱 Seeding SalvageAI database...");

  // Create placeholder photo files for seed data
  const uploadsDir = path.join(process.cwd(), "data", "uploads", "seed");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Wipe existing seed data (keep tables)
  console.log("  Clearing existing data...");
  db.delete(schema.events).run();
  db.delete(schema.readinessResults).run();
  db.delete(schema.listingDrafts).run();
  db.delete(schema.assessments).run();
  db.delete(schema.decisions).run();
  db.delete(schema.claims).run();
  db.delete(schema.sources).run();
  db.delete(schema.parts).run();

  const now = new Date();

  for (const mirror of mirrors) {
    console.log(`  Inserting ${mirror.part.id} — ${mirror.part.displayName}`);

    // Insert part
    db.insert(schema.parts)
      .values({
        id: mirror.part.id,
        partType: "mirror",
        displayName: mirror.part.displayName,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // Insert sources
    for (const src of mirror.sources) {
      // Create placeholder photo file
      if (src.type === "photo" && src.filePath) {
        const fullPath = path.join(process.cwd(), src.filePath);
        if (!fs.existsSync(fullPath)) {
          fs.writeFileSync(fullPath, `placeholder image for ${mirror.part.id}`);
        }
      }

      db.insert(schema.sources)
        .values({
          id: src.id,
          partId: mirror.part.id,
          type: src.type,
          filePath: src.filePath,
          originalText: src.originalText,
          language: src.language,
          detectedFormat: src.detectedFormat,
          contentHash: src.contentHash,
          locationMeta: src.locationMeta,
          createdAt: now,
        })
        .run();

      // Log source_added event
      db.insert(schema.events)
        .values({
          id: `EVT-${src.id}`,
          partId: mirror.part.id,
          eventType: "source_added",
          payload: JSON.stringify({ sourceId: src.id, type: src.type }),
          createdAt: now,
        })
        .run();
    }

    // Insert claims
    for (const clm of mirror.claims) {
      db.insert(schema.claims)
        .values({
          id: clm.id,
          partId: mirror.part.id,
          attribute: clm.attribute,
          value: clm.value,
          sourceId: clm.sourceId,
          originalText: clm.originalText,
          language: clm.language,
          translation: clm.translation,
          extractionStatus: clm.extractionStatus,
          evidenceStatus: clm.evidenceStatus,
          location: clm.location,
          uncertainty: clm.uncertainty,
          createdAt: now,
        })
        .run();

      // Log claim_extracted event
      db.insert(schema.events)
        .values({
          id: `EVT-${clm.id}`,
          partId: mirror.part.id,
          eventType: "claim_extracted",
          payload: JSON.stringify({ claimId: clm.id, attribute: clm.attribute }),
          createdAt: now,
        })
        .run();
    }

    // Insert assessments
    if (mirror.assessments) {
      for (const asm of mirror.assessments) {
        db.insert(schema.assessments)
          .values({
            id: asm.id,
            partId: mirror.part.id,
            attribute: asm.attribute,
            assessmentType: asm.assessmentType,
            severity: asm.severity,
            detail: asm.detail,
            relatedClaimIds: asm.relatedClaimIds
              ? JSON.stringify(asm.relatedClaimIds)
              : null,
            referenceId: asm.referenceId,
            referenceDatasetVersion: asm.referenceDatasetVersion,
            createdAt: now,
          })
          .run();
      }
    }

    // Log verification event
    db.insert(schema.events)
      .values({
        id: `EVT-VERIFY-${mirror.part.id}`,
        partId: mirror.part.id,
        eventType: "verification",
        payload: JSON.stringify({
          assessments: mirror.assessments?.length ?? 0,
        }),
        createdAt: now,
      })
      .run();
  }

  // Verify counts
  const partCount = db.select().from(schema.parts).all().length;
  const sourceCount = db.select().from(schema.sources).all().length;
  const claimCount = db.select().from(schema.claims).all().length;
  const assessmentCount = db.select().from(schema.assessments).all().length;
  const eventCount = db.select().from(schema.events).all().length;

  console.log("");
  console.log("✅ Seed complete!");
  console.log(`   Parts:       ${partCount}`);
  console.log(`   Sources:     ${sourceCount}`);
  console.log(`   Claims:      ${claimCount}`);
  console.log(`   Assessments: ${assessmentCount}`);
  console.log(`   Events:      ${eventCount}`);
  console.log("");
  console.log("Planted scenarios:");
  console.log("  • MIR-0002: 2017 (CSV) vs 2018 (Arabic note) conflict");
  console.log("  • MIR-0003: Missing part number (acceptance test 1)");
  console.log("  • MIR-0004: Possible damaged mounting tab (acceptance test 3)");
  console.log("  • MIR-0005: No electrical test — must say 'not tested'");
  console.log("  • MIR-0006: Wide compatibility claim without reference (acceptance test 5)");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
