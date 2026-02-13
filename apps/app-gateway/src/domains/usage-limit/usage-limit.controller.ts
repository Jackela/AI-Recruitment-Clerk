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
  BadRequestException,
  UseInterceptors,
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
import { ThrottlerGuard } from '@nestjs/throttler';
import type { UserDto } from '@ai-recruitment-clerk/user-management-domain';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';
import type {
  BonusType,
} from '@ai-recruitment-clerk/usage-management-domain';
import type { UsageLimitIntegrationService } from './usage-limit-integration.service';

interface AuthenticatedRequest extends Request {
  user: UserDto & { id: string; organizationId: string };
}

/**
 * Exposes endpoints for usage limit.
 */
@ApiTags('usage-limits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('usage-limits')
export class UsageLimitController {
  /**
   * Initializes a new instance of the Usage Limit Controller.
   * @param usageLimitService - The usage limit service.
   */
  constructor(
    private readonly usageLimitService: UsageLimitIntegrationService,
  ) {}

  /**
   * Performs the check usage limit operation.
   * @param req - The req.
   * @param ip - The ip.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '检查使用限制状态',
    description: '检查指定IP的使用限制和剩余配额状态',
  })
  @ApiResponse({
    status: 200,
    description: '使用限制状态获取成功',
    schema: {
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            ip: { type: 'string' },
            currentUsage: { type: 'number' },
            availableQuota: { type: 'number' },
            dailyLimit: { type: 'number' },
            bonusQuota: { type: 'number' },
            canUse: { type: 'boolean' },
            resetAt: { type: 'string' },
            usagePercentage: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiQuery({
    name: 'ip',
    required: false,
    description: 'IP地址（管理员可查询任意IP）',
  })
  @Get('check')
  public async checkUsageLimit(
    @Request() req: AuthenticatedRequest,
    @Query('ip') ip?: string,
    ): Promise<{
      success: boolean;
      data?: {
        ip: string;
        currentUsage: number;
        availableQuota: number;
        dailyLimit: number;
        bonusQuota: number;
        canUse: boolean;
        resetAt?: string;
        usagePercentage: number;
        lastActivityAt?: string;
      };
      error?: string;
      message?: string;
    }> {
    try {
      const targetIP =
        ip &&
        // Check admin permissions - UserDto has permissions property
        (req.user as UserDto & { permissions?: string[] }).permissions?.includes('admin')
          ? ip
          : ((req as Request & { socket?: { remoteAddress?: string } }).socket?.remoteAddress ||
            this.getHeaderValue(req.headers, 'x-forwarded-for') ||
            'unknown');

      const checkResult = await this.usageLimitService.checkUsageLimit(
        targetIP,
        req.user.organizationId,
      );

      return {
        success: true,
        data: {
          ip: targetIP,
          currentUsage: checkResult.currentUsage,
          availableQuota: checkResult.availableQuota,
          dailyLimit: checkResult.dailyLimit,
          bonusQuota: checkResult.bonusQuota,
          canUse: checkResult.canUse,
          resetAt: checkResult.resetAt,
          usagePercentage: checkResult.usagePercentage,
          lastActivityAt: checkResult.lastActivityAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to check usage limit',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the record usage operation.
   * @param req - The req.
   * @param usageData - The usage data.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '记录使用',
    description: '记录一次API使用，消耗配额并返回剩余状态',
  })
  @ApiResponse({
    status: 201,
    description: '使用记录成功',
    schema: {
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            currentUsage: { type: 'number' },
            remainingQuota: { type: 'number' },
            usagePercentage: { type: 'number' },
            recordedAt: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 429, description: '使用限制超限' })
  @UseInterceptors(ThrottlerGuard) // Rate limiting protection
  @Post('record')
  @HttpCode(HttpStatus.CREATED)
  public async recordUsage(
    @Request() req: AuthenticatedRequest,
    @Body()
    usageData?: {
      operation?: string;
      metadata?: Record<string, unknown>;
      userIP?: string; // For admin override
    },
  ): Promise<{
      success: boolean;
      data?: {
        currentUsage: number;
        remainingQuota: number;
        usagePercentage: number;
        recordedAt: string;
      };
      error?: string;
      message?: string;
      statusCode?: number;
    }> {
    try {
      const targetIP =
        usageData?.userIP &&
        // Check admin permissions - UserDto has permissions property
        (req.user as UserDto & { permissions?: string[] }).permissions?.includes('admin')
          ? usageData.userIP
          : ((req as Request & { socket?: { remoteAddress?: string } }).socket?.remoteAddress ||
            this.getHeaderValue(req.headers, 'x-forwarded-for') ||
            'unknown');

      const recordResult = await this.usageLimitService.recordUsage(
        targetIP,
        usageData?.operation || 'api_call',
        1,
      );

      if (!recordResult.success) {
        return {
          success: false,
          error: 'Usage limit exceeded',
          message: recordResult.error,
          statusCode: 429,
        };
      }

      return {
        success: true,
        message: 'Usage recorded successfully',
        data: {
          currentUsage: recordResult.currentUsage,
          remainingQuota: recordResult.remainingQuota,
          usagePercentage: Math.round(
            ((recordResult.currentUsage ?? 0) /
              ((recordResult.currentUsage ?? 0) + (recordResult.remainingQuota ?? 1))) *
              100,
          ),
          recordedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to record usage',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the add bonus quota operation.
   * @param req - The req.
   * @param bonusData - The bonus data.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '添加奖励配额',
    description: '为指定IP添加奖励配额，如问卷完成奖励或推荐奖励',
  })
  @ApiResponse({ status: 201, description: '奖励配额添加成功' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.MANAGE_QUOTAS)
  @Post('bonus')
  @HttpCode(HttpStatus.CREATED)
  public async addBonusQuota(
    @Request() req: AuthenticatedRequest,
    @Body()
    bonusData: {
      ip?: string;
      bonusType: BonusType;
      amount: number;
      reason: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<{
      success: boolean;
      message?: string;
      data?: {
        ip: string;
        bonusType: BonusType;
        bonusAmount: number;
        newTotalQuota: number;
        reason: string;
        grantedBy: string;
        grantedAt: string;
      };
      error?: string;
    }> {
    try {
      const targetIP =
        bonusData.ip ||
        ((req as Request & { socket?: { remoteAddress?: string } }).socket?.remoteAddress ||
          this.getHeaderValue(req.headers, 'x-forwarded-for') ||
            'unknown');

      // Validate bonus amount
      if (bonusData.amount <= 0 || bonusData.amount > 50) {
        throw new BadRequestException('Bonus amount must be between 1 and 50');
      }

      const bonusResult = await this.usageLimitService.addBonusQuota(
        targetIP,
        bonusData.bonusType,
        bonusData.amount,
      );

      return {
        success: true,
        message: 'Bonus quota added successfully',
        data: {
          ip: targetIP,
          bonusType: bonusData.bonusType,
          bonusAmount: bonusData.amount,
          newTotalQuota: bonusResult.newTotalQuota,
          reason: bonusData.reason,
          grantedBy: req.user.id,
          grantedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to add bonus quota',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Retrieves usage limits.
   * @param req - The req.
   * @param page - The page.
   * @param limit - The limit.
   * @param sortBy - The sort by.
   * @param filterBy - The filter by.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '获取使用限制列表',
    description: '获取组织的所有IP使用限制记录（管理员功能）',
  })
  @ApiResponse({ status: 200, description: '使用限制列表获取成功' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['usage', 'quota', 'lastActivity'],
    description: '排序方式',
  })
  @ApiQuery({
    name: 'filterBy',
    required: false,
    enum: ['exceeded', 'active', 'bonus'],
    description: '筛选条件',
  })
  @UseGuards(RolesGuard)
  @Permissions(Permission.READ_USAGE_LIMITS)
  @Get()
  public async getUsageLimits(
    @Request() req: AuthenticatedRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('sortBy') sortBy = 'lastActivity',
    @Query('filterBy') filterBy?: string,
  ): Promise<{
      success: boolean;
      data?: {
        usageLimits: unknown[];
        totalCount: number;
        page: number;
        totalPages: number;
        hasNext: boolean;
        summary: {
          totalIPs: number;
          averageUsage: number;
          exceedingLimitCount: number;
          totalBonusQuotaGranted: number;
        };
      };
      error?: string;
      message?: string;
    }> {
    try {
      const usageLimits = await this.usageLimitService.getUsageLimits(
        req.user.organizationId,
        {
          page: Math.max(page, 1),
          limit: Math.min(limit, 100),
          sortBy,
          filterBy,
        },
      );

      return {
        success: true,
        data: {
          usageLimits: usageLimits.items,
          totalCount: usageLimits.totalCount,
          page: page,
          totalPages: Math.ceil(usageLimits.totalCount / limit),
          hasNext: page * limit < usageLimits.totalCount,
          summary: {
            totalIPs: usageLimits.totalCount,
            averageUsage: usageLimits.averageUsage,
            exceedingLimitCount: usageLimits.exceedingLimitCount,
            totalBonusQuotaGranted: usageLimits.totalBonusQuotaGranted,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve usage limits',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Retrieves usage limit detail.
   * @param req - The req.
   * @param ip - The ip.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '获取特定IP使用详情',
    description: '获取指定IP的详细使用历史和配额信息',
  })
  @ApiResponse({ status: 200, description: 'IP使用详情获取成功' })
  @ApiResponse({ status: 404, description: '使用记录未找到' })
  @ApiParam({ name: 'ip', description: 'IP地址' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.READ_USAGE_DETAILS)
  @Get(':ip')
  public async getUsageLimitDetail(
    @Request() req: AuthenticatedRequest,
    @Param('ip') ip: string,
  ): Promise<{
      success: boolean;
      data?: unknown;
      error?: string;
      message?: string;
    }> {
    try {
      const usageDetail = await this.usageLimitService.getUsageLimitDetail(
        ip,
        req.user.organizationId,
      );

      if (!usageDetail) {
        throw new NotFoundException('Usage limit record not found for this IP');
      }

      return {
        success: true,
        data: usageDetail,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve usage limit detail',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Updates usage limit policy.
   * @param req - The req.
   * @param policyData - The policy data.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '更新使用限制策略',
    description: '配置组织的默认使用限制策略和配额设置',
  })
  @ApiResponse({ status: 200, description: '使用限制策略更新成功' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.MANAGE_USAGE_POLICY)
  @Put('policy')
  @HttpCode(HttpStatus.OK)
  public async updateUsageLimitPolicy(
    @Request() req: AuthenticatedRequest,
    @Body()
    policyData: {
      dailyLimit: number;
      bonusEnabled: boolean;
      maxBonusQuota: number;
      resetTimeUTC: number;
      rateLimitingEnabled: boolean;
      rateLimitRpm: number; // Requests per minute
    },
  ): Promise<{
      success: boolean;
      message?: string;
      data?: {
        configId: string;
        configuration: unknown;
        policy: unknown;
        updatedBy: string;
        updatedAt: string;
        affectedIPs?: number;
        effectiveFrom: string;
      };
      error?: string;
    }> {
    try {
      // Validate policy data
      if (policyData.dailyLimit < 1 || policyData.dailyLimit > 100) {
        throw new BadRequestException('Daily limit must be between 1 and 100');
      }

      if (policyData.resetTimeUTC < 0 || policyData.resetTimeUTC > 23) {
        throw new BadRequestException(
          'Reset time must be between 0 and 23 hours',
        );
      }

      const updatedPolicy = await this.usageLimitService.updateUsageLimitPolicy(
        req.user.organizationId,
        policyData,
        req.user.id,
      );

      return {
        success: true,
        message: 'Usage limit policy updated successfully',
        data: {
          configId: `policy_${req.user.organizationId}`,
          configuration: policyData,
          policy: updatedPolicy.policy,
          updatedBy: req.user.id,
          updatedAt: updatedPolicy.updatedAt?.toISOString() || new Date().toISOString(),
          affectedIPs: updatedPolicy.affectedIPCount,
          effectiveFrom: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update usage limit policy',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the reset usage limit operation.
   * @param req - The req.
   * @param ip - The ip.
   * @param resetData - The reset data.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '重置使用记录',
    description: '管理员手动重置指定IP的使用记录和配额',
  })
  @ApiResponse({ status: 200, description: '使用记录重置成功' })
  @ApiParam({ name: 'ip', description: 'IP地址' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.ADMIN)
  @Post(':ip/reset')
  @HttpCode(HttpStatus.OK)
  public async resetUsageLimit(
    @Request() req: AuthenticatedRequest,
    @Param('ip') ip: string,
    @Body()
    resetData: {
      reason: string;
      resetQuota?: boolean;
      newQuotaAmount?: number;
    },
  ): Promise<{
      success: boolean;
      message?: string;
      data?: {
        ip: string;
        previousUsage: number;
        newUsage: number;
        previousQuota: number;
        newQuota: number;
        reason: string;
        resetBy: string;
        resetAt: string;
      };
      error?: string;
    }> {
    try {
      const resetResult = await this.usageLimitService.resetUsageLimit(
        ip,
        req.user.organizationId,
        {
          reason: resetData.reason,
          resetBy: req.user.id,
          resetQuota: resetData.resetQuota || false,
          newQuotaAmount: resetData.newQuotaAmount,
        },
      );

      return {
        success: true,
        message: 'Usage limit reset successfully',
        data: {
          ip: ip,
          previousUsage: resetResult.previousUsage,
          newUsage: resetResult.newUsage,
          previousQuota: resetResult.previousQuota,
          newQuota: resetResult.newQuota,
          reason: resetData.reason,
          resetBy: req.user.id,
          resetAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to reset usage limit',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the batch manage usage limits operation.
   * @param req - The req.
   * @param batchRequest - The batch request.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '批量操作使用限制',
    description: '批量重置、添加配额或更新多个IP的使用限制',
  })
  @ApiResponse({ status: 200, description: '批量操作完成' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.MANAGE_QUOTAS)
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  public async batchManageUsageLimits(
    @Request() req: AuthenticatedRequest,
    @Body()
    batchRequest: {
      ips: string[];
      action: 'reset' | 'add_bonus' | 'update_quota';
      parameters: {
        reason?: string;
        bonusType?: BonusType;
        bonusAmount?: number;
        newQuotaAmount?: number;
      };
    },
  ): Promise<{
      success: boolean;
      message?: string;
      data?: {
        totalProcessed: number;
        successful: number;
        failed: number;
        results: unknown[];
        action: string;
        operatedBy: string;
      };
      error?: string;
    }> {
    try {
      const batchResult = await this.usageLimitService.batchManageUsageLimits(
        batchRequest.ips,
        batchRequest.action,
        req.user.organizationId,
        {
          ...batchRequest.parameters,
          operatedBy: req.user.id,
        },
      );

      return {
        success: true,
        message: 'Batch operation completed',
        data: {
          totalProcessed: batchResult.totalProcessed,
          successful: batchResult.successful,
          failed: batchResult.failed,
          results: batchResult.results,
          action: batchRequest.action,
          operatedBy: req.user.id,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Batch operation failed',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Retrieves usage statistics.
   * @param req - The req.
   * @param timeRange - The time range.
   * @param groupBy - The group by.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '获取使用统计数据',
    description: '获取组织的使用限制系统统计和分析数据',
  })
  @ApiResponse({ status: 200, description: '使用统计获取成功' })
  @ApiQuery({
    name: 'timeRange',
    required: false,
    enum: ['24h', '7d', '30d'],
    description: '时间范围',
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    enum: ['hour', 'day'],
    description: '分组方式',
  })
  @UseGuards(RolesGuard)
  @Permissions(Permission.READ_ANALYTICS)
  @Get('stats/overview')
  public async getUsageStatisticsOverview(
    @Request() req: AuthenticatedRequest,
    @Query('timeRange') timeRange = '7d',
    @Query('groupBy') groupBy = 'day',
  ): Promise<{
      success: boolean;
      data?: {
        overview: {
          totalActiveIPs: number;
          totalUsage: number;
          averageUsagePerIP: number;
          quotaUtilizationRate: number;
        };
        quotaDistribution: unknown;
        bonusQuotaStats: unknown;
        usagePatterns: unknown;
        peakUsageTimes: unknown;
        trendsOverTime: unknown;
      };
      error?: string;
      message?: string;
    }> {
    try {
      const statistics = await this.usageLimitService.getUsageStatistics(
        req.user.organizationId,
        timeRange,
        groupBy,
      );

      return {
        success: true,
        data: {
          overview: {
            totalActiveIPs: statistics.totalActiveIPs,
            totalUsage: statistics.totalUsage,
            averageUsagePerIP: statistics.averageUsagePerIP,
            quotaUtilizationRate: statistics.quotaUtilizationRate,
          },
          quotaDistribution: statistics.quotaDistribution,
          bonusQuotaStats: statistics.bonusQuotaStats,
          usagePatterns: statistics.usagePatterns,
          peakUsageTimes: statistics.peakUsageTimes,
          trendsOverTime: statistics.trendsOverTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve usage statistics',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the export usage data operation.
   * @param req - The req.
   * @param format - The format.
   * @param exportRequest - The export request.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '导出使用限制数据',
    description: '导出组织的使用限制数据为CSV或Excel格式',
  })
  @ApiResponse({ status: 200, description: '数据导出成功' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'excel'],
    description: '导出格式',
  })
  @UseGuards(RolesGuard)
  @Permissions(Permission.EXPORT_QUESTIONNAIRE_DATA)
  @Post('export')
  @HttpCode(HttpStatus.OK)
  public async exportUsageData(
    @Request() req: AuthenticatedRequest,
    @Query('format') format: 'csv' | 'excel' = 'csv',
    @Body()
    exportRequest: {
      dateRange?: { startDate: string; endDate: string };
      includeUsageHistory?: boolean;
      includeBonusHistory?: boolean;
      filterByExceededLimits?: boolean;
    },
  ): Promise<{
      success: boolean;
      message?: string;
      data?: {
        exportId: string;
        format: string;
        estimatedTime: string;
        downloadUrl: string;
        expiresAt: string;
      };
      error?: string;
    }> {
    try {
      const exportResult = await this.usageLimitService.exportUsageData(
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
        error: 'Failed to export usage data',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the configure rate limiting operation.
   * @param req - The req.
   * @param rateLimitConfig - The rate limit config.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '设置速率限制',
    description: '配置API速率限制参数和阈值',
  })
  @ApiResponse({ status: 200, description: '速率限制配置成功' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.ADMIN)
  @Put('rate-limiting')
  @HttpCode(HttpStatus.OK)
  public async configureRateLimiting(
    @Request() req: AuthenticatedRequest,
    @Body()
    rateLimitConfig: {
      enabled: boolean;
      requestsPerMinute: number;
      requestsPerHour: number;
      burstLimit: number;
      windowSizeMinutes: number;
      blockDurationMinutes: number;
    },
  ): Promise<{
      success: boolean;
      message?: string;
      data?: {
        configId: string;
        configuration: unknown;
        updatedBy: string;
        updatedAt: string;
        effectiveFrom: string;
      };
      error?: string;
    }> {
    try {
      const config = await this.usageLimitService.configureRateLimiting(
        req.user.organizationId,
        rateLimitConfig,
        req.user.id,
      );

      return {
        success: true,
        message: 'Rate limiting configuration updated successfully',
        data: {
          configId: config.configId,
          configuration: config.configuration,
          updatedBy: req.user.id,
          updatedAt: config.updatedAt,
          effectiveFrom: config.effectiveFrom,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to configure rate limiting',
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
    description: '检查使用限制系统的健康状态和性能指标',
  })
  @ApiResponse({ status: 200, description: '服务状态' })
  @Get('health')
  public async healthCheck(): Promise<{
      status: string;
      timestamp: string;
      service: string;
      details?: {
        database: string;
        redis: string;
        rateLimiting: string;
        quotaSystem: string;
        performanceMetrics: {
          averageResponseTime: number;
          requestsPerSecond: number;
          errorRate: number;
        };
      };
      error?: string;
    }> {
    try {
      const health = await this.usageLimitService.getHealthStatus();

      return {
        status: health.overall,
        timestamp: new Date().toISOString(),
        service: 'usage-limits',
        details: {
          database: health.database,
          redis: health.redis,
          rateLimiting: health.rateLimiting,
          quotaSystem: health.quotaSystem,
          performanceMetrics: {
            averageResponseTime: health.averageResponseTime,
            requestsPerSecond: health.requestsPerSecond,
            errorRate: health.errorRate,
          },
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'usage-limits',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Safely gets a header value, handling string | string[] | undefined.
   * @param headers - The headers object.
   * @param name - The header name.
   * @returns The header value as a string or undefined.
   */
  private getHeaderValue(
    headers: Record<string, string | string[] | undefined> | Headers,
    name: string,
  ): string | undefined {
    if (headers instanceof Headers) {
      const value = headers.get(name);
      return value ?? undefined;
    }
    const value = headers[name];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }
}
