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
  dotnet: ".NET",
  csharp: ".NET",
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
  django: "Django",
  djangoq: "Django Q",
  djangorestframework: "Django REST Framework",
  argocd: "Argo CD",
  agorartc: "Agora RTC",
  azureai: "Azure AI",
  azureopenai: "Azure OpenAI",
  azurecontainerapps: "Azure Container Apps",
  reactrouter: "React Router",
  route53: "Route 53",
  restapi: "REST API",
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
  business_development: "Business Development",
  business_development_executive: "Business Development Executive",
  business_operations: "Business Operations",
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
  customer_service: "Customer Service Representative",
  customer_success: "Customer Success",
  customer_success_engineer: "Customer Success Engineer",
  customer_success_manager: "Customer Success Manager",
  customer_success_associate: "Customer Success Associate",
  robotics: "Robotics Engineer",
  robotics_architect: "Robotics Architect",
  computer_vision: "Computer Vision Engineer",
  automation_tester: "Automation Tester",
  web_scraping: "Web Scraping Engineer",
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
  cplusplus: "C++ Engineer",
};

/** Longer / more specific language keys first (javascript before java; python before typescript for mixed titles). */
const LANG_ROLE_MATCH_ORDER = [
  "javascript",
  "python",
  "typescript",
  "cplusplus",
  "csharp",
  "kotlin",
  "scala",
  "swift",
  "ruby",
  "rust",
  "java",
  "php",
  "go",
] as const;

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

  // "Head of X" → X (families map domain)
  s = s.replace(/^heads?\s+of\s+/i, "");

  // Seniority glued after slash: "Lead/senior", "/senior"
  s = s.replace(
    /\s*(leads?|leaders?|seniors?|juniors?|mid[-\s]?levels?)\s*\/\s*(leads?|leaders?|seniors?|juniors?|mid[-\s]?levels?)\s*$/i,
    "",
  );
  s = s.replace(
    /\s*\/\s*(leads?|leaders?|seniors?|juniors?|mid[-\s]?levels?)\s*$/i,
    "",
  );

  // Leading seniority / level noise (may repeat: "Senior Lead …")
  for (let i = 0; i < 3; i++) {
    const next = s.replace(
      /^(junior|senior|staff|principal|lead|leader|intern|experienced|expierenced|associate|mid[-\s]?senior|mid[-\s]?level|midlevel)\s+/i,
      "",
    );
    if (next === s) break;
    s = next;
  }

  // Trailing seniority / level: "… Lead", "… Mid Level", SWE II, …
  s = s.replace(
    /\s+(leads?|leaders?|seniors?|juniors?|mid[-\s]?levels?|midlevels?)$/i,
    "",
  );
  s = s.replace(
    /\s+(i{1,3}|iv|v|vi{0,3}|ix|x|l[1-7]|level\s*[1-7])$/i,
    "",
  );
  // Trailing geo tags often stuck on sales titles
  s = s.replace(/\s+(us|uk|eu|emea|apac)$/i, "");

  // Plural job nouns
  s = s.replace(
    /\b(engineers|developers|executives|managers|scientists|researchers|associates|testers)\b/gi,
    (_m, w: string) => w.slice(0, -1),
  );

  // Common eng / domain abbreviations
  s = s.replace(/\bswe\b/gi, "Software Engineer");
  s = s.replace(/\bsw\s+engineers?\b/gi, "Software Engineer");
  s = s.replace(/\bee\s+engineers?\b/gi, "Electrical Engineer");
  s = s.replace(/\bme\s+engineers?\b/gi, "Mechanical Engineer");
  s = s.replace(/\bcv\b/gi, "Computer Vision");

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

  // Collapse doubled noun after SWE expand: "Software Engineer Engineer" (rare)
  s = s.replace(/\bsoftware\s+engineer\s+engineer\b/gi, "Software Engineer");

  // Automated Test* → Automation Test* for family match
  s = s.replace(/\bautomated\s+test/gi, "Automation Test");

  return s.replace(/\s+/g, " ").trim();
}

const JOB_NOUN_RE =
  /\b(engineer|developer|associate|manager|executive|representative|statistician|architect|tester|scientist|operator|coordinator|specialist)\b/i;

/**
 * Split compound titles:
 * - shared noun: "C++/runtime Engineer", "Cv & Robotics Software Engineer"
 * - two full roles: "Legal Operations / Legal Tech Associate"
 * Seniority-only slash tails ("Lead/senior") are stripped in structuralCoreTitle.
 */
function expandCompoundRoleTitle(raw: string): string[] | null {
  // Keep intentional brand slash chips (CTO / Co-Founder) for family detection
  if (/\bcto\b/i.test(raw) && /\bco-?founder\b/i.test(raw)) return null;

  const core = structuralCoreTitle(raw);
  if (!core) return null;

  const shared = core.match(
    /^(.+?)\s*[\/&]\s*(.+?)\s+(software\s+engineer|engineer|developer)$/i,
  );
  if (shared) {
    const left = shared[1].trim();
    const right = shared[2].trim();
    const noun = shared[3].trim();
    if (!left || !right) return null;
    return [
      JOB_NOUN_RE.test(left) ? left : `${left} ${noun}`,
      JOB_NOUN_RE.test(right) ? right : `${right} ${noun}`,
    ];
  }

  if (/\s+[\/&]\s+/.test(core)) {
    const parts = core
      .split(/\s+[\/&]\s+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) return parts;
  }

  return null;
}

function languageRoleChip(core: string): string | null {
  const phrase = normalizeRolePhrase(core);
  const compact = phrase.replace(/[^a-z0-9]+/g, "");
  if (!/(developer|engineer|distributed)/.test(compact)) return null;

  for (const lang of LANG_ROLE_MATCH_ORDER) {
    const label = LANG_ROLE_DISPLAY[lang];
    if (!label) continue;
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

  // Customer Service / Success before founding* so "Founding CSM" ≠ Founding Engineer
  const hasCustomerSuccess =
    compact.includes("customersuccess") ||
    (compact.includes("customer") && compact.includes("success"));
  if (
    compact.includes("customerservice") ||
    (compact.includes("customer") &&
      (compact.includes("service") ||
        compact.includes("servicerep") ||
        compact.includes("representative")) &&
      !hasCustomerSuccess)
  ) {
    return only("customer_service");
  }
  if (hasCustomerSuccess) {
    if (compact.includes("engineer")) return only("customer_success_engineer");
    if (compact.includes("associate")) return only("customer_success_associate");
    if (
      compact.includes("manager") ||
      compact.includes("lead") ||
      compact.includes("founding") ||
      compact.includes("technical")
    ) {
      return only("customer_success_manager");
    }
    return only("customer_success");
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

  // Business Development* (Representative → BDR; Executive kept distinct)
  if (
    compact.includes("businessdevelopmentrepresentative") ||
    compact.includes("businessdeveloper") ||
    (compact.includes("businessdevelopment") &&
      (compact.includes("representative") ||
        compact.endsWith("rep") ||
        tokens.has("rep")))
  ) {
    return only("bdr");
  }
  if (
    compact.includes("businessdevelopmentexecutive") ||
    (compact.includes("businessdevelopment") && compact.includes("executive"))
  ) {
    return only("business_development_executive");
  }
  if (compact.includes("businessoperations")) {
    return only("business_operations");
  }
  if (compact.includes("businessdevelopment")) {
    return only("business_development");
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

  if (
    compact.includes("computervision") ||
    (tokens.has("cv") &&
      (compact.includes("engineer") ||
        compact.includes("software") ||
        compact.includes("robotic")))
  ) {
    return only("computer_vision");
  }

  if (compact.includes("robotic")) {
    if (compact.includes("architect")) return only("robotics_architect");
    return only("robotics");
  }

  if (
    compact.includes("automationtest") ||
    compact.includes("automatedtest") ||
    compact.includes("automationtester")
  ) {
    return only("automation_tester");
  }

  if (compact.includes("webscraping")) {
    return only("web_scraping");
  }

  const hasToken = (family: string, ...needles: string[]) => {
    if (needles.some((n) => tokens.has(n))) add(family);
  };
  // Safe compact needles: not a prefix of a longer English word (e.g. data⊂database).
  const hasCompact = (family: string, ...needles: string[]) => {
    if (
      needles.some(
        (n) => compact.includes(n) || tokens.has(n) || phrase.includes(n),
      )
    ) {
      add(family);
    }
  };

  hasCompact("frontend", "frontend");
  hasCompact("backend", "backend");
  hasCompact("fullstack", "fullstack");
  hasCompact("mobile", "mobile");
  // ios/android as tokens only — compact "ios" false-positives BIOS Engineer
  hasToken("mobile", "ios", "android");
  hasCompact("devops", "devops", "sre", "platform");
  hasToken("data", "data");
  hasCompact("ml", "machinelearning", "deeplearning");
  hasToken("ml", "ml");
  hasToken("product", "product");
  hasToken("growth", "growth");
  hasToken("design", "designer", "ux", "ui");
  // Bare "design" — skip Design Systems* titles
  if (
    tokens.has("design") &&
    !tokens.has("systems") &&
    !tokens.has("system") &&
    (tokens.has("engineer") ||
      tokens.has("developer") ||
      tokens.size <= 2)
  ) {
    add("design");
  }

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
  // Compound titles first so "/" / "&" actually split (families would swallow one side).
  const compoundParts = expandCompoundRoleTitle(raw);
  if (compoundParts) {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const part of compoundParts) {
      for (const chip of canonicalizeRolesForProfile(part)) {
        const key = chip.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(chip);
      }
    }
    if (out.length > 0) return out;
  }

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
