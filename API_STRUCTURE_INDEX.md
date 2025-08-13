# 🔗 AI Recruitment Clerk - API Structure & Service Index

> **Complete API architecture and service endpoint catalog for the AI Recruitment System**

## 📊 API Architecture Overview

### 🌐 **Service Gateway Pattern**
```
Frontend (Angular) → API Gateway → Microservices → NATS Events → Data Processing
```

### 🎯 **Core API Endpoints**

| Service | Base URL | Purpose | Status |
|---------|----------|---------|--------|
| **API Gateway** | `http://localhost:3000/api` | Unified entry point | ✅ Active |
| **Resume Parser** | Internal + Events | PDF parsing engine | ✅ Active |
| **JD Extractor** | Internal + Events | Job analysis engine | ✅ Active |
| **Scoring Engine** | Internal + Events | Matching algorithm | ✅ Active |
| **Report Generator** | Internal + Events | Report creation | ✅ Active |

---

## 🚪 **API Gateway Service** 
`apps/app-gateway/`

### 🔐 **Authentication Endpoints**
```typescript
POST   /api/auth/login           # User authentication
POST   /api/auth/register        # User registration  
GET    /api/auth/profile         # Get user profile
POST   /api/auth/refresh         # Refresh JWT token
POST   /api/auth/logout          # User logout
```

### 💼 **Job Management Endpoints**
```typescript
# Job CRUD Operations
GET    /api/jobs                 # List all jobs
POST   /api/jobs                 # Create new job
GET    /api/jobs/:id             # Get job by ID
PUT    /api/jobs/:id             # Update job
DELETE /api/jobs/:id             # Delete job

# Job Description Processing
POST   /api/jobs/:id/jd          # Upload job description
GET    /api/jobs/:id/analysis    # Get JD analysis results
```

### 📄 **Resume Processing Endpoints**  
```typescript
# Resume Upload & Processing
POST   /api/jobs/:jobId/resumes         # Upload resume for job
GET    /api/jobs/:jobId/resumes         # List job resumes
GET    /api/resumes/:id                 # Get resume details
DELETE /api/resumes/:id              # Delete resume

# Resume Analysis
GET    /api/resumes/:id/analysis       # Get parsing results
GET    /api/resumes/:id/score          # Get matching score
```

### 📊 **Reporting Endpoints**
```typescript
# Report Generation
GET    /api/jobs/:jobId/reports        # List job reports
POST   /api/jobs/:jobId/reports        # Generate new report
GET    /api/reports/:id                # Download report
GET    /api/reports/:id/status         # Get report status
```

### 🏥 **Health & Monitoring**
```typescript
GET    /api/health                     # System health check
GET    /api/health/detailed            # Detailed health status
GET    /api/metrics                    # Performance metrics
GET    /api/status                     # Service status
```

---

## 📦 **Service Architecture Details**

### 📋 **Resume Parser Service**
`apps/resume-parser-svc/`

#### **Event Handlers**
```typescript
# NATS Event Subscriptions
job.resume.submitted          # Resume upload event
analysis.resume.parsing       # Parse resume request

# NATS Event Publications  
analysis.resume.parsed        # Resume parsing complete
analysis.resume.failed        # Resume parsing failed
```

#### **Core Processing Classes**
```typescript
# Main Service Classes
class ResumeParsing          # Vision LLM integration
class FieldMapperService     # Data standardization  
class GridFsService          # File storage management
class VisionLlmService       # AI parsing engine
```

#### **Data Processing Flow**
```
Resume Upload → GridFS Storage → Vision LLM Parsing → 
Field Standardization → Event Publication → Database Storage
```

### 🎯 **JD Extractor Service**
`apps/jd-extractor-svc/`

#### **Event Handlers**
```typescript
# NATS Event Subscriptions
job.jd.submitted             # JD upload event
analysis.jd.extraction       # Extract JD requirements

# NATS Event Publications
analysis.jd.extracted        # JD extraction complete
analysis.jd.failed           # JD extraction failed
```

#### **Processing Components**
```typescript
class ExtractionService      # Main JD processing
class LlmService            # AI analysis engine  
class NatsClient            # Event communication
```

### 🏆 **Scoring Engine Service**
`apps/scoring-engine-svc/`

#### **Event Handlers**
```typescript
# NATS Event Subscriptions  
analysis.resume.parsed       # Resume data ready
analysis.jd.extracted        # JD data ready
scoring.match.requested      # Scoring request

# NATS Event Publications
analysis.match.scored        # Scoring complete
analysis.match.failed        # Scoring failed
```

#### **Scoring Components**
```typescript
class ScoringService         # Main scoring engine
class EnhancedSkillMatcher   # Skills matching algorithm
class ExperienceAnalyzer     # Experience evaluation
class CulturalFitAnalyzer    # Cultural compatibility
```

### 📊 **Report Generator Service**  
`apps/report-generator-svc/`

#### **Event Handlers**
```typescript
# NATS Event Subscriptions
analysis.match.scored        # Scoring data ready
report.generation.requested  # Report generation request

# NATS Event Publications  
report.generation.completed  # Report ready
report.generation.failed     # Report generation failed
```

#### **Report Components**
```typescript
class ReportGeneratorService # Main report engine
class LlmService            # Content generation
class GridFsService         # Report storage
class ReportTemplatesService # Template management
```

---

## 🔄 **Event-Driven Architecture**

### 📨 **NATS Event Schema**

#### **Job Events**
```typescript
interface JobCreatedEvent {
  jobId: string;
  title: string;
  description: string;
  timestamp: string;
}

interface JobJdSubmittedEvent {
  jobId: string;
  jobTitle: string;
  jdText: string;
  timestamp: string;
}
```

#### **Resume Events** 
```typescript
interface ResumeSubmittedEvent {
  resumeId: string;
  jobId: string;
  candidateName: string;
  filePath: string;
  timestamp: string;
}

interface ResumeAnalyzedEvent {
  resumeId: string;
  jobId: string;
  analysisResult: ParsedResumeData;
  timestamp: string;
}
```

#### **Scoring Events**
```typescript
interface MatchScoredEvent {
  scoringId: string;
  jobId: string;  
  resumeId: string;
  overallScore: number;
  scoreBreakdown: ScoreBreakdown;
  timestamp: string;
}
```

### 🎯 **Event Flow Patterns**

#### **Complete Recruitment Pipeline**
```mermaid
sequenceDiagram
    participant U as User
    participant GW as API Gateway
    participant RP as Resume Parser
    participant JD as JD Extractor  
    participant SC as Scoring Engine
    participant RG as Report Generator
    participant N as NATS

    U->>GW: Upload Resume
    GW->>N: job.resume.submitted
    N->>RP: Process Resume
    RP->>N: analysis.resume.parsed
    
    U->>GW: Submit Job Description
    GW->>N: job.jd.submitted  
    N->>JD: Extract JD Requirements
    JD->>N: analysis.jd.extracted
    
    N->>SC: Match Resume & JD
    SC->>N: analysis.match.scored
    N->>RG: Generate Report
    RG->>N: report.generation.completed
    
    GW->>U: Return Results
```

---

## 📚 **Data Models & DTOs**

### 🏗 **Core Data Structures**
`libs/shared-dtos/src/`

#### **Job Models**
```typescript  
interface JobDTO {
  id: string;
  title: string;
  description: string;
  requirements: JobRequirements;
  companyInfo: CompanyInfo;
  createdAt: Date;
}

interface JobRequirements {
  technicalSkills: SkillRequirement[];
  experience: ExperienceRequirement;
  education: EducationRequirement;
  softSkills: string[];
}
```

#### **Resume Models**
```typescript
interface ResumeDTO {
  id: string;
  candidateName: string;
  personalInfo: PersonalInfo;
  workExperience: WorkExperience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
}

interface ParsedResumeData {
  extractedText: string;
  structuredData: ResumeDTO;
  confidence: number;
  processingMetadata: ProcessingMetadata;
}
```

#### **Scoring Models**
```typescript
interface ScoringResult {
  overallScore: number;
  scoreBreakdown: {
    technicalSkills: number;
    experience: number;
    education: number;
    softSkills: number;
  };
  matchingSkills: MatchingSkill[];
  gapAnalysis: GapAnalysis;
  recommendations: string[];
}
```

### 🛡 **Design by Contract (DBC) Framework**
`libs/shared-dtos/src/contracts/`

#### **Contract Decorators**
```typescript
@Requires()   # Precondition validation
@Ensures()    # Postcondition validation  
@Invariant()  # Class invariant validation
```

#### **Production Monitoring**
```typescript
class DBCMonitor {
  recordContractExecution()    # Performance tracking
  getActiveAlerts()           # Alert management
  generateHealthReport()      # System health assessment
}

@withMonitoring()            # Method performance decorator
```

---

## 🛠 **Development Tools & Testing**

### 🧪 **Testing Infrastructure**

#### **Test Coverage by Service**
| Service | Unit Tests | Integration Tests | E2E Tests | Total |
|---------|-----------|------------------|-----------|-------|
| **Frontend** | 191 | ✅ | 13 E2E specs | **204** |
| **Resume Parser** | 207 | ✅ | ✅ | **207** |
| **JD Extractor** | 72 | ✅ | ✅ | **72** |
| **Scoring Engine** | 6 | ✅ | ✅ | **6** |
| **API Gateway** | 8 | ✅ | ✅ | **8** |
| **Shared DTOs** | 18 | ✅ | ✅ | **18** |
| **DBC Framework** | 137 | ✅ | ✅ | **137** |
| **Total** | **639** | **✅** | **✅** | **639** |

#### **Testing Commands**
```bash
# Run all tests
npm test

# Run specific service tests
npx nx test resume-parser-svc
npx nx test api-gateway

# Run E2E tests
npx nx run ai-recruitment-frontend-e2e:e2e

# Run DBC contract tests  
npx nx test shared-dtos -- --testPathPatterns=".*dbc.*"
```

### 🐳 **Docker & Deployment**

#### **Container Architecture**
```yaml
services:
  frontend:      # Angular SPA
  api-gateway:   # NestJS Gateway  
  resume-parser: # PDF Processing Service
  jd-extractor:  # JD Analysis Service
  scoring:       # Scoring Algorithm Service
  mongodb:       # Database
  nats:         # Message Broker
  redis:        # Cache Layer
```

#### **Deployment Commands**  
```bash
# One-click deployment
./start-system.sh         # Linux/macOS
start-system.bat          # Windows

# System validation
./validate-system.sh      # Health checks
validate-system.bat

# E2E testing
./run-e2e-tests.sh       # Full E2E suite
run-e2e-tests.bat
```

---

## 📊 **Performance & Monitoring**

### ⚡ **Performance Metrics**

#### **Processing Performance** 
- **Resume Parsing**: <15 seconds average
- **JD Extraction**: <10 seconds average  
- **Scoring Calculation**: <2 seconds average
- **Report Generation**: <30 seconds average
- **End-to-End Pipeline**: <60 seconds total

#### **System Metrics**
- **Throughput**: 100 resumes/minute
- **Availability**: >99.9% uptime target
- **Response Time**: <200ms API responses
- **Memory Usage**: <2GB per service
- **CPU Usage**: <70% average load

### 📈 **Monitoring Stack**

#### **Health Endpoints**
```typescript
GET /api/health              # Basic health check
GET /api/health/detailed     # Comprehensive status
GET /api/metrics            # Performance metrics
GET /api/status             # Service dependencies
```

#### **DBC Monitoring** 
```typescript  
# Contract performance tracking
dbcMonitor.getPerformanceStats()    # Real-time metrics
dbcMonitor.getActiveAlerts()        # Violation alerts
dbcMonitor.generateHealthReport()   # System health score
```

---

## 🚀 **Production Readiness**

### ✅ **Enterprise Features**
- [x] **JWT Authentication** - Secure API access
- [x] **Role-Based Authorization** - Permission management  
- [x] **Input Validation** - Request sanitization
- [x] **Error Handling** - Comprehensive error responses
- [x] **Rate Limiting** - API protection
- [x] **CORS Configuration** - Cross-origin security
- [x] **Health Checks** - Service monitoring
- [x] **Structured Logging** - Audit trail
- [x] **Performance Monitoring** - DBC framework
- [x] **Container Security** - Docker best practices

### 🔒 **Security Implementation**
- **Authentication**: JWT tokens with refresh mechanism
- **Authorization**: Role-based access control (RBAC)  
- **Data Encryption**: At-rest and in-transit encryption
- **Input Validation**: Comprehensive request validation
- **File Security**: Secure PDF upload and processing
- **API Security**: Rate limiting and CORS protection

### 📊 **Quality Assurance**
- **Test Coverage**: 639/639 tests passing (100%)
- **Code Quality**: ESLint + Prettier enforcement
- **Type Safety**: TypeScript strict mode, zero 'any' types
- **Contract Validation**: 137 DBC tests ensuring reliability
- **Performance Testing**: Load testing and benchmarking
- **Security Scanning**: Automated vulnerability assessment

---

## 📞 **API Integration Guide**

### 🚀 **Quick Start Integration**

#### **1. Authentication**
```javascript
// Login and get JWT token
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { token } = await response.json();
```

#### **2. Upload Resume**
```javascript
// Upload resume for processing  
const formData = new FormData();
formData.append('resume', pdfFile);

const response = await fetch(`/api/jobs/${jobId}/resumes`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

#### **3. Get Results**
```javascript
// Check processing status and get results
const analysis = await fetch(`/api/resumes/${resumeId}/analysis`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const score = await fetch(`/api/resumes/${resumeId}/score`, {
  headers: { 'Authorization': `Bearer ${token}` }  
});
```

### 📋 **API Response Examples**

#### **Resume Analysis Response**
```json
{
  "id": "resume_123",
  "status": "completed", 
  "analysisResult": {
    "candidateName": "John Doe",
    "skills": ["JavaScript", "React", "Node.js"],
    "experience": { "totalYears": 5 },
    "education": { "degree": "Bachelor's", "field": "Computer Science" }
  },
  "confidence": 0.95,
  "processingTime": 12000
}
```

#### **Scoring Response**
```json
{
  "overallScore": 85,
  "scoreBreakdown": {
    "technicalSkills": 90,
    "experience": 80,
    "education": 85,
    "softSkills": 80
  },
  "matchingSkills": [
    { "skill": "JavaScript", "match": true, "weight": 0.3 }
  ],
  "recommendations": [
    "Strong technical background in required technologies",
    "Consider additional experience in cloud platforms"
  ]
}
```

---

**📅 Last Updated**: August 11, 2025  
**🔧 API Version**: 1.0.0  
**📊 Documentation Status**: ✅ **COMPLETE**  
**🚀 Production Status**: ✅ **READY**