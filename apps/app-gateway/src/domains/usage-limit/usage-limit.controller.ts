import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UseInterceptors
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UserDto, Permission } from '@ai-recruitment-clerk/user-management-domain';
import { BonusType, UsageStatistics, UsageLimitPolicy } from '@ai-recruitment-clerk/usage-management-domain';
import { UsageLimitIntegrationService } from './usage-limit-integration.service';

interface AuthenticatedRequest extends Request {
  user: UserDto;
}

@ApiTags('usage-limits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('usage-limits')
export class UsageLimitController {
  constructor(private readonly usageLimitService: UsageLimitIntegrationService) {}

  @ApiOperation({
    summary: '检查使用限制状态',
    description: '检查指定IP的使用限制和剩余配额状态'
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
            usagePercentage: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiQuery({ name: 'ip', required: false, description: 'IP地址（管理员可查询任意IP）' })
  @Get('check')
  async checkUsageLimit(
    @Request() req: AuthenticatedRequest,
    @Query('ip') ip?: string
  ) {
    try {
      const targetIP = ip && (req.user as any).permissions?.includes('admin') 
        ? ip 
        : (req as any).socket?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';

      const checkResult = await this.usageLimitService.checkUsageLimit(
        targetIP,
        req.user.organizationId
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
          lastActivityAt: checkResult.lastActivityAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to check usage limit',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '记录使用',
    description: '记录一次API使用，消耗配额并返回剩余状态'
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
            recordedAt: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 429, description: '使用限制超限' })
  @UseInterceptors(ThrottlerGuard) // Rate limiting protection
  @Post('record')
  @HttpCode(HttpStatus.CREATED)
  async recordUsage(
    @Request() req: AuthenticatedRequest,
    @Body() usageData?: {
      operation?: string;
      metadata?: any;
      userIP?: string; // For admin override
    }
  ) {
    try {
      const targetIP = usageData?.userIP && (req.user as any).permissions?.includes('admin')
        ? usageData.userIP
        : (req as any).socket?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';

      const recordResult = await this.usageLimitService.recordUsage(
        targetIP,
        usageData?.operation || 'api_call',
        1
      );

      if (!recordResult.success) {
        return {
          success: false,
          error: 'Usage limit exceeded',
          message: recordResult.error,
          statusCode: 429
        };
      }

      return {
        success: true,
        message: 'Usage recorded successfully',
        data: {
          currentUsage: recordResult.currentUsage,
          remainingQuota: recordResult.remainingQuota,
          usagePercentage: Math.round((recordResult.currentUsage! / (recordResult.currentUsage! + recordResult.remainingQuota!)) * 100),
          recordedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to record usage',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '添加奖励配额',
    description: '为指定IP添加奖励配额，如问卷完成奖励或推荐奖励'
  })
  @ApiResponse({ status: 201, description: '奖励配额添加成功' })
  @UseGuards(RolesGuard)
  @Permissions('manage_quotas' as any)
  @Post('bonus')
  @HttpCode(HttpStatus.CREATED)
  async addBonusQuota(
    @Request() req: AuthenticatedRequest,
    @Body() bonusData: {
      ip?: string;
      bonusType: BonusType;
      amount: number;
      reason: string;
      metadata?: any;
    }
  ) {
    try {
      const targetIP = bonusData.ip || (req as any).socket?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
      
      // Validate bonus amount
      if (bonusData.amount <= 0 || bonusData.amount > 50) {
        throw new BadRequestException('Bonus amount must be between 1 and 50');
      }

      const bonusResult = await this.usageLimitService.addBonusQuota(
        targetIP,
        bonusData.bonusType,
        bonusData.amount
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
          grantedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to add bonus quota',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '获取使用限制列表',
    description: '获取组织的所有IP使用限制记录（管理员功能）'
  })
  @ApiResponse({ status: 200, description: '使用限制列表获取成功' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['usage', 'quota', 'lastActivity'], description: '排序方式' })
  @ApiQuery({ name: 'filterBy', required: false, enum: ['exceeded', 'active', 'bonus'], description: '筛选条件' })
  @UseGuards(RolesGuard)
  @Permissions('read_usage_limits' as any)
  @Get()
  async getUsageLimits(
    @Request() req: AuthenticatedRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('sortBy') sortBy = 'lastActivity',
    @Query('filterBy') filterBy?: string
  ) {
    try {
      const usageLimits = await this.usageLimitService.getUsageLimits(
        req.user.organizationId,
        {
          page: Math.max(page, 1),
          limit: Math.min(limit, 100),
          sortBy,
          filterBy
        }
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
            totalBonusQuotaGranted: usageLimits.totalBonusQuotaGranted
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve usage limits',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '获取特定IP使用详情',
    description: '获取指定IP的详细使用历史和配额信息'
  })
  @ApiResponse({ status: 200, description: 'IP使用详情获取成功' })
  @ApiResponse({ status: 404, description: '使用记录未找到' })
  @ApiParam({ name: 'ip', description: 'IP地址' })
  @UseGuards(RolesGuard)
  @Permissions('read_usage_details' as any)
  @Get(':ip')
  async getUsageLimitDetail(
    @Request() req: AuthenticatedRequest,
    @Param('ip') ip: string
  ) {
    try {
      const usageDetail = await this.usageLimitService.getUsageLimitDetail(
        ip,
        req.user.organizationId
      );

      if (!usageDetail) {
        throw new NotFoundException('Usage limit record not found for this IP');
      }

      return {
        success: true,
        data: usageDetail
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve usage limit detail',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '更新使用限制策略',
    description: '配置组织的默认使用限制策略和配额设置'
  })
  @ApiResponse({ status: 200, description: '使用限制策略更新成功' })
  @UseGuards(RolesGuard)
  @Permissions('manage_usage_policy' as any)
  @Put('policy')
  @HttpCode(HttpStatus.OK)
  async updateUsageLimitPolicy(
    @Request() req: AuthenticatedRequest,
    @Body() policyData: {
      dailyLimit: number;
      bonusEnabled: boolean;
      maxBonusQuota: number;
      resetTimeUTC: number;
      rateLimitingEnabled: boolean;
      rateLimitRpm: number; // Requests per minute
    }
  ) {
    try {
      // Validate policy data
      if (policyData.dailyLimit < 1 || policyData.dailyLimit > 100) {
        throw new BadRequestException('Daily limit must be between 1 and 100');
      }
      
      if (policyData.resetTimeUTC < 0 || policyData.resetTimeUTC > 23) {
        throw new BadRequestException('Reset time must be between 0 and 23 hours');
      }

      const updatedPolicy = await this.usageLimitService.updateUsageLimitPolicy(
        req.user.organizationId,
        policyData,
        req.user.id
      );

      return {
        success: true,
        message: 'Usage limit policy updated successfully',
        data: {
          policy: updatedPolicy.policy,
          updatedBy: req.user.id,
          updatedAt: updatedPolicy.updatedAt,
          affectedIPs: updatedPolicy.affectedIPCount
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update usage limit policy',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '重置使用记录',
    description: '管理员手动重置指定IP的使用记录和配额'
  })
  @ApiResponse({ status: 200, description: '使用记录重置成功' })
  @ApiParam({ name: 'ip', description: 'IP地址' })
  @UseGuards(RolesGuard)
  @Permissions('admin' as any)
  @Post(':ip/reset')
  @HttpCode(HttpStatus.OK)
  async resetUsageLimit(
    @Request() req: AuthenticatedRequest,
    @Param('ip') ip: string,
    @Body() resetData: {
      reason: string;
      resetQuota?: boolean;
      newQuotaAmount?: number;
    }
  ) {
    try {
      const resetResult = await this.usageLimitService.resetUsageLimit(
        ip,
        req.user.organizationId,
        {
          reason: resetData.reason,
          resetBy: req.user.id,
          resetQuota: resetData.resetQuota || false,
          newQuotaAmount: resetData.newQuotaAmount
        }
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
          resetAt: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to reset usage limit',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '批量操作使用限制',
    description: '批量重置、添加配额或更新多个IP的使用限制'
  })
  @ApiResponse({ status: 200, description: '批量操作完成' })
  @UseGuards(RolesGuard)
  @Permissions('manage_quotas' as any)
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  async batchManageUsageLimits(
    @Request() req: AuthenticatedRequest,
    @Body() batchRequest: {
      ips: string[];
      action: 'reset' | 'add_bonus' | 'update_quota';
      parameters: {
        reason?: string;
        bonusType?: BonusType;
        bonusAmount?: number;
        newQuotaAmount?: number;
      };
    }
  ) {
    try {
      const batchResult = await this.usageLimitService.batchManageUsageLimits(
        batchRequest.ips,
        batchRequest.action,
        req.user.organizationId,
        {
          ...batchRequest.parameters,
          operatedBy: req.user.id
        }
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
          operatedBy: req.user.id
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Batch operation failed',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '获取使用统计数据',
    description: '获取组织的使用限制系统统计和分析数据'
  })
  @ApiResponse({ status: 200, description: '使用统计获取成功' })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['24h', '7d', '30d'], description: '时间范围' })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['hour', 'day'], description: '分组方式' })
  @UseGuards(RolesGuard)
  @Permissions('read_analytics' as any)
  @Get('stats/overview')
  async getUsageStatistics(
    @Request() req: AuthenticatedRequest,
    @Query('timeRange') timeRange = '7d',
    @Query('groupBy') groupBy = 'day'
  ) {
    try {
      const statistics = await this.usageLimitService.getUsageStatistics(
        req.user.organizationId,
        timeRange,
        groupBy
      );

      return {
        success: true,
        data: {
          overview: {
            totalActiveIPs: statistics.totalActiveIPs,
            totalUsage: statistics.totalUsage,
            averageUsagePerIP: statistics.averageUsagePerIP,
            quotaUtilizationRate: statistics.quotaUtilizationRate
          },
          quotaDistribution: statistics.quotaDistribution,
          bonusQuotaStats: statistics.bonusQuotaStats,
          usagePatterns: statistics.usagePatterns,
          peakUsageTimes: statistics.peakUsageTimes,
          trendsOverTime: statistics.trendsOverTime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve usage statistics',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '导出使用限制数据',
    description: '导出组织的使用限制数据为CSV或Excel格式'
  })
  @ApiResponse({ status: 200, description: '数据导出成功' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'excel'], description: '导出格式' })
  @UseGuards(RolesGuard)
  @Permissions('read_analytics' as any)
  @Post('export')
  @HttpCode(HttpStatus.OK)
  async exportUsageData(
    @Request() req: AuthenticatedRequest,
    @Query('format') format: 'csv' | 'excel' = 'csv',
    @Body() exportRequest: {
      dateRange?: { startDate: string; endDate: string };
      includeUsageHistory?: boolean;
      includeBonusHistory?: boolean;
      filterByExceededLimits?: boolean;
    }
  ) {
    try {
      const exportResult = await this.usageLimitService.exportUsageData(
        req.user.organizationId,
        {
          ...exportRequest,
          format,
          requestedBy: req.user.id,
          dateRange: exportRequest.dateRange ? {
            startDate: new Date(exportRequest.dateRange.startDate),
            endDate: new Date(exportRequest.dateRange.endDate)
          } : undefined
        }
      );

      return {
        success: true,
        message: 'Data export started successfully',
        data: {
          exportId: exportResult.exportId,
          format: format,
          estimatedTime: exportResult.estimatedTime,
          downloadUrl: exportResult.downloadUrl,
          expiresAt: exportResult.expiresAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to export usage data',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '设置速率限制',
    description: '配置API速率限制参数和阈值'
  })
  @ApiResponse({ status: 200, description: '速率限制配置成功' })
  @UseGuards(RolesGuard)
  @Permissions('admin' as any)
  @Put('rate-limiting')
  @HttpCode(HttpStatus.OK)
  async configureRateLimiting(
    @Request() req: AuthenticatedRequest,
    @Body() rateLimitConfig: {
      enabled: boolean;
      requestsPerMinute: number;
      requestsPerHour: number;
      burstLimit: number;
      windowSizeMinutes: number;
      blockDurationMinutes: number;
    }
  ) {
    try {
      const config = await this.usageLimitService.configureRateLimiting(
        req.user.organizationId,
        rateLimitConfig,
        req.user.id
      );

      return {
        success: true,
        message: 'Rate limiting configuration updated successfully',
        data: {
          configId: config.configId,
          configuration: config.configuration,
          updatedBy: req.user.id,
          updatedAt: config.updatedAt,
          effectiveFrom: config.effectiveFrom
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to configure rate limiting',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '服务健康检查',
    description: '检查使用限制系统的健康状态和性能指标'
  })
  @ApiResponse({ status: 200, description: '服务状态' })
  @Get('health')
  async healthCheck() {
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
            errorRate: health.errorRate
          }
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'usage-limits',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}