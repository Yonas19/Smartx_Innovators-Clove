import { getDb, schema } from "@/lib/db/client";
import { formatTime, generatePartId } from "@/lib/utils";
import Link from "next/link";
import { Plus, Search, Upload, AlertCircle, ArrowLeft, Sparkles } from "lucide-react";
import DashboardGuide from "@/components/DashboardGuide";

export const dynamic = "force-dynamic";

async function getPartsWithStats() {
  const db = getDb();
  const allParts = db.select().from(schema.parts).all();
  const allClaims = db.select().from(schema.claims).all();
  const allAssessments = db.select().from(schema.assessments).all();

  return allParts.map((part) => {
    const partClaims = allClaims.filter((c) => c.partId === part.id);
    const partAssessments = allAssessments.filter(
      (a) => a.partId === part.id,
    );

    const openQuestions = partAssessments.filter(
      (a) => a.severity === "error" || a.severity === "warning",
    ).length;

    const hasConflicts = partAssessments.some(
      (a) => a.assessmentType === "conflict",
    );
    const hasMissing = partAssessments.some(
      (a) => a.assessmentType === "missing" && a.severity === "error",
    );
    const hasUncertain = partAssessments.some(
      (a) => a.assessmentType === "uncertain",
    );

    let readiness: { label: string; color: string };
    if (hasConflicts || hasMissing) {
      readiness = { label: "Specialist review", color: "red" };
    } else if (hasUncertain) {
      readiness = { label: "Info missing", color: "amber" };
    } else {
      readiness = { label: "Ready", color: "green" };
    }

    return {
      ...part,
      claimCount: partClaims.length,
      openQuestions,
      readiness,
    };
  });
}

const readinessChipClass: Record<string, string> = {
  red: "bg-red-100 text-red-700 border-red-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  green: "bg-green-100 text-green-700 border-green-200",
};

export default async function PartsDashboard({
  searchParams,
}: {
  searchParams: Promise<{ guide?: string }>;
}) {
  const parts = await getPartsWithStats();
  const nextPartId = generatePartId(parts.map((p) => p.id));
  const guideParam = (await searchParams).guide;

  const guideParts = parts.map((p) => ({
    id: p.id,
    name: p.displayName || p.id,
    openQuestions: p.openQuestions,
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm hidden sm:inline">Home</span>
            </Link>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Search className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-base font-semibold">Clove Dashboard</h1>
              </div>
            </div>
          </div>
          <Link
            href="/intake"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            New part
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <DashboardGuide parts={guideParts} initialGuide={guideParam} />

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Parts</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {parts.length} part{parts.length !== 1 ? "s" : ""} · Next ID:{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">{nextPartId}</code>
            </p>
          </div>
        </div>

        {parts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <Upload className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No parts yet</h3>
            <p className="mt-1 text-sm text-slate-500">
              Upload your first part to begin, or run{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">npm run seed</code>{" "}
              for demo data.
            </p>
            <Link
              href="/intake"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25"
            >
              <Plus className="h-4 w-4" />
              Upload a part
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Part ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Claims</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Open Qs</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Readiness</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parts.map((part) => (
                  <tr key={part.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/parts/${part.id}`} className="font-mono text-xs font-semibold text-indigo-600 hover:underline">
                        {part.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/parts/${part.id}`} className="font-medium text-slate-900 hover:underline">
                        {part.displayName || "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">{part.claimCount}</td>
                    <td className="px-4 py-3 text-center">
                      {part.openQuestions > 0 ? (
                        <Link
                          href={`/dashboard?guide=${part.id}`}
                          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
                          title="Open the guided details helper"
                        >
                          <AlertCircle className="h-3 w-3" />
                          {part.openQuestions}
                          <Sparkles className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${readinessChipClass[part.readiness.color]}`}>
                        {part.readiness.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">
                      {formatTime(part.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
