# Project Phoenix (C2C Coach) — High‑Level Architecture (HLD)

Version: 1.0
Status: Adopted
Last Updated: 2025-09-13

## 1. Overview

- Purpose: Define the current consumer‑to‑consumer “Coach” system architecture and the next immediate capability: PDF resume parsing.
- Scope: Angular front end, NestJS app gateway, microservices (resume‑parser, scoring‑engine), messaging (NATS), storage (MongoDB + GridFS). Only C2C functionality is in scope; legacy B2B and wave reports are explicitly out of scope.
- Sources: Curated from legacy HLD/LLD in `_LEGACY_ARCHIVE/documents/` and aligned to the Nx monorepo and current app structure.

## 2. Architecture Summary

- Client: Angular SPA (apps/ai-recruitment-frontend)
- API gateway: NestJS (apps/app-gateway)
- Services (microservices; NestJS):
  - resume-parser-svc — parses uploaded resumes, including PDFs
  - scoring-engine-svc — computes match scores between JD and resume
  - jd-extractor-svc — optional; converts JD text to structured JdDTO
  - report-generator-svc — optional; renders markdown report and stores in GridFS
- Messaging: NATS JetStream (events, durable streams)
- Storage: MongoDB; GridFS for large/binary files (PDFs, generated reports)
- Observability: Grafana/Loki/Tempo/Prometheus (LGTM stack)

## 3. Core Domain Flow

1) User creates a Job and provides JD text via gateway.
2) User uploads one or more resumes (PDF/other). Gateway stores files in GridFS and emits events.
3) Resume parser consumes events, downloads files, extracts structured data (ResumeDTO), publishes `analysis.resume.parsed`.
4) Scoring engine consumes parsed resumes + JD to produce ScoreDTO, publishes `analysis.match.scored`.
5) Optional: Report generator creates a markdown insight report and stores it in GridFS.

## 4. Contracts (DTOs & Events)

- JdDTO
  - requiredSkills: { name: string; weight: number }[]
  - experienceYears: { min: number; max: number }
  - educationLevel: 'bachelor' | 'master' | 'phd' | 'any'
  - softSkills: string[]

- ResumeDTO
  - contactInfo: { name: string; email: string; phone: string }
  - skills: string[]
  - workExperience: { company: string; position: string; startDate: Date; endDate: Date | 'present'; summary: string }[]
  - education: { school: string; degree: string; major: string }[]

- ScoreDTO
  - overallScore: number (0–100)
  - skillScore: { score: number; details: string }
  - experienceScore: { score: number; details: string }
  - educationScore: { score: number; details: string }

- Events (NATS subjects)
  - job.jd.submitted — { jobId, jdText }
  - analysis.jd.extracted — { jobId, jdDto }
  - job.resume.submitted — { jobId, resumeId, gridFsId, originalFilename }
  - analysis.resume.parsed — { jobId, resumeId, resumeDto }
  - analysis.match.scored — { jobId, resumeId, scoreDto, reportGridFsId? }

## 5. Gateway API (in scope)

- POST /jobs
  - body: { jobTitle: string; jdText: string }
  - returns: 202 Accepted { jobId }
  - side effects: emits `job.jd.submitted`

- POST /jobs/{jobId}/resumes
  - multipart/form-data: files[] (binary)
  - returns: 202 Accepted { jobId, submittedResumes }
  - side effects: stores files in GridFS, emits `job.resume.submitted` per file

- GET /jobs/{jobId}/resumes/{resumeId}/score
  - returns: { resumeId, scoreDto }

- GET /jobs/{jobId}/resumes/{resumeId}/report
  - returns: markdown report (from GridFS) if generated

## 6. Data Model (MongoDB + GridFS)

- jobs
  - _id, title, jdText, jdDto, status ('processing'|'completed'), createdAt, updatedAt

- resumes
  - _id, jobId (FK), originalFilename, gridFsId, status ('pending'|'parsing'|'scoring'|'completed'|'failed'), errorMessage?, resumeDto, scoreDto, reportGridFsId?, createdAt, updatedAt

- GridFS
  - Stores uploaded PDFs and generated markdown reports

## 7. PDF Parsing Feature — Technical Design (Priority)

Goals
- Parse PDF resumes into a normalized ResumeDTO with high accuracy and resilience.
- Support large files, non‑English text, scanned PDFs (OCR), and partial extraction.

User Journey
- Upload PDF on job page → immediate 202 with queued processing → UI shows pending status → real‑time/interval updates show parsed + scored results.

Service Responsibilities (resume-parser-svc)
- Input: `job.resume.submitted` { jobId, resumeId, gridFsId, originalFilename }
- Steps:
  1) Fetch PDF from GridFS.
  2) Detect content type: digital text vs. scanned; attempt text extraction.
  3) Extraction pipeline:
     - Primary: PDF text extraction (e.g., pdf.js/pdf-parse)
     - Fallback: OCR (e.g., Tesseract or cloud OCR) for scanned images
     - Optional: layout heuristics to segment sections (contact, skills, experience, education)
  4) LLM augmentation (optional): send extracted text to a Vision/LLM to improve field mapping and fill missing pieces; bound with strict schemas and timeouts.
  5) Normalize into ResumeDTO; persist to `resumes.resumeDto`; update status to 'parsing' → 'scoring'.
  6) Emit `analysis.resume.parsed` with resumeDto.

Non‑Goals
- No synchronous parsing on upload path; all parsing is async to keep UX responsive.

Interfaces
- NATS subjects as listed in Section 4.
- Error handling: on failure, set `resumes.status='failed'` and `errorMessage`; include correlation IDs.

Performance & Limits
- Max PDF size: 10–20 MB default (configurable); store raw in GridFS.
- SLA: 95th percentile parse time < 15s for text‑based PDFs; OCR may exceed.
- Concurrency: scale parse workers horizontally; one PDF per worker process.

Security & Compliance
- Virus scan (if available) before storing; reject dangerous files.
- Strip embedded scripts; ignore active content.
- Do not leak PII in logs; mask emails/phones in traces.

Observability
- Emit structured logs with jobId/resumeId; metrics for parse time, success/failure; trace spans across gateway → parser → scoring.

Testing Strategy
- Unit: DTO validation, text extraction adapters, normalizers.
- Integration: end‑to‑end parse from GridFS fixture to ResumeDTO.
- E2E: upload PDF in frontend and verify score appears.

Acceptance Criteria
- Given a valid PDF, ResumeDTO fields populated with ≥ 95% section detection accuracy on curated set.
- Upload path returns 202 and resumes status transitions to 'completed' with ScoreDTO.
- Failures are recorded and surfaced to UI with actionable messages.

## 8. Scoring Engine Notes

- Skill intersection ratio, experience thresholding, education mapping with weights: skill 0.5, experience 0.3, education 0.2.
- Input: JdDTO + ResumeDTO; Output: ScoreDTO with per‑dimension details.

## 9. Deployment & Ops

- Services deploy independently; NATS streams configured with retention and DLQ for failed messages.
- Mongo and NATS credentials loaded via environment; no secrets in repo.
- Health checks: `/health` on gateway and services; readiness gated on DB/NATS connectivity.

## 10. Backward Compatibility

- Legacy B2B flows and historical wave reports are deprecated and excluded from this design.
- Any remaining references must be removed in code and docs as encountered.

## 11. Open Questions

- OCR source (local vs. cloud) selection and cost guardrails.
- Language detection and multilingual normalization rules.
- Report generation scope for Phoenix MVP (immediate vs. later sprint).

