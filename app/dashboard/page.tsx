"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, PackageOpen, CheckCircle2, AlertTriangle, Box } from "lucide-react";
import Header from "@/components/partshelf/Header";
import { PostedProduct, getPostedProducts, validateRow } from "@/lib/partshelf";

function statusFor(product: PostedProduct) {
  const validation = validateRow(product.record);
  if (validation === "valid") {
    return { label: "Ready / جاهز", className: "border-green-200 bg-green-100 text-green-700" };
  }
  if (validation === "conflict") {
    return { label: "Review / مراجعة", className: "border-amber-200 bg-amber-100 text-amber-700" };
  }
  return { label: "Missing / ناقص", className: "border-red-200 bg-red-100 text-red-700" };
}

function ProductCard({ product }: { product: PostedProduct }) {
  const status = statusFor(product);
  const { record } = product;
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex gap-3 p-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
          {product.photoPreview ? <img src={product.photoPreview} alt={record.partType || "Part"} className="h-full w-full object-cover" /> : <Box className="h-7 w-7 text-slate-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-xs font-semibold text-slate-500">{product.id}</p>
              <h3 className="mt-1 truncate text-base font-bold text-slate-900">{record.partType || "Part"} · {record.manufacturer || "Unknown"}</h3>
            </div>
            <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${status.className}`}>{status.label}</span>
          </div>
          <p className="mt-1 truncate text-sm text-slate-500">{record.donorVehicle || "Vehicle not recorded"}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded bg-slate-100 px-2 py-1">{record.condition || "Condition —"}</span>
            <span className="rounded bg-slate-100 px-2 py-1">{record.testingStatus || "Testing —"}</span>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">Posted {new Date(product.postedAt).toLocaleDateString()} · Source: {record.source || "—"}</div>
    </article>
  );
}

export default function PartsDashboard() {
  const [products, setProducts] = useState<PostedProduct[]>([]);
  const [query, setQuery] = useState("");

  const refresh = () => setProducts(getPostedProducts());

  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.toLowerCase().trim();
    if (!needle) return products;
    return products.filter((product) =>
      [
        product.id,
        product.record.partType,
        product.record.manufacturer,
        product.record.partNumber,
        product.record.donorVehicle,
        product.record.storageLocation,
      ].some((value) => value.toLowerCase().includes(needle)),
    );
  }, [products, query]);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header active="inventory" />
      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Inventory / المخزون</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Every part, one honest row.</h1>
            <p className="mt-2 text-sm text-slate-500">{products.length} posted product{products.length === 1 ? "" : "s"} · المنتجات المنشورة</p>
          </div>
          <Link href="/intake?new=1" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"><Plus className="h-4 w-4" />New intake / إدخال جديد</Link>
        </div>

        <div className="mb-5 flex max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search part, number, vehicle or shelf / ابحث" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
        </div>

        {filtered.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100"><PackageOpen className="h-8 w-8 text-slate-400" /></div>
            <h2 className="mt-5 text-xl font-bold text-slate-900">{products.length ? "No matching products" : "No posted products yet"}</h2>
            <p className="mt-2 max-w-md text-sm text-slate-500">{products.length ? "Try another part number, vehicle or shelf." : "Post a product from the intake flow and it will appear here immediately on this device."}</p>
            <Link href="/intake?new=1" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"><Plus className="h-4 w-4" />Add product / إضافة منتج</Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:hidden">
              {filtered.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
              <table className="w-full min-w-[1180px] text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-4">Part type / نوع</th><th className="px-4 py-4">Manufacturer / الشركة</th><th className="px-4 py-4">Part number / الرقم</th><th className="px-4 py-4">Donor vehicle / المركبة</th><th className="px-4 py-4">Condition / الحالة</th><th className="px-4 py-4">Storage / التخزين</th><th className="px-4 py-4">Side / الجهة</th><th className="px-4 py-4">Testing / الفحص</th><th className="px-4 py-4">Status / الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((product) => {
                    const { record } = product;
                    const status = statusFor(product);
                    return <tr key={product.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-4"><div className="font-semibold text-slate-900">{record.partType || "—"}</div><div className="font-mono text-xs text-slate-400">{product.id}</div></td>
                      <td className="px-4 py-4 text-slate-600">{record.manufacturer || "—"}</td><td className="px-4 py-4 font-mono text-xs text-slate-600">{record.partNumber || "—"}</td><td className="px-4 py-4 text-slate-600">{record.donorVehicle || "—"}</td><td className="px-4 py-4 text-slate-600">{record.condition || "—"}</td><td className="px-4 py-4 text-slate-600">{record.storageLocation || "—"}</td><td className="px-4 py-4 text-slate-600">{record.side || "—"}</td><td className="px-4 py-4 text-slate-600">{record.testingStatus || "—"}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 className="h-4 w-4 text-green-600" />Green means all required fields are confirmed. <AlertTriangle className="ml-2 h-4 w-4 text-amber-500" />Yellow or red entries need review.</div>
          </>
        )}
      </main>
    </div>
  );
}
