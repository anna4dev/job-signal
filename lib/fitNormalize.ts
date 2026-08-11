/**
 * Normalize skill/stack and role labels for fit() matching.
 * Compound cells like "React/Next.js (TypeScript)" expand to atomic keys.
 */

const MIN_TOKEN_LEN = 3;

function lower(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

/** ASP.NET / .NET Core|Framework|N / C# → single dotnet key for stack chips + fit match. */
function dotnetFamilyKey(s: string): string | null {
  const t = s
    .replace(/\.?\s*net\s+v?\d+(\.\d+)*/gi, ".net")
    .replace(/\s+/g, " ")
    .trim();
  if (/^c\s*#/.test(t) || t === "csharp" || t.startsWith("csharp")) {
    return "dotnet";
  }
  if (/\basp\.?\s*net\b/.test(t)) return "dotnet";
  if (/^\.?\s*net(\s+(core|framework|standard|mvc))?$/.test(t)) {
    return "dotnet";
  }
  const compact = t.replace(/[^a-z0-9]+/g, "");
  if (/^aspnet/.test(compact)) return "dotnet";
  if (
    compact === "dotnet" ||
    compact === "netcore" ||
    compact === "netframework" ||
    compact === "netstandard" ||
    compact === "netmvc"
  ) {
    return "dotnet";
  }
  return null;
}

function dockerFamilyKey(s: string): string | null {
  if (s === "docker" || s.startsWith("docker ")) return "docker";
  const compact = s.replace(/[^a-z0-9]+/g, "");
  if (
    compact === "docker" ||
    compact.startsWith("dockercompose") ||
    compact.startsWith("dockerswarm")
  ) {
    return "docker";
  }
  return null;
}

function djangoFamilyKey(s: string): string | null {
  if (!s.startsWith("django")) return null;
  const compact = s.replace(/[^a-z0-9]+/g, "");
  if (compact === "djangoq" || /\bdjango\s+q\b/.test(s)) return "djangoq";
  if (
    compact.includes("djangorestframework") ||
    /\bdjango\s+rest\s+framework\b/.test(s)
  ) {
    return "djangorestframework";
  }
  if (compact === "django" || compact.startsWith("django")) return "django";
  return null;
}

/** Rest / REST API / RESTful APIs — not Django REST Framework (django runs first). */
function restApiFamilyKey(s: string): string | null {
  if (s.startsWith("django")) return null;
  const t = s.replace(/\s+apis\b/g, " api").replace(/\s+/g, " ").trim();
  const compact = t.replace(/[^a-z0-9]+/g, "");
  if (compact === "rest") return "restapi";
  if (
    compact === "restapi" ||
    compact === "restfulapi" ||
    compact === "restfulapis"
  ) {
    return "restapi";
  }
  if (compact.startsWith("restful") && compact.includes("api")) return "restapi";
  if (compact.startsWith("rest") && compact.includes("api")) return "restapi";
  return null;
}

/** Agora RTC must win before bare Argo → Argo CD. */
function argoFamilyKey(s: string): string | null {
  const compact = s.replace(/[^a-z0-9]+/g, "");
  if (compact.startsWith("agora")) return "agorartc";
  if (compact === "argocd" || /^argo\s*cd$/.test(s)) return "argocd";
  if (s === "argo" || compact === "argo") return "argocd";
  return null;
}

function azureFamilyKey(s: string): string | null {
  if (!s.startsWith("azure")) return null;
  const compact = s.replace(/[^a-z0-9]+/g, "");
  if (compact.includes("openai")) return "azureopenai";
  if (compact.includes("containerapps")) return "azurecontainerapps";
  if (compact.includes("ai")) return "azureai";
  return "azure";
}

function reactRouterFamilyKey(s: string): string | null {
  if (/\breact\s+router\b/.test(s)) return "reactrouter";
  return null;
}

function route53FamilyKey(s: string): string | null {
  const compact = s.replace(/[^a-z0-9]+/g, "");
  if (compact === "route53") return "route53";
  return null;
}

function pythonFamilyKey(s: string): string | null {
  if (s === "python" || s.startsWith("python ")) return "python";
  return null;
}

/** Split compound stack cells on /, |, +, commas, parentheses, and " or ". */
export function expandSkillLabels(raw: string): string[] {
  const s = raw.trim();
  if (!s) return [];
  const atoms: string[] = [];
  for (const orPart of s.split(/\s+or\s+/i)) {
    const trimmed = orPart.trim();
    if (!trimmed) continue;
    const parts = trimmed
      .split(/[/|,+]|[()]/)
      .map((p) => p.trim())
      .filter(Boolean);
    atoms.push(...(parts.length > 0 ? parts : [trimmed]));
  }
  return atoms;
}

/**
 * Canonical skill key: node.js → nodejs, next.js → nextjs, react.js → react.
 * Exact equality on these keys is the primary skill match (avoids go⊂google).
 */
export function normalizeSkillKey(raw: string): string {
  let s = lower(raw);
  if (!s) return "";

  // "TypeScript Strict" / lint qualifiers → typescript
  s = s.replace(/\bstrict\b/g, " ").replace(/\s+/g, " ").trim();

  const dotnetKey = dotnetFamilyKey(s);
  if (dotnetKey) return dotnetKey;

  // Strip trailing version-ish noise: "django 4.1.13", "react router v7"
  s = s.replace(/\bv?\d+(\.\d+)*\b/g, " ").replace(/\s+/g, " ").trim();

  if (s === "ts") return "typescript";

  for (const family of [
    dockerFamilyKey,
    djangoFamilyKey,
    restApiFamilyKey,
    argoFamilyKey,
    azureFamilyKey,
    reactRouterFamilyKey,
    route53FamilyKey,
    pythonFamilyKey,
  ]) {
    const key = family(s);
    if (key) return key;
  }

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
  "intern",
  "experienced",
  "expierenced",
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
  "qvac",
  "wallet",
  "tether",
  "kernel",
  "optimization",
  "compression",
  "quantization",
  "application",
  "associate",
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
  s = s.replace(/go[\s_-]*to[\s_-]*market/g, "gotomarket");
  s = s.replace(/\binferrence\b/g, "inference");
  s = s.replace(/\bnetworking\b/g, "network");
  s = s.replace(/multi[\s_-]*modal/g, "multimodal");
  s = s.replace(/c\s*#/g, "csharp");
  s = s.replace(/c\+\+/g, "cplusplus");
  s = s.replace(/\bcpp\b/g, "cplusplus");
  s = s.replace(/\.?\s*net\b/g, "dotnet");
  s = s.replace(/\bswe\b/g, "software engineer");
  s = s.replace(/\bsw\s+engineers?\b/g, "software engineer");
  s = s.replace(/\bee\s+engineers?\b/g, "electrical engineer");
  s = s.replace(/\bme\s+engineers?\b/g, "mechanical engineer");
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
