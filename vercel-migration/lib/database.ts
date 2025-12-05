import { MongoClient, Db, Collection } from 'mongodb'

if (!process.env.MONGODB_ATLAS_URI) {
  throw new Error('Please add your MongoDB Atlas URI to .env.local')
}

const uri = process.env.MONGODB_ATLAS_URI
const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  // 在开发环境中使用全局变量，这样不会在HMR时重新连接
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // 在生产环境中，最好不要使用全局变量
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

// 数据库连接
export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  const client = await clientPromise
  const db = client.db('ai-recruitment-poc')
  
  return { client, db }
}

// 集合名称常量
export const COLLECTIONS = {
  USERS: 'users',
  ACTIVATION_CODES: 'activation_codes',
  USER_SESSIONS: 'user_sessions',
  PROCESSING_JOBS: 'processing_jobs',
  USER_ANALYTICS: 'user_analytics',
  USER_FEEDBACK: 'user_feedback',
  PARSED_RESUMES: 'parsed_resumes',
  JOB_DESCRIPTIONS: 'job_descriptions',
  MATCH_RESULTS: 'match_results'
} as const

// 获取指定集合
export async function getCollection<T = any>(name: string): Promise<Collection<T>> {
  const { db } = await connectToDatabase()
  return db.collection<T>(name)
}

// 数据库索引创建
export async function createIndexes() {
  const { db } = await connectToDatabase()
  
  try {
    // 激活码索引
    await db.collection(COLLECTIONS.ACTIVATION_CODES).createIndex(
      { code: 1 }, 
      { unique: true }
    )
    await db.collection(COLLECTIONS.ACTIVATION_CODES).createIndex(
      { isUsed: 1, expiresAt: 1 }
    )
    
    // 用户会话索引
    await db.collection(COLLECTIONS.USER_SESSIONS).createIndex({ userId: 1 })
    await db.collection(COLLECTIONS.USER_SESSIONS).createIndex({ email: 1 }, { unique: true })
    await db.collection(COLLECTIONS.USER_SESSIONS).createIndex({ lastActiveAt: 1 })
    
    // 处理作业索引
    await db.collection(COLLECTIONS.PROCESSING_JOBS).createIndex({ jobId: 1 }, { unique: true })
    await db.collection(COLLECTIONS.PROCESSING_JOBS).createIndex({ userId: 1, createdAt: -1 })
    await db.collection(COLLECTIONS.PROCESSING_JOBS).createIndex({ status: 1, createdAt: 1 })
    
    // 分析数据索引
    await db.collection(COLLECTIONS.USER_ANALYTICS).createIndex({ userId: 1, timestamp: -1 })
    await db.collection(COLLECTIONS.USER_ANALYTICS).createIndex({ event: 1, timestamp: -1 })
    await db.collection(COLLECTIONS.USER_ANALYTICS).createIndex({ 'data.feature': 1 })
    
    // 文档索引
    await db.collection(COLLECTIONS.PARSED_RESUMES).createIndex({ userId: 1, createdAt: -1 })
    await db.collection(COLLECTIONS.JOB_DESCRIPTIONS).createIndex({ userId: 1, createdAt: -1 })
    await db.collection(COLLECTIONS.MATCH_RESULTS).createIndex({ userId: 1, jobId: 1, resumeId: 1 })
    
    console.log('Database indexes created successfully')
  } catch (error) {
    console.error('Error creating database indexes:', error)
    throw error
  }
}

// 数据库健康检查
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const { client } = await connectToDatabase()
    await client.db('admin').command({ ping: 1 })
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

export default clientPromise