# Business Workflow Design - AI Recruitment Clerk

## System Architecture Overview

The AI Recruitment Clerk is an event-driven microservices system that provides intelligent resume analysis and candidate matching capabilities. The system supports both B2B enterprise users and B2C freemium guests, with real-time progress tracking and comprehensive security.

### Core Technology Stack
- **Frontend**: Angular 17+ with standalone components, NgRx state management
- **API Gateway**: NestJS-based orchestration layer (Port 8080)
- **Microservices**: NestJS microservices with specialized AI processing capabilities
- **Messaging**: NATS JetStream for event-driven communication
- **Database**: MongoDB with GridFS for file storage
- **Caching**: Redis for session management and performance optimization
- **AI Integration**: Google Gemini AI for resume parsing and job description analysis

### System Components

#### Frontend Layer
- **Enhanced Dashboard**: Central hub with real-time analytics and task management
- **Unified Analysis**: Comprehensive resume analysis interface with progress tracking
- **Jobs Management**: Job creation, editing, and candidate management
- **Guest Support**: Device-based freemium access with usage tracking
- **Real-time Updates**: WebSocket integration for live progress updates

#### API Gateway (app-gateway)
- **Central Orchestration**: Routes requests to appropriate microservices
- **Authentication & Authorization**: JWT-based security with RBAC
- **Guest Management**: Device fingerprinting and usage limit enforcement
- **NATS Event Publishing**: Initiates workflows by publishing events
- **Real-time Communication**: WebSocket gateway for live updates

#### Microservices Architecture
1. **resume-parser-svc**: AI-powered resume parsing using Gemini Vision
2. **jd-extractor-svc**: Job description analysis and requirement extraction
3. **scoring-engine-svc**: Intelligent candidate scoring and matching
4. **report-generator-svc**: Comprehensive report generation with multiple formats

## Primary Business Workflows

### 1. Job Creation Workflow

**Trigger**: User creates a new job posting through the Jobs interface

```mermaid
sequenceDiagram
    participant User as User/Guest
    participant Frontend as Angular Frontend
    participant Gateway as API Gateway
    participant JobsDB as Jobs Database
    participant JDExtractor as JD Extractor Service
    participant NATS as NATS JetStream

    User->>Frontend: Create Job (title, description, requirements)
    Frontend->>Gateway: POST /api/jobs {jobData}
    
    Gateway->>JobsDB: Save job data
    JobsDB-->>Gateway: Job created with ID
    
    Gateway->>NATS: Publish 'job.jd.submitted' event
    Note over Gateway,NATS: {jobId, jdText, timestamp}
    
    Gateway-->>Frontend: Job created response {jobId, status}
    Frontend-->>User: Job creation confirmation
    
    NATS->>JDExtractor: Event: 'job.jd.submitted'
    JDExtractor->>JDExtractor: AI analysis with Gemini
    JDExtractor->>NATS: Publish 'analysis.jd.extracted'
    Note over JDExtractor,NATS: {jobId, extractedData, confidence}
    
    NATS->>Gateway: Event notification
    Gateway->>Frontend: WebSocket update
    Frontend-->>User: Job analysis complete notification
```

**Key Events**:
- `job.jd.submitted` → Triggers AI-powered job description analysis
- `analysis.jd.extracted` → Job requirements successfully extracted and parsed

---

### 2. Resume Upload & Analysis Workflow

**Trigger**: User uploads a resume for analysis against a specific job

```mermaid
sequenceDiagram
    participant User as User/Guest
    participant Frontend as Angular Frontend
    participant Gateway as API Gateway
    participant GridFS as GridFS Storage
    participant ResumeParser as Resume Parser Service
    participant ScoringEngine as Scoring Engine Service
    participant NATS as NATS JetStream

    User->>Frontend: Upload resume file
    Frontend->>Gateway: POST /api/jobs/{jobId}/resumes (multipart/form-data)
    
    Gateway->>GridFS: Store resume file
    GridFS-->>Gateway: File stored with GridFS ID
    
    Gateway->>Gateway: Create resume record
    Gateway->>NATS: Publish 'job.resume.submitted' event
    Note over Gateway,NATS: {jobId, resumeId, gridFsId, filename}
    
    Gateway-->>Frontend: Upload success {resumeId, status}
    Frontend-->>User: Upload confirmation + progress tracking
    
    NATS->>ResumeParser: Event: 'job.resume.submitted'
    ResumeParser->>GridFS: Fetch resume file
    ResumeParser->>ResumeParser: AI parsing with Gemini Vision
    ResumeParser->>NATS: Publish 'analysis.resume.parsed'
    Note over ResumeParser,NATS: {jobId, resumeId, resumeDto}
    
    NATS->>ScoringEngine: Event: 'analysis.resume.parsed'
    ScoringEngine->>ScoringEngine: Calculate compatibility scores
    ScoringEngine->>NATS: Publish 'match.scored'
    Note over ScoringEngine,NATS: {jobId, resumeId, scoreDto}
    
    NATS->>Gateway: Progress events
    Gateway->>Frontend: WebSocket progress updates
    Frontend-->>User: Real-time analysis progress
```

**Key Events**:
- `job.resume.submitted` → Initiates AI-powered resume parsing
- `analysis.resume.parsed` → Resume successfully parsed and structured
- `match.scored` → Compatibility scoring completed

---

### 3. Candidate Scoring Workflow

**Trigger**: Resume parsing completion triggers intelligent scoring analysis

```mermaid
sequenceDiagram
    participant JDExtractor as JD Extractor Service
    participant ResumeParser as Resume Parser Service
    participant ScoringEngine as Scoring Engine Service
    participant NATS as NATS JetStream
    participant Gateway as API Gateway
    participant Frontend as Angular Frontend

    Note over JDExtractor,ScoringEngine: Prerequisites: Job analysis and resume parsing completed

    JDExtractor->>NATS: 'analysis.jd.extracted' event
    ResumeParser->>NATS: 'analysis.resume.parsed' event
    
    NATS->>ScoringEngine: Both events received
    ScoringEngine->>ScoringEngine: Load job requirements
    ScoringEngine->>ScoringEngine: Load candidate profile
    
    ScoringEngine->>ScoringEngine: Skills matching analysis
    Note over ScoringEngine: Technical skills, soft skills, frameworks
    
    ScoringEngine->>ScoringEngine: Experience compatibility
    Note over ScoringEngine: Years of experience, seniority level, industry context
    
    ScoringEngine->>ScoringEngine: Education assessment
    Note over ScoringEngine: Degree requirements, certifications, specializations
    
    ScoringEngine->>ScoringEngine: Cultural fit analysis
    Note over ScoringEngine: Company culture, team structure, work style
    
    ScoringEngine->>ScoringEngine: Generate comprehensive score
    Note over ScoringEngine: Overall fit: 0-100%, confidence level, detailed breakdown
    
    ScoringEngine->>NATS: Publish 'match.scored' event
    Note over ScoringEngine,NATS: {jobId, resumeId, scoreDto, breakdown}
    
    NATS->>Gateway: Score completion notification
    Gateway->>Frontend: WebSocket score update
    Frontend->>Frontend: Update candidate ranking and UI
```

**Scoring Components**:
- **Skills Match** (40%): Technical and soft skills compatibility
- **Experience Match** (30%): Years of experience and seniority alignment
- **Education Match** (20%): Educational requirements and certifications
- **Cultural Fit** (10%): Company culture and team dynamics compatibility

---

### 4. Report Generation Workflow

**Trigger**: Scoring completion triggers comprehensive report generation

```mermaid
sequenceDiagram
    participant ScoringEngine as Scoring Engine Service
    participant ReportGen as Report Generator Service
    participant GridFS as GridFS Storage
    participant MongoDB as Report Database
    participant NATS as NATS JetStream
    participant Gateway as API Gateway
    participant Frontend as Angular Frontend

    ScoringEngine->>NATS: 'match.scored' event
    Note over ScoringEngine,NATS: {jobId, resumeId, scoreDto, timestamp}
    
    NATS->>ReportGen: Event: 'match.scored'
    ReportGen->>ReportGen: Validate event data
    
    ReportGen->>ReportGen: Generate detailed analysis report
    Note over ReportGen: Skills breakdown, experience analysis, recommendations
    
    ReportGen->>ReportGen: Create executive summary
    Note over ReportGen: Key strengths, concerns, hiring recommendation
    
    ReportGen->>ReportGen: Format report (PDF/HTML)
    
    ReportGen->>GridFS: Store detailed report document
    GridFS-->>ReportGen: GridFS ID for report
    
    ReportGen->>MongoDB: Save report metadata
    Note over ReportGen,MongoDB: Report schema with scores, recommendations, status
    
    ReportGen->>NATS: Publish 'report.generated' event
    Note over ReportGen,NATS: {jobId, resumeId, reportId, gridFsId}
    
    NATS->>Gateway: Report completion notification
    Gateway->>Frontend: WebSocket report ready
    Frontend->>Frontend: Enable report download/view
    
    opt Report Generation Requested
        Frontend->>Gateway: GET /api/reports/{reportId}
        Gateway->>MongoDB: Fetch report metadata
        Gateway->>GridFS: Fetch detailed report
        Gateway-->>Frontend: Complete report data
    end
```

**Report Types**:
- **Match Analysis**: Detailed compatibility assessment with scoring breakdown
- **Candidate Summary**: Executive summary with key insights and recommendations
- **Full Report**: Comprehensive analysis including detailed skill matching and improvement suggestions

---

### 5. Guest User Workflow

**Trigger**: Unauthenticated user accesses the system for trial usage

```mermaid
sequenceDiagram
    participant Guest as Guest User
    participant Frontend as Angular Frontend
    participant Gateway as API Gateway
    participant DeviceService as Device ID Service
    participant UsageDB as Usage Database
    participant Redis as Redis Cache

    Guest->>Frontend: Access application
    Frontend->>Frontend: Generate device fingerprint
    Frontend->>Gateway: POST /api/guest/session {deviceId, fingerprint}
    
    Gateway->>DeviceService: Validate device identity
    DeviceService->>UsageDB: Check usage history
    DeviceService->>Redis: Check current session limits
    
    alt First-time user
        DeviceService->>UsageDB: Create guest profile
        DeviceService->>Redis: Initialize usage counters
        Gateway-->>Frontend: Session created {guestId, limits}
    else Returning user within limits
        Gateway-->>Frontend: Session restored {guestId, remainingLimits}
    else Usage limits exceeded
        Gateway-->>Frontend: Limit exceeded {upgradePrompt}
    end
    
    Frontend-->>Guest: Access granted/restricted
    
    opt Within Usage Limits
        Guest->>Frontend: Use analysis features
        Frontend->>Gateway: API requests with guest session
        Gateway->>Gateway: Track usage per request
        Gateway->>Redis: Update usage counters
        
        alt Approaching limits
            Gateway->>Frontend: Usage warning notifications
        end
    end
    
    opt Upgrade Prompt
        Guest->>Frontend: Request account creation
        Frontend->>Gateway: POST /api/auth/register
        Gateway->>Gateway: Convert guest session to user account
        Gateway-->>Frontend: Account created {userId, fullAccess}
    end
```

**Guest Limitations**:
- **Analysis Limit**: 3 resume analyses per device per day
- **Feature Access**: Basic analysis only, no advanced reports
- **Storage**: 24-hour temporary storage of results
- **Upgrade Path**: Seamless conversion to full account with preserved data

---

## NATS Event-Driven Architecture

### Event Flow Summary

```
Job Creation → job.jd.submitted → analysis.jd.extracted
Resume Upload → job.resume.submitted → analysis.resume.parsed → match.scored → report.generated
```

### Critical Event Patterns

1. **Event Ordering**: Events must be processed in sequence for data consistency
2. **Error Handling**: Failed events trigger retry mechanisms and error notifications
3. **Progress Tracking**: Real-time WebSocket updates for all workflow stages
4. **Scalability**: Event-driven design supports horizontal scaling of services
5. **Monitoring**: Comprehensive logging and performance tracking across all events

### Performance Characteristics

- **Resume Processing**: 2-5 seconds (AI parsing + scoring)
- **Job Analysis**: 1-3 seconds (requirement extraction)
- **Report Generation**: 3-7 seconds (comprehensive analysis)
- **Real-time Updates**: <100ms WebSocket latency
- **Concurrent Processing**: Supports 100+ simultaneous analyses

---

## Security & Compliance

### Authentication & Authorization
- **JWT Tokens**: Secure session management with refresh token rotation
- **RBAC**: Role-based access control for enterprise users
- **Device Fingerprinting**: Secure guest user identification and tracking

### Data Protection
- **Encryption**: All sensitive data encrypted at rest and in transit
- **GDPR Compliance**: Data retention policies and right-to-deletion support
- **Audit Logging**: Comprehensive activity tracking for compliance requirements

### Rate Limiting & Abuse Prevention
- **API Rate Limits**: Configurable per-user and per-endpoint limits
- **Guest Usage Tracking**: Device-based usage monitoring and enforcement
- **DDoS Protection**: Intelligent request throttling and blocking

---

This business workflow design provides a comprehensive overview of the AI Recruitment Clerk system's primary workflows, emphasizing the event-driven architecture that enables scalable, real-time processing of recruitment tasks.

## UAT Test Plan: Job Creation Workflow

### Test Objective
Confirm that a business user can create a new job posting from the Jobs area, observe real-time progress feedback, and reach the final confirmation page without errors.

### Preconditions
- The local environment is running using the Docker Compose stack with the `apps` profile enabled.
- The tester has access to a standard recruiter account with permission to create jobs.
- The browser cache is cleared or a private/incognito window is being used to avoid stale session data.

### Execution Steps
1. Open a browser and navigate to the local frontend URL (`http://localhost:4200`).
2. Log in with the provided recruiter credentials.
3. From the main dashboard, select `Jobs` in the left navigation menu.
4. Click the `Create Job` button to open the job creation form.
5. Fill out the form using the sample data below:
   - Job Title: `Senior Solutions Architect`
   - Location: `Remote - North America`
   - Employment Type: `Full-time`
   - Salary Range: `150000 - 185000`
   - Job Description: copy/paste the sample text from the UAT packet (3–4 paragraphs).
   - Key Requirements: add at least three bullet points (e.g., `10+ years in enterprise architecture`, `Experience with cloud-native design`, `Strong stakeholder communication`).
6. Click `Next` to review the summary and ensure the real-time progress bar animates across the top of the page.
7. Press `Submit Job` on the confirmation screen.
8. Wait for the submission to complete and allow the app to navigate to the job detail page.

### Expected Results
1. The login page loads without error and displays the company branding.
2. The dashboard appears with the recruiter’s name in the header and no warning banners.
3. The Jobs list view loads, showing existing jobs (if any) with filters visible.
4. The job creation form appears with empty fields ready for input.
5. All entered sample data is accepted, and no validation errors are displayed.
6. The progress bar moves smoothly to the next stage and shows a status such as “Reviewing details…”.
7. A loading indicator appears, then disappears without showing any error messages.
8. The screen transitions to the new job detail page, displays the title “Senior Solutions Architect,” shows the progress bar at 100%, and presents a success toast confirming the job was created.

## UAT Test Plan: Resume Upload & Analysis

### Test Objective
Verify that a recruiter can upload a candidate resume to an existing job, observe each processing stage, and view the final analysis scores and report links without encountering errors.

### Preconditions
- A job such as “Senior Solutions Architect” already exists and is visible in the Jobs list.
- A sample resume PDF (e.g., `Candidate-Solutions-Architect.pdf`) is saved locally and meets the size/type requirements.
- The tester is logged in with recruiter permissions and the local stack is running with all microservices active.

### Execution Steps
1. From the dashboard, select `Jobs` in the left navigation menu.
2. Click the job card titled `Senior Solutions Architect` to open its detail page.
3. In the `Resumes` tab, press the `Upload Resume` button.
4. In the upload dialog, click `Browse`, choose `Candidate-Solutions-Architect.pdf`, and confirm the selection.
5. Click `Start Analysis` to begin processing.
6. Watch the real-time progress widget as it advances through each stage (`Uploading File`, `Parsing Resume`, `Scoring Candidate`, `Generating Report`).
7. Wait for the progress widget to reach 100% and disappear.
8. Review the analysis summary displayed on the job detail page.

### Expected Results
1. The Jobs list loads and displays the “Senior Solutions Architect” entry.
2. The job detail page opens, showing tabs for Overview, Resumes, Analytics, etc.
3. The upload modal appears with drag-and-drop/browse options and shows accepted file types.
4. The selected file name is visible in the dialog with a green checkmark indicating it passed validation.
5. The dialog closes automatically, and the progress widget appears at the top of the Resumes tab.
6. Each stage updates in sequence with labels such as “Uploading File,” “Parsing Resume,” “Scoring Candidate,” and “Generating Report,” accompanied by animated progress.
7. The widget displays “Analysis Complete” briefly before closing, and a success toast confirms the analysis finished.
8. A new resume entry appears in the Resumes table showing candidate name, match score (e.g., 86%), strengths/risks badges, and buttons for `View Report` and `Download PDF`.
