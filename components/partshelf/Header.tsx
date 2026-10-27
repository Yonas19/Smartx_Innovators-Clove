"use client";

import Link from "next/link";
import { Search, Box } from "lucide-react";

interface Props {
  active?: "intake" | "inventory";
}

export default function Header({ active = "intake" }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Box className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight text-slate-900">
              PartShelf
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
              Parts Intake · إدخال القطع
            </span>
          </div>
        </Link>

        <div className="hidden md:block">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-400">
            <Search className="h-3.5 w-3.5" />
            <span>Home</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/intake"
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              active === "intake"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Intake / إدخال
          </Link>
          <Link
            href="/dashboard"
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              active === "inventory"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Inventory / المخزون
          </Link>
        </div>
      </div>
    </header>
  );
}
