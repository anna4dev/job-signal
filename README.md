# Job Signal

Structured, searchable interface for Hacker News "Who’s Hiring" jobs.

website: https://jobsignal.dev/

## Overview

Job Signal converts unstructured Hacker News hiring threads into structured job listings that are searchable, filterable, and indexable.

## Features

- Structured parsing of HN Who’s Hiring threads
- Filters for fast job browsing
- Bookmark jobs (localStorage, no login required)
- Mobile-friendly UI

## Example Job Page

https://jobsignal.dev/jobs/hn_47036452_0

Each job page includes:

- structured JobPosting schema
- company name
- role title
- location
- salary (if available)
- company website and apply link (if available)

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Turso (SQLite)
- Vercel deployment

## Database Schema

1.  jobs_raw
    | Field | Type | Description |
    | :--- | :--- | :--- |
    | id | TEXT | Primary key. |
    | source | TEXT | Source platform or origin of the job posting (e.g., LinkedIn, company site). Required. |
    | raw_text | TEXT | Original unprocessed job posting content in raw text format. |
    | is_job | INTEGER | Flag indicating whether the record is a valid job posting (1 = yes, 0 = no). Default is 1. |
    | is_structured | INTEGER | Default is 0. |
    | fetched_at | DATETIME | Timestamp |

2.  jobs_structured
    | Field | Type | Description |
    | :--- | :--- | :--- |
    | job_id | TEXT | Unique job identifier. Primary key. |
    | company_id | TEXT | Identifier of the company. |
    | role_title | TEXT | Job title or role name. |
    | level | TEXT | Seniority level ('intern','junior','mid','senior','staff','principal','unknown'). |
    | jd_url | TEXT | URL of the job description. |
    | location_city | TEXT | City where the job is located. |
    | location_country | TEXT | Country where the job is located. |
    | location_remote | BOOLEAN | Whether the job is remote. |
    | location_timezone | TEXT | Required or preferred timezone. |
    | location_visa_supported | BOOLEAN | Whether visa sponsorship is available. |
    | location_extra | JSON | Additional location-related details. |
    | responsibilities | JSON | List of job responsibilities. |
    | required_skills | JSON | Required skills for the job. |
    | preferred_skills | JSON | Preferred or optional skills. |
    | job_raw_id | TEXT | Reference to the raw job record. |
    | confidence | TEXT | 'high','medium','low' |
    | salary_min | NUMERIC | Minimum salary estimate. |
    | salary_max | NUMERIC | Maximum salary estimate. |
    | salary_median | NUMERIC | Median salary estimate. |
    | risk_flags | JSON | List of identified risk flags. |
    | risk_mitigation | JSON | Suggested actions to reduce risks. |
    | risk_confidence | TEXT | Confidence level of risk assessment. |
    | engineering_signals | JSON | Indicators of engineering quality or maturity. |
    | work_style | TEXT | Work style (remote, async, hybrid, etc.). |
    | red_flags | JSON | List of negative warning signals. |
    | created_at | DATETIME | Record creation time. |
    | updated_at | DATETIME | Last update time. |
    | post_at | DATETIME | Original job posting date. |

3.  company_structured
    | Field | Type | Description |
    | :--- | :--- | :--- |
    | company_id | TEXT | Unique company identifier. Primary key. |
    | company_name | TEXT | Company name. |
    | company_description | TEXT | Short description of the company. |
    | industry | TEXT | Industry the company belongs to. |
    | confidence | TEXT | Confidence level ('high', 'medium', 'low'). |
    | source | TEXT | Source of company data. |
    | source_links | JSON | Links such as website, LinkedIn. |
    | size | TEXT | Company size (e.g., "1-10 people", "11-50 people", "51-200 people", "201-500 people", "501-1000 people", "1000+ people"). |
    | funding_stage | TEXT | Funding stage (e.g., "Bootstrapped", "Seed", "Series A", "Series B", "Series C", "Series D+", "Profitable", "Public", "Unknown"). |
    | total_funding_usd | NUMERIC | Total funding amount in USD. |
    | tech_stack | JSON | Technologies used by the company. |
    | culture_keywords | JSON | Keywords describing company culture. |
    | recent_news | JSON | Recent news items about the company. |
    | competitor_companies | JSON | List of competitor company names. |
    | industry_trends | JSON | Relevant trends in the industry. |
    | regional_demand | JSON | Regional demand indicators (e.g., {"US":"high","EU":"medium","Asia":"low"}). |
    | enrichment_status | TEXT | Enrichment status ('basic', 'full'). |
    | created_at | DATETIME | Record creation time. |
    | updated_at | DATETIME | Last update time. |

4.  job_corrections
    | Field | Type | Description |
    | :--- | :--- | :--- |
    | id | TEXT | Primary key. |
    | job_id | TEXT | FK to `jobs_structured.job_id`. |
    | job_raw_id | TEXT | FK to `jobs_raw.id`. |
    | anonymous_id | TEXT | Client-generated UUID (`job_signal_anonymous_id_v1`). |
    | field | TEXT | Corrected field name (e.g. `salary`, `is_job`). |
    | correction_type | TEXT | `overwrite`, `add`, or `remove`. |
    | original_value | TEXT | JSON snapshot of the original value. |
    | corrected_value | TEXT | JSON snapshot of the corrected value. |
    | created_at | DATETIME | Record creation time. |

    **Turso migration (required for API idempotency):** run once in the Turso console.

    ```sql
    CREATE UNIQUE INDEX IF NOT EXISTS idx_job_corrections_idempotency
    ON job_corrections (
      anonymous_id,
      job_id,
      field,
      correction_type,
      corrected_value
    );
    ```

    `/api/job-corrections` uses SELECT-then-INSERT for fast duplicate detection; the unique index closes the concurrent-request race and is handled as `duplicate: true`.

5.  fit_events
    | Field | Type | Description |
    | :--- | :--- | :--- |
    | id | TEXT | Primary key. |
    | anonymous_id | TEXT | Client-generated UUID (`job_signal_anonymous_id_v1`). |
    | job_id | TEXT | FK to `jobs_structured.job_id` (nullable for `sort_change`). |
    | event_type | TEXT | `impression`, `open`, `bookmark_add`, `bookmark_remove`, or `sort_change`. |
    | fit_score | INTEGER | Client fit score at event time (0–100), nullable. |
    | hard_fail | INTEGER | `1` if hard constraints failed, else `0`. |
    | sort_mode | TEXT | List sort (`fit` / `newest` / `pay`), or `from->to` for `sort_change`. |
    | position | INTEGER | 0-based position in the visible list. |
    | created_at | DATETIME | Record creation time. |

    **Turso migration (required before `/api/fit-events` writes):** run once in the Turso console.

    ```sql
    CREATE TABLE IF NOT EXISTS fit_events (
      id TEXT PRIMARY KEY,
      anonymous_id TEXT NOT NULL,
      job_id TEXT,
      event_type TEXT NOT NULL CHECK (
        event_type IN (
          'impression','open','bookmark_add','bookmark_remove','sort_change'
        )
      ),
      fit_score INTEGER,
      hard_fail INTEGER NOT NULL DEFAULT 0,
      sort_mode TEXT,
      position INTEGER,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES jobs_structured(job_id)
    );

    CREATE INDEX IF NOT EXISTS idx_fit_events_anon_created
    ON fit_events (anonymous_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_fit_events_sort_type_created
    ON fit_events (sort_mode, event_type, created_at);
    ```

    If you already created `fit_events` without `sort_change` / nullable `job_id`, recreate the table (or migrate) before deploying this event type.

    Monitoring only — events do not update fit weights or `UnifiedSignals`. Example funnel by fit-score bucket (`sort=fit`):

    ```sql
    SELECT
      CASE
        WHEN fit_score IS NULL THEN 'unknown'
        WHEN fit_score >= 80 THEN '80-100'
        WHEN fit_score >= 60 THEN '60-79'
        WHEN fit_score >= 40 THEN '40-59'
        ELSE '0-39'
      END AS score_bucket,
      SUM(event_type = 'impression') AS impressions,
      SUM(event_type = 'open') AS opens,
      SUM(event_type = 'bookmark_add') AS bookmarks,
      ROUND(1.0 * SUM(event_type = 'open') / NULLIF(SUM(event_type = 'impression'), 0), 3) AS open_rate,
      ROUND(1.0 * SUM(event_type = 'bookmark_add') / NULLIF(SUM(event_type = 'impression'), 0), 3) AS bookmark_rate
    FROM fit_events
    WHERE sort_mode = 'fit'
      AND created_at >= datetime('now', '-14 day')
    GROUP BY score_bucket
    ORDER BY score_bucket DESC;
    ```

    Compare funnels across sort modes:

    ```sql
    SELECT
      sort_mode,
      SUM(event_type = 'impression') AS impressions,
      SUM(event_type = 'open') AS opens,
      SUM(event_type = 'bookmark_add') AS bookmarks,
      ROUND(1.0 * SUM(event_type = 'open') / NULLIF(SUM(event_type = 'impression'), 0), 3) AS open_rate
    FROM fit_events
    WHERE created_at >= datetime('now', '-14 day')
    GROUP BY sort_mode;
    ```

6.  company_events

    | Field | Type | Description |
    | :--- | :--- | :--- |
    | id | TEXT | Primary key. |
    | anonymous_id | TEXT | Client-generated UUID (`job_signal_anonymous_id_v1`). |
    | company_id | TEXT | FK to `company_structured.company_id`. |
    | job_id | TEXT | FK to `jobs_structured.job_id` (nullable for `page_view`). |
    | event_type | TEXT | `page_view`, `job_click`, `bookmark_add`, `bookmark_remove`, or `apply_click`. |
    | position | INTEGER | 0-based position in the company jobs list. |
    | created_at | DATETIME | Record creation time. |

    **Turso migration (required before `/api/company-events` writes):** run once in the Turso console.

    ```sql
    CREATE TABLE IF NOT EXISTS company_events (
      id TEXT PRIMARY KEY,
      anonymous_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      job_id TEXT,
      event_type TEXT NOT NULL CHECK (
        event_type IN (
          'page_view','job_click','bookmark_add','bookmark_remove','apply_click'
        )
      ),
      position INTEGER,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES company_structured(company_id),
      FOREIGN KEY (job_id) REFERENCES jobs_structured(job_id)
    );

    CREATE INDEX IF NOT EXISTS idx_company_events_anon_created
    ON company_events (anonymous_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_company_events_company_type_created
    ON company_events (company_id, event_type, created_at);
    ```

    Monitoring only — used for Phase B exit metrics (second-click, bookmark/apply from company pages). Example funnel:

    ```sql
    SELECT
      company_id,
      SUM(event_type = 'page_view') AS page_views,
      SUM(event_type = 'job_click') AS job_clicks,
      SUM(event_type = 'bookmark_add') AS bookmarks,
      SUM(event_type = 'apply_click') AS applies,
      ROUND(1.0 * SUM(event_type = 'job_click') / NULLIF(SUM(event_type = 'page_view'), 0), 3) AS second_click_rate
    FROM company_events
    WHERE created_at >= datetime('now', '-14 day')
    GROUP BY company_id
    ORDER BY page_views DESC
    LIMIT 50;
    ```

## Environment Variables

Configure your `.env` file as follows:

```bash
TURSO_DATABASE_URL=your_database_url
TURSO_AUTH_TOKEN=your_auth_token
```

## Development

Clone the repo:

```bash
git clone git@github.com:anna4dev/job-signal.git
cd job-signal
npm install
npm run dev
```

## Contributing

- [CONTRIBUTING.md](CONTRIBUTING.md) — atomic commits & PR review
- [AGENTS.md](AGENTS.md) — AI-assisted development & architecture constraints

## Roadmap

Future updates follow a dual-track plan:
- **Core matching track** keeps the mainline focused on `2.3 -> 3.x`.
- **Company intelligence track** runs in parallel for To C growth (GSC exposure/click uplift) without blocking the mainline.

### Phase 1: Discovery Foundation

_Goal: Make job discovery fast, reusable, and trustworthy._

- [x] **1.1 Query & Filter UX**
- Stack filter and core search filters are available.
- Stable, shareable query-string-based filter state.

- [x] **1.2 Job Details Trust Layer**
- Add `Raw Post` panel in details.
- Add structured `Report Issue` workflow.
- Persist `job_overrides_v1` locally and apply immediate UI overrides.

- [x] **1.3 Saved Filters / Saved Searches (Local-First MVP)**
- Save current filter snapshots locally.
- Manage and re-apply saved searches from `/searches`.
- No login required.

- [x] **1.4 Bookmarks + Lifecycle**
- Add status to bookmarks (Saved/Applied/Interviewing/Offer/Rejected).
- Use lifecycle as downstream implicit signal input.

### Phase 2: Profile & Signals Layer

_Goal: Build stable matching inputs before introducing ranking complexity._

- [x] **2.1 Explicit Profile (Local-First)**
- `/profile` page for roles, stack, salary, remote/visa, locations.
- Persist `explicitProfile` locally.

- [x] **2.2 Unified Signals Contract**
- Merge `explicitProfile` + `implicitSignals` into normalized `UnifiedSignals`.
- Persist `unified_signals_v1` locally for downstream fit usage.

- [x] **2.3 Signal Quality & Explainability Prep**
- Enrich implicit signals from bookmarked jobs (industry, size, funding_stage, role, tech_stack) via `/api/jobs/signal-context`.
- Harden saved-search stack extraction and applied-bookmark weighting.
- Stabilize `FACTOR_FIELD_MAP` for Phase 3 fit explainability.

### Phase 3: Fit v1 (Deterministic + Explainable)

_Goal: Ship practical matching with clear reasons, not black-box scoring._

- [x] **3.1 Deterministic Fit Engine**
- Deterministic `fit(job, unifiedSignals)` outputs `fitScore + reasonTags + factorBreakdown`.
- Hard constraints unmet → `fitScore = 0`; preferences are pre-normalized (no `normalizeWeights` in fit).

- [x] **3.2 Best Fit View + Sort Toggle**
- Toggle `Best Fit`, `Newest`, `Highest Pay` via `sort` query param.
- Show fit score and reason tags on job cards; Best Fit ranks a recent matching pool client-side.

- [x] **3.3 Fit Observability (behavior, not votes)**
- Instrument natural funnels under Best Fit: impression → detail open → bookmark (list + detail), bucketed by fitScore.
- Track `sort_change` (`from->to`) to separate intentional Best Fit use from other sorts.
- Compare `sort=fit` vs `newest`/`pay` on the same funnel via `fit_events` + `POST /api/fit-events`.
- Monitoring only — no auto-updating fit weights; no thumbs-up UI.

### Company Intelligence Track (Parallel)

_Goal: grow discoverability and decision value via company pages without blocking the core `2.3 -> 3.x` track._

Measurement note: activation/quality targets and exact numeric thresholds are defined in `analytics spec v1`.

#### Phase A: Company Surface (v1)

- [x] Deliver baseline data + pages: `companies` list, `companies/[id]`, and `company profile + company jobs`.
- [x] Support bidirectional navigation (`jobs <-> company`) and company-page SEO policy (sitemap/canonical/metadata/indexing gates).
- [x] Enabled UI blocks: Hero, Quick Decision Zone, Company Jobs Zone, Page Footer Baseline.

**Indexing gate** (`lib/companyIndexable.ts`) — a company is sitemap/`index`-eligible when all hold:
1. `job_count > 2`
2. Cross-month: distinct `YYYY-MM` of `post_at` > 1
3. `nonAdjacentMonthPostCount > 2` (posting months that have another posting month at calendar distance ≥ 2)

Anonymous / placeholder names (`Anonymous`, `Stealth`, `Confidential`, …) are never indexable. Thin companies remain reachable from job links with `noindex,follow`. Sitemap still lists only gate-passing companies (notify/Indexing API does not replace this).

Exit criteria:
- `company -> job` CTR >= target for 2 consecutive weeks.
- Company page render success rate meets production reliability target.
- Company page index coverage is measurable under Job Signal SEO policy.
- Effective index rate (indexed company pages with impressions/clicks) >= target for 2 consecutive weeks.

#### Phase B: Apply Intelligence (v2)

- [x] Add evidence-first decision signals: 30/90-day momentum, role/level mix, remote/visa/salary coverage, and baseline tech-stack coverage (job-derived).
- [x] Enabled UI blocks: Evidence & Sources Zone, Trend Zone.
- [x] Company-page observability: `page_view` / `job_click` / `bookmark_*` / `apply_click` via `company_events` + `POST /api/company-events`.
- Implementation principle: prioritize reuse; do not block delivery.

**Measurability** (after Turso migration for `company_events`):
- Second-click rate: `job_click / page_view` per company (or site-wide).
- Bookmark / apply from company: `bookmark_add` and `apply_click` divided by `page_view` or `job_click`.
- Module coverage is rendered per company (Evidence zone) and queryable from `jobs_structured` aggregates.

Exit criteria:
- Company-page second-click rate >= target for 2 consecutive weeks.
- Apply/bookmark conversion initiated from company pages >= target for 2 consecutive weeks.
- Coverage for momentum/role/constraint/stack modules is measurable per company page.

#### Phase C: Career Risk & Trajectory (v3)

- Add long-horizon context: trajectory timeline, signal-consistency view, and same-lane peer comparison (3-5 companies).
- Enabled UI block: Long-Horizon Zone.

Boundaries:
- v3 default uses internal structured signals only (`HN + in-product structured data`).
- External enrichment is out of scope for v3 and belongs to v4.
- Do not output a single "apply/do-not-apply" conclusion.

Exit criteria:
- Company-page 7-day revisit rate >= target for 2 consecutive weeks.
- Peer-compare module usage is measurable and above activation threshold.
- "Information not trustworthy" feedback rate stays below quality threshold.

#### Optional Follow-up: External Evidence (v4, TBD)

- Introduce Tavily enrichment only after product demand and data-quality thresholds are met.

Trigger conditions:
- v3 behavior indicates sustained user demand for long-horizon analysis.
- External coverage/stability reaches a usable threshold.
- Team has capacity to own source-consistency and maintenance costs.

### Company Detail Structure (Reference)

- **v1 sections**: Hero, Quick Decision Zone (hiring/role/constraint snapshots), Company Jobs Zone (sortable/filterable with `company -> job` path), Page Footer Baseline (`last updated`, coverage, source disclosure, feedback).
- **v2 sections**: Evidence & Sources Zone (sample size/time window/source list/coverage hints) and Trend Zone (momentum/role/stack trends + anomaly hints). Wired in `app/companies/[id]/page.tsx` via `getCompanyEvidence`.
- **v3 sections**: Long-Horizon Zone (trajectory timeline, peer comparison, signal consistency, optional lenses).

### Phase 4: Identity & Sync Layer

_Goal: Add account and multi-device consistency after core local-first value is proven._

Gating rule for post-Phase-3 work: only starts after Phase 3 fit-quality gates pass for two consecutive releases.

- [ ] **4.1 Identity Gateway**
- Implement OAuth.

- [ ] **4.2 Cloud Sync & Hybrid State**
- Sync profile/bookmarks/saved-searches/overrides to cloud.
- Add data export.

### Phase 5: Retention & Outbound Value

_Goal: Proactive engagement on top of stable fit quality._

- [ ] **5.1 Match Alerts**
- Cron job executes fit and sends notifications.

## Appendix: Design Ops Backlog

- [ ] **UI: unify accent palette (blue -> slate)**
- Replace `blue-*` accents across home/bookmarks/profile/filters with a shared slate token set (`primary`, `primary-hover`, `accent-surface`, `focus-ring`, `selected`).
- Centralize tokens instead of per-file class edits; keep focus-ring contrast accessible.
- Cosmetic only; does not block product roadmap milestones.

## Appendix: Fit Observability Backlog

_Post-3.3. Does not auto-update fit weights. Prefer natural behavior over survey UI._

**Fit calibration (next)**
- [ ] `detail_view` on job detail mount (reconcile with list `open`; cover deep links)
- [ ] Detail dwell / scroll depth (filter mis-taps vs serious reads)
- [ ] Pagination `page` events (whether high-fit conversion collapses to page 1)
- [ ] Hard-fail interaction analysis (open/bookmark rates when `hard_fail=1`)

**Product / growth (separate from Fit calibration)**
- [ ] Apply Now / outbound JD click (when `jd_url` present)
- [ ] Profile empty CTA → edit / profile save
- [ ] Assist-fill suggestion applied
- [ ] Saved search create / apply
- [ ] Bookmark lifecycle status changes (Applied / Rejected / …)
