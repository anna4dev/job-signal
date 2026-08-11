/**
 * Profile vocabulary 收口.
 *
 * Skills: expand compounds + alias → display chips (small map).
 * Roles: **rules first**, not an endless title→chip dictionary:
 *   1) strip specialty tails (parens / comma / " - …")
 *   2) strip seniority + plural noise
 *   3) a short list of *families* only where structure alone is ambiguous
 *   4) language-primary titles (Rust/Python/…) → "{Lang} Engineer"
 * Job-side JD mess stays in lib/fitNormalize.ts.
 */

import {
  expandSkillLabels,
  normalizeRolePhrase,
  normalizeSkillKey,
  significantRoleTokens,
} from "@/lib/fitNormalize";

/** Canonical skill key → profile display label. */
const SKILL_DISPLAY: Record<string, string> = {
  nodejs: "Node.js",
  nextjs: "Next.js",
  react: "React",
  typescript: "TypeScript",
  javascript: "JavaScript",
  postgresql: "PostgreSQL",
  go: "Go",
  vue: "Vue",
  nuxt: "Nuxt",
  express: "Express",
  kubernetes: "Kubernetes",
  tailwind: "Tailwind",
  python: "Python",
  java: "Java",
  rust: "Rust",
  ruby: "Ruby",
  php: "PHP",
  swift: "Swift",
  kotlin: "Kotlin",
  graphql: "GraphQL",
  redis: "Redis",
  mongodb: "MongoDB",
  mysql: "MySQL",
  docker: "Docker",
  aws: "AWS",
  gcp: "GCP",
  azure: "Azure",
};

/**
 * Small family map — only for titles that rules cannot safely invent
 * (co-founder spellings, GTM, BDR, frontend≈front-end, …).
 */
const ROLE_FAMILY_DISPLAY: Record<string, string> = {
  frontend: "Frontend Engineer",
  backend: "Backend Engineer",
  fullstack: "Fullstack Engineer",
  mobile: "Mobile Engineer",
  devops: "DevOps Engineer",
  data: "Data Engineer",
  ml: "ML Engineer",
  ai_swe: "AI Software Engineer",
  ai_research: "AI Research Engineer",
  ai_inference: "AI Inference Engineer",
  ai_agent: "AI Agent Engineer",
  agentic_ops: "Agentic Operator",
  ai_systems: "AI Systems Engineer",
  ai_delivery: "AI Delivery",
  ai_associate: "AI Associate",
  llm: "LLM Engineer",
  bayesian: "Bayesian Software Engineer",
  category_theory: "Applied Category Theory",
  gtm: "Go-to-Market",
  bdr: "BDR",
  account_executive: "Account Executive",
  mts: "Member of Technical Staff",
  dotnet: ".NET Engineer",
  dotnet_architect: ".NET Architect",
  network: "Network Engineer",
  project_manager: "Project Manager",
  product: "Product Engineer",
  founding_engineer: "Founding Engineer",
  founder_associate: "Founder's Associate",
  cto_cofounder: "CTO / Co-Founder",
  cofounder: "Co-Founder",
  cto: "CTO",
  growth: "Growth",
  design: "Designer",
};

const LANG_ROLE_DISPLAY: Record<string, string> = {
  rust: "Rust Engineer",
  python: "Python Engineer",
  go: "Go Engineer",
  java: "Java Engineer",
  kotlin: "Kotlin Engineer",
  swift: "Swift Engineer",
  ruby: "Ruby Engineer",
  php: "PHP Engineer",
  scala: "Scala Engineer",
  typescript: "TypeScript Engineer",
  javascript: "JavaScript Engineer",
  csharp: ".NET Engineer",
};

const SMALL_TITLE_WORDS = new Set(["of", "and", "the", "for", "to", "in", "on"]);

function titleCaseWords(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && SMALL_TITLE_WORDS.has(lower)) return lower;
      if (lower === ".net") return ".NET";
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

function skillDisplayForKey(key: string, fallbackRaw: string): string {
  if (SKILL_DISPLAY[key]) return SKILL_DISPLAY[key];
  const cleaned = fallbackRaw.trim().replace(/\s+/g, " ");
  if (!cleaned) return key;
  if (key === cleaned.toLowerCase().replace(/[^a-z0-9]+/g, "")) {
    return titleCaseWords(cleaned.replace(/-/g, " "));
  }
  return cleaned;
}

/**
 * Expand compounds and map each atom to a canonical profile skill label.
 * "React/Next.js (TypeScript)" → ["React", "Next.js", "TypeScript"]
 */
export function canonicalizeSkillsForProfile(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of expandSkillLabels(raw)) {
    const key = normalizeSkillKey(part);
    if (!key || key.length < 2) continue;
    const display = skillDisplayForKey(key, part);
    const dedupe = display.toLowerCase();
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    out.push(display);
  }
  return out;
}

/**
 * Structural cleanup shared by unknown titles:
 * drop specialty tails, seniority, plurals, and a few redundant suffixes.
 */
export function structuralCoreTitle(raw: string): string {
  let s = raw.trim();
  if (!s) return "";

  // Parenthetical specialty: "Foo (bar)" → Foo
  s = s.replace(/\([^)]*\)/g, " ");
  // "Research: Analytic Learning Algorithms" → research family via detect;
  // also allow colon as specialty separator like comma/dash.
  if (/^research\s*:/i.test(s)) {
    return "Research";
  }
  // Head before comma / em-dash / " - " specialty clause
  s = (s.split(/\s*[,–—]\s*|\s+-\s+/)[0] ?? s).trim();
  s = s.replace(/\s+/g, " ").trim();

  // Leading seniority / level noise (may repeat: "Senior Lead …")
  for (let i = 0; i < 3; i++) {
    const next = s.replace(
      /^(junior|senior|staff|principal|lead|intern|experienced|expierenced|associate)\s+/i,
      "",
    );
    if (next === s) break;
    s = next;
  }

  // Plural job nouns
  s = s.replace(
    /\b(engineers|developers|executives|managers|scientists|researchers|associates)\b/gi,
    (_m, w: string) => w.slice(0, -1),
  );

  // Account Exec* / Account Executive Sales → Account Executive
  s = s.replace(/\baccount\s+executives?\b/gi, "Account Executive");
  s = s.replace(/\baccount\s+execs?\b/gi, "Account Executive");
  s = s.replace(/\baccount\s+executive\s+sales\b/gi, "Account Executive");

  // Executive Assistant to CEO / to the CEO / to Founder → Executive Assistant
  s = s.replace(/\bexecutive\s+assistant\s+to\s+.+$/i, "Executive Assistant");

  // "Developer Engineer" → Developer; "Engineering" trailing noise already singularized
  s = s.replace(/\bdeveloper\s+engineer\b/gi, "Developer");

  // "Software Engineering" as trailing noun → Engineer when paired with a domain
  s = s.replace(/\bsoftware\s+engineering\b/gi, "Software Engineer");

  return s.replace(/\s+/g, " ").trim();
}

function languageRoleChip(core: string): string | null {
  const phrase = normalizeRolePhrase(core);
  const compact = phrase.replace(/[^a-z0-9]+/g, "");
  if (!/(developer|engineer|distributed)/.test(compact)) return null;

  for (const [lang, label] of Object.entries(LANG_ROLE_DISPLAY)) {
    if (lang === "go") {
      if (/(?:^|[^a-z])go(?:[^a-z]|$)/.test(phrase) || compact.startsWith("go")) {
        return label;
      }
      continue;
    }
    if (compact.includes(lang) || phrase.includes(lang)) return label;
  }
  return null;
}

/**
 * Ordered family detection for ambiguous / branded titles only.
 */
function detectRoleFamilies(raw: string): string[] {
  const phrase = normalizeRolePhrase(raw);
  const compact = phrase.replace(/[^a-z0-9]+/g, "");
  const tokens = new Set(significantRoleTokens(raw));
  const families: string[] = [];

  const add = (family: string) => {
    if (!families.includes(family)) families.push(family);
  };
  const only = (family: string) => {
    add(family);
    return families;
  };
  const hasAi =
    compact.startsWith("ai") ||
    compact.includes("ainative") ||
    /(?:^|[^a-z])ai(?:[^a-z]|$)/.test(phrase);

  if (
    compact.includes("founderassociate") ||
    compact.includes("foundersassociate") ||
    (compact.includes("associate") && compact.includes("founder"))
  ) {
    return only("founder_associate");
  }

  if (
    compact.includes("foundingengineer") ||
    (compact.includes("founding") &&
      (compact.includes("engineer") || tokens.has("engineer")))
  ) {
    return only("founding_engineer");
  }

  const hasCto = tokens.has("cto") || /(?:^|[^a-z])cto(?:[^a-z]|$)/.test(phrase);
  const hasCofounder =
    compact.includes("cofounder") || phrase.includes("co founder");
  if (hasCto && hasCofounder) return only("cto_cofounder");
  if (hasCofounder) return only("cofounder");
  if (hasCto) return only("cto");

  if (compact.includes("categorytheory") || phrase.includes("category theory")) {
    return only("category_theory");
  }

  if (
    compact.includes("gotomarket") ||
    compact === "gtm" ||
    tokens.has("gtm") ||
    phrase.includes("go to market")
  ) {
    return only("gtm");
  }

  if (tokens.has("bdr") || compact === "bdr" || compact.startsWith("bdr")) {
    return only("bdr");
  }

  // Account Executive (after structural cleanup also handles; catch raw variants here)
  if (
    compact.includes("accountexecutive") ||
    compact.includes("accountexec") ||
    phrase.includes("account exec")
  ) {
    return only("account_executive");
  }

  if (
    compact.includes("memberoftechnicalstaff") ||
    compact.includes("memberoftechstaff") ||
    phrase.includes("member of technical staff")
  ) {
    return only("mts");
  }

  if (
    compact.includes("projectmanager") ||
    (compact.includes("delivery") && compact.includes("manager")) ||
    (tokens.has("manager") &&
      (compact.includes("project") || compact.includes("delivery")))
  ) {
    return only("project_manager");
  }

  if (compact.includes("bayesian")) return only("bayesian");
  if (tokens.has("llm") || compact.includes("llm")) return only("llm");

  // AI research* / bare "Research" core from "Research: …" titles
  if (
    compact === "research" ||
    compact.includes("airesearch") ||
    compact.includes("researchscientist") ||
    (compact.includes("research") &&
      (compact.includes("engineer") ||
        compact.includes("scientist") ||
        compact.includes("researcher") ||
        tokens.has("researcher")))
  ) {
    return only("ai_research");
  }

  if (compact.includes("inference") || phrase.includes("inference")) {
    return only("ai_inference");
  }

  if (compact.includes("delivery") && hasAi) return only("ai_delivery");

  // Agentic Operator / Agentic Operations Coordinator (ops, not Agent Engineer)
  if (
    compact.includes("agentic") &&
    (compact.includes("operator") || compact.includes("operations"))
  ) {
    return only("agentic_ops");
  }

  if (
    compact.includes("agentengineer") ||
    (compact.includes("agent") &&
      compact.includes("engineer") &&
      !compact.includes("agentic"))
  ) {
    return only("ai_agent");
  }

  if ((compact.includes("system") || compact.includes("systems")) && hasAi) {
    return only("ai_systems");
  }

  if (
    compact.includes("aiassociate") ||
    compact.includes("aidevelopmentassociate") ||
    (hasAi && compact.includes("associate"))
  ) {
    return only("ai_associate");
  }

  if (
    hasAi &&
    (compact.includes("software") ||
      compact.includes("ainative") ||
      phrase.includes("ai native") ||
      phrase.includes("ai software"))
  ) {
    return only("ai_swe");
  }

  if (
    compact.includes("dotnet") ||
    tokens.has("csharp") ||
    phrase.includes("c#") ||
    phrase.includes(".net")
  ) {
    if (compact.includes("architect")) return only("dotnet_architect");
    return only("dotnet");
  }

  if (compact.includes("network")) return only("network");

  const has = (family: string, ...needles: string[]) => {
    if (
      needles.some(
        (n) => compact.includes(n) || tokens.has(n) || phrase.includes(n),
      )
    ) {
      add(family);
    }
  };

  has("frontend", "frontend");
  has("backend", "backend");
  has("fullstack", "fullstack");
  has("mobile", "mobile", "ios", "android");
  has("devops", "devops", "sre", "platform");
  has("data", "data");
  has("ml", "ml", "machinelearning", "deeplearning");
  has("product", "product");
  has("growth", "growth");
  has("design", "design", "designer", "ux", "ui");

  if (families.length === 0 && (hasAi || compact.includes("aiengineer"))) {
    add("ml");
  }

  return families;
}

/**
 * Map role free-text / suggestion onto one or more Target role chips.
 * Prefers structural rules; families only when needed.
 */
export function canonicalizeRolesForProfile(raw: string): string[] {
  const fromRaw = detectRoleFamilies(raw);
  if (fromRaw.length > 0) {
    return fromRaw.map((f) => ROLE_FAMILY_DISPLAY[f]).filter(Boolean);
  }

  const core = structuralCoreTitle(raw);
  if (!core) return [];

  const fromCore = detectRoleFamilies(core);
  if (fromCore.length > 0) {
    return fromCore.map((f) => ROLE_FAMILY_DISPLAY[f]).filter(Boolean);
  }

  const lang = languageRoleChip(core);
  if (lang) return [lang];

  return [titleCaseWords(core)];
}

/** Dedupe key for profile tag equality (canonical skills/roles). */
export function profileTagKey(value: string): string {
  return value.trim().toLowerCase();
}
