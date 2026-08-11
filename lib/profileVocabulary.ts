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
  product: "Product Engineer",
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

function detectRoleFamilies(raw: string): string[] {
  const phrase = normalizeRolePhrase(raw);
  const compact = phrase.replace(/[^a-z0-9]+/g, "");
  const tokens = new Set(significantRoleTokens(raw));
  const families: string[] = [];

  const has = (family: string, ...needles: string[]) => {
    if (
      needles.some((n) => compact.includes(n) || tokens.has(n) || phrase.includes(n))
    ) {
      families.push(family);
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

  // "ai engineer" without ml/product → treat as ml family if "ai" alone with engineer context
  if (
    families.length === 0 &&
    (tokens.has("ai") || compact.includes("aiengineer"))
  ) {
    families.push("ml");
  }

  return [...new Set(families)];
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
