/**
 * Profile vocabulary 收口: map free-text / DB suggestion variants onto a
 * small set of display labels before persisting ExplicitProfile.
 *
 * Job-side mess (React/Next.js (TypeScript) on a JD) is handled separately in
 * lib/fitNormalize.ts at match time — do not conflate the two.
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

/** Role family → single Target role chip. */
const ROLE_FAMILY_DISPLAY: Record<string, string> = {
  frontend: "Frontend Engineer",
  backend: "Backend Engineer",
  fullstack: "Fullstack Engineer",
  mobile: "Mobile Engineer",
  devops: "DevOps Engineer",
  data: "Data Engineer",
  ml: "ML Engineer",
  ai_swe: "AI Software Engineer",
  bayesian: "Bayesian Software Engineer",
  product: "Product Engineer",
  founding_engineer: "Founding Engineer",
  founder_associate: "Founder's Associate",
  cto_cofounder: "CTO / Co-Founder",
  cofounder: "Co-Founder",
  cto: "CTO",
  growth: "Growth",
  design: "Designer",
};

function titleCaseWords(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function skillDisplayForKey(key: string, fallbackRaw: string): string {
  if (SKILL_DISPLAY[key]) return SKILL_DISPLAY[key];
  // Unknown skill: light cleanup, keep readable casing from first letter.
  const cleaned = fallbackRaw.trim().replace(/\s+/g, " ");
  if (!cleaned) return key;
  // Prefer known dotted forms already cleaned via key
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
 * Ordered, specific-first family detection. More specific titles must win over
 * generic "ai" → ML or bare "engineer" fallbacks.
 */
function detectRoleFamilies(raw: string): string[] {
  const phrase = normalizeRolePhrase(raw);
  const compact = phrase.replace(/[^a-z0-9]+/g, "");
  const tokens = new Set(significantRoleTokens(raw));
  const families: string[] = [];

  const add = (family: string) => {
    if (!families.includes(family)) families.push(family);
  };

  // Founder's / Founder / Founders Associate
  if (
    compact.includes("founderassociate") ||
    compact.includes("foundersassociate") ||
    (compact.includes("associate") && compact.includes("founder"))
  ) {
    add("founder_associate");
    return families;
  }

  // 2nd / AI founding engineer → Founding Engineer
  if (
    compact.includes("foundingengineer") ||
    (compact.includes("founding") &&
      (compact.includes("engineer") || tokens.has("engineer")))
  ) {
    add("founding_engineer");
    return families;
  }

  // CTO + Co-Founder (any order) vs Co-Founder alone vs CTO alone
  const hasCto = tokens.has("cto") || /(?:^|[^a-z])cto(?:[^a-z]|$)/.test(phrase);
  const hasCofounder =
    compact.includes("cofounder") || phrase.includes("co founder");
  if (hasCto && hasCofounder) {
    add("cto_cofounder");
    return families;
  }
  if (hasCofounder) {
    add("cofounder");
    return families;
  }
  if (hasCto) {
    add("cto");
    return families;
  }

  // Bayesian software engineer / engineering
  if (compact.includes("bayesian")) {
    add("bayesian");
    return families;
  }

  // AI native / AI software engineer (before generic ml)
  if (
    (tokens.has("ai") || compact.includes("ainative") || compact.startsWith("ai")) &&
    (compact.includes("software") ||
      compact.includes("ainative") ||
      phrase.includes("ai native") ||
      phrase.includes("ai software"))
  ) {
    add("ai_swe");
    return families;
  }

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

  // Bare "ai engineer" / "ai" + eng context → ML family
  if (
    families.length === 0 &&
    (tokens.has("ai") || compact.includes("aiengineer"))
  ) {
    add("ml");
  }

  return families;
}

/**
 * Map role free-text / suggestion onto one or more Target role chips.
 * "front-end developer" → ["Frontend Engineer"]
 * "ai product engineer (fullstack)" → ["Fullstack Engineer", "Product Engineer"]
 */
export function canonicalizeRolesForProfile(raw: string): string[] {
  const families = detectRoleFamilies(raw);
  if (families.length > 0) {
    return families.map((f) => ROLE_FAMILY_DISPLAY[f]).filter(Boolean);
  }
  const cleaned = raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[/_]+/g, " ");
  if (!cleaned) return [];
  return [titleCaseWords(cleaned)];
}

/** Dedupe key for profile tag equality (canonical skills/roles). */
export function profileTagKey(value: string): string {
  return value.trim().toLowerCase();
}
