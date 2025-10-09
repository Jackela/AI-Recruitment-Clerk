import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';
import { QuestionnaireIntegrationService } from '../domains/questionnaire/questionnaire-integration.service';

interface QuestionnaireSubmission {
  // 基础用户信息
  userProfile: {
    role: 'hr' | 'recruiter' | 'job_seeker' | 'other';
    industry: string;
    companySize: '1-10' | '11-50' | '51-200' | '201-1000' | '1000+';
    location: string;
  };

  // 使用体验反馈
  userExperience: {
    overallSatisfaction: 1 | 2 | 3 | 4 | 5;
    accuracyRating: 1 | 2 | 3 | 4 | 5;
    speedRating: 1 | 2 | 3 | 4 | 5;
    uiRating: 1 | 2 | 3 | 4 | 5;
    mostUsefulFeature: string;
    mainPainPoint: string;
    improvementSuggestion: string;
  };

  // 商业价值评估
  businessValue: {
    currentScreeningMethod: 'manual' | 'ats' | 'other_ai' | 'mixed';
    timeSpentPerResume: number; // 分钟
    resumesPerWeek: number;
    timeSavingPercentage: number; // 百分比
    willingnessToPayMonthly: number; // 元/月
    recommendLikelihood: 1 | 2 | 3 | 4 | 5; // NPS分数
  };

  // 功能需求
  featureNeeds: {
    batchProcessing: boolean;
    apiIntegration: boolean;
    customReports: boolean;
    multiLanguage: boolean;
    teamCollaboration: boolean;
    priorityFeature: string;
  };

  // 可选信息
  optional: {
    email?: string;
    allowFollowUp?: boolean;
    participateInBeta?: boolean;
    additionalFeedback?: string;
  };
}

/**
 * Exposes endpoints for questionnaire.
 */
@Controller('questionnaire')
export class QuestionnaireController {
  private readonly logger = new Logger(QuestionnaireController.name);
  /**
   * Initializes a new instance of the Questionnaire Controller.
   * @param questionnaireService - The questionnaire service.
   * @param rateLimitMiddleware - The rate limit middleware.
   */
  constructor(
    private readonly questionnaireService: QuestionnaireIntegrationService,
    private readonly rateLimitMiddleware: RateLimitMiddleware,
  ) {}

  /**
   * Retrieves questionnaire template.
   * @returns The result of the operation.
   */
  @Get('template')
  getQuestionnaireTemplate() {
    return {
      sections: [
        {
          id: 'user_profile',
          title: '用户背景',
          description: '帮助我们了解您的使用场景',
          questions: [
            {
              id: 'role',
              type: 'single_choice',
              question: '您的主要角色是？',
              options: [
                { value: 'hr', label: 'HR专员/经理' },
                { value: 'recruiter', label: '招聘专家/猎头' },
                { value: 'job_seeker', label: '求职者' },
                { value: 'other', label: '其他' },
              ],
              required: true,
            },
            {
              id: 'industry',
              type: 'text',
              question: '您所在的行业是？',
              placeholder: '如：互联网、金融、制造业等',
              required: true,
            },
            {
              id: 'company_size',
              type: 'single_choice',
              question: '公司规模？',
              options: [
                { value: '1-10', label: '1-10人' },
                { value: '11-50', label: '11-50人' },
                { value: '51-200', label: '51-200人' },
                { value: '201-1000', label: '201-1000人' },
                { value: '1000+', label: '1000人以上' },
              ],
              required: true,
            },
            {
              id: 'location',
              type: 'text',
              question: '工作所在城市？',
              placeholder: '如：北京、上海、深圳等',
              required: true,
            },
          ],
        },
        {
          id: 'user_experience',
          title: '使用体验评价',
          description: '您对我们产品的真实感受',
          questions: [
            {
              id: 'overall_satisfaction',
              type: 'rating',
              question: '整体满意度？',
              scale: 5,
              labels: { 1: '很不满意', 5: '非常满意' },
              required: true,
            },
            {
              id: 'accuracy_rating',
              type: 'rating',
              question: 'AI匹配结果的准确性？',
              scale: 5,
              labels: { 1: '很不准确', 5: '非常准确' },
              required: true,
            },
            {
              id: 'speed_rating',
              type: 'rating',
              question: '处理速度满意度？',
              scale: 5,
              labels: { 1: '太慢了', 5: '很快' },
              required: true,
            },
            {
              id: 'ui_rating',
              type: 'rating',
              question: '界面易用性？',
              scale: 5,
              labels: { 1: '很难用', 5: '很好用' },
              required: true,
            },
            {
              id: 'most_useful_feature',
              type: 'text',
              question: '您觉得最有用的功能是什么？',
              required: true,
            },
            {
              id: 'main_pain_point',
              type: 'text',
              question: '使用中遇到的最大问题是什么？',
              required: false,
            },
            {
              id: 'improvement_suggestion',
              type: 'textarea',
              question: '您希望我们如何改进？',
              required: false,
            },
          ],
        },
        {
          id: 'business_value',
          title: '商业价值评估',
          description: '帮助我们了解产品的实际价值',
          questions: [
            {
              id: 'current_screening_method',
              type: 'single_choice',
              question: '您目前主要使用什么方式筛选简历？',
              options: [
                { value: 'manual', label: '完全人工筛选' },
                { value: 'ats', label: '传统ATS系统' },
                { value: 'other_ai', label: '其他AI工具' },
                { value: 'mixed', label: '混合使用多种方式' },
              ],
              required: true,
            },
            {
              id: 'time_spent_per_resume',
              type: 'number',
              question: '平均每份简历您需要花多少分钟？',
              unit: '分钟',
              required: true,
            },
            {
              id: 'resumes_per_week',
              type: 'number',
              question: '每周大概需要筛选多少份简历？',
              unit: '份',
              required: true,
            },
            {
              id: 'time_saving_percentage',
              type: 'number',
              question: '使用我们的工具大概能节省多少时间？',
              unit: '%',
              max: 100,
              required: true,
            },
            {
              id: 'willingness_to_pay_monthly',
              type: 'number',
              question: '如果这个工具收费，您愿意每月支付多少？',
              unit: '元',
              required: true,
            },
            {
              id: 'recommend_likelihood',
              type: 'rating',
              question: '您会向同事推荐这个工具吗？',
              scale: 5,
              labels: { 1: '绝对不会', 5: '强烈推荐' },
              required: true,
            },
          ],
        },
        {
          id: 'feature_needs',
          title: '功能需求',
          description: '告诉我们您还需要什么功能',
          questions: [
            {
              id: 'needed_features',
              type: 'multiple_choice',
              question: '您希望我们增加哪些功能？',
              options: [
                { value: 'batch_processing', label: '批量处理简历' },
                { value: 'api_integration', label: 'API集成到现有系统' },
                { value: 'custom_reports', label: '自定义报告模板' },
                { value: 'multi_language', label: '多语言支持' },
                { value: 'team_collaboration', label: '团队协作功能' },
              ],
              required: true,
            },
            {
              id: 'priority_feature',
              type: 'text',
              question: '上述功能中，您最优先需要的是？',
              required: true,
            },
          ],
        },
        {
          id: 'optional',
          title: '可选信息',
          description: '如果您愿意，可以留下联系方式',
          questions: [
            {
              id: 'email',
              type: 'email',
              question: '邮箱地址（可选，用于产品更新通知）',
              required: false,
            },
            {
              id: 'allow_follow_up',
              type: 'boolean',
              question: '是否允许我们就您的反馈进行后续沟通？',
              required: false,
            },
            {
              id: 'participate_in_beta',
              type: 'boolean',
              question: '是否有兴趣参与我们的新功能内测？',
              required: false,
            },
            {
              id: 'additional_feedback',
              type: 'textarea',
              question: '其他想说的话',
              placeholder: '任何其他建议、想法或反馈',
              required: false,
            },
          ],
        },
      ],
      estimatedTime: '3-5分钟',
      reward: '完成问卷可获得5次额外免费使用机会',
      privacy: '您的回答将严格保密，仅用于产品改进',
    };
  }

  /**
   * Performs the submit questionnaire operation.
   * @param submission - The submission.
   * @param request - The request.
   * @returns The result of the operation.
   */
  @Post('submit')
  async submitQuestionnaire(
    @Body() submission: QuestionnaireSubmission,
    @Req() request: Request,
  ) {
    try {
      const clientIP = this.getClientIP(request);

      // 检查是否已经提交过问卷
      const hasSubmitted =
        await this.questionnaireService.hasSubmittedToday(clientIP);
      if (hasSubmitted) {
        throw new HttpException(
          {
            message: '您今天已经提交过问卷了',
            code: 'ALREADY_SUBMITTED_TODAY',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // 验证提交数据
      const validationResult = this.validateSubmission(submission);
      if (!validationResult.isValid) {
        throw new HttpException(
          {
            message: '问卷填写不完整',
            errors: validationResult.errors,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // 保存问卷响应
      const questionnaireId = await this.questionnaireService.saveSubmission({
        ...submission,
        metadata: {
          ip: clientIP,
          userAgent: request.headers['user-agent'],
          timestamp: new Date(),
          source: 'web',
        },
      });

      // 增加IP使用额度
      const usageResult =
        await this.rateLimitMiddleware.completeQuestionnaire(clientIP);

      if (!usageResult.success) {
        // 即使额度增加失败，问卷也已保存，记录错误但不影响用户
        this.logger.error(
          'Failed to increase usage limit after questionnaire completion',
        );
      }

      // 记录完成事件
      await this.questionnaireService.trackEvent({
        ip: clientIP,
        event: 'questionnaire_completed',
        data: {
          questionnaireId,
          newLimit: usageResult.newLimit,
          remaining: usageResult.remaining,
        },
      });

      return {
        success: true,
        message: '感谢您的反馈！已为您增加5次免费使用机会',
        questionnaireId,
        newUsageLimit: {
          total: usageResult.newLimit,
          remaining: usageResult.remaining,
        },
        nextSteps: [
          '您现在可以继续使用AI简历匹配功能',
          '我们会根据您的反馈持续改进产品',
          '如有问题，欢迎联系我们',
        ],
      };
    } catch (error) {
      this.logger.error('Questionnaire submission error', error.stack || error.message);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          message: '提交失败，请稍后重试',
          code: 'SUBMISSION_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retrieves questionnaire stats.
   * @param request - The request.
   * @returns The result of the operation.
   */
  @Get('stats')
  async getQuestionnaireStats(@Req() request: Request) {
    // 简单的管理接口，实际应该加权限验证
    const clientIP = this.getClientIP(request);

    // 基础统计数据
    const stats = await this.questionnaireService.getBasicStats();

    return {
      ...stats,
      requestIP: clientIP, // 用于调试
      message: '这是公开的统计数据，详细数据需要管理权限',
    };
  }

  private validateSubmission(submission: QuestionnaireSubmission): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 必填字段验证
    if (!submission.userProfile?.role) errors.push('用户角色不能为空');
    if (!submission.userProfile?.industry) errors.push('所在行业不能为空');
    if (!submission.userProfile?.companySize) errors.push('公司规模不能为空');
    if (!submission.userProfile?.location) errors.push('工作城市不能为空');

    if (!submission.userExperience?.overallSatisfaction)
      errors.push('整体满意度评分不能为空');
    if (!submission.userExperience?.accuracyRating)
      errors.push('准确性评分不能为空');
    if (!submission.userExperience?.speedRating)
      errors.push('速度评分不能为空');
    if (!submission.userExperience?.uiRating)
      errors.push('界面易用性评分不能为空');
    if (!submission.userExperience?.mostUsefulFeature)
      errors.push('最有用功能不能为空');

    if (!submission.businessValue?.currentScreeningMethod)
      errors.push('当前筛选方式不能为空');
    if (!submission.businessValue?.timeSpentPerResume)
      errors.push('每份简历耗时不能为空');
    if (!submission.businessValue?.resumesPerWeek)
      errors.push('每周简历数量不能为空');
    if (submission.businessValue?.timeSavingPercentage === undefined)
      errors.push('时间节省比例不能为空');
    if (
      !submission.businessValue?.willingnessToPayMonthly &&
      submission.businessValue?.willingnessToPayMonthly !== 0
    )
      errors.push('付费意愿不能为空');
    if (!submission.businessValue?.recommendLikelihood)
      errors.push('推荐可能性评分不能为空');

    if (!submission.featureNeeds?.priorityFeature)
      errors.push('优先功能需求不能为空');

    // 数值范围验证
    const ratings = [
      submission.userExperience?.overallSatisfaction,
      submission.userExperience?.accuracyRating,
      submission.userExperience?.speedRating,
      submission.userExperience?.uiRating,
      submission.businessValue?.recommendLikelihood,
    ];

    ratings.forEach((rating, index) => {
      if (rating && (rating < 1 || rating > 5)) {
        errors.push(`评分必须在1-5之间 (第${index + 1}个评分)`);
      }
    });

    if (
      submission.businessValue?.timeSavingPercentage &&
      (submission.businessValue.timeSavingPercentage < 0 ||
        submission.businessValue.timeSavingPercentage > 100)
    ) {
      errors.push('时间节省比例必须在0-100之间');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.connection.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }
}
