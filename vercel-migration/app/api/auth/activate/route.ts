import { NextRequest, NextResponse } from 'next/server'
import { ActivationManager } from '@/lib/activation'
import { Analytics, getClientMetadata } from '@/lib/analytics'
import { z } from 'zod'

// 激活请求验证模式
const ActivateSchema = z.object({
  code: z.string().min(1, 'Activation code is required'),
  email: z.string().email('Valid email is required'),
  profile: z.object({
    company: z.string().optional(),
    industry: z.string().optional(),
    teamSize: z.enum(['1', '2-10', '11-50', '51-200', '200+']).optional(),
    useCase: z.enum(['hiring', 'recruiting', 'hr', 'other']).optional(),
    country: z.string().optional(),
    role: z.string().optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const clientMetadata = getClientMetadata(request)
    
    // 追踪激活码输入事件
    await Analytics.track(null, 'activation_code_entered', {
      codeLength: body.code?.length || 0,
      hasEmail: !!body.email,
      hasProfile: !!body.profile
    }, clientMetadata)
    
    // 验证请求数据
    const validation = ActivateSchema.safeParse(body)
    if (!validation.success) {
      await Analytics.track(null, 'error_occurred', {
        error: 'VALIDATION_ERROR',
        details: validation.error.errors,
        context: 'activation_request'
      }, clientMetadata)
      
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        details: validation.error.errors
      }, { status: 400 })
    }

    const { code, email, profile } = validation.data
    
    // 尝试激活
    const result = await ActivationManager.activateCode(
      code.toUpperCase(),
      email.toLowerCase(),
      profile
    )
    
    if (!result.success) {
      // 追踪激活失败
      await Analytics.track(null, 'error_occurred', {
        error: result.error,
        context: 'activation_failed',
        code: code.substring(0, 4) + '****' // 只记录前4位
      }, clientMetadata)
      
      const errorMessages = {
        'INVALID_CODE': 'Invalid activation code',
        'CODE_ALREADY_USED': 'This activation code has already been used',
        'CODE_EXPIRED': 'This activation code has expired',
        'EMAIL_ALREADY_USED': 'This email address has already been used',
        'ACTIVATION_FAILED': 'Activation failed. Please try again.'
      }
      
      return NextResponse.json({
        error: result.error,
        message: errorMessages[result.error as keyof typeof errorMessages] || 'Activation failed'
      }, { status: 400 })
    }

    const session = result.session!
    
    // 追踪成功激活
    await Analytics.track(session.id, 'activation_successful', {
      email: email,
      hasProfile: !!profile,
      features: {
        maxResumes: session.usage.resumesProcessed, // 这里应该从激活码获取限额
        maxJobs: 0,
        validDays: Math.floor((session.expiresAt.getTime() - session.activatedAt.getTime()) / (1000 * 60 * 60 * 24))
      }
    }, clientMetadata)
    
    // 追踪转化漏斗
    await Analytics.trackConversionFunnel(session.id, 'activation_successful', 'main', {
      source: 'direct',
      email: email
    })
    
    // 记录会话开始
    await Analytics.track(session.id, 'session_start', {
      isNewUser: true,
      profile: profile || {}
    }, clientMetadata)

    // 返回会话信息（不包含敏感数据）
    const responseData = {
      success: true,
      user: {
        id: session.id,
        email: session.email,
        activatedAt: session.activatedAt,
        expiresAt: session.expiresAt,
        profile: session.profile,
        limits: {
          // 这里需要从激活码获取真实限额
          resumes: { used: session.usage.resumesProcessed, limit: 50 },
          jobs: { used: session.usage.jobsAnalyzed, limit: 10 },
          reports: { used: session.usage.reportsGenerated, limit: 20 }
        }
      }
    }
    
    return NextResponse.json(responseData, { status: 201 })
    
  } catch (error) {
    console.error('Activation error:', error)
    
    await Analytics.trackError(
      error as Error,
      'activation_api',
      undefined,
      { severity: 'high', component: 'activation' }
    )
    
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error occurred'
    }, { status: 500 })
  }
}

// 验证激活码格式（不激活）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    
    if (!code) {
      return NextResponse.json({
        error: 'CODE_REQUIRED',
        message: 'Activation code is required'
      }, { status: 400 })
    }
    
    const validation = await ActivationManager.validateCode(code.toUpperCase())
    const clientMetadata = getClientMetadata(request)
    
    // 追踪验证尝试
    await Analytics.track(null, 'feature_usage', {
      feature: 'activation_validation',
      action: 'code_check',
      success: validation.valid,
      error: validation.error
    }, clientMetadata)
    
    if (!validation.valid) {
      return NextResponse.json({
        valid: false,
        error: validation.error
      }, { status: 200 })
    }
    
    const activationCode = validation.activationCode!
    
    return NextResponse.json({
      valid: true,
      features: activationCode.features,
      expiresAt: activationCode.expiresAt
    }, { status: 200 })
    
  } catch (error) {
    console.error('Code validation error:', error)
    
    await Analytics.trackError(
      error as Error,
      'activation_validation_api',
      undefined,
      { severity: 'medium', component: 'validation' }
    )
    
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'Validation failed'
    }, { status: 500 })
  }
}