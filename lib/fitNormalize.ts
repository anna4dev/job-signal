/**
 * Normalize skill/stack and role labels for fit() matching.
 * Compound cells like "React/Next.js (TypeScript)" expand to atomic keys.
 */

const MIN_TOKEN_LEN = 3;

function lower(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

/** Split compound stack cells on /, |, +, commas, and parentheses. */
export function expandSkillLabels(raw: string): string[] {
  const s = raw.trim();
  if (!s) return [];
  const parts = s
    .split(/[/|,+]|[()]/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [s];
}

/**
 * Canonical skill key: node.js → nodejs, next.js → nextjs, react.js → react.
 * Exact equality on these keys is the primary skill match (avoids go⊂google).
 */
export function normalizeSkillKey(raw: string): string {
  let s = lower(raw);
  if (!s) return "";

  // Strip trailing version-ish noise: "node.js v20" → keep words before
  s = s.replace(/\bv?\d+(\.\d+)*\b/g, " ");

  const aliases: Record<string, string> = {
    "node.js": "nodejs",
    nodejs: "nodejs",
    node: "nodejs",
    "next.js": "nextjs",
    nextjs: "nextjs",
    next: "nextjs",
    "react.js": "react",
    reactjs: "react",
    react: "react",
    typescript: "typescript",
    "type script": "typescript",
    javascript: "javascript",
    "java script": "javascript",
    postgres: "postgresql",
    postgresql: "postgresql",
    psql: "postgresql",
    golang: "go",
    "vue.js": "vue",
    vuejs: "vue",
    "nuxt.js": "nuxt",
    nuxtjs: "nuxt",
    "express.js": "express",
    expressjs: "express",
    k8s: "kubernetes",
    "tailwind css": "tailwind",
    tailwindcss: "tailwind",
  };

  if (aliases[s]) return aliases[s];

  // node.js / next.js style → drop dots then re-check
  const noDots = s.replace(/\.js\b/g, "js").replace(/\./g, "");
  const compact = noDots.replace(/[^a-z0-9]+/g, "");
  if (aliases[s.replace(/\s+/g, " ")]) return aliases[s.replace(/\s+/g, " ")];
  if (aliases[compact]) return aliases[compact];

  // reactjs → react, nextjs already handled
  if (compact === "reactjs") return "react";
  if (compact.endsWith("js") && compact.length > 2) {
    const base = compact.slice(0, -2);
    if (aliases[base + ".js"]) return aliases[base + ".js"];
    if (base === "node") return "nodejs";
    if (base === "next") return "nextjs";
  }

  return compact || s.replace(/[^a-z0-9]+/g, "");
}

/** All normalized keys for one skill label (possibly compound). */
export function skillKeysForLabel(raw: string): string[] {
  const keys = expandSkillLabels(raw)
    .map(normalizeSkillKey)
    .filter((k) => k.length >= 2);
  return [...new Set(keys)];
}

export function skillLabelsMatch(a: string, b: string): boolean {
  const ka = new Set(skillKeysForLabel(a));
  const kb = skillKeysForLabel(b);
  if (ka.size === 0 || kb.length === 0) return false;
  return kb.some((k) => ka.has(k));
}

/** Whether preferred skill hits any job stack label (compound-aware). */
export function skillPreferredMatchesJob(
  preferred: string,
  jobLabels: string[],
): boolean {
  const prefKeys = skillKeysForLabel(preferred);
  if (prefKeys.length === 0) return false;
  const jobKeys = new Set(jobLabels.flatMap(skillKeysForLabel));
  return prefKeys.some((k) => jobKeys.has(k));
}

const ROLE_STOPWORDS = new Set([
  "developer",
  "engineer",
  "engineering",
  "software",
  "senior",
  "junior",
  "staff",
  "principal",
  "lead",
  "manager",
  "the",
  "and",
  "or",
  "native",
  "2nd",
  "second",
  "third",
  "1st",
  "3rd",
]);

/** front-end → frontend, full-stack → fullstack, co-founder → cofounder, etc. */
export function normalizeRolePhrase(raw: string): string {
  let s = lower(raw);
  s = s.replace(/front[\s_-]*end/g, "frontend");
  s = s.replace(/back[\s_-]*end/g, "backend");
  s = s.replace(/full[\s_-]*stack/g, "fullstack");
  s = s.replace(/co[\s_-]*founders?/g, "cofounder");
  s = s.replace(/founder'?s?/g, "founder");
  s = s.replace(/ai[\s_-]*native/g, "ainative");
  return s;
}

export function compactRoleKey(raw: string): string {
  return normalizeRolePhrase(raw).replace(/[^a-z0-9]+/g, "");
}

export function significantRoleTokens(raw: string): string[] {
  const phrase = normalizeRolePhrase(raw);
  return phrase
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= MIN_TOKEN_LEN && !ROLE_STOPWORDS.has(t));
}

/**
 * Role title vs preferred label: compacted form + significant token overlap
 * (frontend developer ≈ front-end engineer).
 */
export function roleTitleMatches(roleTitle: string, preferred: string): boolean {
  const title = lower(roleTitle);
  const pref = lower(preferred);
  if (!title || !pref) return false;
  if (title === pref) return true;

  const titleCompact = compactRoleKey(title);
  const prefCompact = compactRoleKey(pref);
  if (
    titleCompact.length >= MIN_TOKEN_LEN &&
    prefCompact.length >= MIN_TOKEN_LEN &&
    (titleCompact.includes(prefCompact) || prefCompact.includes(titleCompact))
  ) {
    return true;
  }

  const titleTokens = new Set(significantRoleTokens(title));
  const prefTokens = significantRoleTokens(pref);
  if (prefTokens.length === 0 || titleTokens.size === 0) return false;
  return prefTokens.some((t) => titleTokens.has(t) || titleCompact.includes(t));
}
