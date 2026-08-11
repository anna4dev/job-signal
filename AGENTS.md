# Agent Guidelines (Vibe Coding)

Instructions for AI-assisted development on Job Signal. Humans should skim this too — it encodes non-negotiable architecture rules.

## What Is Vibe Coding Here?

Pair with AI using **small, verifiable, revertible steps**. The agent follows repository contracts instead of inventing new architecture.

### Workflow

1. **Read before writing** — For profile/signals work, read `types/profile.ts` and `lib/signals.ts` comments and invariants first.
2. **One topic per session** — e.g. "Phase 2.2 persistence only"; do not bundle Phase 3 Fit Engine.
3. **Minimal diff** — Do not rewrite unrelated files; match existing patterns (`hooks/useExplicitProfile.ts`, `hooks/useBookmarks.ts`).
4. **Self-check before done** — Run `npm run lint`; manually verify localStorage flows (write → event → UI update).
5. **Do not commit unless asked** — Wait for explicit user request to create git commits.
6. **Plan first for milestones** — Align with `.cursor/plans/` before multi-file features (e.g. Phase 2.2).

## Project Architecture (Hard Constraints)

### Local-first storage keys

| Key                    | Purpose                          |
| ---------------------- | -------------------------------- |
| `explicit_profile_v1`  | User-editable ExplicitProfile    |
| `job_bookmarks`        | Bookmarked jobs + lifecycle      |
| `saved_searches`       | Saved filter snapshots           |
| `job_overrides_v1`     | Per-job UI overrides             |
| `unified_signals_v1`   | Computed UnifiedSignals (Phase 2.2+) |
| `job_signal_anonymous_id_v1` | Stable anon id for corrections / fit events (localStorage) |
| `job_signal_last_sort_v1` | Last list sort mode for detail fit events (sessionStorage) |

New client state must use versioned keys, coercion on read, and a custom `window` event for cross-tab sync (mirror `PROFILE_EVENT` / `bookmark-change`).

### Signal layer invariants

- **`UnifiedSignals` is Phase 3's sole fit input.**
- **`UnifiedSignals.preferences` is pre-normalized** (per-dimension `sum(weight)=1`). `fit()` must **not** call `normalizeWeights`.
- **Implicit signals do not score separately** — they enter only via `mergePreferences` (no double-counting).
- **Capabilities are never inferred from behavior** — skills, seniority, years must be self-declared.
- **Assist-fill ≠ implicit signals** — Profile suggestion `source: 'implicit'` marks explicit profile fields the user applied; that is different from `ImplicitSignals` in `lib/signals.ts`.
- **Conflict priority:** `Rejections.soft` > `Preferences` > `Capabilities` (resolved at merge time for skills).
- **Location / work mode / visa are eligibility gates only** — passing them does not imply a good fit. Soft ranking is dominated by **target roles + skills**; industry/level/size are secondary.
- **Non-empty `preferences.roles` is a hard title filter** — if no role token matches `role_title`, `fit()` hard-fails (`role_constraint`). Empty roles skip this gate; skills then dominate the score.
- **Location allow-list is geographic when the JD states geography** — remote/onsite/hybrid with a country/city must overlap `hardConstraints.locations.allow` (e.g. Singapore profile ≠ US-only remote). Macro regions expand via `lib/locationRegions.ts` (`EU` includes Germany; `EMEA` includes Europe + Middle East + Africa; `NA` includes US/Canada/Mexico). Do **not** treat “work mode includes remote” as worldwide location pass.
- **Remote with no country/city passes location** — JD did not constrain hire-from region (UI “Location N/A”); profile allow-list must not hard-fail these.
- **Job visa unlocks relocation, not remote geography** — onsite/hybrid with `location_visa_supported` may pass location even when the job country is outside the allow-list (US/UK + visa can fit a non-local profile). Visa does **not** bypass location for remote roles that name a country.
- **Profile remote-anywhere is explicit** — `scope: "remote_tz"` / id `Remote` (or worldwide/anywhere/global) still opts into named-country remotes outside the allow-list. Legacy `LocationSpec.remoteOk` must not mean “any remote worldwide”.
- **Profile `visa.required` is separate** — “I need sponsorship” vs job offering visa; do not conflate with the location bypass above.

### Roadmap boundaries

- Phase 2.2: persist + wire `computeUnifiedSignals`; no Fit UI yet.
- Phase 3: deterministic `fit(job, unifiedSignals)` — wait until 2.2 is stable.
- Phase 4+: OAuth / cloud sync — out of scope until then.

## File Navigation

| Area              | Location                                      |
| ----------------- | --------------------------------------------- |
| Profile types     | `types/profile.ts`                            |
| Explicit profile  | `lib/profile.ts`, `hooks/useExplicitProfile.ts` |
| Signal computation| `lib/signals.ts`                              |
| Fit engine        | `lib/fit.ts`, `lib/locationRegions.ts`, `types/fit.ts` |
| Profile UI        | `app/profile/ProfileContent.tsx`              |
| Companies         | `lib/companies.ts`, `lib/companyIndexable.ts`, `lib/dbCoerce.ts`, `lib/companyJobRows.ts`, `lib/companyAggregates.ts`, `lib/companyEvidence.ts`, `lib/companyLongHorizon.ts`, `lib/companyEvents.ts`, `app/companies/` |
| Assist-fill       | `lib/profileSuggestions.ts`                     |
| Bookmarks         | `hooks/useBookmarks.ts`                       |
| Saved searches    | `hooks/useSavedSearches.ts`, `lib/savedSearch.ts` |
| Job overrides     | `lib/jobOverrides.ts`                         |
| DB access         | `lib/db.ts` (server only)                     |
| API routes        | `app/api/`                                    |

## Next.js 16 Practices (This Repo)

### Already in use

- **App Router** — `app/` routes; `app/layout.tsx` uses Metadata API with `metadataBase`.
- **Server / Client split** — Pages default to Server Components; interactivity in `"use client"` leaves (`ProfileContent`, `FilterBar`, hooks consumers).
- **Data fetching** — Turso queries on the server (`lib/db.ts`); client state via hooks + localStorage.
- **Route Handlers** — `app/api/*`; validate input, return proper HTTP status, do not leak stack traces.
- **Fonts** — `next/font` (Geist).
- **SEO** — `app/sitemap.ts`, `app/robots.ts`.

### Adopt when touching related code

- **`params` / `searchParams` are Promises** — In new or modified pages (Next 15+), await both before use, e.g. `const { id } = await params` and `const { q } = await searchParams`.
- **Default dynamic, cache opt-in** — Without `cacheComponents`, use explicit `fetch` cache options or direct DB reads in Route Handlers.
- **Minimize `"use client"`** — Keep client boundaries at leaves; do not wrap entire pages.
- **Suspense** — Wrap slow dynamic sections when adding streaming; avoid blocking whole pages.
- **Security** — No secrets in client bundles; validate JSON bodies in API routes.

### Upgrade path (not required now)

- `cacheComponents: true` + `'use cache'` for read-heavy job list/detail PPR — evaluate separately.
- Server Actions for new mutations — optional; Route Handlers remain the current pattern.
- `middleware.ts` → `proxy.ts` migration — only when upgrading network boundary logic.

### Anti-patterns (do not)

- Access `localStorage` / `window` in Server Components
- Call `normalizeWeights` inside `fit()` or scoring paths
- Introduce OAuth / server sessions for local-first features before Phase 4
- Infer `capabilities.*` from bookmarks or saved searches

## Commit Style

Follow [CONTRIBUTING.md](CONTRIBUTING.md) — atomic commits, Conventional Commits format.
