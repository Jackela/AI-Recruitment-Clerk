# Findings – app-gateway

1. **SSOT Breach**: Job posting entity defined in both Mongo schema and temporary Redis store without reconciliation. Evidence: `apps/app-gateway/src/schemas/job.schema.ts` vs `apps/app-gateway/src/services/gridfs.service.ts`. Severity: High.
2. **SOLID – Single Responsibility**: `scoring-proxy.controller.ts` orchestrates both analytics logging and score aggregation; requires service extraction. Severity: Medium.
