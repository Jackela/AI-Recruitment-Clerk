# Migration Cutover Plan

This document defines the dual-run rehearsal, success criteria, and cutover steps.

## Dual-Run Scope
- Endpoints: `/scoring/gap-analysis`, `/scoring/gap-analysis-file`
- Primary: `SCORING_ENGINE_URL`
- Alternate: `SCORING_ENGINE_URL_ALT` (or `MATCH_SVC_URL`)
- Enable via `featureFlags.dualRun = true`

## Rehearsal
1. Enable dual-run in pre-release.
2. Execute workload using anonymized sample corpus.
3. Generate summaries:
   - `node tools/migration/compare-summary.mjs`
   - `node tools/migration/consistency-metrics.mjs`

## Success Criteria
- Status match rate ≥ 95%.
- Pearson correlation ≥ 0.65.
- NDCG@10 ≥ 0.80.
- Alternate latency within +20% of primary on average.

## Cutover Steps
1. Disable dual-run.
2. Switch traffic to alternate service (update `SCORING_ENGINE_URL`).
3. Monitor funnels and impact endpoints.
4. If regression detected, rollback to previous config.

