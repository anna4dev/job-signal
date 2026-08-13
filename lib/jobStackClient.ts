/**
 * Shared client loader for /api/jobs/stack.
 * Homepage StackFilter and Profile Tech want/don't must share one cache + validation.
 */

export type StackOption = { name: string; count: number };

let optionsCache: StackOption[] | null = null;
let inflight: Promise<StackOption[]> | null = null;

function parseStackOptions(data: unknown): StackOption[] {
  if (!Array.isArray(data)) {
    throw new Error("Invalid /api/jobs/stack payload");
  }
  const out: StackOption[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const name = (row as { name?: unknown }).name;
    const count = (row as { count?: unknown }).count;
    if (typeof name !== "string" || !name.trim()) continue;
    out.push({
      name: name.trim(),
      count: typeof count === "number" && Number.isFinite(count) ? count : 0,
    });
  }
  return out;
}

/**
 * Load canonical stack options once per session.
 * Non-OK / invalid responses do not poison the cache (next call retries).
 */
export function loadJobStackOptions(): Promise<StackOption[]> {
  if (optionsCache) return Promise.resolve(optionsCache);
  if (inflight) return inflight;

  inflight = fetch("/api/jobs/stack", { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`/api/jobs/stack HTTP ${res.status}`);
      }
      const data: unknown = await res.json();
      const options = parseStackOptions(data);
      optionsCache = options;
      return options;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export async function loadJobStackNames(): Promise<string[]> {
  try {
    const options = await loadJobStackOptions();
    return options.map((o) => o.name);
  } catch {
    return [];
  }
}

/** Test helper — clear module cache between cases. */
export function clearJobStackClientCache(): void {
  optionsCache = null;
  inflight = null;
}
