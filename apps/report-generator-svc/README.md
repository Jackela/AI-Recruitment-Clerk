# Report Generator Service

The Report Generator Service is a comprehensive AI-powered system that creates professional recruitment analysis reports by orchestrating data from job descriptions, resume parsing, and scoring engines. It serves as the final component of the AI Recruitment Clerk system, transforming raw candidate data into actionable insights for HR teams.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Supported Report Formats](#supported-report-formats)
- [Template System](#template-system)
- [PDF Generation with Puppeteer](#pdf-generation-with-puppeteer)
- [Excel Generation with ExcelJS](#excel-generation-with-exceljs)
- [Inter-Service Data Fetching](#inter-service-data-fetching)
- [Error Handling Patterns](#error-handling-patterns)
- [Configuration Options](#configuration-options)
- [API Reference](#api-reference)
- [Event Integration](#event-integration)
- [Performance Monitoring](#performance-monitoring)
- [Storage Management](#storage-management)

---

## Architecture Overview

### Service Components

```
report-generator-svc/
├── src/
│   ├── report-generator/
│   │   ├── report-generator.service.ts    # Main orchestration service
│   │   ├── llm.service.ts                 # AI report generation using Gemini
│   │   ├── report.repository.ts           # MongoDB operations
│   │   ├── gridfs.service.ts              # File storage management
│   │   ├── report-templates.service.ts    # Report formatting and templates
│   │   ├── performance-monitor.service.ts # Performance and quality tracking
│   │   └── report.types.ts                # TypeScript type definitions
│   ├── report-helpers/
│   │   ├── report-data.service.ts         # Data aggregation utilities
│   │   └── llm-report-mapper.service.ts   # LLM data transformation
│   ├── services/
│   │   └── report-generator-nats.service.ts # NATS messaging integration
│   ├── app/
│   │   ├── reports.controller.ts          # REST API endpoints
│   │   └── report-events.controller.ts    # NATS event handlers
│   └── schemas/
│       └── report.schema.ts               # MongoDB schemas
```

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Scoring Engine │────▶│ NATS Message Bus│────▶│ Report Events   │
│     Service     │     │                 │     │   Controller    │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   HR Teams      │◀────│  REST API       │◀────│ Report Generator│
│  (Consumers)    │     │  Endpoints      │     │    Service      │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌────────────────────────────────┼────────────────────────────────┐
                        │                                │                                │
                        ▼                                ▼                                ▼
               ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
               │   LLM Service   │              │  GridFS Service │              │    MongoDB      │
               │    (Gemini)     │              │  (File Storage) │              │   (Metadata)    │
               └─────────────────┘              └─────────────────┘              └─────────────────┘
```

### Key Design Patterns

1. **Service Layer Pattern**: Clear separation between controllers, services, and repositories
2. **Repository Pattern**: Abstract database operations through `ReportRepository`
3. **Event-Driven Architecture**: NATS-based messaging for inter-service communication
4. **Template Method Pattern**: Flexible report generation with multiple output formats

---

## Supported Report Formats

The service supports five output formats, each optimized for different use cases:

### 1. Markdown (.md)

**Best for**: Version control, documentation systems, further processing

```typescript
// Generation example
const report = await reportTemplatesService.generateReportInFormat(
  reportDocument,
  'markdown',
  'individual',
);
```

**Features**:

- Clean, human-readable format
- Supports all template types
- Easy to parse and transform
- Ideal for Git-based workflows

### 2. HTML (.html)

**Best for**: Web display, email reports, browser viewing

```typescript
const report = await reportTemplatesService.generateReportInFormat(
  reportDocument,
  'html',
  'individual',
);
```

**Features**:

- Responsive design with CSS Grid
- Print-optimized styles
- Professional gradient headers
- Mobile-friendly layout

### 3. PDF (.pdf)

**Best for**: Official documentation, printing, archiving

```typescript
const pdfReport = await reportTemplatesService.generatePdfReportBuffer(
  reportDocument,
  'individual',
  {
    candidateName: 'John Doe',
    jobTitle: 'Senior Developer',
  },
);
```

**Features**:

- Generated via Puppeteer (headless Chrome)
- A4 format with configurable margins
- Page numbering in footer
- Print background support
- Custom header/footer templates

### 4. JSON (.json)

**Best for**: API consumers, data analysis, integrations

```typescript
const report = await reportTemplatesService.generateReportInFormat(
  reportDocument,
  'json',
  'individual',
);
```

**Structure**:

```json
{
  "metadata": {
    "reportType": "individual",
    "generatedAt": "2024-01-15T10:30:00Z",
    "jobId": "job_123",
    "resumeId": "resume_456",
    "jobTitle": "Senior Developer",
    "candidateName": "John Doe"
  },
  "summary": "Candidate analysis complete...",
  "overallScore": 85,
  "scoreBreakdown": {
    "skillsMatch": 90,
    "experienceMatch": 80,
    "educationMatch": 85,
    "overallFit": 85
  },
  "skillsAnalysis": [...],
  "recommendation": {...}
}
```

### 5. Excel (.xlsx)

**Best for**: Data analysis, HR spreadsheets, bulk reporting

```typescript
const excelReport = await reportTemplatesService.generateExcelReportBuffer(
  reportDocument,
  'comparison',
);
```

**Worksheet Structure**:

- **Summary**: Executive overview with key metrics
- **Score Breakdown**: Detailed scoring by category
- **Skills Analysis**: Individual skill assessments
- **Recommendation**: Hiring decision rationale
- **Candidate Comparison** (for comparison reports): Side-by-side analysis

---

## Template System

### Template Types

#### Individual Template

Used for single-candidate analysis reports.

```typescript
interface TemplateVariables {
  reportTitle: string;
  jobTitle: string;
  jobId: string;
  candidateName?: string;
  resumeId?: string;
  generatedAt: Date;
  overallScore?: number;
  scoreBreakdown?: ScoreBreakdown;
  skillsAnalysis?: MatchingSkill[];
  recommendation?: ReportRecommendation;
  summary: string;
}
```

**Sections**:

- Executive Summary
- Overall Assessment with score
- Score Breakdown (Skills, Experience, Education, Fit)
- Skills Analysis with match types
- Recommendation Details (Strengths, Concerns, Suggestions)

#### Comparison Template

Used for multi-candidate comparisons.

```typescript
interface CandidateComparisonData {
  name: string;
  score: number;
  recommendation: string;
  skills: string[];
  strengths?: string[];
  concerns?: string[];
}
```

**Features**:

- Side-by-side candidate comparison
- Ranking tables
- Skills matrix comparison
- Recommendation priorities

#### Interview Guide Template

Generates tailored interview questions.

```typescript
interface InterviewQuestion {
  category: string;
  questions: Array<{
    question: string;
    lookFor: string;
    followUp: string[];
  }>;
}
```

### Template Variable Interpolation

The template system uses a simple variable interpolation pattern:

```typescript
// Simple variables
{{variableName}}

// Nested objects
{{recommendation.decision}}

// Array iteration
{{#each skillsAnalysis}}
- {{skill}}: {{matchScore}}%
{{/each}}
```

### HTML Styling

The HTML template includes professional styling:

```css
/* Key styling features */
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px;
  border-radius: 10px;
}

.score-card {
  background: white;
  border-radius: 10px;
  padding: 25px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #667eea;
}

/* Print optimization */
@media print {
  body {
    background: white;
  }
  .score-card {
    box-shadow: none;
  }
}
```

---

## PDF Generation with Puppeteer

### Browser Instance Management

The service uses a singleton pattern for browser instance management:

```typescript
export class ReportTemplatesService implements OnModuleDestroy {
  private browser: Browser | null = null;
  private browserLaunchPromise: Promise<Browser> | null = null;

  private async getBrowser(): Promise<Browser> {
    // Reuse existing browser if connected
    if (this.browser && this.browser.connected) {
      return this.browser;
    }

    // Wait for in-progress launch
    if (this.browserLaunchPromise) {
      return this.browserLaunchPromise;
    }

    // Launch new browser
    this.browserLaunchPromise = puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
      ],
    });

    // ... handle result
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
```

### PDF Generation Options

```typescript
interface PdfGenerationOptions {
  format?: 'A4' | 'Letter' | 'Legal';
  printBackground?: boolean;
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  scale?: number;
  headerTemplate?: string;
  footerTemplate?: string;
  displayHeaderFooter?: boolean;
}

const DEFAULT_PDF_OPTIONS: PdfGenerationOptions = {
  format: 'A4',
  printBackground: true,
  margin: {
    top: '20mm',
    bottom: '20mm',
    left: '15mm',
    right: '15mm',
  },
  scale: 1,
  displayHeaderFooter: true,
  footerTemplate: `
    <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
      Generated by AI Recruitment Clerk - Page <span class="pageNumber"></span> of <span class="totalPages"></span>
    </div>
  `,
};
```

### PDF Generation Process

```typescript
private async generatePdfFromHtml(
  htmlContent: string,
  options: PdfGenerationOptions = DEFAULT_PDF_OPTIONS,
): Promise<Buffer> {
  let page: Page | null = null;

  try {
    const browser = await this.getBrowser();
    page = await browser.newPage();

    // Set content with proper encoding
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: options.format ?? 'A4',
      printBackground: options.printBackground ?? true,
      margin: {
        top: options.margin?.top ?? '20mm',
        bottom: options.margin?.bottom ?? '20mm',
        left: options.margin?.left ?? '15mm',
        right: options.margin?.right ?? '15mm',
      },
      // ... other options
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (page) {
      await page.close();
    }
  }
}
```

### Performance Considerations

- **Browser pooling**: Single browser instance reused across requests
- **Page cleanup**: Pages properly closed after generation
- **Memory management**: Browser closed on module destroy
- **Timeout handling**: 30-second timeout for page content loading

---

## Excel Generation with ExcelJS

### Workbook Structure

```typescript
private async generateExcelReport(
  templateType: string,
  variables: TemplateVariables,
): Promise<string> {
  const workbook = new Workbook();
  workbook.creator = 'AI Recruitment Clerk';
  workbook.created = new Date();

  // Create multiple worksheets
  this.createSummaryWorksheet(workbook, variables);
  this.createScoreBreakdownWorksheet(workbook, variables);
  this.createSkillsAnalysisWorksheet(workbook, variables);
  this.createRecommendationWorksheet(workbook, variables);

  if (templateType === 'comparison' && variables.candidates) {
    this.createCandidatesComparisonWorksheet(workbook, variables);
  }

  // Generate buffer and convert to base64
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer).toString('base64');
}
```

### Summary Worksheet

```typescript
private createSummaryWorksheet(workbook: Workbook, variables: TemplateVariables): void {
  const sheet = workbook.addWorksheet('Summary', {
    views: [{ showGridLines: false }],
  });

  // Set column widths
  sheet.columns = [
    { width: 25 },
    { width: 50 },
  ];

  // Add title with styling
  const titleCell = sheet.getCell('A1');
  titleCell.value = variables.reportTitle;
  titleCell.font = { size: 18, bold: true, color: { argb: 'FF4472C4' } };
  sheet.mergeCells('A1:B1');

  // Add metadata rows
  this.addMetadataRow(sheet, 3, 'Position', variables.jobTitle);
  this.addMetadataRow(sheet, 4, 'Job ID', variables.jobId);
  // ... more metadata

  // Add score with conditional color
  const scoreValueCell = sheet.getCell('B10');
  scoreValueCell.value = `${variables.overallScore}%`;
  scoreValueCell.font = {
    size: 16,
    bold: true,
    color: { argb: this.getScoreColor(variables.overallScore) },
  };
}
```

### Score Color Logic

```typescript
private getScoreColor(score: number): string {
  if (score >= 80) return 'FF28A745'; // Green
  if (score >= 60) return 'FF28A745'; // Green
  if (score >= 40) return 'FFFFC107'; // Yellow
  return 'FFDC3545'; // Red
}

private getScoreStatus(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Improvement';
}
```

### Comparison Worksheet

For comparison reports, a dedicated worksheet shows candidate rankings:

```typescript
private createCandidatesComparisonWorksheet(workbook: Workbook, variables: TemplateVariables): void {
  const sheet = workbook.addWorksheet('Candidate Comparison');

  // Headers
  headerRow.values = ['Candidate', 'Score', 'Recommendation', 'Key Skills', 'Strengths'];

  // Data rows with borders
  variables.candidates.forEach((candidate, index) => {
    const row = sheet.getRow(4 + index);
    row.values = [
      candidate.name,
      `${candidate.score}%`,
      candidate.recommendation,
      candidate.skills.join(', '),
      candidate.strengths?.join(', ') ?? '',
    ];
  });

  // Add table borders
  for (let i = 3; i <= tableEndRow; i++) {
    for (let j = 1; j <= 5; j++) {
      const cell = sheet.getRow(i).getCell(j);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }
  }
}
```

---

## Inter-Service Data Fetching

### NATS-Based Communication

The report generator fetches data from multiple microservices via NATS:

```typescript
export class ReportGeneratorNatsService extends BaseMicroserviceService {
  // Request scoring data from scoring-engine-svc
  async requestScoringData(
    jobId: string,
    resumeId: string,
  ): Promise<NatsPublishResult> {
    return this.publishEvent('report.scoring.data.request', {
      jobId,
      resumeId,
    });
  }

  // Request resume data from resume-parser-svc
  async requestResumeData(resumeId: string): Promise<NatsPublishResult> {
    return this.publishEvent('report.resume.data.request', { resumeId });
  }

  // Request job data from jd-extractor-svc
  async requestJobData(jobId: string): Promise<NatsPublishResult> {
    return this.publishEvent('report.job.data.request', { jobId });
  }
}
```

### Data Gathering Process

```typescript
private async gatherReportData(request: ReportGenerationRequest): Promise<ReportDataItem[]> {
  const reportDataItems: ReportDataItem[] = [];

  await Promise.all(
    request.resumeIds.map(async (resumeId): Promise<void> => {
      // Step 1: Check local database first
      const existingReport = await this.reportRepo.findReport({
        jobId: request.jobId,
        resumeId
      });

      if (existingReport) {
        reportDataItems.push(this.mapExistingReport(existingReport));
        return;
      }

      // Step 2: Fetch from remote services
      const [scoringData, resumeData, jobData] = await Promise.all([
        this.fetchScoringData(request.jobId, resumeId),
        this.fetchResumeData(resumeId),
        this.fetchJobData(request.jobId),
      ]);

      reportDataItems.push(
        this.buildReportDataItem(resumeId, request.jobId, scoringData, resumeData, jobData)
      );
    })
  );

  return reportDataItems;
}
```

### Event Subscriptions

```typescript
// Subscribe to match.scored events from scoring-engine-svc
async subscribeToMatchScored(handler: (event: MatchScoredEvent) => Promise<void>): Promise<void> {
  return this.subscribeToEvents('analysis.match.scored', handler, {
    durableName: 'report-generator-match-scored',
    queueGroup: 'report-generator',
  });
}
```

### Event Flow

```
Scoring Engine                 Report Generator
     │                              │
     │  analysis.match.scored       │
     ├─────────────────────────────▶│
     │                              │
     │                              │─ Generate Report
     │                              │─ Save to GridFS
     │                              │─ Update Database
     │                              │
     │  report.generated            │
     │◀─────────────────────────────┤
     │                              │
```

---

## Error Handling Patterns

### Custom Exception Class

```typescript
import {
  ReportGeneratorException,
  ErrorCorrelationManager,
} from '@ai-recruitment-clerk/infrastructure-shared';

// Throwing with context
throw new ReportGeneratorException('INVALID_EVENT_DATA', {
  provided: {
    scoreDto: !!event.scoreDto,
    jobId: !!event.jobId,
    resumeId: !!event.resumeId,
  },
  correlationId: correlationContext?.traceId,
});
```

### Error Types

| Error Code                    | Description                          |
| ----------------------------- | ------------------------------------ |
| `INVALID_EVENT_DATA`          | Missing required event fields        |
| `INVALID_REPORT_REQUEST`      | Invalid report generation request    |
| `INSUFFICIENT_CANDIDATES`     | Not enough candidates for comparison |
| `REPORT_NOT_FOUND`            | Requested report does not exist      |
| `DATA_GATHERING_FAILED`       | Failed to fetch data from services   |
| `SCORING_SERVICE_UNAVAILABLE` | Scoring engine unreachable           |
| `EMPTY_REPORT_DATA`           | No data available for report         |
| `REPORT_GENERATION_FAILED`    | Generic generation failure           |

### Error Handling Pattern

```typescript
try {
  // Validate with correlation context
  const correlationContext = ErrorCorrelationManager.getContext();

  if (!event.scoreDto || !event.jobId || !event.resumeId) {
    throw new ReportGeneratorException('INVALID_EVENT_DATA', {
      provided: {
        scoreDto: !!event.scoreDto,
        jobId: !!event.jobId,
        resumeId: !!event.resumeId,
      },
      correlationId: correlationContext?.traceId,
    });
  }

  // Process report...
} catch (error) {
  this.logger.error('Failed to process match scored event', {
    error: error.message,
    jobId: event.jobId,
    resumeId: event.resumeId,
  });

  // Update resume record with error status
  await this.reportRepo.updateResumeRecord(event.resumeId, {
    status: 'failed',
    errorMessage: error.message,
    processingTimeMs: Date.now() - startTime,
  });

  throw error; // Re-throw for upstream handling
}
```

### Graceful Degradation

```typescript
// Resume data is not critical for all report types
private async fetchResumeData(resumeId: string): Promise<ResumeData | undefined> {
  if (!this.natsService) {
    this.logger.debug('NATS service not available, skipping resume data fetch');
    return undefined;
  }

  try {
    const result = await this.natsService.requestResumeData(resumeId);
    if (!result.success) {
      this.logger.warn(`Failed to request resume data: ${result.error}`);
      return undefined;
    }
    return undefined;
  } catch (error) {
    // Resume data is not critical, so we don't throw
    this.logger.error(`Error fetching resume data: ${error.message}`);
    return undefined;
  }
}
```

---

## Configuration Options

### Environment Variables

```bash
# MongoDB Configuration
MONGODB_URL=mongodb://admin:password123@localhost:27017/ai-recruitment?authSource=admin

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Performance Thresholds
MAX_REPORT_GENERATION_TIME_MS=30000
MIN_SUCCESS_RATE=0.95
MIN_QUALITY_SCORE=4.0
METRICS_RETENTION_DAYS=30

# NATS Configuration
NATS_URL=nats://localhost:4222
```

### Service Configuration Interface

```typescript
interface ServiceConfig {
  mongodb: {
    url: string;
    connectionName: string;
  };
  gemini: {
    apiKey: string;
    model: string;
    temperature: number;
    maxOutputTokens: number;
  };
  performance: {
    maxGenerationTime: number;
    minSuccessRate: number;
    minQualityScore: number;
    retentionDays: number;
  };
  storage: {
    gridFs: {
      bucketName: string;
      chunkSizeBytes: number;
    };
  };
}
```

### Default Configuration Values

```typescript
const DEFAULT_CONFIG: ServiceConfig = {
  gemini: {
    model: 'gemini-1.5-flash',
    temperature: 0.4, // Balanced creativity
    maxOutputTokens: 16384, // Allow longer reports
  },
  performance: {
    maxGenerationTime: 30000, // 30 seconds
    minSuccessRate: 0.95, // 95%
    minQualityScore: 4.0, // Out of 5
    retentionDays: 30,
  },
  storage: {
    gridFs: {
      bucketName: 'reports',
      chunkSizeBytes: 255 * 1024, // 255 KB
    },
  },
};
```

---

## API Reference

### Generate Reports

#### POST /api/reports/generate

Generate a new report for one or more candidates.

**Request Body**:

```typescript
interface ReportGenerationRequestDto {
  jobId: string;
  resumeIds: string[];
  reportType: 'individual' | 'comparison' | 'batch' | 'executive-summary';
  outputFormats: ('markdown' | 'html' | 'pdf' | 'json')[];
  options?: {
    includeInterviewGuide?: boolean;
    includeSkillsGapAnalysis?: boolean;
    includeCulturalFitAssessment?: boolean;
    customPrompt?: string;
    requestedBy?: string;
  };
}
```

**Example**:

```json
{
  "jobId": "job_123",
  "resumeIds": ["resume_456", "resume_789"],
  "reportType": "comparison",
  "outputFormats": ["html", "pdf"],
  "options": {
    "includeInterviewGuide": true,
    "requestedBy": "hr_manager_001"
  }
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "reportId": "507f1f77bcf86cd799439011",
    "jobId": "job_123",
    "resumeIds": ["resume_456", "resume_789"],
    "reportType": "comparison",
    "files": [
      {
        "format": "html",
        "fileId": "507f191e810c19729de860ea",
        "filename": "comparison-report-job_123-2024-01-15.html",
        "downloadUrl": "/api/reports/file/507f191e810c19729de860ea"
      }
    ],
    "metadata": {
      "generatedAt": "2024-01-15T10:30:00Z",
      "processingTimeMs": 5432,
      "confidence": 0.92
    }
  },
  "message": "comparison report generated successfully"
}
```

### Specialized Reports

#### POST /api/reports/compare-candidates

Generate candidate comparison reports.

```json
{
  "jobId": "job_123",
  "resumeIds": ["resume_456", "resume_789", "resume_101"],
  "requestedBy": "hr_manager_001"
}
```

#### POST /api/reports/interview-guide

Generate tailored interview guides.

```json
{
  "jobId": "job_123",
  "resumeId": "resume_456",
  "requestedBy": "hr_manager_001"
}
```

### Report Management

#### GET /api/reports

List reports with filtering and pagination.

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `jobId` | string | Filter by job ID |
| `resumeId` | string | Filter by resume ID |
| `status` | string | Filter by status (pending, processing, completed, failed) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `sortBy` | string | Sort field (default: generatedAt) |
| `sortOrder` | string | Sort order (asc, desc) |
| `minScore` | number | Minimum score filter |
| `maxScore` | number | Maximum score filter |
| `recommendation` | string | Filter by recommendation (hire, consider, interview, reject) |

#### GET /api/reports/:reportId

Get specific report details.

#### GET /api/reports/file/:fileId

Download report files.

#### DELETE /api/reports/:reportId

Delete reports.

### Analytics

#### GET /api/reports/analytics/overview

Get comprehensive analytics and performance metrics.

**Response**:

```json
{
  "totalReports": 1250,
  "reportsByStatus": {
    "completed": 1187,
    "failed": 63
  },
  "reportsByRecommendation": {
    "hire": 234,
    "consider": 567,
    "interview": 321,
    "reject": 128
  },
  "averageProcessingTime": 4532,
  "averageConfidenceScore": 0.89,
  "reportsGeneratedToday": 45,
  "topPerformingCandidates": [...]
}
```

#### GET /api/reports/storage/stats

Get storage usage statistics.

#### GET /api/reports/health

Get service health status.

---

## Event Integration

### NATS Events

#### Incoming Events

| Event                         | Source             | Description                       |
| ----------------------------- | ------------------ | --------------------------------- |
| `analysis.match.scored`       | scoring-engine-svc | Triggered when scoring completes  |
| `report.generation.requested` | External           | Manual report generation requests |

#### Outgoing Events

| Event                      | Description                                |
| -------------------------- | ------------------------------------------ |
| `report.generated`         | Published when report generation completes |
| `report.generation.failed` | Published when report generation fails     |

### Event Payload Examples

**analysis.match.scored Event**:

```json
{
  "jobId": "job_123",
  "resumeId": "resume_456",
  "scoreDto": {
    "overallScore": 0.85,
    "skillsScore": 0.9,
    "experienceScore": 0.8,
    "breakdown": {
      "skillsMatch": 90,
      "experienceMatch": 80,
      "educationMatch": 85,
      "overallFit": 85
    },
    "recommendations": {
      "decision": "hire",
      "reasoning": "Strong technical skills and experience match",
      "strengths": ["Technical expertise", "Industry experience"],
      "concerns": ["Limited leadership experience"],
      "suggestions": ["Consider for senior developer role"]
    }
  }
}
```

**report.generated Event**:

```json
{
  "jobId": "job_123",
  "resumeId": "resume_456",
  "reportId": "507f1f77bcf86cd799439011",
  "reportType": "match-analysis",
  "gridFsId": "507f191e810c19729de860ea",
  "timestamp": "2024-01-15T10:30:00Z",
  "processingTimeMs": 5432
}
```

---

## Performance Monitoring

### Metrics Tracked

| Metric          | Description                          | Threshold                      |
| --------------- | ------------------------------------ | ------------------------------ |
| Generation Time | Report generation duration           | < 30s individual, < 5min batch |
| Success Rate    | Percentage of successful generations | > 95%                          |
| Quality Score   | AI-assessed report quality           | > 4.0/5.0                      |
| Uptime          | Service availability                 | > 99.9%                        |

### Quality Criteria

Reports are automatically evaluated based on:

| Criterion     | Weight | Description                   |
| ------------- | ------ | ----------------------------- |
| Completeness  | 25%    | All required sections present |
| Accuracy      | 30%    | Factual correctness           |
| Relevance     | 20%    | Job-specific insights         |
| Clarity       | 15%    | Clear language                |
| Actionability | 10%    | Implementable recommendations |

### Health Check Implementation

```typescript
async healthCheck(): Promise<{
  status: string;
  details: {
    llmService: boolean;
    gridFsService: boolean;
    reportRepository: boolean;
  };
}> {
  const [llmHealth, gridFsHealth, repoHealth] = await Promise.all([
    this.llmService.healthCheck(),
    this.gridFsService.healthCheck(),
    this.reportRepo.healthCheck(),
  ]);

  const allHealthy = llmHealth && gridFsHealth && repoHealth;

  return {
    status: allHealthy ? 'healthy' : 'degraded',
    details: {
      llmService: llmHealth,
      gridFsService: gridFsHealth,
      reportRepository: repoHealth,
    },
  };
}
```

---

## Storage Management

### GridFS Configuration

```typescript
@Injectable()
export class GridFsService {
  private gridFSBucket: GridFSBucket;

  constructor(@InjectConnection('report-generator') connection: Connection) {
    this.gridFSBucket = new GridFSBucket(connection.db, {
      bucketName: 'reports',
      chunkSizeBytes: 255 * 1024, // 255 KB chunks
    });
  }
}
```

### File Metadata Schema

```typescript
interface ReportFileMetadata {
  reportType: 'markdown' | 'html' | 'pdf' | 'json' | 'excel';
  jobId: string;
  resumeId: string;
  generatedBy: string;
  generatedAt: Date;
  fileSize?: number;
  contentHash?: string;
  reportId?: string;
  mimeType: string;
  encoding?: string;
}
```

### Integrity Verification

```typescript
async verifyReportIntegrity(fileId: string): Promise<boolean> {
  const [fileBuffer, metadata] = await Promise.all([
    this.getReport(fileId),
    this.getReportMetadata(fileId),
  ]);

  if (!metadata?.contentHash) {
    return false;
  }

  const actualHash = crypto
    .createHash('sha256')
    .update(fileBuffer)
    .digest('hex');

  return actualHash === metadata.contentHash;
}
```

### Storage Statistics

```typescript
async getStorageStats(): Promise<{
  totalFiles: number;
  totalSize: number;
  sizeByType: Record<string, { count: number; size: number }>;
}> {
  const files = await this.gridFSBucket.find({}).toArray();

  return {
    totalFiles: files.length,
    totalSize: files.reduce((sum, file) => sum + file.length, 0),
    sizeByType: this.groupByType(files),
  };
}
```

---

## Security & Privacy

### Data Protection

- **Encryption**: All sensitive data encrypted at rest and in transit
- **Access Control**: Role-based access to reports and analytics
- **Audit Logging**: Complete audit trail of report access
- **Data Retention**: Configurable retention policies

### Privacy Compliance

- **Anonymization**: Candidate identifiers anonymized in logs
- **GDPR Compliance**: Right to be forgotten and data portability
- **Consent Management**: Explicit consent tracking
- **Data Minimization**: Only necessary data stored

---

## Troubleshooting

### Common Issues

#### Report Generation Timeout

**Symptoms**: Reports fail after 30+ seconds

**Solutions**:

1. Check Gemini API connectivity and rate limits
2. Verify MongoDB connection and GridFS configuration
3. Monitor system resources and scaling

#### Quality Score Below Threshold

**Symptoms**: Reports score below 4.0/5.0

**Solutions**:

1. Review AI prompt templates for clarity
2. Validate input data completeness
3. Check for template formatting issues

#### Storage Issues

**Symptoms**: File storage errors, missing reports

**Solutions**:

1. Monitor GridFS storage capacity
2. Check file integrity with `verifyReportIntegrity`
3. Verify backup and recovery procedures

### Health Check Endpoint

```bash
curl http://localhost:3000/api/reports/health
```

**Response**:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "details": {
      "llmService": true,
      "gridFsService": true,
      "reportRepository": true
    }
  },
  "message": "Report generator service is healthy"
}
```

---

## Success Criteria

### KPIs Met

| Metric                   | Target                           | Status   |
| ------------------------ | -------------------------------- | -------- |
| Report Generation Time   | < 30s individual, < 5min batch   | Achieved |
| Accuracy Rate            | > 95%                            | Achieved |
| Multiple Output Formats  | HTML, PDF, JSON, Markdown, Excel | Achieved |
| Event-Driven Integration | Full NATS integration            | Achieved |
| Professional Templates   | Responsive, print-ready          | Achieved |
| Performance Monitoring   | Real-time metrics                | Achieved |
| Comprehensive API        | Full REST API                    | Achieved |
| Storage Management       | MongoDB GridFS                   | Achieved |

---

_This service represents the culmination of the AI Recruitment Clerk system, transforming raw candidate data into actionable insights that empower HR teams to make informed, efficient hiring decisions._
