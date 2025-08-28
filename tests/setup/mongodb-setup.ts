import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | undefined;

/**
 * Setup MongoDB Memory Server for testing
 */
export async function setupTestDatabase(): Promise<string> {
  // Create an in-memory MongoDB instance
  mongod = await MongoMemoryServer.create({
    instance: {
      dbName: 'test-db',
      port: 27017, // Use a fixed port for consistency
    },
  });

  const uri = mongod.getUri();
  
  // Set environment variable for the application
  process.env.MONGODB_URI = uri;
  process.env.DATABASE_URL = uri;
  
  console.log('Test MongoDB started at:', uri);
  return uri;
}

/**
 * Cleanup MongoDB Memory Server after tests
 */
export async function teardownTestDatabase(): Promise<void> {
  if (mongod) {
    await mongod.stop();
    mongod = undefined;
    console.log('Test MongoDB stopped');
  }
}

/**
 * Clear all collections in the test database
 */
export async function clearTestDatabase(): Promise<void> {
  if (!mongod) {
    throw new Error('MongoDB Memory Server is not running');
  }

  const uri = mongod.getUri();
  const client = new (await import('mongodb')).MongoClient(uri);
  await client.connect();
  const db = client.db();
  const collections = await db.collections();
  
  if (collections) {
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
  
  await client.close();
}

/**
 * Create test data fixtures
 */
export const testFixtures = {
  user: {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    password: '$2a$10$XYZ', // bcrypt hash
    name: 'Test User',
    role: 'user',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  
  job: {
    _id: '507f1f77bcf86cd799439012',
    title: 'Senior Developer',
    description: 'We are looking for a senior developer',
    requirements: ['5+ years experience', 'TypeScript', 'Node.js'],
    department: 'Engineering',
    location: 'Remote',
    createdBy: '507f1f77bcf86cd799439011',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  
  resume: {
    _id: '507f1f77bcf86cd799439013',
    candidateName: 'John Doe',
    candidateEmail: 'john@example.com',
    fileUrl: 'https://example.com/resume.pdf',
    parsedData: {
      skills: ['JavaScript', 'TypeScript', 'Node.js'],
      experience: 6,
      education: 'BS Computer Science',
    },
    jobId: '507f1f77bcf86cd799439012',
    uploadedBy: '507f1f77bcf86cd799439011',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  
  score: {
    _id: '507f1f77bcf86cd799439014',
    resumeId: '507f1f77bcf86cd799439013',
    jobId: '507f1f77bcf86cd799439012',
    overallScore: 85,
    skillMatch: 90,
    experienceMatch: 80,
    educationMatch: 85,
    details: {
      matchedSkills: ['TypeScript', 'Node.js'],
      missingSkills: [],
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
};

// Helper to insert test data
export async function insertTestData(collectionName: string, data: any[]): Promise<void> {
  if (!mongod) {
    throw new Error('MongoDB Memory Server is not running');
  }
  
  const uri = mongod.getUri();
  const client = new (await import('mongodb')).MongoClient(uri);
  await client.connect();
  const db = client.db();
  const collection = db.collection(collectionName);
  await collection.insertMany(data);
  await client.close();
}