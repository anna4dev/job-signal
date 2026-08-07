/**
 * Macro location regions for profile allow-lists and fit().
 * Single source of truth — ProfileContent and fit must not fork alias lists.
 */

function canonical(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

/** Normalize common country aliases to a canonical English name. */
const COUNTRY_CANON: Record<string, string> = {
  de: "germany",
  deutschland: "germany",
  germany: "germany",
  fr: "france",
  france: "france",
  nl: "netherlands",
  holland: "netherlands",
  netherlands: "netherlands",
  ie: "ireland",
  ireland: "ireland",
  es: "spain",
  spain: "spain",
  it: "italy",
  italy: "italy",
  pt: "portugal",
  portugal: "portugal",
  be: "belgium",
  belgium: "belgium",
  at: "austria",
  austria: "austria",
  se: "sweden",
  sweden: "sweden",
  dk: "denmark",
  denmark: "denmark",
  fi: "finland",
  finland: "finland",
  pl: "poland",
  poland: "poland",
  cz: "czechia",
  czechia: "czechia",
  "czech republic": "czechia",
  us: "united states",
  usa: "united states",
  "u.s.": "united states",
  "u.s.a.": "united states",
  "united states": "united states",
  "united states of america": "united states",
  ca: "canada",
  canada: "canada",
  mx: "mexico",
  mexico: "mexico",
  uk: "united kingdom",
  "u.k.": "united kingdom",
  britain: "united kingdom",
  "great britain": "united kingdom",
  england: "united kingdom",
  "united kingdom": "united kingdom",
  ch: "switzerland",
  switzerland: "switzerland",
  no: "norway",
  norway: "norway",
  sg: "singapore",
  singapore: "singapore",
  au: "australia",
  australia: "australia",
  nz: "new zealand",
  "new zealand": "new zealand",
  in: "india",
  india: "india",
  jp: "japan",
  japan: "japan",
  kr: "south korea",
  "south korea": "south korea",
  korea: "south korea",
  ae: "united arab emirates",
  uae: "united arab emirates",
  "united arab emirates": "united arab emirates",
  sa: "saudi arabia",
  "saudi arabia": "saudi arabia",
  il: "israel",
  israel: "israel",
  tr: "turkey",
  turkey: "turkey",
  türkiye: "turkey",
  eg: "egypt",
  egypt: "egypt",
  za: "south africa",
  "south africa": "south africa",
  ng: "nigeria",
  nigeria: "nigeria",
  ke: "kenya",
  kenya: "kenya",
  ma: "morocco",
  morocco: "morocco",
  qa: "qatar",
  qatar: "qatar",
};

export function canonCountry(raw: string): string {
  const c = canonical(raw);
  return COUNTRY_CANON[c] ?? c;
}

const EU_MEMBERS = [
  "austria",
  "belgium",
  "bulgaria",
  "croatia",
  "cyprus",
  "czechia",
  "denmark",
  "estonia",
  "finland",
  "france",
  "germany",
  "greece",
  "hungary",
  "ireland",
  "italy",
  "latvia",
  "lithuania",
  "luxembourg",
  "malta",
  "netherlands",
  "poland",
  "portugal",
  "romania",
  "slovakia",
  "slovenia",
  "spain",
  "sweden",
] as const;

const EUROPE_EXTRA = [
  "iceland",
  "norway",
  "switzerland",
  "united kingdom",
] as const;

const EUROPE_MEMBERS = [...EU_MEMBERS, ...EUROPE_EXTRA];

const MIDDLE_EAST_MEMBERS = [
  "united arab emirates",
  "saudi arabia",
  "israel",
  "qatar",
  "bahrain",
  "kuwait",
  "oman",
  "jordan",
  "lebanon",
  "egypt",
  "turkey",
] as const;

const AFRICA_MEMBERS = [
  "south africa",
  "nigeria",
  "kenya",
  "ghana",
  "egypt",
  "morocco",
  "tunisia",
  "rwanda",
  "senegal",
  "uganda",
] as const;

const NA_MEMBERS = ["united states", "canada", "mexico"] as const;

const APAC_MEMBERS = [
  "australia",
  "new zealand",
  "singapore",
  "india",
  "japan",
  "south korea",
  "hong kong",
  "taiwan",
  "indonesia",
  "malaysia",
  "philippines",
  "thailand",
  "vietnam",
] as const;

/** Canonical region key → member countries (canonical English names). */
export const REGION_MEMBERS: Record<string, readonly string[]> = {
  eu: EU_MEMBERS,
  europe: EUROPE_MEMBERS,
  emea: [...new Set([...EUROPE_MEMBERS, ...MIDDLE_EAST_MEMBERS, ...AFRICA_MEMBERS])],
  na: NA_MEMBERS,
  uk: ["united kingdom"],
  apac: APAC_MEMBERS,
  "south asia": ["india", "pakistan", "bangladesh", "sri lanka", "nepal"],
};

/** Map free-text / profile ids onto REGION_MEMBERS keys. */
export function regionKeyFor(allowId: string): string | null {
  const id = canonical(allowId);
  if (id === "eu" || id === "european union") return "eu";
  if (id === "europe") return "europe";
  if (id === "emea") return "emea";
  if (id === "na" || id === "north america") return "na";
  if (id === "uk" || id === "united kingdom") return "uk";
  if (id === "apac" || id === "asia pacific") return "apac";
  if (id === "south asia") return "south asia";
  return REGION_MEMBERS[id] ? id : null;
}

/** True when the value is a known macro region (store as LocationSpec scope region). */
export function isMacroRegionId(id: string): boolean {
  return regionKeyFor(id) != null;
}

/**
 * Exact membership after canon — no fuzzy substring (avoids
 * "united states" accidentally matching via "united kingdom").
 */
export function countryInAllowRegion(country: string, allowId: string): boolean {
  const key = regionKeyFor(allowId);
  if (!key) return false;
  const members = REGION_MEMBERS[key];
  if (!members) return false;
  return members.includes(canonCountry(country));
}
