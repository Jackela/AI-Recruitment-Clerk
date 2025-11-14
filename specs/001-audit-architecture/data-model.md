# Data Model – Holistic Architecture Governance Program

## 1. System Component
- **Identifier**: `componentId` (string; matches Nx project name)
- **Attributes**:
  - `type`: enum (`application`, `library`, `tooling`, `script`)
  - `ownerTeam`: text (team or squad name)
  - `principleScores`: object with keys `ssot`, `solid`, `ddd` (values: `pass`, `fail`, `not-applicable`)
  - `evidenceLinks`: array of URLs/paths to supporting docs
  - `dependencies`: array of `componentId` values (mirrors Nx graph)
  - `lastAuditedAt`: ISO timestamp
- **Relationships**:
  - 1-to-many with **Best Practice Finding** (a component can have multiple findings)
  - 1-to-many with **Validation Run** (component included in many runs)
- **Validation Rules**:
  - Component must exist in Nx workspace metadata.
  - `ownerTeam` cannot be empty; use "UNASSIGNED" only when flagged for escalation.
  - `principleScores` must include rationale entries for every `fail` state.

## 2. Best Practice Finding
- **Identifier**: `findingId` (string `COMPONENT-###`)
- **Attributes**:
  - `componentId`: foreign key to System Component
  - `principle`: enum (`SSOT`, `SOLID`, `DDD`)
  - `severity`: enum (`high`, `medium`, `low`)
  - `description`: text summary of violation
  - `evidence`: markdown/URL referencing code, docs, or logs
  - `openedAt` / `targetClosure`
  - `status`: enum (`open`, `in-progress`, `closed`, `waived`)
- **Relationships**:
  - Many-to-one with **System Component**
  - One-to-many with **Remediation Work Item** (a finding can map to multiple granular fixes)
- **Validation Rules**:
  - Severity must align with impact (e.g., SSOT breach affecting hiring decision data cannot be `low`).
  - Findings cannot be closed unless all linked remediation items report `verified`.

## 3. Remediation Work Item
- **Identifier**: `remediationId` (string `FINDING-LETTER`)
- **Attributes**:
  - `findingId`: foreign key to Best Practice Finding
  - `owner`: individual or squad lead
  - `milestones`: ordered list of `{name, dueDate, acceptanceCriteria}`
  - `dependencies`: list of other `remediationId`s or external blockers
  - `verificationSteps`: list of required tests/CI checks
  - `status`: enum (`planned`, `in-progress`, `ready-for-validation`, `verified`, `blocked`)
- **Relationships**:
  - Many-to-one with **Best Practice Finding**
  - One-to-many with **Validation Run** entries that cite the remediation being verified
- **Validation Rules**:
  - Every remediation must reference at least one verification step (unit, integration, lint, E2E, or governance checklist).
  - Cannot transition to `verified` without attached validation run manifest referencing successful CI.

## 4. Validation Run
- **Identifier**: `runId` (timestamp + short SHA, e.g., `2025-11-08-abc1234`)
- **Attributes**:
  - `components`: array of componentIds included in the run
  - `testsExecuted`: `{unit, integration, lint, typecheck, e2e}` booleans + summaries
  - `actSimulation`: `{workflow, image, status, logPath}`
  - `githubActions`: `{workflowUrl, conclusion, jobMatrix}`
  - `trigger`: enum (`remediation`, `scheduled`, `pre-merge`)
  - `result`: enum (`pass`, `fail`, `blocked`)
  - `notes`: free-form details about discrepancies or follow-ups
- **Relationships**:
  - Many-to-many with **Remediation Work Item** (documented via `remediationIds` array)
  - Many-to-many with **System Component** (derived from `components` field)
- **Validation Rules**:
  - `testsExecuted` must include timestamps/results for every mandatory suite; missing suites require `result = blocked`.
  - `actSimulation.status` and `githubActions.conclusion` must match for the run to be marked `pass`.

## State Transitions

### Remediation Work Item Lifecycle
`planned → in-progress → ready-for-validation → verified`
- Transitions require:
  - `planned → in-progress`: owner assigned + kickoff date recorded.
  - `in-progress → ready-for-validation`: implementation complete, awaiting tests.
  - `ready-for-validation → verified`: linked Validation Run with `result = pass` and reviewer sign-off.
  - Any state → `blocked`: dependency unmet or CI failure; requires unblock note.

### Validation Run Lifecycle
`pass` and `fail` are terminal states; `blocked` remains open until rerun.
- Runs default to `blocked` if any suite skipped or `act` parity differs.
- Only `pass` runs can unlock PR merge gates.
