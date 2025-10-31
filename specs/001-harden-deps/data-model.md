# Data Model – Dependency Vulnerability Hardening

## Entities

### Dependency Vulnerability
- **Purpose**: Represents a security finding from automated dependency scans.
- **Key Fields**:
  - `id` (string) – unique identifier from scan report (e.g., CVE/CWE reference).
  - `packageName` (string) – npm package or workspace identifier.
  - `currentVersion` (string) – version detected in the codebase.
  - `severity` (enum: High, Moderate) – normalized risk classification in scope.
  - `fixVersion` (string, optional) – patched version recommended by scanners.
  - `detectionDate` (date) – timestamp of first detection on main branch.
  - `sourceWorkflow` (enum) – which CI job surfaced the finding (dependency-scan, contract-validation, etc.).
  - `status` (enum: Detected, InRemediation, Resolved) – lifecycle state.
  - `notes` (string, optional) – additional scan metadata (links to advisories).
- **Lifecycle**:
  1. `Detected` when scanner reports vulnerability.
  2. `InRemediation` once work item is assigned.
  3. `Resolved` after dependency upgrade verified and vulnerability cleared in follow-up scan.

### Remediation Record
- **Purpose**: Tracks the plan and completion proof for each vulnerability.
- **Key Fields**:
  - `recordId` (string) – unique identifier (e.g., Jira ticket or internal ID).
  - `vulnerabilityId` (string) – foreign key to Dependency Vulnerability.
  - `owner` (string) – accountable engineer or team.
  - `strategy` (enum: Upgrade, Replace, Patch, Remove) – remediation approach.
  - `targetCompletionDate` (date) – committed resolution deadline.
  - `status` (enum: Planned, InProgress, Completed, Blocked) – progress state.
  - `verificationEvidence` (string) – reference to CI run or manual validation proving resolution.
  - `riskAcceptance` (boolean, defaults false) – indicates if exception approved (should remain false for mod/high).
  - `reviewedBy` (string) – security reviewer approving completion.
  - `reviewDate` (date) – timestamp of approval.
- **Relationships**:
  - One Remediation Record references one Dependency Vulnerability.
  - Dependency Vulnerability must have exactly one active Remediation Record until resolved.
- **Lifecycle**:
  1. `Planned` when remediation decision logged.
  2. `InProgress` during implementation/testing.
  3. `Completed` once verification evidence confirms vulnerability removed.
  4. `Blocked` if remediation cannot proceed (triggers escalation).

## Derived Views
- **Remediation Dashboard**: Aggregates vulnerabilities and remediation records to display counts by severity, status, and approaching deadlines.
- **Release Gate Summary**: Snapshot enumerating remaining Detected/InRemediation items; used by CI to permit or block deployment.

## Validation Rules
- Every High or Moderate vulnerability must enter `Resolved` state before release approval.
- `targetCompletionDate` must not be later than agreed release cut-off.
- `verificationEvidence` required before marking Remediation Record `Completed`.
- `riskAcceptance` stays `false`; if set `true`, release automatically blocked pending governance review.
