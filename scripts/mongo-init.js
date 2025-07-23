// MongoDB initialization script for AI Recruitment Clerk
db = db.getSiblingDB('ai-recruitment');

// Create collections
db.createCollection('jobs');
db.createCollection('resumes');
db.createCollection('reports');
db.createCollection('analysis_results');

// Create indexes for better performance
db.jobs.createIndex({ "id": 1 }, { unique: true });
db.jobs.createIndex({ "status": 1 });
db.jobs.createIndex({ "createdAt": -1 });

db.resumes.createIndex({ "jobId": 1 });
db.resumes.createIndex({ "uploadedAt": -1 });
db.resumes.createIndex({ "status": 1 });

db.reports.createIndex({ "jobId": 1 });
db.reports.createIndex({ "createdAt": -1 });
db.reports.createIndex({ "status": 1 });

db.analysis_results.createIndex({ "jobId": 1 });
db.analysis_results.createIndex({ "resumeId": 1 });
db.analysis_results.createIndex({ "score": -1 });

print('AI Recruitment database initialized successfully');