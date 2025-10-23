# Result States — Acceptance

Authoritative definitions for acceptance result states. Mirrors spec D‑002 and clarifies
Fail vs. Blocked differentiation.

## States

- Pass: Expected outcome achieved; no S1/S2 defects observed.
- Fail: Expected outcome not achieved due to product behavior; reproducible.
- Blocked: Execution cannot proceed due to environment, data, or dependency issues outside
  product behavior; defect or incident logged and linked.

## Differentiation

- Fail is used when acceptance cannot meet expected outcomes because of the product’s
  behavior (e.g., incorrect results, broken UI flow) under valid preconditions.
- Blocked is used when external factors prevent execution (e.g., outage, invalid dataset,
  required feature flag missing). Provide the incident/defect link and re‑run when cleared.

References: specs/001-functional-acceptance/spec.md (D‑002)

