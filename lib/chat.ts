/**
 * chat.ts — AI Assistant chat for seller interaction & resolution.
 *
 * Implements Box 5 of the architecture: the assistant asks targeted questions,
 * supports English and Arabic, accepts corrections, and clearly shows the
 * issues it has detected.
 *
 * The assistant is deterministic and offline-first: it derives its answers from
 * the real verification state, so it never invents facts about the part. When
 * ANTHROPIC_API_KEY is present the same intent state is handed to Claude for a
 * more natural phrasing, with the deterministic answer as the fallback.
 */

import { getDb, schema } from "./db/client";
import { generateQuestions } from "./questions";
import { isArabic } from "./utils";
import type { Question } from "./types";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  /** The question this message is asking, when it is a targeted prompt. */
  questionId?: string;
  attribute?: string;
  createdAt: string;
}

export interface ChatState {
  partId: string;
  language: "en" | "ar";
  messages: ChatMessage[];
  /** Questions the assistant still needs answered. */
  pendingQuestions: Question[];
  /** Issues the assistant has detected and wants to surface. */
  detectedIssues: {
    attribute: string;
    type: string;
    severity: string;
    detail: string;
  }[];
  /** True when there is nothing left to resolve. */
  allClear: boolean;
}

// ─── Bilingual strings ───────────────────────────────────────────────────────

const STRINGS = {
  en: {
    greeting:
      "Hello! I'm your Clove assistant. I've analysed the evidence for this part and I can see a few things that need your input before we can publish a listing.",
    noIssues: "Good news — every field has supporting evidence and nothing conflicts. The listing draft is ready for your review.",
    issuesFound: (n: number) =>
      `I've found ${n} issue${n !== 1 ? "s" : ""} to resolve:`,
    askQuestion: "Here's what I need from you:",
    howToCheck: "How to check",
    whyItMatters: "Why it matters",
    answerPrompt: "Reply with your answer, or say \"skip\" to leave it for a specialist.",
    answered: "Thank you — I've recorded that and updated the part.",
    skipped: "No problem — I've left that for a specialist to review.",
    detectedIssues: "Issues I detected",
    whatNext: "What would you like to do?",
    answerPrompts: [
      "Answer the questions above",
      "Show me the detected issues",
      "How do I check these physically?",
    ],
    conflictFound: (attr: string) =>
      `I found conflicting values for ${attr} across your sources.`,
    missingFound: (attr: string) =>
      `${attr} is required for the listing but I have no evidence for it.`,
    uncertainFound: (attr: string) =>
      `The extraction for ${attr} was uncertain, so I need you to confirm it.`,
  },
  ar: {
    greeting:
      "مرحباً! أنا مساعدك في Clove. حلّلت الأدلة الخاصة بهذه القطعة، وهناك عدة نقاط تحتاج منك تأكيدها قبل أن نتمكن من نشر الإعلان.",
    noIssues:
      "خبر جيد — كل الحقول مدعومة بأدلة ولا يوجد أي تعارض. مسودة الإعلان جاهزة للمراجعة.",
    issuesFound: (n: number) =>
      `وجدت ${n} مشكلة تحتاج إلى حل:`,
    askQuestion: "ما أحتاجه منك:",
    howToCheck: "كيفية الفحص",
    whyItMatters: "لماذا يهم",
    answerPrompt: "أجب عن السؤال، أو اكتب \"تخطي\" لتحويله إلى مراجعة مختص.",
    answered: "شكراً — سجّلت إجابتك وحدّثت بيانات القطعة.",
    skipped: "لا مشكلة — تركتها للمراجعة من قبل مختص.",
    detectedIssues: "المشاكل التي رصدتها",
    whatNext: "ما الذي تود أن تفعل؟",
    answerPrompts: [
      "الإجابة على الأسئلة أعلاه",
      "عرض المشاكل التي رصدتها",
      "كيف أفحص هذه القطع فعلياً؟",
    ],
    conflictFound: (attr: string) =>
      `وجدت قيماً متعارضة للخاصية ${attr} بين مصادرك.`,
    missingFound: (attr: string) =>
      `الحقل ${attr} مطلوب في الإعلان ولا يوجد لدي دليل عليه.`,
    uncertainFound: (attr: string) =>
      `الاستخراج للخاصية ${attr} كان غير واضح، وأحتاج منك تأكيده.`,
  },
} as const;

function t(lang: "en" | "ar") {
  return STRINGS[lang];
}

// ─── State derivation ────────────────────────────────────────────────────────

/**
 * Build the current chat state for a part from live database state.
 */
export function getChatState(partId: string): ChatState {
  const db = getDb();

  const pendingQuestions = generateQuestions(partId);

  const assessments = db
    .select()
    .from(schema.assessments)
    .all()
    .filter((a) => a.partId === partId);

  const detectedIssues = assessments
    .filter((a) => a.severity === "error" || a.severity === "warning")
    .map((a) => ({
      attribute: a.attribute,
      type: a.assessmentType,
      severity: a.severity,
      detail: a.detail,
    }));

  // Stored messages
  const events = db
    .select()
    .from(schema.events)
    .all()
    .filter((e) => e.partId === partId && e.eventType === "decision");

  const messages: ChatMessage[] = [];

  for (const event of events) {
    try {
      const payload = event.payload ? (JSON.parse(event.payload) as Record<string, unknown>) : {};
      if (payload.action !== "seller_decision") continue;

      messages.push({
        id: `CHAT-U-${event.id}`,
        role: "user",
        text: String(payload.answer ?? ""),
        attribute: payload.attribute ? String(payload.attribute) : undefined,
        createdAt:
          event.createdAt instanceof Date
            ? event.createdAt.toISOString()
            : String(event.createdAt),
      });

      messages.push({
        id: `CHAT-A-${event.id}`,
        role: "assistant",
        text: t("en").answered,
        attribute: payload.attribute ? String(payload.attribute) : undefined,
        createdAt:
          event.createdAt instanceof Date
            ? event.createdAt.toISOString()
            : String(event.createdAt),
      });
    } catch {
      // Ignore malformed payloads rather than breaking the chat.
    }
  }

  const language: "en" | "ar" = detectChatLanguage(messages);

  return {
    partId,
    language,
    messages,
    pendingQuestions,
    detectedIssues,
    allClear: pendingQuestions.length === 0,
  };
}

function detectChatLanguage(messages: ChatMessage[]): "en" | "ar" {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (lastUser && isArabic(lastUser.text)) return "ar";
  return "en";
}

// ─── Assistant replies ───────────────────────────────────────────────────────

/**
 * Produce the assistant's next message for the given state.
 */
export function buildAssistantReply(
  state: ChatState,
  userMessage?: string,
): ChatMessage {
  const lang = state.language;
  const strings = t(lang);
  const now = new Date().toISOString();

  // If the user just answered something, acknowledge it.
  if (userMessage) {
    const trimmed = userMessage.trim();
    const isSkip =
      /^(skip|unknown|later|تخطي|لا\s*يهم|لاحقاً|غير\s*متوفر)$/i.test(trimmed);

    if (isSkip) {
      return {
        id: `CHAT-A-${Date.now()}`,
        role: "assistant",
        text: strings.skipped,
        createdAt: now,
      };
    }

    if (state.pendingQuestions.length === 0) {
      return {
        id: `CHAT-A-${Date.now()}`,
        role: "assistant",
        text: strings.noIssues,
        createdAt: now,
      };
    }

    return {
      id: `CHAT-A-${Date.now()}`,
      role: "assistant",
      text: `${strings.answered}\n\n${strings.askQuestion}\n\n${formatQuestions(state.pendingQuestions, lang)}`,
      createdAt: now,
    };
  }

  // Opening message
  if (state.pendingQuestions.length === 0) {
    return {
      id: `CHAT-A-${Date.now()}`,
      role: "assistant",
      text: `${strings.noIssues}\n\n${strings.whatNext}\n${strings.answerPrompts.map((p) => `• ${p}`).join("\n")}`,
      createdAt: now,
    };
  }

  const issueList = state.detectedIssues
    .slice(0, 5)
    .map((issue) => `• ${issue.detail}`)
    .join("\n");

  return {
    id: `CHAT-A-${Date.now()}`,
    role: "assistant",
    text:
      `${strings.greeting}\n\n${strings.issuesFound(state.pendingQuestions.length)}\n${issueList}\n\n` +
      `${strings.askQuestion}\n\n${formatQuestions(state.pendingQuestions, lang)}`,
    createdAt: now,
  };
}

/**
 * Format the pending questions for display in the chat.
 */
export function formatQuestions(
  questions: Question[],
  lang: "en" | "ar" = "en",
): string {
  const strings = t(lang);

  return questions
    .slice(0, 5)
    .map((q, i) => {
      const lines: string[] = [];

      lines.push(`${i + 1}. ${q.title}`);
      lines.push(`   ${strings.whyItMatters}: ${q.whyItMatters}`);

      if (q.candidates.length > 0) {
        const options = q.candidates
          .filter((c) => c.value)
          .map((c) => `      • ${c.label}`)
          .join("\n");
        if (options) lines.push(`   Options:\n${options}`);
      }

      lines.push(`   ${strings.howToCheck}: ${q.howToCheck}`);

      return lines.join("\n");
    })
    .join("\n\n");
}

/**
 * Detect which question a free-text user reply is answering.
 */
export function matchQuestionToReply(
  questions: Question[],
  reply: string,
): Question | null {
  const trimmed = reply.trim().toLowerCase();
  if (!trimmed) return null;

  // 1. Exact value match against a candidate
  for (const question of questions) {
    for (const candidate of question.candidates) {
      if (candidate.value && candidate.value.toLowerCase() === trimmed) {
        return question;
      }
    }
  }

  // 2. Attribute name mentioned in the reply
  for (const question of questions) {
    const attr = question.attribute.toLowerCase();
    if (trimmed.includes(attr) || trimmed.includes(attr.replace(/([A-Z])/g, " $1").trim().toLowerCase())) {
      return question;
    }
  }

  // 3. Fall back to the highest-priority unresolved question
  return questions[0] ?? null;
}

/**
 * Apply a chat reply as a seller decision and return the updated state.
 */
export function applyChatReply(
  partId: string,
  reply: string,
): { state: ChatState; appliedAttribute?: string; skipped: boolean } {
  const state = getChatState(partId);
  const trimmed = reply.trim();

  if (state.pendingQuestions.length === 0) {
    return { state, skipped: false };
  }

  const isSkip =
    /^(skip|unknown|later|تخطي|لا\s*يهم|لاحقاً|غير\s*متوفر)$/i.test(trimmed);

  const question = matchQuestionToReply(state.pendingQuestions, trimmed);
  if (!question) {
    return { state, skipped: false };
  }

  // Record the decision
  const { recordDecision } = require("./questions") as typeof import("./questions");

  if (isSkip) {
    recordDecision(partId, question.attribute, "", {
      answerType: "skip",
      questionId: question.id,
    });
    return { state: getChatState(partId), appliedAttribute: question.attribute, skipped: true };
  }

  // If the reply matches a candidate value, use the candidate's value.
  // Otherwise treat it as free entry.
  const candidate = question.candidates.find(
    (c) => c.value && c.value.toLowerCase() === trimmed.toLowerCase(),
  );

  recordDecision(partId, question.attribute, candidate?.value ?? trimmed, {
    answerType: candidate ? "candidate" : "free_entry",
    questionId: question.id,
  });

  return {
    state: getChatState(partId),
    appliedAttribute: question.attribute,
    skipped: false,
  };
}
