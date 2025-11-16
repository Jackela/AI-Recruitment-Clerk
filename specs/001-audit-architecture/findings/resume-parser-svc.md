# Findings – resume-parser-svc

1. **SSOT Breach**: Candidate identity parsed in both `field-mapper/date-parser.ts` and downstream `gridfs.service.ts` sanitation, leading to conflicting DOB formats. Severity: High.
