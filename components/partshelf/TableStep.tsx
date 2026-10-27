"use client";

import { PartRecord, TABLE_COLUMNS, validateField, requiresVinOem, validateRow } from "@/lib/partshelf";

interface Props {
  record: PartRecord;
  onChange: (record: PartRecord) => void;
}

export default function TableStep({ record, onChange }: Props) {
  const update = (key: keyof PartRecord, value: string) => {
    onChange({ ...record, [key]: value });
  };

  const borderClass = (key: keyof PartRecord) => {
    const status = validateField(record, key);
    if (status === "missing") return "border-2 border-red-500 font-semibold";
    if (status === "conflict") return "border-2 border-amber-400 font-semibold";
    return "border border-green-500";
  };

  const vinOemRequired = requiresVinOem(record);

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`space-y-3 p-4 md:hidden ${validateRow(record) === "valid" ? "bg-green-50/60" : ""}`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Editable record / سجل قابل للتعديل</p>
        {TABLE_COLUMNS.map((col) => (
          <div key={col.key}>
            <label className="mb-1 block text-xs font-medium text-slate-500">{col.label}{col.required && <span className="ml-1 text-red-500">*</span>}</label>
            {col.source ? (
              <span title={record.sourceTooltip} className="inline-flex cursor-help rounded bg-slate-100 px-2.5 py-2 text-sm text-slate-600">{record.source || "—"}</span>
            ) : (
              <input type="text" value={record[col.key]} onChange={(e) => update(col.key, e.target.value)} placeholder={col.required ? "Required / مطلوب" : "—"} className={`w-full rounded-lg bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-200 ${borderClass(col.key)}`} />
            )}
          </div>
        ))}
      </div>
      <table className="hidden w-full text-sm md:table">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            {TABLE_COLUMNS.map((col) => (
              <th
                key={col.key}
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                {col.label}
                {col.required && <span className="ml-1 text-red-500">*</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className={validateRow(record) === "valid" ? "bg-green-50/60" : ""}>
            {TABLE_COLUMNS.map((col) => {
              if (col.source) {
                return (
                  <td key={col.key} className="px-4 py-2 align-top">
                    {record.source && (
                      <span
                        title={record.sourceTooltip}
                        className="cursor-help rounded bg-slate-100 px-2 py-1 text-xs text-slate-600"
                      >
                        {record.source}
                      </span>
                    )}
                  </td>
                );
              }
              return (
                <td key={col.key} className="px-4 py-2 align-top">
                  <input
                    type="text"
                    value={record[col.key]}
                    onChange={(e) => update(col.key, e.target.value)}
                    placeholder={col.required ? "Required" : "—"}
                    className={`w-full min-w-[120px] rounded-lg bg-white px-3 py-2 text-slate-700 outline-none transition-all focus:ring-2 focus:ring-slate-200 ${borderClass(col.key)}`}
                  />
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>

      {vinOemRequired && (
        <div className="border-t border-slate-200 bg-amber-50/50 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
            VIN / OEM required for {record.partType || "this part"}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                VIN (vehicle identification number)
              </label>
              <input
                type="text"
                value={record.vin}
                onChange={(e) => update("vin", e.target.value)}
                placeholder="e.g. JTDBU4EE3B9123456"
                className={`w-full rounded-lg bg-white px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-slate-200 ${borderClass("vin")}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                OEM (original equipment manufacturer)
              </label>
              <input
                type="text"
                value={record.oem}
                onChange={(e) => update("oem", e.target.value)}
                placeholder="e.g. JTDBU4EE3B9123456"
                className={`w-full rounded-lg bg-white px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-slate-200 ${borderClass("oem")}`}
              />
            </div>
          </div>
          {record.vin &&
            record.oem &&
            record.vin.toUpperCase() !== record.oem.toUpperCase() && (
              <p className="mt-2 text-xs text-amber-700">
                VIN and OEM do not match. Please confirm which is correct.
              </p>
            )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border-2 border-red-500" />
          Missing / wrong
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border-2 border-amber-400" />
          Conflicting
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border border-green-500" />
          Correct
        </span>
      </div>
    </div>
  );
}
