# Data Model: CI/CD, Quality Gates, Migration & Gray Release

**Feature**: specs/002-cicd-quality-migration/spec.md  
**Date**: 2025-11-02

## Entities

### FeatureFlag
- id: string
- key: string (unique)
- description: string
- enabled: boolean
- rolloutPercentage: number (0–100)
- cohorts: string[] (optional; labels/segments when used)
- killSwitch: boolean (default false)
- updatedBy: string
- updatedAt: datetime
- auditId: string (link to AuditEvent)
Validation: key non-empty; 0 ≤ rolloutPercentage ≤ 100; killSwitch=true implies enabled=false.

### ReleaseChannel
- id: string
- name: enum ("pre-release", "production")
- artifactId: string (ref BuildArtifact)
- approver: string
- deployedAt: datetime
- rollbackPointId: string (ref BuildArtifact; optional)
Validation: production requires approved artifact; rollbackPointId when deployment succeeds.

### BuildArtifact
- id: string
- sourceCommit: string (SHA)
- createdAt: datetime
- checksum: string
- metadata: object (build info)
Validation: checksum present; sourceCommit valid SHA.

### Cohort
- id: string
- name: string
- type: enum ("whitelist", "label", "random")
- rule: string (expression or reference)
- createdBy: string
- createdAt: datetime
Validation: type= random implies rule holds percentage definition elsewhere; expression must be non-empty for whitelist/label.

### QualityGate
- id: string
- name: string
- thresholds: object (coverage %, test pass %, lint errors=0, typecheck pass)
- enforcedOn: enum ("pr", "main", "pre-release")
- updatedAt: datetime
Validation: 0 ≤ coverage ≤ 100; enforcedOn non-empty.

### MigrationScript
- id: string
- name: string
- description: string
- isOneTime: boolean
- executedAt: datetime (optional)
- status: enum ("pending", "success", "failed")
- rollbackNotes: string (optional)
Validation: when status!=pending, executedAt present.

### AuditEvent
- id: string
- actor: string
- action: enum ("deploy", "rollout", "rollback", "flag-update", "threshold-update")
- target: string (resource id or key)
- detail: object
- createdAt: datetime
Validation: action and target required; createdAt present.

## Relationships
- FeatureFlag → AuditEvent (updated via)
- ReleaseChannel → BuildArtifact (deployed artifact)
- ReleaseChannel → BuildArtifact (rollbackPoint)
- FeatureFlag → Cohort (optional association)
- QualityGate applied on branches/pipelines (contextual, not persisted)

## State Transitions
- FeatureFlag: enabled false → true (with rolloutPercentage 0→X) → 100 → off or killSwitch.
- ReleaseChannel: artifact built → pre-release deploy → validate → production deploy → rollback (optional).
- MigrationScript: pending → success/failed (retriable if idempotent).

