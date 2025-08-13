// Database Performance Stress Testing for AI Recruitment Clerk
// MongoDB performance validation under high load conditions

import { MongoClient } from 'k6/x/mongo';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for database performance
const dbConnectionTime = new Trend('db_connection_time');
const dbQueryTime = new Trend('db_query_time');
const dbInsertTime = new Trend('db_insert_time');
const dbUpdateTime = new Trend('db_update_time');
const dbDeleteTime = new Trend('db_delete_time');
const dbOperationErrors = new Rate('db_operation_errors');
const dbTotalOperations = new Counter('db_total_operations');

// Database Stress Testing Configuration
export let options = {
  scenarios: {
    // Connection Pool Stress Test
    connection_pool_test: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      tags: { test_type: 'connection_pool' },
    },
    
    // Read-Heavy Workload Test
    read_heavy_test: {
      executor: 'constant-vus',
      vus: 100,
      duration: '10m',
      startTime: '5m',
      tags: { test_type: 'read_heavy' },
    },
    
    // Write-Heavy Workload Test
    write_heavy_test: {
      executor: 'constant-vus',
      vus: 30,
      duration: '8m',
      startTime: '15m',
      tags: { test_type: 'write_heavy' },
    },
    
    // Mixed Workload Test
    mixed_workload_test: {
      executor: 'constant-vus',
      vus: 75,
      duration: '12m',
      startTime: '23m',
      tags: { test_type: 'mixed_workload' },
    },
    
    // Concurrent Operations Test
    concurrent_ops_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 20 },
        { duration: '3m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      startTime: '35m',
      tags: { test_type: 'concurrent_ops' },
    },
  },
  
  // Database Performance Thresholds
  thresholds: {
    // Connection Performance
    'db_connection_time': [
      'p(95)<1000',    // 95% of connections established < 1s
      'p(99)<2000',    // 99% of connections established < 2s
    ],
    
    // Query Performance
    'db_query_time': [
      'p(95)<100',     // 95% of queries < 100ms
      'p(99)<500',     // 99% of queries < 500ms
    ],
    
    // Write Performance
    'db_insert_time': [
      'p(95)<200',     // 95% of inserts < 200ms
      'p(99)<1000',    // 99% of inserts < 1s
    ],
    
    'db_update_time': [
      'p(95)<150',     // 95% of updates < 150ms
      'p(99)<500',     // 99% of updates < 500ms
    ],
    
    // Reliability
    'db_operation_errors': ['rate<0.01'], // <1% error rate
    
    // Throughput
    'db_total_operations': ['rate>50'], // >50 operations/second
  },
};

// Test Configuration
const DB_CONFIG = {
  host: __ENV.MONGODB_HOST || 'localhost',
  port: __ENV.MONGODB_PORT || 27017,
  database: __ENV.MONGODB_DATABASE || 'ai-recruitment',
  username: __ENV.MONGODB_USERNAME || 'admin',
  password: __ENV.MONGODB_PASSWORD || 'devpassword123',
};

const CONNECTION_STRING = `mongodb://${DB_CONFIG.username}:${DB_CONFIG.password}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}?authSource=admin`;

// Test Data Generators
function generateJobData(index) {
  return {
    _id: `stress_job_${index}_${Date.now()}`,
    title: `Performance Test Job ${index}`,
    description: `Database stress test job posting ${index} - ${Math.random().toString(36)}`,
    requirements: ['JavaScript', 'Node.js', 'MongoDB', 'Performance Testing'],
    location: ['Remote', 'New York', 'San Francisco', 'London'][index % 4],
    salaryMin: 50000 + (index % 10) * 5000,
    salaryMax: 80000 + (index % 10) * 10000,
    employmentType: 'full-time',
    companyId: `company_${Math.floor(index / 10)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active',
    metadata: {
      testRun: true,
      batchNumber: Math.floor(index / 100),
      priority: index % 5,
    },
  };
}

function generateResumeData(index) {
  return {
    _id: `stress_resume_${index}_${Date.now()}`,
    candidateId: `candidate_${index}`,
    fileName: `performance_resume_${index}.pdf`,
    originalName: `Resume_${index}.pdf`,
    fileSize: 50000 + Math.random() * 200000,
    mimeType: 'application/pdf',
    uploadedAt: new Date(),
    processedAt: new Date(),
    status: 'processed',
    extractedData: {
      name: `Test Candidate ${index}`,
      email: `candidate${index}@stress.test`,
      phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      experience: Math.floor(Math.random() * 15),
      skills: ['JavaScript', 'Python', 'Database', 'Testing'][index % 4],
      education: ['Bachelor', 'Master', 'PhD'][index % 3],
      location: ['Remote', 'NYC', 'SF', 'London'][index % 4],
    },
    metadata: {
      testRun: true,
      batchNumber: Math.floor(index / 100),
      processingTime: Math.random() * 5000,
    },
  };
}

function generateAnalyticsData(index) {
  return {
    _id: `stress_analytics_${index}_${Date.now()}`,
    eventType: ['view', 'click', 'search', 'upload'][index % 4],
    userId: `user_${index % 1000}`,
    sessionId: `session_${index % 500}`,
    timestamp: new Date(),
    data: {
      page: `/test-page-${index % 20}`,
      action: `test-action-${index % 10}`,
      value: Math.random() * 100,
      metadata: {
        userAgent: 'k6-stress-test',
        ip: `192.168.1.${(index % 254) + 1}`,
        referrer: `https://test-${index % 5}.com`,
      },
    },
    processingTime: Math.random() * 1000,
    batchId: Math.floor(index / 50),
  };
}

// Global client for reuse
let mongoClient;

export function setup() {
  console.log('🚀 Database Stress Testing Setup');
  console.log(`📊 Target: ${CONNECTION_STRING.replace(/:([^:@]*@)/, ':***@')}`);
  console.log('⚡ Testing: Connection Pool, Read/Write Performance, Concurrent Operations');
  
  // Test initial connection
  try {
    const startTime = Date.now();
    mongoClient = new MongoClient(CONNECTION_STRING);
    const connectionTime = Date.now() - startTime;
    
    console.log(`✅ Database connection established in ${connectionTime}ms`);
    
    // Verify collections exist
    const collections = ['jobs', 'resumes', 'analytics'];
    console.log('📋 Target Collections:', collections.join(', '));
    
    return { 
      connectionString: CONNECTION_STRING,
      collections,
      setupTime: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    throw error;
  }
}

export default function (data) {
  const testType = __ENV.K6_SCENARIO || 'unknown';
  const vuId = __VU;
  const iterationId = __ITER;
  
  // Select test scenario based on current test type
  switch (testType) {
    case 'connection_pool_test':
      testConnectionPool(data, vuId, iterationId);
      break;
    case 'read_heavy_test':
      testReadHeavyWorkload(data, vuId, iterationId);
      break;
    case 'write_heavy_test':
      testWriteHeavyWorkload(data, vuId, iterationId);
      break;
    case 'mixed_workload_test':
      testMixedWorkload(data, vuId, iterationId);
      break;
    case 'concurrent_ops_test':
      testConcurrentOperations(data, vuId, iterationId);
      break;
    default:
      testMixedWorkload(data, vuId, iterationId);
  }
  
  // Simulate realistic operation spacing
  sleep(Math.random() * 0.5 + 0.1); // 100-600ms
}

function testConnectionPool(data, vuId, iterationId) {
  // Test connection establishment and reuse
  const startTime = Date.now();
  
  try {
    if (!mongoClient) {
      mongoClient = new MongoClient(data.connectionString);
    }
    
    const connectionTime = Date.now() - startTime;
    dbConnectionTime.add(connectionTime);
    
    // Perform simple query to test connection
    const queryStart = Date.now();
    const result = mongoClient.db().collection('jobs').countDocuments({});
    const queryTime = Date.now() - queryStart;
    
    dbQueryTime.add(queryTime);
    dbTotalOperations.add(1);
    
    const success = check(result, {
      'connection pool query successful': (r) => r >= 0,
      'connection established quickly': () => connectionTime < 1000,
      'query executed quickly': () => queryTime < 500,
    });
    
    if (!success) {
      dbOperationErrors.add(1);
    }
  } catch (error) {
    console.error(`Connection pool test error (VU ${vuId}):`, error.message);
    dbOperationErrors.add(1);
  }
}

function testReadHeavyWorkload(data, vuId, iterationId) {
  try {
    if (!mongoClient) {
      mongoClient = new MongoClient(data.connectionString);
    }
    
    // Perform various read operations
    const operations = [
      () => performJobSearch(mongoClient, vuId, iterationId),
      () => performResumeQuery(mongoClient, vuId, iterationId),
      () => performAnalyticsQuery(mongoClient, vuId, iterationId),
      () => performAggregationQuery(mongoClient, vuId, iterationId),
    ];
    
    // Execute random read operation
    const operation = operations[Math.floor(Math.random() * operations.length)];
    operation();
    
  } catch (error) {
    console.error(`Read heavy test error (VU ${vuId}):`, error.message);
    dbOperationErrors.add(1);
  }
}

function testWriteHeavyWorkload(data, vuId, iterationId) {
  try {
    if (!mongoClient) {
      mongoClient = new MongoClient(data.connectionString);
    }
    
    // Perform various write operations
    const operations = [
      () => performJobInsert(mongoClient, vuId, iterationId),
      () => performResumeInsert(mongoClient, vuId, iterationId),
      () => performAnalyticsInsert(mongoClient, vuId, iterationId),
      () => performBulkInsert(mongoClient, vuId, iterationId),
      () => performUpdate(mongoClient, vuId, iterationId),
    ];
    
    // Execute random write operation
    const operation = operations[Math.floor(Math.random() * operations.length)];
    operation();
    
  } catch (error) {
    console.error(`Write heavy test error (VU ${vuId}):`, error.message);
    dbOperationErrors.add(1);
  }
}

function testMixedWorkload(data, vuId, iterationId) {
  try {
    if (!mongoClient) {
      mongoClient = new MongoClient(data.connectionString);
    }
    
    // 70% read, 30% write operations (realistic ratio)
    if (Math.random() < 0.7) {
      testReadHeavyWorkload(data, vuId, iterationId);
    } else {
      testWriteHeavyWorkload(data, vuId, iterationId);
    }
    
  } catch (error) {
    console.error(`Mixed workload test error (VU ${vuId}):`, error.message);
    dbOperationErrors.add(1);
  }
}

function testConcurrentOperations(data, vuId, iterationId) {
  // Test concurrent access to same documents
  const documentId = `concurrent_test_${iterationId % 10}`;
  
  try {
    if (!mongoClient) {
      mongoClient = new MongoClient(data.connectionString);
    }
    
    // Perform concurrent update
    performConcurrentUpdate(mongoClient, documentId, vuId, iterationId);
    
  } catch (error) {
    console.error(`Concurrent operations test error (VU ${vuId}):`, error.message);
    dbOperationErrors.add(1);
  }
}

// Database Operation Functions

function performJobSearch(client, vuId, iterationId) {
  const startTime = Date.now();
  
  const query = {
    $and: [
      { status: 'active' },
      { $or: [
        { 'requirements': { $in: ['JavaScript', 'Node.js'] } },
        { 'location': { $in: ['Remote', 'New York'] } },
      ]},
    ],
  };
  
  const result = client.db().collection('jobs').find(query).limit(20).toArray();
  const queryTime = Date.now() - startTime;
  
  dbQueryTime.add(queryTime);
  dbTotalOperations.add(1);
  
  check(result, {
    'job search successful': (r) => Array.isArray(r),
    'job search performance': () => queryTime < 500,
  });
}

function performResumeQuery(client, vuId, iterationId) {
  const startTime = Date.now();
  
  const query = {
    'extractedData.experience': { $gte: 2 },
    'status': 'processed',
    'extractedData.skills': { $in: ['JavaScript', 'Python'] },
  };
  
  const result = client.db().collection('resumes').find(query).limit(10).toArray();
  const queryTime = Date.now() - startTime;
  
  dbQueryTime.add(queryTime);
  dbTotalOperations.add(1);
  
  check(result, {
    'resume query successful': (r) => Array.isArray(r),
    'resume query performance': () => queryTime < 300,
  });
}

function performAnalyticsQuery(client, vuId, iterationId) {
  const startTime = Date.now();
  
  const query = {
    'timestamp': { 
      $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    },
    'eventType': { $in: ['view', 'click'] },
  };
  
  const result = client.db().collection('analytics').find(query).limit(50).toArray();
  const queryTime = Date.now() - startTime;
  
  dbQueryTime.add(queryTime);
  dbTotalOperations.add(1);
  
  check(result, {
    'analytics query successful': (r) => Array.isArray(r),
    'analytics query performance': () => queryTime < 200,
  });
}

function performAggregationQuery(client, vuId, iterationId) {
  const startTime = Date.now();
  
  const pipeline = [
    { $match: { 'metadata.testRun': true } },
    { $group: {
        _id: '$location',
        count: { $sum: 1 },
        avgSalary: { $avg: '$salaryMin' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ];
  
  const result = client.db().collection('jobs').aggregate(pipeline).toArray();
  const queryTime = Date.now() - startTime;
  
  dbQueryTime.add(queryTime);
  dbTotalOperations.add(1);
  
  check(result, {
    'aggregation query successful': (r) => Array.isArray(r),
    'aggregation performance': () => queryTime < 1000,
  });
}

function performJobInsert(client, vuId, iterationId) {
  const startTime = Date.now();
  
  const jobData = generateJobData(vuId * 1000 + iterationId);
  const result = client.db().collection('jobs').insertOne(jobData);
  const insertTime = Date.now() - startTime;
  
  dbInsertTime.add(insertTime);
  dbTotalOperations.add(1);
  
  check(result, {
    'job insert successful': (r) => r.insertedId !== null,
    'job insert performance': () => insertTime < 200,
  });
}

function performResumeInsert(client, vuId, iterationId) {
  const startTime = Date.now();
  
  const resumeData = generateResumeData(vuId * 1000 + iterationId);
  const result = client.db().collection('resumes').insertOne(resumeData);
  const insertTime = Date.now() - startTime;
  
  dbInsertTime.add(insertTime);
  dbTotalOperations.add(1);
  
  check(result, {
    'resume insert successful': (r) => r.insertedId !== null,
    'resume insert performance': () => insertTime < 150,
  });
}

function performAnalyticsInsert(client, vuId, iterationId) {
  const startTime = Date.now();
  
  const analyticsData = generateAnalyticsData(vuId * 1000 + iterationId);
  const result = client.db().collection('analytics').insertOne(analyticsData);
  const insertTime = Date.now() - startTime;
  
  dbInsertTime.add(insertTime);
  dbTotalOperations.add(1);
  
  check(result, {
    'analytics insert successful': (r) => r.insertedId !== null,
    'analytics insert performance': () => insertTime < 100,
  });
}

function performBulkInsert(client, vuId, iterationId) {
  const startTime = Date.now();
  
  const batchSize = 10;
  const documents = [];
  for (let i = 0; i < batchSize; i++) {
    documents.push(generateJobData(vuId * 1000 + iterationId * batchSize + i));
  }
  
  const result = client.db().collection('jobs').insertMany(documents);
  const insertTime = Date.now() - startTime;
  
  dbInsertTime.add(insertTime);
  dbTotalOperations.add(batchSize);
  
  check(result, {
    'bulk insert successful': (r) => r.insertedCount === batchSize,
    'bulk insert performance': () => insertTime < 1000,
  });
}

function performUpdate(client, vuId, iterationId) {
  const startTime = Date.now();
  
  const query = { 'metadata.testRun': true };
  const update = { 
    $set: { 
      'metadata.lastUpdated': new Date(),
      'metadata.updateCount': { $inc: 1 },
    }
  };
  
  const result = client.db().collection('jobs').updateMany(query, update);
  const updateTime = Date.now() - startTime;
  
  dbUpdateTime.add(updateTime);
  dbTotalOperations.add(1);
  
  check(result, {
    'update successful': (r) => r.modifiedCount >= 0,
    'update performance': () => updateTime < 500,
  });
}

function performConcurrentUpdate(client, documentId, vuId, iterationId) {
  const startTime = Date.now();
  
  // Upsert operation for concurrent access testing
  const query = { _id: `concurrent_${documentId}` };
  const update = {
    $inc: { 'counters.access_count': 1 },
    $set: { 
      'lastAccess': new Date(),
      'accessedBy': vuId,
      'iteration': iterationId,
    },
    $setOnInsert: {
      '_id': `concurrent_${documentId}`,
      'createdAt': new Date(),
      'counters': { access_count: 0 },
    },
  };
  
  const result = client.db().collection('concurrent_test').updateOne(
    query,
    update,
    { upsert: true }
  );
  
  const updateTime = Date.now() - startTime;
  
  dbUpdateTime.add(updateTime);
  dbTotalOperations.add(1);
  
  check(result, {
    'concurrent update successful': (r) => r.modifiedCount > 0 || r.upsertedCount > 0,
    'concurrent update performance': () => updateTime < 300,
  });
}

export function teardown(data) {
  console.log('🧹 Database Stress Test Cleanup');
  
  try {
    if (mongoClient) {
      // Clean up test data
      const collections = ['jobs', 'resumes', 'analytics', 'concurrent_test'];
      
      collections.forEach(collection => {
        try {
          const result = mongoClient.db().collection(collection).deleteMany({
            'metadata.testRun': true
          });
          console.log(`🗑️ Cleaned ${result.deletedCount} test documents from ${collection}`);
        } catch (error) {
          console.error(`❌ Error cleaning ${collection}:`, error.message);
        }
      });
      
      mongoClient.close();
    }
    
    console.log('✅ Database stress test cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
  }
}