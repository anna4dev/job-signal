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

- [ ] **3.3 Feedback Collection**
- Keep collecting structured corrections/feedback.
- Use feedback for monitoring and future tuning (not auto-learning yet).

### Company Intelligence Track (Parallel)

_Goal: grow discoverability and decision value via company pages without blocking the core `2.3 -> 3.x` track._

Measurement note: activation/quality targets and exact numeric thresholds are defined in `analytics spec v1`.

#### Phase A: Company Surface (v1)

- Deliver baseline data + pages: `companies` list, `companies/[id]`, and `company profile + company jobs`.
- Support bidirectional navigation (`jobs <-> company`) and company-page SEO policy (sitemap/canonical/metadata/indexing gates).
- Enabled UI blocks: Hero, Quick Decision Zone, Company Jobs Zone, Page Footer Baseline.

Exit criteria:
- `company -> job` CTR >= target for 2 consecutive weeks.
- Company page render success rate meets production reliability target.
- Company page index coverage is measurable under Job Signal SEO policy.
- Effective index rate (indexed company pages with impressions/clicks) >= target for 2 consecutive weeks.

#### Phase B: Apply Intelligence (v2)

- Add evidence-first decision signals: 30/90-day momentum, role/level mix, remote/visa/salary coverage, and baseline tech-stack coverage.
- Enabled UI blocks: Evidence & Sources Zone, Trend Zone.
- Implementation principle: prioritize reuse; do not block delivery.

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
- **v2 sections**: Evidence & Sources Zone (sample size/time window/source list/coverage hints) and Trend Zone (momentum/role/stack trends + anomaly hints).
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
