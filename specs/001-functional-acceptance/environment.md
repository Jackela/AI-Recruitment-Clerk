# Acceptance Environment Specification

**Scope**: Functional acceptance for feature `001-functional-acceptance`
**Purpose**: Define the pre‑release environment representative of production used for acceptance runs.

## Environment Definition

- Environment Name: `pre-release`
- Application Version: Align with release candidate tag (e.g., `vX.Y.Z-rcN`)
- Configuration Source: `.env.pre` derived from `.env.example` (no secrets committed)
- Feature Flags: Enumerate and set per run in `runs/<RUN_ID>.json` → `flags: { ... }`
- External Services: Point to staging endpoints with documented SLAs or approved mocks
- Data Set: Seed data version `seed-<DATE>`; refresh procedure documented below

## Versions & Components

- Node.js: >= 20.18
- Nx workspace: per repository `package.json`
- Apps in scope: `apps/app-gateway` (compose only; no code changes required for this feature)
- Libraries: No changes; acceptance documents only

## Access & Accounts

- Test Accounts: Non‑privileged accounts prepared for P1/P2 journeys
- Credentials: Provided via secure channel; not stored in VCS
- Permissions: Sufficient for all acceptance scenarios without elevated roles unless specified

## Seed Data & Refresh

- Seed Source: `scripts/seed/` (if applicable)
- Refresh Window: Before each acceptance run; document dataset hash in `runs/<RUN_ID>.json`
- Known Data Caveats: Record in `acceptance-catalog.md` per case if applicable

## Network & Stability

- Network Conditions: Typical office latency; no artificial shaping
- External Dependencies: Retry/timeouts per service defaults; log incidents as Blocked per D‑002

## External Dependencies (Acceptance Expectations)

Enumerate dependencies and expectations for acceptance runs. Use staging endpoints or approved mocks. If unavailable or degraded beyond expectations, mark affected cases as Blocked and link the incident/defect.

- LLM/Inference Service
  - Mode: Staging endpoint or approved mock
  - Expectations: 95th percentile latency within staging SLA; timeouts per default config
  - Fallback: If unavailable, affected extraction/scoring cases are Blocked

- Object Storage (uploads/evidence)
  - Mode: Staging bucket/container
  - Expectations: Write/read succeeds for acceptance artifact sizes; signed URLs if applicable
  - Fallback: If unavailable, upload/report cases are Blocked

- Primary Database
  - Mode: Staging DB with seed dataset
  - Expectations: Dataset version recorded in `runs/<RUN_ID>.json`; stable schema
  - Fallback: If schema/data mismatch, re‑seed; persistent failures → Blocked

- Message Broker / Queue
  - Mode: Staging broker with default retry/timeouts
  - Expectations: Enqueue/dequeue for processing flows observable within acceptance window
  - Fallback: If unavailable, processing cases are Blocked

- Search/Indexing Backend (if applicable)
  - Mode: Staging search endpoint
  - Expectations: Query/filter/pagination behave per spec
  - Fallback: If degraded, search cases are Blocked

- Reporting/Rendering Service (if applicable)
  - Mode: Staging renderer
  - Expectations: Generate downloadable reports within reasonable time
  - Fallback: If unavailable, report cases are Blocked

## Change Control

- Any deviation from this environment during a run MUST be recorded in run metadata
- Environment changes during an acceptance round require re‑run or explicit waiver in sign‑off
