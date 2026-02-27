import {
  Controller,
  Get,
  Post,
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
import type { UserDto } from '@ai-recruitment-clerk/user-management-domain';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';
import type { UsageLimitIntegrationService } from './usage-limit-integration.service';

interface AuthenticatedRequest extends Request {
  user: UserDto & { id: string; organizationId: string };
}

/**
 * Exposes endpoints for usage history and analytics.
 */
@ApiTags('usage-limits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('usage-limits')
export class HistoryController {
  /**
   * Initializes a new instance of the History Controller.
   * @param usageLimitService - The usage limit service.
   */
  constructor(
    private readonly usageLimitService: UsageLimitIntegrationService,
  ) {}

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
}
