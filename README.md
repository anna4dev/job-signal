# Job Signal

Structured, searchable interface for Hacker News "Who’s Hiring" jobs.

website: https://www.jobsignal.dev/

## Overview

Job Signal converts unstructured Hacker News hiring threads into structured job listings that are searchable, filterable, and indexable.

## Features

- Structured parsing of HN Who’s Hiring threads
- Filters for fast job browsing
- Bookmark jobs (localStorage, no login required)
- Mobile-friendly UI

## Example Job Page

https://www.jobsignal.dev/jobs/hn_47036452_0

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

## Roadmap

Future updates will follow this priority order:

#### Phase 1: The Matching Foundation

_Goal: Bridge the gap between job data and user intent._

- [x] **1.1 Enhance Filter**
- Add `stack` filter.

- [x] **1.2 Raw Post & Report Issue**
- Add `Raw Post` to details page.
- Add `Report Issue` to details page.
- Persist `job_overrides_v1` locally.

- [ ] **1.3 Implicit Signals**
- Update `learnedProfile` based on bookmarks.
- Update `contextualProfile` based on searches.

- [ ] **1.4 Explicit Signals**
- Define `/profile` structure: `roles`, `expert_stack`, `interested_stack`, `min_salary`, `remote_only`, `locations`.
- Add profile page to maintain `explicitProfile`.
- Persist `explicitProfile` locally.

- [ ] **1.5 Unified Signals**
- Persist `effectiveProfile` locally.

#### Phase 2: Intelligence & Explainability

_Goal: Quantify "Fit" and eliminate the "Black Box" feeling._

- [ ] **2.1 Deterministic Fit-Score Engine**
- Create a calculation utility.
- Weighting.

- [ ] **2.2 "Jobs Fit Me" View**
- Add best match results sorting by `fitScore` DESC.
- Visual tags (e.g., "Stack Match", "Salary Match") to justify the score.
- Add feedback to adjust weighting.

- [ ] **2.3 Unified Advanced Sorting**
- Toggle between `Best Fit`, `Newest`, and `Highest Pay`.

- [ ] **2.4 Job Lifecycle**
- Add status field to bookmark model and toggle in UI (e.g., Saved/Applied/Interviewing/Offer/Rejected)
- Add status grouping in bookmarks page
- Use job lifecycle as implicit matching signal

- [] **2.5 Company Intelligence Layer**
- Add `/company/[company_id]` page
- Show company info, aggregated jobs
- bookmark

#### Phase 3: The Identity & Sync Layer

_Goal: Transition from "Local Tool" to "Personal Career Agent."_

- [ ] **3.1 Identity Gateway**
- Implement OAuth.

- [ ] **3.2 Saved Searches**
- Allow users to "Follow" a specific filter set (e.g., "Remote React Roles > $120k").

- [ ] **3.3 Cloud Sync & Hybrid State**
- Overrides Cleanup: 
    - trusting the updated Agent data 
    - Time-To-Live: 30 days
    - Silently remove overrides where override.value is identical to baseJob
- Migrate `localStorage` profile/bookmarks/filters to DB.
- Export profile/bookmarks/filters.

#### Phase 4: Retention & Outbound Value

_Goal: Proactive engagement._

- [ ] **4.1 Match Alert**
- Background job (Cron) to run the `Fit-Score Engine`.
- Send notifications for jobs meeting user fits.
