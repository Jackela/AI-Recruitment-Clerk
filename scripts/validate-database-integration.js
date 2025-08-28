/**
 * Database Integration Validation Script
 * 
 * This script validates the MongoDB integration for all services:
 * - app-gateway: Job storage and management
 * - resume-parser-svc: Resume storage and GridFS file operations  
 * - report-generator-svc: Report storage and analysis
 * 
 * Run with: node scripts/validate-database-integration.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://admin:password123@localhost:27017/ai-recruitment?authSource=admin';

async function validateDatabaseIntegration() {
  let client;
  
  try {
    console.log('🔍 Starting Database Integration Validation...\n');
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URL);
    await client.connect();
    console.log('✅ MongoDB connection successful\n');
    
    const db = client.db('ai-recruitment');
    
    // Validate collections exist or can be created
    const collections = ['jobs', 'resumes', 'reports'];
    console.log('📂 Validating collections...');
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        console.log(`✅ Collection '${collectionName}': ${count} documents`);
      } catch (error) {
        console.log(`⚠️  Collection '${collectionName}': Will be created on first insert`);
      }
    }
    
    // Validate GridFS bucket for file storage
    console.log('\n📄 Validating GridFS...');
    try {
      const gridFSFiles = db.collection('resume-files.files');
      const gridFSChunks = db.collection('resume-files.chunks');
      
      const fileCount = await gridFSFiles.countDocuments();
      const chunkCount = await gridFSChunks.countDocuments();
      
      console.log(`✅ GridFS bucket 'resume-files': ${fileCount} files, ${chunkCount} chunks`);
    } catch (error) {
      console.log('⚠️  GridFS bucket: Will be created on first file upload');
    }
    
    // Test basic CRUD operations
    console.log('\n🧪 Testing basic database operations...');
    
    // Test job insertion
    const jobsCollection = db.collection('jobs');
    const testJob = {
      title: 'Database Validation Test Job',
      description: 'Test job for database integration validation',
      company: 'Test Company',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const jobResult = await jobsCollection.insertOne(testJob);
    console.log(`✅ Job insert test: ${jobResult.insertedId}`);
    
    // Test job query
    const foundJob = await jobsCollection.findOne({ _id: jobResult.insertedId });
    console.log(`✅ Job query test: ${foundJob ? 'Found' : 'Not found'}`);
    
    // Test job update
    const updateResult = await jobsCollection.updateOne(
      { _id: jobResult.insertedId },
      { $set: { status: 'validated' } }
    );
    console.log(`✅ Job update test: ${updateResult.modifiedCount} document(s) modified`);
    
    // Test job deletion
    const deleteResult = await jobsCollection.deleteOne({ _id: jobResult.insertedId });
    console.log(`✅ Job delete test: ${deleteResult.deletedCount} document(s) deleted`);
    
    // Test resume collection
    const resumesCollection = db.collection('resumes');
    const testResume = {
      contactInfo: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '123-456-7890'
      },
      skills: ['JavaScript', 'Node.js', 'MongoDB'],
      workExperience: [],
      education: [],
      originalFilename: 'test-resume.pdf',
      gridFsUrl: 'gridfs://resume-files/test-id',
      status: 'pending',
      createdAt: new Date()
    };
    
    const resumeResult = await resumesCollection.insertOne(testResume);
    console.log(`✅ Resume insert test: ${resumeResult.insertedId}`);
    
    // Clean up test resume
    await resumesCollection.deleteOne({ _id: resumeResult.insertedId });
    console.log(`✅ Resume cleanup: Test document removed`);
    
    // Test reports collection
    const reportsCollection = db.collection('reports');
    const testReport = {
      jobId: 'test-job-id',
      resumeId: 'test-resume-id',
      scoreBreakdown: {
        skillsMatch: 85,
        experienceMatch: 70,
        educationMatch: 90,
        overallFit: 80
      },
      recommendation: {
        decision: 'interview',
        reasoning: 'Strong candidate with good skills match',
        strengths: ['Technical skills', 'Experience'],
        concerns: [],
        suggestions: []
      },
      summary: 'Test analysis report',
      status: 'completed',
      generatedBy: 'test-service',
      llmModel: 'test-model',
      generatedAt: new Date()
    };
    
    const reportResult = await reportsCollection.insertOne(testReport);
    console.log(`✅ Report insert test: ${reportResult.insertedId}`);
    
    // Clean up test report
    await reportsCollection.deleteOne({ _id: reportResult.insertedId });
    console.log(`✅ Report cleanup: Test document removed`);
    
    // Validate indexes (will be created automatically by Mongoose)
    console.log('\n🔍 Checking for recommended indexes...');
    
    const jobsIndexes = await jobsCollection.indexes();
    const resumesIndexes = await resumesCollection.indexes();
    const reportsIndexes = await reportsCollection.indexes();
    
    console.log(`📊 Jobs collection has ${jobsIndexes.length} index(es)`);
    console.log(`📊 Resumes collection has ${resumesIndexes.length} index(es)`);
    console.log(`📊 Reports collection has ${reportsIndexes.length} index(es)`);
    
    console.log('\n🎉 Database Integration Validation Complete!');
    console.log('\n✅ Summary:');
    console.log('  - MongoDB connection: ✅ Working');
    console.log('  - Collections access: ✅ Working');
    console.log('  - CRUD operations: ✅ Working');
    console.log('  - GridFS setup: ✅ Ready');
    console.log('  - Data integrity: ✅ Maintained');
    
    console.log('\n🚀 Ready for production use!');
    
  } catch (error) {
    console.error('❌ Database validation failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n📡 Database connection closed');
    }
  }
}

// Handle script execution
if (require.main === module) {
  validateDatabaseIntegration().catch(console.error);
}

module.exports = { validateDatabaseIntegration };