"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import LandingChatAssistant from "@/components/LandingChatAssistant";
import {
  Search,
  Upload,
  Shield,
  FileText,
  Sparkles,
  Camera,
  Languages,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Zap,
  Eye,
  GitBranch,
  Lock,
  ChevronDown,
  FileSpreadsheet,
  MessageSquare,
  ClipboardCheck,
  TrendingUp,
} from "lucide-react";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-rotate feature highlights
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((p) => (p + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: Camera,
      title: "Photo & File Intake",
      desc: "Drag-and-drop photos, CSV/XLSX rows, and paste text notes in Arabic or English. Everything gets an immutable source ID.",
      color: "bg-emerald-600",
    },
    {
      icon: Sparkles,
      title: "AI Claim Extraction",
      desc: "Claude reads your photos and notes, proposes field-level claims with source links, original text, and uncertainty flags.",
      color: "bg-emerald-600",
    },
    {
      icon: Shield,
      title: "Guardrail Enforcement",
      desc: "Deterministic code validates every claim. No invented facts, no fitment guarantees, no silent conflict resolution — ever.",
      color: "bg-emerald-600",
    },
  ];

  const evidenceFlow = [
    { icon: Upload, label: "Upload", desc: "Photos, CSV, notes" },
    { icon: Sparkles, label: "Extract", desc: "AI proposes claims" },
    { icon: Shield, label: "Verify", desc: "Check & reference" },
    { icon: MessageSquare, label: "Resolve", desc: "Answer questions" },
    { icon: ClipboardCheck, label: "Review", desc: "Approve draft" },
  ];

  const evidenceStatuses = [
    { label: "Reported", color: "bg-slate-400", text: "text-slate-700" },
    { label: "Corroborated", color: "bg-blue-400", text: "text-blue-700" },
    { label: "Conflicting", color: "bg-red-400", text: "text-red-700" },
    { label: "Missing", color: "bg-amber-400", text: "text-amber-700" },
    { label: "Seller-confirmed", color: "bg-green-400", text: "text-green-700" },
    { label: "Reference-supported", color: "bg-teal-400", text: "text-teal-700" },
    { label: "Unverified", color: "bg-emerald-400", text: "text-emerald-700" },
  ];

  const faqs = [
    {
      q: "Does Clove invent part numbers or fitment data?",
      a: "Never. Any value without a source ID is rejected. The field stays null or unverified. Compatibility text requires a reference match plus an explicit variant, or it is labelled 'not independently verified'.",
    },
    {
      q: "Can it handle Arabic notes?",
      a: "Yes. Arabic text is stored in its original form alongside an English translation. Both are editable. The UI auto-detects RTL direction. Arabic integrity is enforced by the guardrails.",
    },
    {
      q: "What happens when two sources disagree?",
      a: "The field is marked 'Conflicting' (red). It cannot be used in the draft until Noor makes a decision. Decisions are append-only events — the original claims are never deleted.",
    },
    {
      q: "Does it publish directly to eBay?",
      a: "No. Clove produces an editable listing draft. The seller approves it, but nothing leaves the system. Live eBay publishing is out of scope for the MVP.",
    },
  ];

  const stats = [
    { value: "10", label: "Synthetic mirrors\nseeded for demo" },
    { value: "7", label: "Evidence statuses\nfor full traceability" },
    { value: "8", label: "Guardrail rules\nenforced in code" },
    { value: "0", label: "Invented facts\never" },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      {/* ─── Navbar ────────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "glass shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-indigo-500/30">
              <Search className="h-5 w-5" />
              <span className="absolute -inset-1 rounded-xl bg-indigo-500/20 animate-pulse-ring" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight">Clove</span>
              <span className="ml-1.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">
                v0.1
              </span>
            </div>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Features</a>
            <a href="#how" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">How it works</a>
            <a href="#guardrails" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Guardrails</a>
            <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:inline"
            >
              Dashboard
            </Link>
            <Link
              href="/intake"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-95"
            >
              <Zap className="h-4 w-4" />
              Start Free
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 grid-pattern">
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 -left-20 h-72 w-72 rounded-full bg-indigo-300/30 blur-3xl animate-blob" />
          <div className="absolute top-40 right-0 h-96 w-96 rounded-full bg-emerald-200/20 blur-3xl animate-blob" style={{ animationDelay: "2s" }} />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-200/20 blur-3xl animate-blob" style={{ animationDelay: "4s" }} />
        </div>

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left: Copy */}
            <motion.div
              initial="hidden"
              animate={mounted ? "visible" : "hidden"}
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
              }}
              className="text-center lg:text-left"
            >
              <motion.div
                variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700"
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI-powered salvage yard listing assistant
              </motion.div>

              <motion.h1
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl"
              >
                Turn salvage evidence into{" "}
                <span className="text-gradient">traceable</span> eBay listing drafts
              </motion.h1>

              <motion.p
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="mt-6 max-w-xl text-lg text-slate-600 lg:mx-0 mx-auto"
              >
                Upload photos, spreadsheets, and chat notes in Arabic or English. AI
                extracts every claim with full provenance. Conflicts are surfaced —
                never invented.
              </motion.p>

              <motion.div
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start justify-center"
              >
                <Link
                  href="/intake"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3.5 text-base font-semibold text-white shadow-xl shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-95 sm:w-auto"
                >
                  <Upload className="h-5 w-5" />
                  Upload a part now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 sm:w-auto"
                >
                  View demo data
                </Link>
              </motion.div>

              <motion.div
                variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-500 lg:justify-start"
              >
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  No login required
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Works offline
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Bilingual EN/AR
                </div>
              </motion.div>
            </motion.div>

            {/* Right: Interactive demo card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative"
            >
              <DemoCard activeFeature={activeFeature} setActiveFeature={setActiveFeature} features={features} evidenceStatuses={evidenceStatuses} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Stats Bar ─────────────────────────────────────────────────────── */}
      <section className="border-y border-slate-200 bg-slate-50 py-12">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl font-bold text-gradient-blue">{stat.value}</div>
              <div className="mt-1 whitespace-pre-line text-sm text-slate-600">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            >
              Every claim traced to its source
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-4 text-lg text-slate-600"
            >
              Three layers of intelligence turn scattered evidence into a listing you can trust.
            </motion.p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -8 }}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-xl"
              >
                <div className="absolute inset-0 bg-emerald-600 opacity-0 transition-opacity group-hover:opacity-5" />
                <div className={`relative flex h-14 w-14 items-center justify-center rounded-xl ${feature.color} text-white shadow-lg`}>
                  {(() => { const FeatureIcon = feature.icon; return <FeatureIcon className="h-7 w-7" />; })()}
                </div>
                <h3 className="relative mt-6 text-xl font-bold text-slate-900">{feature.title}</h3>
                <p className="relative mt-3 text-sm leading-relaxed text-slate-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ──────────────────────────────────────────────────── */}
      <section id="how" className="py-24 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            >
              From salvage yard to listing in five steps
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-4 text-lg text-slate-600"
            >
              One core loop. Every step preserves provenance. Nothing is invented.
            </motion.p>
          </div>

          <div className="mt-16">
            <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center">
              {evidenceFlow.map((step, i) => (
                <div key={i} className="flex flex-1 items-center gap-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group flex flex-1 flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100">
                      {(() => { const StepIcon = step.icon; return <StepIcon className="h-6 w-6" />; })()}
                    </div>
                    <div className="mt-1 text-xs font-bold text-indigo-400">Step {i + 1}</div>
                    <div className="font-semibold text-slate-900">{step.label}</div>
                    <div className="text-xs text-slate-500">{step.desc}</div>
                  </motion.div>
                  {i < evidenceFlow.length - 1 && (
                    <ArrowRight className="hidden h-5 w-5 shrink-0 text-slate-300 md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Guardrails ────────────────────────────────────────────────────── */}
      <section id="guardrails" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700">
                <Lock className="h-3.5 w-3.5" />
                Deterministic enforcement, not just prompts
              </div>
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Guardrails that <span className="text-gradient">refuse to guess</span>
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                The LLM system prompt contains a short version of these rules, but the
                code is the enforcement. Every LLM output and every draft save is validated.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  { icon: AlertTriangle, text: "Any value without a sourceId is rejected", color: "text-red-500" },
                  { icon: Eye, text: "Compatibility text requires a reference ID or 'not independently verified'", color: "text-amber-500" },
                  { icon: GitBranch, text: "Conflicting fields cannot enter the draft until a Decision exists", color: "text-emerald-500" },
                  { icon: Languages, text: "Arabic original text is always stored beside the translation", color: "text-blue-500" },
                ].map((rule, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    {(() => { const RuleIcon = rule.icon; return <RuleIcon className={`mt-0.5 h-5 w-5 ${rule.color}`} />; })()}
                    <span className="text-sm text-slate-700">{rule.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-2xl">
                <div className="flex items-center gap-2 border-b border-slate-700 px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-xs font-mono text-slate-400">lib/guardrails.ts</span>
                </div>
                <pre className="overflow-x-auto p-6 text-xs leading-relaxed">
                  <code className="font-mono text-slate-300">
{`// Every claim must have a sourceId
if (!claim.sourceId) {
  reject("No source — value stays null");
}

// Electrical test from photo? Never.
if (claim.attribute === "electricalTestStatus"
    && claim.value === "passed"
    && claim.source.type === "photo") {
  reject("Inference blocked — photo is not a test");
}

// Conflicting field in draft? Blocked.
if (field.status === "conflicting"
    && !decisionExists(field)) {
  reject("Resolve the conflict first");
}`}
                  </code>
                </pre>
              </div>
              <div className="absolute -bottom-3 -right-3 flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
                <Shield className="h-4 w-4" />
                Enforced in code
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Evidence Statuses ─────────────────────────────────────────────── */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Seven evidence statuses. Full transparency.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-4 text-lg text-slate-400"
            >
              Every field carries a color-coded status chip so you always know what is proven and what is not.
            </motion.p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {evidenceStatuses.map((status, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.05, y: -4 }}
                className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4"
              >
                <div className={`h-3 w-3 rounded-full ${status.color}`} />
                <span className="text-sm font-medium">{status.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-emerald-700 px-8 py-16 text-center shadow-2xl"
          >
            <div className="absolute inset-0 grid-pattern opacity-20" />
            <div className="relative">
              <TrendingUp className="mx-auto h-12 w-12 text-white/90" />
              <h2 className="mt-6 text-3xl font-bold text-white sm:text-4xl">
                Ready to list with confidence?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
                Upload your first part and watch AI extract, verify, and draft your listing — all in minutes.
              </p>
              <Link
                href="/intake"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-indigo-600 shadow-xl transition-all hover:scale-105 active:scale-95"
              >
                <Upload className="h-5 w-5" />
                Start uploading now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FAQ ────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 bg-slate-50">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Frequently asked questions
          </h2>
          <div className="mt-12 space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                >
                  <span className="font-semibold text-slate-900">{faq.q}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="px-6 pb-4 text-sm leading-relaxed text-slate-600">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────────────── */}
      <LandingChatAssistant />

      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Search className="h-4 w-4" />
            </div>
            <span className="font-bold text-slate-900">Clove</span>
            <span className="text-sm text-slate-500">— MVP v0.1</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="/dashboard" className="hover:text-slate-900">Dashboard</Link>
            <Link href="/intake" className="hover:text-slate-900">Intake</Link>
            <span>Built for FutureMindz</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Interactive demo card component ─────────────────────────────────────────
function DemoCard({
  activeFeature,
  setActiveFeature,
  features,
  evidenceStatuses,
}: {
  activeFeature: number;
  setActiveFeature: (n: number) => void;
  features: { icon: typeof Camera; title: string; desc: string; color: string }[];
  evidenceStatuses: { label: string; color: string; text: string }[];
}) {
  return (
    <div className="relative">
      {/* Floating cards around the main card */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-6 -left-6 z-20 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-900">Part matched</div>
          <div className="text-[10px] text-slate-500">Reference-supported</div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute -bottom-4 -right-4 z-20 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-900">Year conflict</div>
          <div className="text-[10px] text-slate-500">2017 vs 2018</div>
        </div>
      </motion.div>

      {/* Main card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <span className="text-xs font-mono text-slate-400">MIR-0002</span>
        </div>

        {/* Card body — rotating feature display */}
        <div className="p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFeature}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${features[activeFeature].color} text-white shadow-lg`}>
                {(() => { const FeatureIcon = features[activeFeature].icon; return <FeatureIcon className="h-6 w-6" />; })()}
              </div>
              <h3 className="mt-3 font-bold text-slate-900">{features[activeFeature].title}</h3>
              <p className="mt-1 text-xs text-slate-600">{features[activeFeature].desc}</p>
            </motion.div>
          </AnimatePresence>

          {/* Mini evidence table mock */}
          <div className="mt-4 space-y-1.5">
            {[
              { attr: "partNumber", val: "81110-06B20", status: 5 },
              { attr: "donorYear", val: "2017 / 2018", status: 2 },
              { attr: "side", val: "L", status: 1 },
              { attr: "electricalTest", val: "not tested", status: 3 },
            ].map((row, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
              >
                <span className="text-xs font-medium text-slate-600">{row.attr}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-700">{row.val}</span>
                  <span className={`h-2 w-2 rounded-full ${evidenceStatuses[row.status].color}`} title={evidenceStatuses[row.status].label} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Card footer — progress dots */}
        <div className="flex items-center justify-center gap-1.5 border-t border-slate-100 bg-slate-50 py-2.5">
          {features.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveFeature(i)}
              className={`h-1.5 rounded-full transition-all ${activeFeature === i ? "w-6 bg-indigo-500" : "w-1.5 bg-slate-300"}`}
              aria-label={`Feature ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
