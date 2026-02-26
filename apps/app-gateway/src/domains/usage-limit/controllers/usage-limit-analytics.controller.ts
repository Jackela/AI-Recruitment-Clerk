import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';
import type { UsageLimitIntegrationService } from '../usage-limit-integration.service';
import type {
  AuthenticatedRequest,
  ControllerResponse,
  UsageStatisticsData,
  ExportResultData,
  RateLimitConfigData,
  HealthCheckData} from './usage-limit.types';
import {
  UsageLimitControllerUtils,
} from './usage-limit.types';

/**
 * Handles analytics, export, and health check operations for usage limits.
 */
@ApiTags('usage-limits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('usage-limits')
export class UsageLimitAnalyticsController {
  constructor(
    private readonly usageLimitService: UsageLimitIntegrationService,
  ) {}

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
  ): Promise<ControllerResponse<UsageStatisticsData>> {
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
      return UsageLimitControllerUtils.createErrorResponse(
        error,
        'Failed to retrieve usage statistics',
      );
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
  ): Promise<ControllerResponse<ExportResultData>> {
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
      return UsageLimitControllerUtils.createErrorResponse(
        error,
        'Failed to export usage data',
      );
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
  ): Promise<ControllerResponse<RateLimitConfigData>> {
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
      return UsageLimitControllerUtils.createErrorResponse(
        error,
        'Failed to configure rate limiting',
      );
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
  public async healthCheck(): Promise<HealthCheckData> {
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
}
