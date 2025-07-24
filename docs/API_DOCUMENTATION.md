# AI Recruitment Clerk - API Documentation

> **Complete API Reference for the AI-Powered Resume & Job Matching System**

[![Version](https://img.shields.io/badge/API-v1.0.0-blue)](.) [![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0.1-green)](./specs/api_spec.openapi.yml)

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [Event System](#event-system)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)

## 🎯 Overview

The AI Recruitment Clerk API provides a comprehensive REST interface for automated resume screening and job matching. The system uses an event-driven architecture with microservices to process PDF resumes, extract job requirements, and generate intelligent matching reports.

### Base URL
```
Production: https://api.ai-recruitment-clerk.com
Development: http://localhost:3000/api
```

### API Architecture
- **Protocol**: REST over HTTPS
- **Format**: JSON
- **Authentication**: JWT Bearer tokens
- **Rate Limiting**: 1000 requests/hour per API key
- **Versioning**: URL path versioning (`/api/v1/`)

## 🔐 Authentication

All API endpoints require authentication using JWT Bearer tokens.

### Authorization Header
```http
Authorization: Bearer <your-jwt-token>
```

### Token Acquisition
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@company.com",
  "password": "secure-password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

## 🔌 API Endpoints

### 📋 Jobs Management

#### Create Job
```http
POST /api/v1/jobs
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Senior Software Engineer",
  "description": "We are looking for an experienced software engineer...",
  "requirements": ["5+ years experience", "React", "Node.js"],
  "department": "Engineering",
  "location": "San Francisco, CA"
}
```

**Response (201 Created):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Senior Software Engineer",
  "status": "active",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### Get Job Details
```http
GET /api/v1/jobs/{jobId}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Senior Software Engineer",
  "description": "We are looking for an experienced software engineer...",
  "jdAnalysis": {
    "extractedSkills": ["React", "Node.js", "TypeScript"],
    "experienceLevel": "Senior",
    "requiredEducation": "Bachelor's Degree",
    "estimatedSalary": "$120,000 - $160,000"
  },
  "status": "active",
  "totalResumes": 25,
  "processedResumes": 23,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T11:45:00Z"
}
```

### 📄 Resume Management

#### Upload Resumes for Job
```http
POST /api/v1/jobs/{jobId}/resumes
Content-Type: multipart/form-data
Authorization: Bearer <token>

files: [resume1.pdf, resume2.pdf, resume3.pdf]
```

**Response (202 Accepted):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "submittedResumes": 3,
  "resumeIds": [
    "resume-001-uuid",
    "resume-002-uuid", 
    "resume-003-uuid"
  ],
  "estimatedProcessingTime": "2-5 minutes",
  "status": "processing"
}
```

#### Get Resume Details
```http
GET /api/v1/jobs/{jobId}/resumes/{resumeId}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "resumeId": "resume-001-uuid",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "originalFilename": "john_doe_resume.pdf",
  "parsedData": {
    "contactInfo": {
      "name": "John Doe",
      "email": "john.doe@email.com",
      "phone": "+1-555-123-4567",
      "location": "San Francisco, CA"
    },
    "skills": [
      "JavaScript", "React", "Node.js", "TypeScript", 
      "AWS", "Docker", "Kubernetes"
    ],
    "workExperience": [
      {
        "company": "Tech Innovations Inc",
        "position": "Senior Software Engineer",
        "duration": "2020-2024",
        "description": "Led development of microservices architecture..."
      }
    ],
    "education": [
      {
        "institution": "Stanford University",
        "degree": "Master of Science in Computer Science",
        "graduationYear": "2020"
      }
    ]
  },
  "matchScore": 0.87,
  "status": "processed",
  "processedAt": "2024-01-15T10:35:00Z"
}
```

### 📊 Reports & Analytics

#### Get Matching Report
```http
GET /api/v1/jobs/{jobId}/resumes/{resumeId}/report
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "reportId": "report-uuid-12345",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "resumeId": "resume-001-uuid",
  "overallScore": 0.87,
  "detailedAnalysis": {
    "skillsMatch": {
      "score": 0.92,
      "matchedSkills": ["React", "Node.js", "TypeScript"],
      "missingSkills": ["GraphQL", "Redis"],
      "additionalSkills": ["AWS", "Docker", "Kubernetes"]
    },
    "experienceMatch": {
      "score": 0.85,
      "requiredYears": 5,
      "candidateYears": 4,
      "relevantExperience": "4 years in full-stack development"
    },
    "educationMatch": {
      "score": 1.0,
      "requiredLevel": "Bachelor's",
      "candidateLevel": "Master's",
      "fieldRelevance": "Highly relevant"
    }
  },
  "recommendations": [
    "Strong technical skills alignment",
    "Slightly below required experience but compensated by education",
    "Excellent additional skills in cloud technologies"
  ],
  "generatedAt": "2024-01-15T10:36:00Z"
}
```

#### Get Job Summary Analytics
```http
GET /api/v1/jobs/{jobId}/analytics
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "totalResumes": 25,
  "processedResumes": 23,
  "failedResumes": 2,
  "averageScore": 0.68,
  "scoreDistribution": {
    "0.9-1.0": 3,
    "0.8-0.9": 7,
    "0.7-0.8": 8,
    "0.6-0.7": 3,
    "below_0.6": 2
  },
  "topCandidates": [
    {
      "resumeId": "resume-001-uuid",
      "candidateName": "John Doe",
      "score": 0.95
    },
    {
      "resumeId": "resume-007-uuid", 
      "candidateName": "Jane Smith",
      "score": 0.91
    }
  ],
  "commonSkills": ["JavaScript", "React", "Node.js"],
  "rareSkills": ["GraphQL", "Kubernetes", "Machine Learning"]
}
```

## 📊 Data Models

### JobDTO
```typescript
interface JobDTO {
  jobId: string;
  title: string;
  description: string;
  requirements: string[];
  department?: string;
  location?: string;
  status: 'active' | 'inactive' | 'closed';
  jdAnalysis?: {
    extractedSkills: string[];
    experienceLevel: string;
    requiredEducation: string;
    estimatedSalary?: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

### ResumeDTO
```typescript
interface ResumeDTO {
  resumeId: string;
  jobId: string;
  originalFilename: string;
  contactInfo: {
    name: string;
    email: string | null;
    phone: string | null;
    location?: string;
  };
  skills: string[];
  workExperience: WorkExperience[];
  education: Education[];
  matchScore?: number;
  status: 'processing' | 'processed' | 'failed';
  processedAt?: string;
}

interface WorkExperience {
  company: string;
  position: string;
  duration: string;
  description?: string;
}

interface Education {
  institution: string;
  degree: string;
  field?: string;
  graduationYear: string;
}
```

## 🔔 Event System

The API uses an event-driven architecture with NATS JetStream for asynchronous processing.

### Key Events

| Event Type | Description | Payload |
|------------|-------------|---------|
| `job.jd.submitted` | Job description submitted for analysis | `{jobId, jdText}` |
| `analysis.jd.extracted` | JD analysis completed | `{jobId, jdDto}` |
| `job.resume.submitted` | Resume uploaded for processing | `{jobId, resumeId, tempGridFsUrl}` |
| `analysis.resume.parsed` | Resume parsing completed | `{jobId, resumeId, resumeDto}` |
| `job.resume.failed` | Resume processing failed | `{jobId, resumeId, error}` |
| `analysis.match.scored` | Matching score calculated | `{jobId, resumeId, score}` |

### Event Subscription (WebSocket)
```javascript
// Connect to event stream
const eventSource = new EventSource('/api/v1/events/subscribe');

eventSource.addEventListener('analysis.resume.parsed', (event) => {
  const data = JSON.parse(event.data);
  console.log('Resume processed:', data);
});
```

## ⚠️ Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The uploaded file is not a valid PDF",
    "details": {
      "field": "file",
      "provided": "image/jpeg",
      "expected": "application/pdf"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "path": "/api/v1/jobs/123/resumes"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_TOKEN` | 401 | Authentication token is invalid or expired |
| `FORBIDDEN` | 403 | Insufficient permissions for requested resource |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `VALIDATION_ERROR` | 400 | Request data validation failed |
| `FILE_TOO_LARGE` | 413 | Uploaded file exceeds size limit (10MB) |
| `PROCESSING_ERROR` | 422 | Resume parsing or analysis failed |
| `RATE_LIMIT_EXCEEDED` | 429 | API rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## ⏱️ Rate Limiting

### Limits by Endpoint

| Endpoint Pattern | Limit | Window |
|------------------|--------|--------|
| `/auth/*` | 10 requests | 1 minute |
| `/jobs/{id}/resumes` (POST) | 100 requests | 1 hour |
| `/jobs/*` (GET) | 1000 requests | 1 hour |
| All other endpoints | 500 requests | 1 hour |

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705312200
```

## 💡 Examples

### Complete Workflow Example
```javascript
// 1. Create a new job
const job = await fetch('/api/v1/jobs', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Senior Software Engineer',
    description: 'Looking for an experienced developer...'
  })
});
const jobData = await job.json();

// 2. Upload resumes
const formData = new FormData();
formData.append('files', resume1File);
formData.append('files', resume2File);

const upload = await fetch(`/api/v1/jobs/${jobData.jobId}/resumes`, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token },
  body: formData
});
const uploadResult = await upload.json();

// 3. Poll for processing completion
const checkStatus = async () => {
  const status = await fetch(`/api/v1/jobs/${jobData.jobId}/analytics`, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const analytics = await status.json();
  
  if (analytics.processedResumes === analytics.totalResumes) {
    console.log('All resumes processed!');
    return analytics;
  } else {
    setTimeout(checkStatus, 5000); // Check again in 5 seconds
  }
};

await checkStatus();
```

### Bulk Operations Example
```javascript
// Batch create multiple jobs
const jobs = [
  { title: 'Frontend Developer', description: '...' },
  { title: 'Backend Developer', description: '...' },
  { title: 'DevOps Engineer', description: '...' }
];

const jobPromises = jobs.map(job => 
  fetch('/api/v1/jobs', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(job)
  })
);

const createdJobs = await Promise.all(jobPromises);
```

## 🔧 SDK Support

### JavaScript/TypeScript
```bash
npm install @ai-recruitment-clerk/sdk
```

```typescript
import { AIRecruitmentClient } from '@ai-recruitment-clerk/sdk';

const client = new AIRecruitmentClient({
  apiKey: 'your-api-key',
  baseURL: 'https://api.ai-recruitment-clerk.com'
});

// Create job and upload resumes
const job = await client.jobs.create({
  title: 'Software Engineer',
  description: 'Job description here...'
});

const resumes = await client.resumes.upload(job.jobId, [
  './resume1.pdf',
  './resume2.pdf'
]);

// Get results
const analytics = await client.analytics.getJobSummary(job.jobId);
```

---

**API Version**: v1.0.0  
**Last Updated**: January 15, 2024  
**Support**: [GitHub Issues](https://github.com/ai-recruitment-clerk/issues)