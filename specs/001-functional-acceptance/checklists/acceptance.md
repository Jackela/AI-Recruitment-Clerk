# Acceptance Requirements Quality Checklist

Purpose: Unit tests for the English quality of acceptance and usability requirements (not implementation tests)
Created: 2025-10-23
Feature: 001-functional-acceptance

## Requirement Completeness
- [X] CHK001 Are all P1 user journeys enumerated with titles/IDs and expected outcomes? [Completeness, Spec §FR-001]
- [X] CHK002 Are all declared product features in scope (P1+P2) mapped to Acceptance Cases? [Completeness, Spec §FR-002, §FR-006]
- [X] CHK003 Does the spec define required acceptance run metadata (date/time, executor, env, evidence, result) comprehensively? [Completeness, Spec §FR-003]
- [X] CHK004 Are sign-off actors and the joint approval flow fully specified? [Completeness, Spec §FR-007]
- [X] CHK005 Is the defect lifecycle (log → triage → fix → re‑verify → close) completely described? [Completeness, Spec §FR-004]
- [X] CHK006 Are acceptance scenarios defined for all P1 and P2 items, not just examples? [Completeness, Spec §User Stories]

## Requirement Clarity
- [X] CHK007 Are acceptance evidence types (screenshots, recordings, notes) defined with storage/format guidance? [Clarity, Spec §Key Entities "Evidence Artifact"]
- [X] CHK008 Are roles and responsibilities for execution vs. approval clearly distinguished? [Clarity, Spec §FR-003, §FR-007]
- [X] CHK009 Are scope boundaries for this round (what is excluded or deferred) explicitly stated? [Clarity, Spec §FR-006, Gap]
- [X] CHK010 Are ambiguous terms like "acceptable time" and "without assistance" quantified with thresholds or conditions? [Ambiguity, Spec §User Story 1, §SC-003]

## Requirement Consistency
- [X] CHK011 Do success criteria (SC-001..SC-004) align with functional requirements (FR-001..FR-007) without contradiction? [Consistency, Spec §Requirements, §Success Criteria]
- [X] CHK012 Is the P1+P2 scope in FR‑006 consistent with coverage targets in SC‑002? [Consistency, Spec §FR-006, §SC-002]
- [X] CHK013 Is the joint sign‑off in FR‑007 consistent with the acceptance run ownership in FR‑003? [Consistency, Spec §FR-003, §FR-007]

## Acceptance Criteria Quality
- [X] CHK014 Are measurable acceptance thresholds defined for usability completion time per journey? [Measurability, Spec §SC-003]
- [X] CHK015 Are pass/fail criteria for each Acceptance Case explicitly tied to expected outcomes? [Acceptance Criteria, Spec §FR-002]
- [X] CHK016 Are quality gates for critical defects (blockers) explicitly preventing sign‑off? [Acceptance Criteria, Spec §SC-001]
- [X] CHK017 Is the reopen rate target operationalized with calculation method and data source? [Measurability, Spec §SC-004, Gap]

## Scenario Coverage
- [X] CHK018 Are primary, alternate, and exception flows identified for each P1 journey with acceptance expectations? [Coverage, Spec §User Stories, Gap]
- [X] CHK019 Are recovery requirements specified for user error recovery and partial failures? [Coverage, Spec §User Story 1, §Edge Cases]
- [X] CHK020 Are acceptance cases specified for features gated by configuration/feature flags (including enablement instructions)? [Coverage, Spec §Edge Cases]

## Edge Case Coverage
- [X] CHK021 Are environment instability and external dependency degradation acceptance expectations documented (timeouts, retries, defer rules)? [Edge Case, Spec §Edge Cases, Gap]
- [X] CHK022 Are session expiration and intermittent network scenarios covered with acceptance expectations and evidence requirements? [Edge Case, Spec §Edge Cases]
- [X] CHK023 Are data inconsistency conditions in test environments accounted for with acceptance handling (dataset refresh, known issues list)? [Edge Case, Spec §Edge Cases, Gap]

## Non-Functional Requirements
- [X] CHK024 Are any NFRs (performance, accessibility, security, reliability) in scope for acceptance explicitly listed with measurable targets? [NFR, Gap]
- [X] CHK025 Are auditability and traceability requirements for evidence storage (location, retention, naming) specified? [NFR, Spec §Assumptions "Evidence storage"; Gap]

## Dependencies & Assumptions
- [X] CHK026 Are external service dependencies enumerated with acceptance-time expectations (mock vs. live, SLAs, fallback)? [Dependency, Spec §Edge Cases, Gap]
- [X] CHK027 Are prerequisites (test accounts, credentials, seed data) precisely documented and controlled? [Assumption, Spec §Assumptions]
- [X] CHK028 Is the target environment definition (pre‑release representative of production) sufficiently specified (versions, configs)? [Assumption, Spec §Assumptions, Gap]

## Ambiguities & Conflicts
- [X] CHK029 Is "expected outcomes" defined for each journey/feature in a way that prevents subjective interpretation? [Ambiguity, Spec §FR-001, §FR-002]
- [X] CHK030 Are roles like "acceptance owner" vs. "executor" vs. "approver" unambiguously defined? [Ambiguity, Spec §User Story 3, §FR-003, §FR-007]
- [X] CHK031 Are criteria for "Blocked" vs. "Fail" results clearly differentiated? [Ambiguity, Spec §FR-003, Gap]

## Traceability & Governance
- [X] CHK032 Does each Acceptance Case reference the corresponding requirement ID (FR/US/SC) and maintain bidirectional traceability? [Traceability, Spec §FR-002, Gap]
- [X] CHK033 Is there a catalog/index of journeys, features, acceptance cases, and evidence with stable IDs? [Traceability, Spec §FR-001, §FR-002, Gap]
- [X] CHK034 Is the defect triage process linked to acceptance cases and requirements for re‑verification traceability? [Traceability, Spec §FR-004]

## Scope Control & Change Management
- [X] CHK035 Is there a defined process for scope change during acceptance (adding/removing features or journeys) with impact on targets (SC‑002)? [Consistency, Spec §FR-006, §SC-002, Gap]
- [X] CHK036 Are exit criteria for this acceptance round clearly stated and aligned to sign‑off? [Acceptance Criteria, Spec §Success Criteria, §FR-007]
