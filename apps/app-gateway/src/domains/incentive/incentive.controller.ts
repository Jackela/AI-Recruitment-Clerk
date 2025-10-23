import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import {
  IncentiveStatus,
  RewardType,
  PaymentMethod,
  ContactInfo,
} from '../../common/interfaces/fallback-types';
import { AuthenticatedRequest } from '@ai-recruitment-clerk/user-management-domain';
import { IncentiveIntegrationService } from './incentive-integration.service';

// Use shared AuthenticatedRequest type with required user.id and user.organizationId

/**
 * Exposes endpoints for incentive.
 */
@ApiTags('incentive-system')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('incentives')
export class IncentiveController {
  /**
   * Initializes a new instance of the Incentive Controller.
   * @param incentiveService - The incentive service.
   */
  constructor(private readonly incentiveService: IncentiveIntegrationService) {}

  /**
   * Creates questionnaire incentive.
   * @param req - The req.
   * @param incentiveData - The incentive data.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '创建问卷完成激励',
    description: '基于问卷完成情况和质量评分创建激励奖励',
  })
  @ApiResponse({
    status: 201,
    description: '激励创建成功',
    schema: {
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            incentiveId: { type: 'string' },
            rewardAmount: { type: 'number' },
            currency: { type: 'string' },
            status: { type: 'string' },
            canBePaid: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @UseGuards(RolesGuard)
  @Permissions('create_job' as any)
  @Post('questionnaire')
  @HttpCode(HttpStatus.CREATED)
  async createQuestionnaireIncentive(
    @Request() req: AuthenticatedRequest,
    @Body()
    incentiveData: {
      questionnaireId: string;
      qualityScore: number;
      contactInfo: {
        email?: string;
        phone?: string;
        wechat?: string;
        alipay?: string;
      };
      userIP?: string;
      businessValue?: any;
      incentiveType?: string;
      metadata?: any;
    },
  ) {
    try {
      const fwd = req.headers['x-forwarded-for'];
      const normalizedIP = Array.isArray(fwd) ? fwd[0] : fwd;
      const userIP = String(
        incentiveData.userIP ||
          normalizedIP ||
          (req.socket as any)?.remoteAddress ||
          'unknown',
      );
      const contactInfo = new ContactInfo(incentiveData.contactInfo);

      const incentive =
        await this.incentiveService.createQuestionnaireIncentive(
          userIP,
          incentiveData.questionnaireId,
          incentiveData.qualityScore,
          contactInfo,
          incentiveData.businessValue || {},
          incentiveData.incentiveType || 'questionnaire',
          {
            organizationId: req.user.organizationId,
            ...incentiveData.metadata,
          },
        );

      const summary = {
        id: incentive.id,
        type: incentive.type,
        status: incentive.status,
        createdAt: incentive.createdAt,
        rewardAmount: 0,
        rewardCurrency: 'USD',
        canBePaid: false,
      };

      return {
        success: true,
        message: 'Questionnaire incentive created successfully',
        data: {
          incentiveId: summary.id,
          rewardAmount: summary.rewardAmount,
          currency: summary.rewardCurrency,
          status: summary.status,
          canBePaid: summary.canBePaid,
          createdAt: summary.createdAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create questionnaire incentive',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Creates referral incentive.
   * @param req - The req.
   * @param referralData - The referral data.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '创建推荐激励',
    description: '为成功推荐新用户的推荐人创建激励奖励',
  })
  @ApiResponse({ status: 201, description: '推荐激励创建成功' })
  @UseGuards(RolesGuard)
  @Permissions('create_job' as any)
  @Post('referral')
  @HttpCode(HttpStatus.CREATED)
  async createReferralIncentive(
    @Request() req: AuthenticatedRequest,
    @Body()
    referralData: {
      referrerIP: string;
      referredIP: string;
      contactInfo: {
        email?: string;
        phone?: string;
        wechat?: string;
        alipay?: string;
      };
      referralType?: string;
      expectedValue?: number;
      metadata?: any;
    },
  ) {
    try {
      const contactInfo = new ContactInfo(referralData.contactInfo);

      const incentive = await this.incentiveService.createReferralIncentive(
        referralData.referrerIP,
        referralData.referredIP,
        contactInfo,
        referralData.referralType || 'general',
        referralData.expectedValue || 0,
        { organizationId: req.user.organizationId, ...referralData.metadata },
      );

      const summary = {
        id: incentive.id,
        type: incentive.type,
        status: incentive.status,
        createdAt: incentive.createdAt,
        rewardAmount: incentive.expectedValue || 0,
        rewardCurrency: 'USD',
        canBePaid: false,
      };

      return {
        success: true,
        message: 'Referral incentive created successfully',
        data: {
          incentiveId: summary.id,
          rewardAmount: summary.rewardAmount,
          currency: summary.rewardCurrency,
          status: summary.status,
          canBePaid: summary.canBePaid,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create referral incentive',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Retrieves incentives.
   * @param req - The req.
   * @param page - The page.
   * @param limit - The limit.
   * @param status - The status.
   * @param rewardType - The reward type.
   * @param startDate - The start date.
   * @param endDate - The end date.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '获取激励列表',
    description: '获取组织的激励记录列表，支持分页和筛选',
  })
  @ApiResponse({ status: 200, description: '激励列表获取成功' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: IncentiveStatus,
    description: '状态筛选',
  })
  @ApiQuery({
    name: 'rewardType',
    required: false,
    enum: RewardType,
    description: '奖励类型筛选',
  })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @UseGuards(RolesGuard)
  @Permissions('read_job' as any)
  @Get()
  async getIncentives(
    @Request() req: AuthenticatedRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: IncentiveStatus,
    @Query('rewardType') rewardType?: RewardType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const incentives = await this.incentiveService.getIncentives(
        req.user.organizationId,
        {
          status,
          type: rewardType,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          limit: Math.min(limit, 100),
          offset: (Math.max(page, 1) - 1) * Math.min(limit, 100),
        },
      );

      return {
        success: true,
        data: {
          incentives: incentives.items,
          totalCount: incentives.totalCount,
          totalRewardAmount: incentives.totalRewardAmount,
          page: page,
          totalPages: Math.ceil(incentives.totalCount / limit),
          hasNext: page * limit < incentives.totalCount,
          summary: {
            byStatus: (incentives as any).statusDistribution || {},
            byRewardType: (incentives as any).rewardTypeDistribution || {},
            avgRewardAmount:
              (incentives as any).avgRewardAmount ||
              incentives.totalRewardAmount / (incentives.totalCount || 1),
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve incentives',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Retrieves incentive.
   * @param req - The req.
   * @param incentiveId - The incentive id.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '获取激励详情',
    description: '获取指定激励的详细信息，包括所有相关数据',
  })
  @ApiResponse({ status: 200, description: '激励详情获取成功' })
  @ApiResponse({ status: 404, description: '激励未找到' })
  @ApiParam({ name: 'incentiveId', description: '激励ID' })
  @UseGuards(RolesGuard)
  @Permissions('read_job' as any)
  @Get(':incentiveId')
  async getIncentive(
    @Request() req: AuthenticatedRequest,
    @Param('incentiveId') incentiveId: string,
  ) {
    try {
      const incentive = await this.incentiveService.getIncentive(
        incentiveId,
        req.user.organizationId,
      );

      if (!incentive) {
        throw new NotFoundException('Incentive not found');
      }

      return {
        success: true,
        data: incentive,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve incentive',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validates incentive.
   * @param req - The req.
   * @param incentiveId - The incentive id.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '验证激励资格',
    description: '验证指定激励的资格和状态，检查是否符合支付条件',
  })
  @ApiResponse({ status: 200, description: '激励验证成功' })
  @ApiParam({ name: 'incentiveId', description: '激励ID' })
  @UseGuards(RolesGuard)
  @Permissions('validate_incentive' as any)
  @Post(':incentiveId/validate')
  @HttpCode(HttpStatus.OK)
  async validateIncentive(
    @Request() req: AuthenticatedRequest,
    @Param('incentiveId') incentiveId: string,
  ) {
    try {
      const validationResult = await this.incentiveService.validateIncentive(
        incentiveId,
        req.user.organizationId,
      );

      return {
        success: true,
        data: {
          incentiveId,
          isValid: validationResult.isValid,
          errors: validationResult.errors,
          canProceedToPayment: validationResult.canProceedToPayment,
          validatedAt: new Date().toISOString(),
          validatedBy: req.user.id,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to validate incentive',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the approve incentive operation.
   * @param req - The req.
   * @param incentiveId - The incentive id.
   * @param approvalData - The approval data.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '批准激励',
    description: '管理员批准激励进行支付处理',
  })
  @ApiResponse({ status: 200, description: '激励批准成功' })
  @ApiParam({ name: 'incentiveId', description: '激励ID' })
  @UseGuards(RolesGuard)
  @Permissions('approve_incentive' as any)
  @Put(':incentiveId/approve')
  @HttpCode(HttpStatus.OK)
  async approveIncentive(
    @Request() req: AuthenticatedRequest,
    @Param('incentiveId') incentiveId: string,
    @Body()
    approvalData: {
      reason: string;
      notes?: string;
    },
  ) {
    try {
      await this.incentiveService.approveIncentive(incentiveId, {
        reason: approvalData.reason,
        approverId: req.user.id,
        organizationId: req.user.organizationId,
        notes: approvalData.notes,
      });

      return {
        success: true,
        message: 'Incentive approved successfully',
        data: {
          incentiveId,
          approvedAt: new Date().toISOString(),
          approvedBy: req.user.id,
          reason: approvalData.reason,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to approve incentive',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the reject incentive operation.
   * @param req - The req.
   * @param incentiveId - The incentive id.
   * @param rejectionData - The rejection data.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '拒绝激励',
    description: '管理员拒绝激励支付申请',
  })
  @ApiResponse({ status: 200, description: '激励拒绝成功' })
  @ApiParam({ name: 'incentiveId', description: '激励ID' })
  @UseGuards(RolesGuard)
  @Permissions('reject_incentive' as any)
  @Put(':incentiveId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectIncentive(
    @Request() req: AuthenticatedRequest,
    @Param('incentiveId') incentiveId: string,
    @Body()
    rejectionData: {
      reason: string;
      notes?: string;
    },
  ) {
    try {
      await this.incentiveService.rejectIncentive(
        incentiveId,
        rejectionData.reason,
        req.user.id,
        req.user.organizationId,
        rejectionData.notes,
      );

      return {
        success: true,
        message: 'Incentive rejected successfully',
        data: {
          incentiveId,
          rejectedAt: new Date().toISOString(),
          rejectedBy: req.user.id,
          reason: rejectionData.reason,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to reject incentive',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the process payment operation.
   * @param req - The req.
   * @param incentiveId - The incentive id.
   * @param paymentData - The payment data.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '执行激励支付',
    description: '对已批准的激励执行实际支付操作',
  })
  @ApiResponse({
    status: 200,
    description: '支付执行成功',
    schema: {
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            incentiveId: { type: 'string' },
            transactionId: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            paymentMethod: { type: 'string' },
            paidAt: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiParam({ name: 'incentiveId', description: '激励ID' })
  @UseGuards(RolesGuard)
  @Permissions('process_payment' as any)
  @Post(':incentiveId/pay')
  @HttpCode(HttpStatus.OK)
  async processPayment(
    @Request() req: AuthenticatedRequest,
    @Param('incentiveId') incentiveId: string,
    @Body()
    paymentData: {
      paymentMethod: PaymentMethod;
      transactionRef?: string;
      notes?: string;
    },
  ) {
    try {
      const paymentResult = await this.incentiveService.processPayment(
        incentiveId,
        paymentData.paymentMethod,
        req.user.id,
        req.user.organizationId,
        {
          transactionRef: paymentData.transactionRef,
          notes: paymentData.notes,
        },
      );

      return {
        success: paymentResult.success,
        message: paymentResult.success
          ? 'Payment processed successfully'
          : 'Payment processing failed',
        data: paymentResult.success
          ? {
              incentiveId,
              transactionId: paymentResult.transactionId,
              amount: paymentResult.amount,
              currency: paymentResult.currency,
              paymentMethod: paymentData.paymentMethod,
              paidAt: new Date().toISOString(),
              processedBy: req.user.id,
            }
          : undefined,
        error: paymentResult.success ? undefined : paymentResult.error,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to process payment',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the batch process incentives operation.
   * @param req - The req.
   * @param batchRequest - The batch request.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '批量处理激励',
    description: '批量操作多个激励（批准、拒绝、支付等）',
  })
  @ApiResponse({ status: 200, description: '批量处理完成' })
  @UseGuards(RolesGuard)
  @Permissions('batch_process_incentive' as any)
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  async batchProcessIncentives(
    @Request() req: AuthenticatedRequest,
    @Body()
    batchRequest: {
      incentiveIds: string[];
      action: 'approve' | 'reject' | 'pay';
      reason: string;
      paymentMethod?: PaymentMethod;
      notes?: string;
    },
  ) {
    try {
      const batchResult = await this.incentiveService.batchProcessIncentives(
        batchRequest.incentiveIds,
        batchRequest.action,
        req.user.id,
        req.user.organizationId,
        {
          reason: batchRequest.reason,
          paymentMethod: batchRequest.paymentMethod,
          notes: batchRequest.notes,
        },
      );

      return {
        success: true,
        message: 'Batch processing completed',
        data: {
          totalProcessed: batchResult.totalProcessed,
          successful: batchResult.successful,
          failed: batchResult.failed,
          results: batchResult.results,
          action: batchRequest.action,
          processedBy: req.user.id,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Batch processing failed',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Retrieves incentive statistics.
   * @param req - The req.
   * @param timeRange - The time range.
   * @param groupBy - The group by.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '获取激励统计数据',
    description: '获取组织的激励系统统计数据和分析报告',
  })
  @ApiResponse({ status: 200, description: '统计数据获取成功' })
  @ApiQuery({
    name: 'timeRange',
    required: false,
    enum: ['7d', '30d', '90d', '1y'],
    description: '时间范围',
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    enum: ['day', 'week', 'month'],
    description: '分组方式',
  })
  @UseGuards(RolesGuard)
  @Permissions('read_incentive_stats' as any)
  @Get('stats/overview')
  async getIncentiveStatistics(
    @Request() req: AuthenticatedRequest,
    @Query('timeRange') timeRange = '30d',
    @Query('groupBy') groupBy = 'day',
  ) {
    try {
      const statistics = await this.incentiveService.getIncentiveStatistics(
        req.user.organizationId,
        timeRange,
        groupBy,
      );

      return {
        success: true,
        data: {
          overview: {
            totalIncentives: statistics.totalIncentives,
            totalRewardAmount: statistics.totalRewardAmount,
            avgRewardAmount: statistics.avgRewardAmount,
            conversionRate: statistics.conversionRate,
          },
          statusDistribution: statistics.statusDistribution,
          rewardTypeDistribution: statistics.rewardTypeDistribution,
          paymentMethodDistribution: statistics.paymentMethodDistribution,
          trends: statistics.trends,
          topPerformers: statistics.topPerformers,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve incentive statistics',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the export incentive data operation.
   * @param req - The req.
   * @param format - The format.
   * @param exportRequest - The export request.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '导出激励数据',
    description: '导出激励数据为CSV或Excel格式',
  })
  @ApiResponse({ status: 200, description: '数据导出成功' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'excel'],
    description: '导出格式',
  })
  @UseGuards(RolesGuard)
  @Permissions('export_incentive_data' as any)
  @Post('export')
  @HttpCode(HttpStatus.OK)
  async exportIncentiveData(
    @Request() req: AuthenticatedRequest,
    @Query('format') format: 'csv' | 'excel' = 'csv',
    @Body()
    exportRequest: {
      dateRange?: { startDate: string; endDate: string };
      status?: IncentiveStatus[];
      rewardTypes?: RewardType[];
      includeContactInfo?: boolean;
    },
  ) {
    try {
      const exportResult = await this.incentiveService.exportIncentiveData(
        req.user.organizationId,
        {
          ...exportRequest,
          format,
          requestedBy: req.user.id,
          dateRange: exportRequest.dateRange
            ? {
                startDate: new Date(exportRequest.dateRange.startDate),
                endDate: new Date(exportRequest.dateRange.endDate),
              }
            : undefined,
        },
      );

      return {
        success: true,
        message: 'Data export started successfully',
        data: {
          exportId: exportResult.exportId,
          format: format,
          estimatedTime: exportResult.estimatedTime,
          downloadUrl: exportResult.downloadUrl,
          expiresAt: exportResult.expiresAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to export incentive data',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the configure incentive rules operation.
   * @param req - The req.
   * @param rulesConfig - The rules config.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '配置激励规则',
    description: '配置组织的激励奖励规则和阈值',
  })
  @ApiResponse({ status: 200, description: '激励规则配置成功' })
  @UseGuards(RolesGuard)
  @Permissions('manage_incentive_rules' as any)
  @Put('rules')
  @HttpCode(HttpStatus.OK)
  async configureIncentiveRules(
    @Request() req: AuthenticatedRequest,
    @Body()
    rulesConfig: {
      questionnaireRules: {
        minQualityScore: number;
        rewardTiers: Array<{
          minScore: number;
          maxScore: number;
          rewardAmount: number;
        }>;
      };
      referralRules: {
        rewardAmount: number;
        maxReferralsPerIP: number;
      };
      paymentRules: {
        minPayoutAmount: number;
        maxPayoutAmount: number;
        autoApprovalThreshold: number;
      };
      enabled: boolean;
    },
  ) {
    try {
      const config = await this.incentiveService.configureIncentiveRules(
        req.user.organizationId,
        rulesConfig,
        req.user.id,
      );

      return {
        success: true,
        message: 'Incentive rules configured successfully',
        data: {
          configId: config.configId,
          rules: config.rules,
          updatedBy: req.user.id,
          updatedAt: config.updatedAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to configure incentive rules',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the health check operation.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '服务健康检查',
    description: '检查激励系统服务的健康状态',
  })
  @ApiResponse({ status: 200, description: '服务状态' })
  @Get('health')
  async healthCheck() {
    try {
      const health = await this.incentiveService.getHealthStatus();

      return {
        status: health.overall,
        timestamp: new Date().toISOString(),
        service: 'incentive-system',
        details: {
          database: health.database,
          paymentProcessor: health.paymentProcessor,
          ruleEngine: health.ruleEngine,
          eventProcessing: health.eventProcessing,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'incentive-system',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
