// MongoDB initialization script for E2E testing
// This script runs when the MongoDB container starts

print('Starting MongoDB initialization for E2E testing...');

// Switch to the test database
db = db.getSiblingDB('ai-recruitment-test');

// Create test collections with initial data
print('Creating test collections...');

// Users collection with test data
db.createCollection('users');
db.users.insertMany([
  {
    _id: ObjectId("507f1f77bcf86cd799439011"),
    userId: "test-user-1",
    email: "testuser1@example.com",
    name: "Test User One",
    role: "recruiter",
    permissions: ["CREATE_JOB", "UPLOAD_RESUME", "READ_JOB", "READ_RESUME", "GENERATE_REPORT"],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId("507f1f77bcf86cd799439012"),
    userId: "test-user-2", 
    email: "testuser2@example.com",
    name: "Test User Two",
    role: "admin",
    permissions: ["CREATE_JOB", "UPLOAD_RESUME", "READ_JOB", "READ_RESUME", "GENERATE_REPORT", "ADMIN", "TRACK_ANALYTICS"],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// Jobs collection with test data
db.createCollection('jobs');
db.jobs.insertMany([
  {
    _id: ObjectId("507f1f77bcf86cd799439021"),
    jobId: "test-job-1",
    title: "Senior Software Engineer",
    company: "Test Company Inc",
    description: "Looking for an experienced software engineer with expertise in Node.js, React, and MongoDB.",
    requirements: [
      "5+ years of software development experience",
      "Proficiency in JavaScript/TypeScript",
      "Experience with Node.js and React",
      "Knowledge of MongoDB and database design"
    ],
    skills: ["JavaScript", "TypeScript", "Node.js", "React", "MongoDB"],
    location: "Remote",
    salaryRange: "$80,000 - $120,000",
    status: "active",
    createdBy: "test-user-1",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId("507f1f77bcf86cd799439022"),
    jobId: "test-job-2",
    title: "Frontend Developer",
    company: "Test Startup LLC",
    description: "We're seeking a talented frontend developer to join our growing team.",
    requirements: [
      "3+ years of frontend development experience",
      "Expert knowledge of React and modern JavaScript",
      "Experience with CSS frameworks and responsive design"
    ],
    skills: ["React", "JavaScript", "CSS", "HTML", "Responsive Design"],
    location: "New York, NY",
    salaryRange: "$60,000 - $90,000",
    status: "active",
    createdBy: "test-user-1",
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// Resumes collection (initially empty, will be populated during tests)
db.createCollection('resumes');

// Analytics events collection (initially empty)
db.createCollection('analytics_events');

// User profiles collection
db.createCollection('user_profiles');
db.user_profiles.insertMany([
  {
    userId: "test-user-1",
    email: "testuser1@example.com",
    displayName: "Test User One",
    dataProcessingConsent: "granted",
    marketingConsent: "granted",
    analyticsConsent: "granted",
    isActive: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    userId: "test-user-2",
    email: "testuser2@example.com", 
    displayName: "Test User Two",
    dataProcessingConsent: "granted",
    marketingConsent: "denied",
    analyticsConsent: "granted",
    isActive: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// Create indexes for performance
print('Creating indexes...');

// User indexes
db.users.createIndex({ "userId": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "isActive": 1, "role": 1 });

// Job indexes
db.jobs.createIndex({ "jobId": 1 }, { unique: true });
db.jobs.createIndex({ "status": 1, "createdAt": -1 });
db.jobs.createIndex({ "createdBy": 1, "status": 1 });
db.jobs.createIndex({ "skills": 1 });

// Resume indexes
db.resumes.createIndex({ "resumeId": 1 }, { unique: true });
db.resumes.createIndex({ "jobId": 1, "status": 1 });
db.resumes.createIndex({ "uploadedBy": 1, "createdAt": -1 });

// Analytics events indexes
db.analytics_events.createIndex({ "eventId": 1 }, { unique: true });
db.analytics_events.createIndex({ "sessionId": 1, "timestamp": -1 });
db.analytics_events.createIndex({ "userId": 1, "eventType": 1, "timestamp": -1 });
db.analytics_events.createIndex({ "eventType": 1, "status": 1, "timestamp": -1 });
db.analytics_events.createIndex({ "retentionExpiry": 1, "status": 1 });

// User profiles indexes
db.user_profiles.createIndex({ "userId": 1 }, { unique: true });
db.user_profiles.createIndex({ "email": 1 });
db.user_profiles.createIndex({ "isActive": 1, "lastLoginAt": -1 });

print('MongoDB E2E initialization completed successfully!');

// Verify collections were created
print('Collections created:');
db.runCommand("listCollections").cursor.firstBatch.forEach(
  function(collection) {
    print(' - ' + collection.name);
  }
);

print('Total documents inserted:');
print(' - Users: ' + db.users.countDocuments());
print(' - Jobs: ' + db.jobs.countDocuments()); 
print(' - User Profiles: ' + db.user_profiles.countDocuments());
print(' - Resumes: ' + db.resumes.countDocuments());
print(' - Analytics Events: ' + db.analytics_events.countDocuments());