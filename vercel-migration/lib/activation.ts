import { getCollection, COLLECTIONS } from './database'
import { nanoid } from 'nanoid'

// 激活码模型
export interface ActivationCode {
  _id?: string
  code: string
  isUsed: boolean
  usedBy?: string
  usedAt?: Date
  createdAt: Date
  expiresAt: Date
  features: {
    maxResumes: number
    maxJobs: number
    maxReports: number
    validDays: number
  }
  metadata: {
    source: 'website' | 'social' | 'referral' | 'campaign'
    campaign?: string
    referrer?: string
    batchId?: string
  }
}

// 用户会话模型
export interface UserSession {
  _id?: string
  id: string
  email: string
  activationCode: string
  activatedAt: Date
  lastActiveAt: Date
  expiresAt: Date
  status: 'active' | 'expired' | 'suspended'
  usage: {
    resumesProcessed: number
    jobsAnalyzed: number
    reportsGenerated: number
    apiCalls: number
  }
  profile: {
    company?: string
    industry?: string
    teamSize?: string
    useCase?: string
    country?: string
    role?: string
  }
}

// 激活码管理类
export class ActivationManager {
  // 生成激活码
  static async generateCodes(count: number, options: {
    validDays?: number
    maxResumes?: number
    maxJobs?: number
    maxReports?: number
    source?: string
    campaign?: string
    batchId?: string
  } = {}): Promise<ActivationCode[]> {
    const collection = await getCollection<ActivationCode>(COLLECTIONS.ACTIVATION_CODES)
    
    const codes: ActivationCode[] = []
    const batchId = options.batchId || nanoid(8)
    
    for (let i = 0; i < count; i++) {
      const code: ActivationCode = {
        code: this.generateCodeString(),
        isUsed: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + (options.validDays || 365) * 24 * 60 * 60 * 1000),
        features: {
          maxResumes: options.maxResumes || 50,
          maxJobs: options.maxJobs || 10,
          maxReports: options.maxReports || 20,
          validDays: options.validDays || 30
        },
        metadata: {
          source: (options.source as any) || 'website',
          campaign: options.campaign,
          batchId
        }
      }
      codes.push(code)
    }
    
    await collection.insertMany(codes)
    return codes
  }

  // 验证激活码
  static async validateCode(code: string): Promise<{
    valid: boolean
    activationCode?: ActivationCode
    error?: string
  }> {
    const collection = await getCollection<ActivationCode>(COLLECTIONS.ACTIVATION_CODES)
    
    const activationCode = await collection.findOne({ code: code.toUpperCase() })
    
    if (!activationCode) {
      return { valid: false, error: 'INVALID_CODE' }
    }
    
    if (activationCode.isUsed) {
      return { valid: false, error: 'CODE_ALREADY_USED' }
    }
    
    if (activationCode.expiresAt < new Date()) {
      return { valid: false, error: 'CODE_EXPIRED' }
    }
    
    return { valid: true, activationCode }
  }

  // 使用激活码创建会话
  static async activateCode(code: string, email: string, profile?: any): Promise<{
    success: boolean
    session?: UserSession
    error?: string
  }> {
    const validation = await this.validateCode(code)
    
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }
    
    const activationCode = validation.activationCode!
    
    // 检查邮箱是否已存在
    const sessionCollection = await getCollection<UserSession>(COLLECTIONS.USER_SESSIONS)
    const existingSession = await sessionCollection.findOne({ email })
    
    if (existingSession) {
      return { success: false, error: 'EMAIL_ALREADY_USED' }
    }
    
    try {
      // 创建用户会话
      const session: UserSession = {
        id: nanoid(),
        email,
        activationCode: code,
        activatedAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + activationCode.features.validDays * 24 * 60 * 60 * 1000),
        status: 'active',
        usage: {
          resumesProcessed: 0,
          jobsAnalyzed: 0,
          reportsGenerated: 0,
          apiCalls: 0
        },
        profile: profile || {}
      }
      
      await sessionCollection.insertOne(session)
      
      // 标记激活码为已使用
      const codeCollection = await getCollection<ActivationCode>(COLLECTIONS.ACTIVATION_CODES)
      await codeCollection.updateOne(
        { code },
        {
          $set: {
            isUsed: true,
            usedBy: email,
            usedAt: new Date()
          }
        }
      )
      
      return { success: true, session }
      
    } catch (error) {
      console.error('Error activating code:', error)
      return { success: false, error: 'ACTIVATION_FAILED' }
    }
  }

  // 检查使用限制
  static async checkUsageLimit(userId: string, feature: 'resume' | 'job' | 'report'): Promise<{
    allowed: boolean
    usage: number
    limit: number
    remaining: number
  }> {
    const sessionCollection = await getCollection<UserSession>(COLLECTIONS.USER_SESSIONS)
    const session = await sessionCollection.findOne({ id: userId })
    
    if (!session || session.status !== 'active') {
      return { allowed: false, usage: 0, limit: 0, remaining: 0 }
    }
    
    if (session.expiresAt < new Date()) {
      // 过期会话
      await sessionCollection.updateOne({ id: userId }, { $set: { status: 'expired' } })
      return { allowed: false, usage: 0, limit: 0, remaining: 0 }
    }
    
    const codeCollection = await getCollection<ActivationCode>(COLLECTIONS.ACTIVATION_CODES)
    const activationCode = await codeCollection.findOne({ code: session.activationCode })
    
    if (!activationCode) {
      return { allowed: false, usage: 0, limit: 0, remaining: 0 }
    }
    
    let usage: number, limit: number
    
    switch (feature) {
      case 'resume':
        usage = session.usage.resumesProcessed
        limit = activationCode.features.maxResumes
        break
      case 'job':
        usage = session.usage.jobsAnalyzed
        limit = activationCode.features.maxJobs
        break
      case 'report':
        usage = session.usage.reportsGenerated
        limit = activationCode.features.maxReports
        break
      default:
        return { allowed: false, usage: 0, limit: 0, remaining: 0 }
    }
    
    const remaining = Math.max(0, limit - usage)
    return {
      allowed: usage < limit,
      usage,
      limit,
      remaining
    }
  }

  // 更新使用统计
  static async updateUsage(userId: string, feature: 'resume' | 'job' | 'report', increment = 1): Promise<void> {
    const sessionCollection = await getCollection<UserSession>(COLLECTIONS.USER_SESSIONS)
    
    const updateField = feature === 'resume' ? 'usage.resumesProcessed' :
                       feature === 'job' ? 'usage.jobsAnalyzed' :
                       'usage.reportsGenerated'
    
    await sessionCollection.updateOne(
      { id: userId },
      {
        $inc: { 
          [updateField]: increment,
          'usage.apiCalls': 1
        },
        $set: { lastActiveAt: new Date() }
      }
    )
  }

  // 获取用户会话
  static async getSession(userId: string): Promise<UserSession | null> {
    const collection = await getCollection<UserSession>(COLLECTIONS.USER_SESSIONS)
    return await collection.findOne({ id: userId })
  }

  // 生成激活码字符串
  private static generateCodeString(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 排除易混淆字符
    let result = ''
    
    // 格式: XXXX-XXXX-XXXX
    for (let segment = 0; segment < 3; segment++) {
      if (segment > 0) result += '-'
      for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
      }
    }
    
    return result
  }

  // 获取统计信息
  static async getStats(): Promise<{
    totalCodes: number
    usedCodes: number
    activeSessions: number
    expiredSessions: number
    usageStats: {
      totalResumes: number
      totalJobs: number
      totalReports: number
      totalApiCalls: number
    }
  }> {
    const codeCollection = await getCollection<ActivationCode>(COLLECTIONS.ACTIVATION_CODES)
    const sessionCollection = await getCollection<UserSession>(COLLECTIONS.USER_SESSIONS)
    
    const [
      totalCodes,
      usedCodes,
      activeSessions,
      expiredSessions,
      usageStats
    ] = await Promise.all([
      codeCollection.countDocuments(),
      codeCollection.countDocuments({ isUsed: true }),
      sessionCollection.countDocuments({ status: 'active' }),
      sessionCollection.countDocuments({ status: 'expired' }),
      sessionCollection.aggregate([
        {
          $group: {
            _id: null,
            totalResumes: { $sum: '$usage.resumesProcessed' },
            totalJobs: { $sum: '$usage.jobsAnalyzed' },
            totalReports: { $sum: '$usage.reportsGenerated' },
            totalApiCalls: { $sum: '$usage.apiCalls' }
          }
        }
      ]).toArray()
    ])
    
    return {
      totalCodes,
      usedCodes,
      activeSessions,
      expiredSessions,
      usageStats: usageStats[0] || {
        totalResumes: 0,
        totalJobs: 0,
        totalReports: 0,
        totalApiCalls: 0
      }
    }
  }
}

// 导出类型
export type { ActivationCode, UserSession }