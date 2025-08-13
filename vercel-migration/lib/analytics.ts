import { getCollection, COLLECTIONS } from './database'
import { nanoid } from 'nanoid'

// 分析事件类型
export type AnalyticsEvent = 
  | 'page_view'
  | 'activation_code_entered'
  | 'activation_successful'
  | 'feature_usage'
  | 'resume_upload'
  | 'resume_processing_complete'
  | 'job_analysis'
  | 'matching_complete'
  | 'report_generation'
  | 'error_occurred'
  | 'session_start'
  | 'session_end'
  | 'value_realization'
  | 'user_feedback'
  | 'conversion_funnel'
  | 'business_metric'

// 分析数据模型
export interface AnalyticsData {
  _id?: string
  eventId: string
  userId?: string
  sessionId?: string
  event: AnalyticsEvent
  timestamp: Date
  data: Record<string, any>
  metadata: {
    userAgent?: string
    ip?: string
    referrer?: string
    page?: string
    device?: string
    country?: string
    city?: string
  }
}

// 转化漏斗模型
export interface ConversionFunnel {
  userId: string
  funnelId: string
  steps: {
    step: string
    timestamp: Date
    completed: boolean
    data?: any
  }[]
  currentStep: number
  completionRate: number
}

// 业务价值指标
export interface BusinessMetric {
  userId: string
  metric: string
  value: number | string | boolean
  unit?: string
  timestamp: Date
  context: Record<string, any>
}

// 分析管理器类
export class Analytics {
  // 记录事件
  static async track(
    userId: string | null,
    event: AnalyticsEvent,
    data: Record<string, any> = {},
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const collection = await getCollection<AnalyticsData>(COLLECTIONS.USER_ANALYTICS)
      
      const analyticsData: AnalyticsData = {
        eventId: nanoid(),
        userId: userId || undefined,
        sessionId: metadata.sessionId,
        event,
        timestamp: new Date(),
        data,
        metadata: {
          userAgent: metadata.userAgent,
          ip: metadata.ip,
          referrer: metadata.referrer,
          page: metadata.page,
          device: metadata.device,
          country: metadata.country,
          city: metadata.city
        }
      }
      
      await collection.insertOne(analyticsData)
    } catch (error) {
      console.error('Analytics tracking error:', error)
      // 不阻塞主流程
    }
  }

  // 页面访问追踪
  static async trackPageView(
    userId: string | null,
    page: string,
    referrer?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.track(userId, 'page_view', {
      page,
      referrer,
      loadTime: metadata?.loadTime,
      previousPage: metadata?.previousPage
    }, metadata)
  }

  // 功能使用追踪
  static async trackFeatureUsage(
    userId: string,
    feature: string,
    action: string,
    data?: Record<string, any>
  ): Promise<void> {
    await this.track(userId, 'feature_usage', {
      feature,
      action,
      success: data?.success,
      processingTime: data?.processingTime,
      errorCode: data?.errorCode,
      fileSize: data?.fileSize,
      fileType: data?.fileType,
      ...data
    })
  }

  // 业务价值追踪
  static async trackBusinessValue(
    userId: string,
    metric: string,
    value: any,
    context?: Record<string, any>
  ): Promise<void> {
    const businessMetricCollection = await getCollection<BusinessMetric>('business_metrics')
    
    await businessMetricCollection.insertOne({
      userId,
      metric,
      value,
      timestamp: new Date(),
      context: context || {}
    })

    // 同时记录为分析事件
    await this.track(userId, 'business_metric', {
      metric,
      value,
      context
    })
  }

  // 转化漏斗追踪
  static async trackConversionFunnel(
    userId: string,
    step: string,
    funnelId: string = 'main',
    data?: Record<string, any>
  ): Promise<void> {
    const collection = await getCollection<ConversionFunnel>('conversion_funnels')
    
    // 查找现有漏斗记录
    let funnel = await collection.findOne({ userId, funnelId })
    
    if (!funnel) {
      // 创建新的漏斗记录
      funnel = {
        userId,
        funnelId,
        steps: [],
        currentStep: 0,
        completionRate: 0
      }
    }

    // 添加新步骤
    const stepIndex = funnel.steps.findIndex(s => s.step === step)
    if (stepIndex === -1) {
      funnel.steps.push({
        step,
        timestamp: new Date(),
        completed: true,
        data
      })
      funnel.currentStep = funnel.steps.length
    } else {
      // 更新现有步骤
      funnel.steps[stepIndex] = {
        step,
        timestamp: new Date(),
        completed: true,
        data
      }
    }

    // 计算完成率
    const totalSteps = this.getFunnelSteps(funnelId).length
    funnel.completionRate = (funnel.steps.length / totalSteps) * 100

    await collection.replaceOne(
      { userId, funnelId },
      funnel,
      { upsert: true }
    )

    // 记录转化事件
    await this.track(userId, 'conversion_funnel', {
      step,
      funnelId,
      stepIndex: funnel.currentStep,
      completionRate: funnel.completionRate,
      data
    })
  }

  // 错误追踪
  static async trackError(
    error: Error,
    context: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.track(userId || null, 'error_occurred', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      context,
      severity: metadata?.severity || 'error',
      component: metadata?.component,
      function: metadata?.function
    }, metadata)
  }

  // 时间价值计算追踪
  static async trackTimeValue(
    userId: string,
    activity: string,
    manualTime: number,
    aiTime: number,
    accuracy?: number
  ): Promise<void> {
    const timeSaved = Math.max(0, manualTime - aiTime)
    const efficiency = manualTime > 0 ? ((timeSaved / manualTime) * 100) : 0
    
    await this.trackBusinessValue(userId, 'time_efficiency', {
      activity,
      manualTime,
      aiTime,
      timeSaved,
      efficiencyGain: efficiency,
      accuracy: accuracy || null
    })
  }

  // 用户反馈追踪
  static async trackUserFeedback(
    userId: string,
    feedbackType: 'rating' | 'comment' | 'suggestion' | 'bug_report',
    content: any,
    context?: string
  ): Promise<void> {
    const feedbackCollection = await getCollection('user_feedback')
    
    await feedbackCollection.insertOne({
      userId,
      feedbackType,
      content,
      context,
      timestamp: new Date(),
      processed: false
    })

    await this.track(userId, 'user_feedback', {
      feedbackType,
      hasContent: !!content,
      context,
      sentiment: content.sentiment // 如果有情感分析
    })
  }

  // 获取转化率数据
  static async getConversionRates(funnelId: string = 'main'): Promise<{
    step: string
    users: number
    conversionRate: number
  }[]> {
    const collection = await getCollection<AnalyticsData>(COLLECTIONS.USER_ANALYTICS)
    
    const pipeline = [
      { $match: { event: 'conversion_funnel', 'data.funnelId': funnelId } },
      { $group: {
        _id: '$data.step',
        users: { $addToSet: '$userId' },
        events: { $sum: 1 }
      }},
      { $project: {
        step: '$_id',
        users: { $size: '$users' },
        events: 1
      }},
      { $sort: { step: 1 } }
    ]
    
    const results = await collection.aggregate(pipeline).toArray()
    
    // 计算转化率
    const totalUsers = results[0]?.users || 0
    return results.map((result, index) => ({
      step: result.step,
      users: result.users,
      conversionRate: totalUsers > 0 ? (result.users / totalUsers) * 100 : 0
    }))
  }

  // 获取用户使用统计
  static async getUserStats(userId: string): Promise<{
    totalEvents: number
    firstSeen: Date
    lastSeen: Date
    topFeatures: { feature: string; usage: number }[]
    conversionProgress: number
    businessValue: {
      timeSaved: number
      documentsProcessed: number
      accuracyScore: number
    }
  }> {
    const collection = await getCollection<AnalyticsData>(COLLECTIONS.USER_ANALYTICS)
    
    const [generalStats, featureStats, businessStats] = await Promise.all([
      // 总体统计
      collection.aggregate([
        { $match: { userId } },
        { $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          firstSeen: { $min: '$timestamp' },
          lastSeen: { $max: '$timestamp' }
        }}
      ]).toArray(),
      
      // 功能使用统计
      collection.aggregate([
        { $match: { userId, event: 'feature_usage' } },
        { $group: {
          _id: '$data.feature',
          usage: { $sum: 1 }
        }},
        { $sort: { usage: -1 } },
        { $limit: 10 }
      ]).toArray(),
      
      // 业务价值统计
      collection.aggregate([
        { $match: { userId, event: 'business_metric' } },
        { $group: {
          _id: '$data.metric',
          totalValue: { $sum: '$data.value.timeSaved' },
          avgAccuracy: { $avg: '$data.value.accuracy' },
          count: { $sum: 1 }
        }}
      ]).toArray()
    ])

    const stats = generalStats[0] || { totalEvents: 0, firstSeen: new Date(), lastSeen: new Date() }
    
    return {
      totalEvents: stats.totalEvents,
      firstSeen: stats.firstSeen,
      lastSeen: stats.lastSeen,
      topFeatures: featureStats.map(f => ({ feature: f._id, usage: f.usage })),
      conversionProgress: await this.getUserConversionProgress(userId),
      businessValue: {
        timeSaved: businessStats.reduce((acc, b) => acc + (b.totalValue || 0), 0),
        documentsProcessed: businessStats.reduce((acc, b) => acc + (b.count || 0), 0),
        accuracyScore: businessStats.length > 0 ? 
          businessStats.reduce((acc, b) => acc + (b.avgAccuracy || 0), 0) / businessStats.length : 0
      }
    }
  }

  // 获取用户转化进度
  private static async getUserConversionProgress(userId: string): Promise<number> {
    const collection = await getCollection<ConversionFunnel>('conversion_funnels')
    const funnel = await collection.findOne({ userId, funnelId: 'main' })
    return funnel?.completionRate || 0
  }

  // 定义转化漏斗步骤
  private static getFunnelSteps(funnelId: string): string[] {
    const funnelMaps = {
      main: [
        'landing_page_visit',
        'activation_code_entered', 
        'activation_successful',
        'first_resume_upload',
        'first_processing_complete',
        'first_results_viewed',
        'value_realization',
        'feature_exploration',
        'return_visit'
      ],
      power_user: [
        'multiple_resumes_processed',
        'job_analysis_used',
        'report_generation_used',
        'advanced_features_explored',
        'feedback_provided',
        'referral_made'
      ]
    }
    
    return funnelMaps[funnelId as keyof typeof funnelMaps] || funnelMaps.main
  }

  // 获取实时指标
  static async getRealTimeMetrics(): Promise<{
    activeUsers: number
    processingJobs: number
    successRate: number
    avgProcessingTime: number
  }> {
    const collection = await getCollection<AnalyticsData>(COLLECTIONS.USER_ANALYTICS)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const [activeUsers, recentEvents] = await Promise.all([
      collection.distinct('userId', {
        timestamp: { $gte: oneHourAgo }
      }),
      collection.find({
        timestamp: { $gte: oneHourAgo },
        event: { $in: ['feature_usage', 'error_occurred'] }
      }).toArray()
    ])

    const processingEvents = recentEvents.filter(e => 
      e.event === 'feature_usage' && e.data.action === 'processing'
    )
    const errorEvents = recentEvents.filter(e => e.event === 'error_occurred')
    
    const successRate = processingEvents.length > 0 ? 
      ((processingEvents.length - errorEvents.length) / processingEvents.length) * 100 : 100

    const avgProcessingTime = processingEvents.reduce((acc, e) => 
      acc + (e.data.processingTime || 0), 0) / Math.max(processingEvents.length, 1)

    return {
      activeUsers: activeUsers.length,
      processingJobs: processingEvents.length,
      successRate: Math.round(successRate),
      avgProcessingTime: Math.round(avgProcessingTime)
    }
  }
}

// 中间件辅助函数
export function getClientMetadata(request: Request): Record<string, any> {
  const headers = Object.fromEntries(request.headers.entries())
  
  return {
    userAgent: headers['user-agent'],
    ip: headers['x-forwarded-for'] || headers['x-real-ip'],
    referrer: headers['referer'],
    acceptLanguage: headers['accept-language'],
    acceptEncoding: headers['accept-encoding']
  }
}

export { AnalyticsData, ConversionFunnel, BusinessMetric }