import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete,
  Body, 
  Param, 
  Query, 
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Permission, UserDto } from '@ai-recruitment-clerk/user-management-domain';
import { AnalyticsEvent } from '@ai-recruitment-clerk/infrastructure-shared';
import { AnalyticsIntegrationService } from './analytics-integration.service';

interface AuthenticatedRequest extends ExpressRequest {
  user: UserDto;
}

@ApiTags('analytics-reporting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsIntegrationService) {}

  @ApiOperation({
    summary: '记录用户行为事件',
    description: '记录用户在系统中的各种行为事件，用于用户体验分析和系统优化'
  })
  @ApiResponse({
    status: 201,
    description: '事件记录成功',
    schema: {
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            eventId: { type: 'string' },
            timestamp: { type: 'string' },
            eventType: { type: 'string' },
            processed: { type: 'boolean' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.READ_ANALYSIS)
  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  async trackEvent(
    @Request() req: AuthenticatedRequest,
    @Body() eventData: {
      eventType: string;
      category: string;
      action: string;
      label?: string;
      value?: number;
      metadata?: any;
      sessionId?: string;
    }
  ) {
    try {
      const event = await this.analyticsService.trackEvent({
        ...eventData,
        userId: req.user.id,
        organizationId: req.user.organizationId,
        timestamp: new Date(),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      });

      return {
        success: true,
        message: 'Event tracked successfully',
        data: {
          eventId: event.eventId,
          timestamp: event.timestamp,
          eventType: event.eventType,
          processed: event.processed
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to track event',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '记录系统性能指标',
    description: '记录系统关键操作的性能数据，包括响应时间、错误率、吞吐量等'
  })
  @ApiResponse({ status: 201, description: '性能指标记录成功' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.TRACK_METRICS)
  @Post('metrics/performance')
  @HttpCode(HttpStatus.CREATED)
  async recordPerformanceMetric(
    @Request() req: AuthenticatedRequest,
    @Body() metricData: {
      metricName: string;
      value: number;
      unit: string;
      operation: string;
      service: string;
      status: 'success' | 'error' | 'timeout';
      duration?: number;
      metadata?: any;
    }
  ) {
    try {
      const metric = await this.analyticsService.recordMetric({
        ...metricData,
        organizationId: req.user.organizationId,
        recordedBy: req.user.id,
        timestamp: new Date(),
        category: 'performance'
      });

      return {
        success: true,
        message: 'Performance metric recorded successfully',
        data: {
          metricId: metric.metricId,
          metricName: metric.metricName,
          value: metric.value,
          timestamp: metric.timestamp
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to record performance metric',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '记录业务指标',
    description: '记录关键业务KPI，如用户转化率、留存率、收入指标等'
  })
  @ApiResponse({ status: 201, description: '业务指标记录成功' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.TRACK_METRICS)
  @Post('metrics/business')
  @HttpCode(HttpStatus.CREATED)
  async recordBusinessMetric(
    @Request() req: AuthenticatedRequest,
    @Body() metricData: {
      metricName: string;
      value: number;
      unit: string;
      category: string;
      dimensions?: Record<string, any>;
      tags?: string[];
    }
  ) {
    try {
      const metric = await this.analyticsService.recordMetric({
        ...metricData,
        organizationId: req.user.organizationId,
        recordedBy: req.user.id,
        timestamp: new Date(),
        category: 'business'
      });

      return {
        success: true,
        message: 'Business metric recorded successfully',
        data: {
          metricId: metric.metricId,
          metricName: metric.metricName,
          value: metric.value,
          category: metric.category,
          timestamp: metric.timestamp
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to record business metric',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '获取分析仪表板数据',
    description: '获取组织的核心分析数据仪表板，包括关键指标和趋势'
  })
  @ApiResponse({
    status: 200,
    description: '仪表板数据获取成功'
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['24h', '7d', '30d', '90d'], description: '时间范围' })
  @ApiQuery({ name: 'metrics', required: false, description: '指定的指标列表（逗号分隔）' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.VIEW_ANALYTICS)
  @Get('dashboard')
  async getDashboard(
    @Request() req: AuthenticatedRequest,
    @Query('timeRange') timeRange = '7d',
    @Query('metrics') metrics?: string
  ) {
    try {
      const metricsArray = metrics ? metrics.split(',') : undefined;
      const dashboard = await this.analyticsService.getDashboard(
        req.user.organizationId,
        timeRange,
        metricsArray
      );

      return {
        success: true,
        data: dashboard
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve dashboard data',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '获取用户行为分析',
    description: '获取指定用户或用户群体的行为分析数据和模式'
  })
  @ApiResponse({ status: 200, description: '用户行为分析获取成功' })
  @ApiQuery({ name: 'userId', required: false, description: '特定用户ID' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiQuery({ name: 'segmentBy', required: false, description: '分段维度' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.VIEW_ANALYTICS)
  @Get('users/behavior')
  async getUserBehaviorAnalysis(
    @Request() req: AuthenticatedRequest,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('segmentBy') segmentBy?: string
  ) {
    try {
      const analysis = await this.analyticsService.getUserBehaviorAnalysis(
        req.user.organizationId,
        {
          userId,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          segmentBy
        }
      );

      return {
        success: true,
        data: analysis
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve user behavior analysis',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '获取系统使用统计',
    description: '获取系统各模块的使用统计数据，包括活跃用户、功能使用频率等'
  })
  @ApiResponse({ status: 200, description: '使用统计获取成功' })
  @ApiQuery({ name: 'module', required: false, description: '特定模块' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiQuery({ name: 'granularity', required: false, enum: ['hour', 'day', 'week', 'month'], description: '数据粒度' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.VIEW_ANALYTICS)
  @Get('usage/statistics')
  async getUsageStatistics(
    @Request() req: AuthenticatedRequest,
    @Query('module') module?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('granularity') granularity = 'day'
  ) {
    try {
      const statistics = await this.analyticsService.getUsageStatistics(
        req.user.organizationId,
        {
          module,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          granularity
        }
      );

      return {
        success: true,
        data: statistics
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
    summary: '生成分析报告',
    description: '生成指定类型的分析报告，支持多种格式输出'
  })
  @ApiResponse({
    status: 201,
    description: '报告生成任务创建成功',
    schema: {
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            reportId: { type: 'string' },
            reportType: { type: 'string' },
            status: { type: 'string' },
            estimatedTime: { type: 'string' },
            downloadUrl: { type: 'string' }
          }
        }
      }
    }
  })
  @UseGuards(RolesGuard)
  @Permissions(Permission.GENERATE_REPORT)
  @Post('reports/generate')
  @HttpCode(HttpStatus.CREATED)
  async generateReport(
    @Request() req: AuthenticatedRequest,
    @Body() reportRequest: {
      reportType: 'user_activity' | 'performance' | 'business_metrics' | 'usage_trends' | 'comprehensive';
      format: 'pdf' | 'excel' | 'csv' | 'json';
      dateRange: { startDate: string; endDate: string };
      filters?: Record<string, any>;
      sections?: string[];
      recipients?: string[];
    }
  ) {
    try {
      const report = await this.analyticsService.generateReport({
        ...reportRequest,
        organizationId: req.user.organizationId,
        requestedBy: req.user.id,
        dateRange: {
          startDate: new Date(reportRequest.dateRange.startDate),
          endDate: new Date(reportRequest.dateRange.endDate)
        }
      });

      return {
        success: true,
        message: 'Report generation started successfully',
        data: {
          reportId: report.reportId,
          reportType: report.reportType,
          status: report.status,
          estimatedTime: report.estimatedCompletionTime,
          downloadUrl: report.downloadUrl
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to generate report',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '获取报告状态和历史',
    description: '获取报告生成状态和历史记录'
  })
  @ApiResponse({ status: 200, description: '报告列表获取成功' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({ name: 'status', required: false, description: '报告状态筛选' })
  @ApiQuery({ name: 'reportType', required: false, description: '报告类型筛选' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.READ_ANALYSIS)
  @Get('reports')
  async getReports(
    @Request() req: AuthenticatedRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('reportType') reportType?: string
  ) {
    try {
      const reports = await this.analyticsService.getReports(
        req.user.organizationId,
        {
          page: Math.max(page, 1),
          limit: Math.min(limit, 100),
          status,
          reportType,
          requestedBy: req.user.id
        }
      );

      return {
        success: true,
        data: {
          reports: reports.reports,
          totalCount: reports.totalCount,
          page: page,
          totalPages: Math.ceil(reports.totalCount / limit),
          hasNext: page * limit < reports.totalCount
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve reports',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '获取指定报告详情',
    description: '获取指定报告的详细信息和下载链接'
  })
  @ApiResponse({ status: 200, description: '报告详情获取成功' })
  @ApiResponse({ status: 404, description: '报告未找到' })
  @ApiParam({ name: 'reportId', description: '报告ID' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.READ_ANALYSIS)
  @Get('reports/:reportId')
  async getReport(
    @Request() req: AuthenticatedRequest,
    @Param('reportId') reportId: string
  ) {
    try {
      const report = await this.analyticsService.getReport(reportId, req.user.organizationId);

      if (!report) {
        throw new NotFoundException('Report not found');
      }

      return {
        success: true,
        data: report
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve report',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '删除报告',
    description: '删除指定的分析报告及其关联文件'
  })
  @ApiResponse({ status: 200, description: '报告删除成功' })
  @ApiResponse({ status: 404, description: '报告未找到' })
  @ApiParam({ name: 'reportId', description: '报告ID' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.DELETE_RESUME)
  @Delete('reports/:reportId')
  @HttpCode(HttpStatus.OK)
  async deleteReport(
    @Request() req: AuthenticatedRequest,
    @Param('reportId') reportId: string,
    @Body() deleteRequest: { reason?: string; hardDelete?: boolean }
  ) {
    try {
      await this.analyticsService.deleteReport(
        reportId,
        req.user.organizationId,
        req.user.id,
        deleteRequest.reason,
        deleteRequest.hardDelete || false
      );

      return {
        success: true,
        message: 'Report deleted successfully',
        data: {
          reportId,
          deletedAt: new Date().toISOString(),
          deletedBy: req.user.id,
          hardDelete: deleteRequest.hardDelete || false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to delete report',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '获取实时分析数据',
    description: '获取实时系统指标和用户活动数据'
  })
  @ApiResponse({ status: 200, description: '实时数据获取成功' })
  @ApiQuery({ name: 'metrics', required: false, description: '指定的实时指标' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.VIEW_ANALYTICS)
  @Get('realtime')
  async getRealtimeData(
    @Request() req: AuthenticatedRequest,
    @Query('metrics') metrics?: string
  ) {
    try {
      const metricsArray = metrics ? metrics.split(',') : undefined;
      const realtimeData = await this.analyticsService.getRealtimeData(
        req.user.organizationId,
        metricsArray
      );

      return {
        success: true,
        data: realtimeData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve realtime data',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '配置分析数据保留策略',
    description: '配置分析数据的保留时间和清理策略'
  })
  @ApiResponse({ status: 200, description: '保留策略配置成功' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.SYSTEM_CONFIG)
  @Put('data-retention')
  @HttpCode(HttpStatus.OK)
  async configureDataRetention(
    @Request() req: AuthenticatedRequest,
    @Body() retentionConfig: {
      eventDataRetentionDays: number;
      metricDataRetentionDays: number;
      reportRetentionDays: number;
      anonymizeAfterDays?: number;
      enableAutoCleanup: boolean;
    }
  ) {
    try {
      const config = await this.analyticsService.configureDataRetention(
        req.user.organizationId,
        retentionConfig,
        req.user.id
      );

      return {
        success: true,
        message: 'Data retention policy configured successfully',
        data: config
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to configure data retention',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '导出分析数据',
    description: '导出指定时间范围的分析数据为各种格式'
  })
  @ApiResponse({ status: 200, description: '数据导出成功' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json', 'excel'], description: '导出格式' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.GENERATE_REPORT)
  @Post('export')
  @HttpCode(HttpStatus.OK)
  async exportAnalyticsData(
    @Request() req: AuthenticatedRequest,
    @Query('format') format: 'csv' | 'json' | 'excel' = 'csv',
    @Body() exportRequest: {
      dataTypes: string[];
      dateRange: { startDate: string; endDate: string };
      filters?: Record<string, any>;
      includeMetadata?: boolean;
    }
  ) {
    try {
      const exportResult = await this.analyticsService.exportData(
        req.user.organizationId,
        {
          ...exportRequest,
          format,
          requestedBy: req.user.id,
          dateRange: {
            startDate: new Date(exportRequest.dateRange.startDate),
            endDate: new Date(exportRequest.dateRange.endDate)
          }
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
        error: 'Failed to export analytics data',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @ApiOperation({
    summary: '服务健康检查',
    description: '检查分析服务的健康状态和系统指标'
  })
  @ApiResponse({ status: 200, description: '服务状态' })
  @Get('health')
  async healthCheck() {
    try {
      const health = await this.analyticsService.getHealthStatus();

      return {
        status: health.overall,
        timestamp: new Date().toISOString(),
        service: 'analytics-reporting',
        details: {
          database: health.database,
          eventProcessing: health.eventProcessing,
          reportGeneration: health.reportGeneration,
          realtimeData: health.realtimeData,
          dataRetention: health.dataRetention
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'analytics-reporting',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}