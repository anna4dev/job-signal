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
  ai_research: "AI Research Engineer",
  ai_inference: "AI Inference Engineer",
  ai_agent: "AI Agent Engineer",
  ai_systems: "AI Systems Engineer",
  ai_delivery: "AI Delivery",
  ai_associate: "AI Associate",
  llm: "LLM Engineer",
  bayesian: "Bayesian Software Engineer",
  python_eng: "Python Engineer",
  category_theory: "Applied Category Theory",
  gtm: "Go-to-Market",
  bdr: "BDR",
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
  const only = (family: string) => {
    add(family);
    return families;
  };
  // "ai" is len 2 so it never appears in significantRoleTokens — use phrase/compact.
  const hasAi =
    compact.startsWith("ai") ||
    compact.includes("ainative") ||
    /(?:^|[^a-z])ai(?:[^a-z]|$)/.test(phrase);

  // Founder's / Founder / Founders Associate
  if (
    compact.includes("founderassociate") ||
    compact.includes("foundersassociate") ||
    (compact.includes("associate") && compact.includes("founder"))
  ) {
    return only("founder_associate");
  }

  // 2nd / AI founding engineer → Founding Engineer
  if (
    compact.includes("foundingengineer") ||
    (compact.includes("founding") &&
      (compact.includes("engineer") || tokens.has("engineer")))
  ) {
    return only("founding_engineer");
  }

  // CTO + Co-Founder (any order) vs Co-Founder alone vs CTO alone
  const hasCto = tokens.has("cto") || /(?:^|[^a-z])cto(?:[^a-z]|$)/.test(phrase);
  const hasCofounder =
    compact.includes("cofounder") || phrase.includes("co founder");
  if (hasCto && hasCofounder) return only("cto_cofounder");
  if (hasCofounder) return only("cofounder");
  if (hasCto) return only("cto");

  // Applied category theory research(er)
  if (compact.includes("categorytheory") || phrase.includes("category theory")) {
    return only("category_theory");
  }

  // Go-to-market / GTM
  if (
    compact.includes("gotomarket") ||
    compact === "gtm" ||
    tokens.has("gtm") ||
    phrase.includes("go to market")
  ) {
    return only("gtm");
  }

  // BDR
  if (tokens.has("bdr") || compact === "bdr" || compact.startsWith("bdr")) {
    return only("bdr");
  }

  // Project / delivery manager (IT, AI, technical, senior, tether wallet, …)
  if (
    compact.includes("projectmanager") ||
    (compact.includes("delivery") && compact.includes("manager")) ||
    (tokens.has("manager") &&
      (compact.includes("project") || compact.includes("delivery")))
  ) {
    return only("project_manager");
  }

  // Bayesian software engineer / engineering
  if (compact.includes("bayesian")) return only("bayesian");

  // LLM engineer family (incl. typo inferrence → inference via normalize)
  if (tokens.has("llm") || compact.includes("llm")) {
    return only("llm");
  }

  // AI research* wins over inference-in-parens specialties
  if (
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

  // AI Inference Engineer (+ qvac / specialty tags)
  if (compact.includes("inference") || phrase.includes("inference")) {
    return only("ai_inference");
  }

  // AI Delivery Intern / Lead
  if (compact.includes("delivery") && hasAi) {
    return only("ai_delivery");
  }

  // AI Agent Engineer
  if (
    compact.includes("agentengineer") ||
    (compact.includes("agent") && compact.includes("engineer"))
  ) {
    return only("ai_agent");
  }

  // AI Systems / System Engineer
  if (
    (compact.includes("system") || compact.includes("systems")) &&
    hasAi
  ) {
    return only("ai_systems");
  }

  // AI Associate / AI Development associate
  if (
    compact.includes("aiassociate") ||
    compact.includes("aidevelopmentassociate") ||
    (hasAi && compact.includes("associate"))
  ) {
    return only("ai_associate");
  }

  // AI native / AI software engineer
  if (
    hasAi &&
    (compact.includes("software") ||
      compact.includes("ainative") ||
      phrase.includes("ai native") ||
      phrase.includes("ai software"))
  ) {
    return only("ai_swe");
  }

  // .NET Architect vs .NET / C# engineer
  if (
    compact.includes("dotnet") ||
    tokens.has("csharp") ||
    phrase.includes("c#") ||
    phrase.includes(".net")
  ) {
    if (compact.includes("architect")) return only("dotnet_architect");
    return only("dotnet");
  }

  // Network / Networking Engineer(s)
  if (compact.includes("network")) {
    return only("network");
  }

  // Python-primary engineer titles
  if (
    tokens.has("python") ||
    compact.startsWith("python") ||
    /python(?:developer|engineer|software)/.test(compact)
  ) {
    return only("python_eng");
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

  if (families.length === 0 && (hasAi || compact.includes("aiengineer"))) {
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
