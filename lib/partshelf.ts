/**
 * Clove intake types, validation rules and mock AI helpers.
 */

export type UsedOrNew = "Used" | "New" | "Unknown";
export type TestingStatus =
  | "Tested and working"
  | "Tested and faulty"
  | "Not tested"
  | "Testing not possible";
export type FieldStatus = "missing" | "conflict" | "valid";
export type Step = "photos" | "questions" | "table";

export interface PartRecord {
  id: string;
  partType: string;
  manufacturer: string;
  partNumber: string;
  donorVehicle: string;
  condition: string;
  storageLocation: string;
  identifiers: string;
  includedComponents: string;
  side: string;
  packedSize: string;
  weight: string;
  source: string;
  sourceTooltip: string;
  usedOrNew: UsedOrNew | "";
  defects: string;
  testingStatus: TestingStatus | "";
  intendedPart: string;
  vin: string;
  oem: string;
}

export const REQUIRES_VIN_OEM = [
  "engine",
  "transmission",
  "ecu",
  "airbag",
  "dashboard",
  "instrument cluster",
  "abs module",
  "bcm",
  "pcm",
  "steering rack",
  "turbo",
];

export const TABLE_COLUMNS: {
  key: keyof PartRecord;
  label: string;
  required: boolean;
  source?: boolean;
}[] = [
  { key: "partType", label: "Part type / نوع القطعة", required: true },
  { key: "manufacturer", label: "Manufacturer / الشركة", required: true },
  { key: "partNumber", label: "Part number / رقم القطعة", required: true },
  { key: "donorVehicle", label: "Donor vehicle / مركبة التبرع", required: true },
  { key: "condition", label: "Condition / الحالة", required: true },
  { key: "storageLocation", label: "Storage location / موقع التخزين", required: true },
  { key: "identifiers", label: "Identifiers / أرقام التعريف", required: true },
  { key: "includedComponents", label: "Included components / المكونات", required: true },
  { key: "side", label: "Left / Right · يسار / يمين", required: true },
  { key: "packedSize", label: "Packed size / حجم التغليف", required: false },
  { key: "weight", label: "Weight / الوزن", required: false },
  { key: "source", label: "Source / المصدر", required: false, source: true },
];

export function requiresVinOem(record: PartRecord) {
  const type = record.partType.toLowerCase();
  return REQUIRES_VIN_OEM.some((term) => type.includes(term));
}

export function validateField(
  record: PartRecord,
  key: keyof PartRecord,
): FieldStatus {
  const value = record[key];
  const str = typeof value === "string" ? value.trim() : String(value || "");

  const requiredText: (keyof PartRecord)[] = [
    "partType",
    "manufacturer",
    "partNumber",
    "donorVehicle",
    "condition",
    "storageLocation",
    "identifiers",
    "includedComponents",
  ];

  if (requiredText.includes(key) && !str) return "missing";
  if (key === "side" && !str) return "missing";
  if (key === "usedOrNew" && !str) return "missing";
  if (key === "testingStatus" && !str) return "missing";

  if (requiresVinOem(record)) {
    if (key === "vin" && !str) return "missing";
    if (key === "oem" && !str) return "missing";
    if (
      (key === "vin" || key === "oem") &&
      record.vin.trim() &&
      record.oem.trim() &&
      record.vin.trim().toUpperCase() !== record.oem.trim().toUpperCase()
    ) {
      return "conflict";
    }
  }

  return "valid";
}

export function validateRow(record: PartRecord): FieldStatus {
  const keys: (keyof PartRecord)[] = [
    "partType",
    "manufacturer",
    "partNumber",
    "donorVehicle",
    "condition",
    "storageLocation",
    "identifiers",
    "includedComponents",
    "side",
    "usedOrNew",
    "testingStatus",
    "vin",
    "oem",
  ];
  const statuses = keys.map((k) => validateField(record, k));
  if (statuses.some((s) => s === "missing")) return "missing";
  if (statuses.some((s) => s === "conflict")) return "conflict";
  return "valid";
}

export function defaultPartRecord(id = "PART-0001"): PartRecord {
  return {
    id,
    partType: "",
    manufacturer: "",
    partNumber: "",
    donorVehicle: "",
    condition: "",
    storageLocation: "",
    identifiers: "",
    includedComponents: "",
    side: "",
    packedSize: "",
    weight: "",
    source: "",
    sourceTooltip: "",
    usedOrNew: "",
    defects: "",
    testingStatus: "",
    intendedPart: "",
    vin: "",
    oem: "",
  };
}

export interface ExtractedResult {
  record: Partial<PartRecord>;
  summary: string;
}

/**
 * Simulated AI analysis. In production this would call the vision API.
 */
export function mockAnalyzeEvidence(
  note: string,
  photoCount: number,
): ExtractedResult {
  const n = note.toLowerCase();

  let partType = "";
  if (n.includes("mirror")) partType = "Side mirror";
  else if (n.includes("door")) partType = "Door";
  else if (n.includes("engine")) partType = "Engine";
  else if (n.includes("transmission")) partType = "Transmission";
  else if (n.includes("bumper")) partType = "Bumper";
  else if (n.includes("headlight")) partType = "Headlight";
  else partType = photoCount > 0 ? "Mirror" : "";

  let manufacturer = "";
  if (n.includes("toyota")) manufacturer = "Toyota";
  else if (n.includes("honda")) manufacturer = "Honda";
  else if (n.includes("ford")) manufacturer = "Ford";
  else if (n.includes("bmw")) manufacturer = "BMW";
  else manufacturer = photoCount > 0 ? "Toyota" : "";

  let donorVehicle = "";
  const yearMatch = note.match(/(19|20)\d{2}/);
  const year = yearMatch ? yearMatch[0] : "2017";
  if (manufacturer && partType) donorVehicle = `${year} ${manufacturer} Corolla`;

  const record: Partial<PartRecord> = {
    partType,
    manufacturer,
    donorVehicle,
    partNumber: n.match(/\b\d{5}-[0-9A-Z]{4,6}\b/i)?.[0] || "",
    condition: "Good, light scuffs",
    storageLocation: "Shelf A-12",
    identifiers: n.match(/\b[A-Z0-9]{6,}\b/g)?.join(", ") || "",
    includedComponents: "Mirror assembly, mounting bracket",
    side: n.includes("left") ? "Left" : n.includes("right") ? "Right" : "",
    packedSize: "",
    weight: "",
    source: "Image, donor note",
    sourceTooltip: `${photoCount} photo(s) uploaded + seller note`,
    usedOrNew: "Used",
    defects: n.includes("crack") || n.includes("scratch")
      ? "Light surface scratches"
      : "None visible",
    testingStatus: "",
    intendedPart: partType,
  };

  const summary =
    photoCount > 0
      ? `I see a ${record.usedOrNew?.toLowerCase() || "used"} ${partType || "automotive part"}${manufacturer ? ` for a ${manufacturer}` : ""}. Labels and casting marks are partially visible. I still need your answers on testing status, exact identifiers and package measurements before the row is complete.`
      : "No photo provided. Please upload at least one image of the part so I can read labels, casting numbers and assess damage.";

  return { record, summary };
}

export interface ActionItem {
  id: string;
  priority: number;
  label: string;
  detail: string;
  field?: keyof PartRecord;
  done: boolean;
}

export function buildActionPlan(record: PartRecord): ActionItem[] {
  const items: ActionItem[] = [];

  if (requiresVinOem(record) && (!record.vin.trim() || !record.oem.trim())) {
    items.push({
      id: "vin-oem",
      priority: 1,
      label: "Provide VIN and OEM for this major component",
      detail:
        "High-value drivetrain and safety parts require a VIN and OEM match to avoid misrepresentation.",
      field: "vin",
      done: false,
    });
  }

  if (record.vin.trim() && record.oem.trim() && record.vin.toUpperCase() !== record.oem.toUpperCase()) {
    items.push({
      id: "vin-oem-match",
      priority: 1,
      label: "Resolve VIN / OEM mismatch",
      detail:
        "The VIN and OEM numbers do not match. Confirm which one is correct before posting.",
      field: "vin",
      done: false,
    });
  }

  if (validateField(record, "donorVehicle") === "missing") {
    items.push({
      id: "donor-vehicle",
      priority: 1,
      label: "Confirm donor vehicle",
      detail:
        "Fitment depends on the exact year, make and model. Check the donor record or label.",
      field: "donorVehicle",
      done: false,
    });
  }

  if (record.testingStatus === "Not tested") {
    items.push({
      id: "test-status",
      priority: 2,
      label: "Confirm testing status",
      detail:
        "Test the electrical functions or mark them as untested. Do not claim it works just because it looks undamaged.",
      field: "testingStatus",
      done: false,
    });
  }

  if (validateField(record, "testingStatus") === "missing") {
    items.push({
      id: "test-missing",
      priority: 2,
      label: "Provide testing status",
      detail:
        "Choose tested/working, tested/faulty, not tested or testing not possible.",
      field: "testingStatus",
      done: false,
    });
  }

  if (!record.packedSize.trim() || !record.weight.trim()) {
    items.push({
      id: "package",
      priority: 3,
      label: "Provide package measurements",
      detail:
        "Enter packaged weight and dimensions so shipping costs can be calculated.",
      field: "packedSize",
      done: false,
    });
  }

  if (!record.defects.trim()) {
    items.push({
      id: "defects",
      priority: 2,
      label: "Describe defects or damage",
      detail:
        'Write "None visible" only if you have inspected the part. This protects you from returns.',
      field: "defects",
      done: false,
    });
  }

  return items.sort((a, b) => a.priority - b.priority);
}

export const STORAGE_KEY = "clove-intake-draft-v1";
export const INVENTORY_STORAGE_KEY = "clove-posted-products-v1";

export interface PostedProduct {
  id: string;
  record: PartRecord;
  defects: { id: string; component: string; defect: string; testingStatus: string }[];
  photoPreview?: string;
  postedAt: string;
  status: "Posted";
}

export function getPostedProducts(): PostedProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const value = localStorage.getItem(INVENTORY_STORAGE_KEY);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

export function savePostedProduct(product: PostedProduct) {
  const current = getPostedProducts();
  const next = [product, ...current.filter((item) => item.id !== product.id)];
  localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(next));
}

export function newPartId() {
  return `PART-${Math.floor(1000 + Math.random() * 9000)}`;
}
