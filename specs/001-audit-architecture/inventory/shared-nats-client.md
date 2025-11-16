# shared-nats-client – SSOT / SOLID / DDD Checklist

## Metadata
- **Component ID**: `shared-nats-client`
- **Owner Team**: `platform-governance`
- **Last Audited**: `2025-11-08`
- **Auditor**: `[name]`

## SSOT (Single Source of Truth)
| Check | Description | Status | Evidence |
|-------|-------------|--------|----------|
| SSOT-1 | Single authoritative data source identified | ☐ PASS / ☐ FAIL / ☐ N/A | |
| SSOT-2 | No duplicated persistence or configuration for critical entities | ☐ PASS / ☐ FAIL / ☐ N/A | |
| SSOT-3 | Ownership + escalation documented | ☐ PASS / ☐ FAIL / ☐ N/A | |
| SSOT-4 | Data contracts shared consistently across consumers | ☐ PASS / ☐ FAIL / ☐ N/A | |

## SOLID
| Principle | Guideline | Status | Evidence |
|-----------|-----------|--------|----------|
| S (Single Responsibility) | Module has one reason to change | ☐ PASS / ☐ FAIL / ☐ N/A | |
| O (Open/Closed) | Extensibility achieved via composition/config rather than edits | ☐ PASS / ☐ FAIL / ☐ N/A | |
| L (Liskov Substitution) | Abstractions safe to swap without side effects | ☐ PASS / ☐ FAIL / ☐ N/A | |
| I (Interface Segregation) | Clients only depend on what they use | ☐ PASS / ☐ FAIL / ☐ N/A | |
| D (Dependency Inversion) | High-level policies not coupled to low-level details | ☐ PASS / ☐ FAIL / ☐ N/A | |

## DDD Alignment
| Check | Description | Status | Evidence |
|-------|-------------|--------|----------|
| DDD-1 | Bounded context defined and documented | ☐ PASS / ☐ FAIL / ☐ N/A | |
| DDD-2 | Aggregates/entities respect invariants | ☐ PASS / ☐ FAIL / ☐ N/A | |
| DDD-3 | Ubiquitous language consistent across code + docs | ☐ PASS / ☐ FAIL / ☐ N/A | |
| DDD-4 | Domain events and integration boundaries explicit | ☐ PASS / ☐ FAIL / ☐ N/A | |

## Follow-ups
- **Violations Logged?** `[Yes/No + links]`
- **Next Actions**: `[summaries of remediation work items]`
