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
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import type {
  UserDto,
} from '@ai-recruitment-clerk/user-management-domain';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';
import type { AnalyticsIntegrationService } from './analytics-integration.service';

interface AuthenticatedRequest extends ExpressRequest {
  user: UserDto;
}

/**
 * Reports Controller - Handles analytics reports generation and management
 */
@ApiTags('analytics-reporting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class ReportsController {
  /**
   * Initializes a new instance of the Reports Controller.
   * @param analyticsService - The analytics service.
   */
  constructor(private readonly analyticsService: AnalyticsIntegrationService) {}

  /**
   * Retrieves user behavior analysis.
   * @param req - The req.
   * @param userId - The user id.
   * @param startDate - The start date.
   * @param endDate - The end date.
   * @param segmentBy - The segment by.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: 'Get user behavior analysis',
    description:
      'Get behavior analysis data and patterns for specified users or user groups',
  })
  @ApiResponse({ status: 200, description: 'User behavior analysis retrieved successfully' })
  @ApiQuery({ name: 'userId', required: false, description: 'Specific user ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date' })
  @ApiQuery({ name: 'segmentBy', required: false, description: 'Segmentation dimension' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.VIEW_ANALYTICS)
  @Get('users/behavior')
  public async getUserBehaviorAnalysis(
    @Request() req: AuthenticatedRequest,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('segmentBy') segmentBy?: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    try {
      if (!req.user.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const analysis = await this.analyticsService.getUserBehaviorAnalysis(
        req.user.organizationId,
        {
          userId,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          segmentBy,
        },
      );

      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve user behavior analysis',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Retrieves usage statistics.
   * @param req - The req.
   * @param module - The module.
   * @param startDate - The start date.
   * @param endDate - The end date.
   * @param granularity - The granularity.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: 'Get system usage statistics',
    description:
      'Get usage statistics for each system module, including active users and feature usage frequency',
  })
  @ApiResponse({ status: 200, description: 'Usage statistics retrieved successfully' })
  @ApiQuery({ name: 'module', required: false, description: 'Specific module' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date' })
  @ApiQuery({
    name: 'granularity',
    required: false,
    enum: ['hour', 'day', 'week', 'month'],
    description: 'Data granularity',
  })
  @UseGuards(RolesGuard)
  @Permissions(Permission.VIEW_ANALYTICS)
  @Get('usage/statistics')
  public async getUsageStatistics(
    @Request() req: AuthenticatedRequest,
    @Query('module') module?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('granularity') granularity = 'day',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    try {
      if (!req.user.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const statistics = await this.analyticsService.getUsageStatistics(
        req.user.organizationId,
        {
          module,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          granularity,
        },
      );

      return {
        success: true,
        data: statistics,
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
   * Generates report.
   * @param req - The req.
   * @param reportRequest - The report request.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: 'Generate analytics report',
    description: 'Generate specified type of analytics report, supporting multiple output formats',
  })
  @ApiResponse({
    status: 201,
    description: 'Report generation task created successfully',
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
            downloadUrl: { type: 'string' },
          },
        },
      },
    },
  })
  @UseGuards(RolesGuard)
  @Permissions(Permission.GENERATE_REPORT)
  @Post('reports/generate')
  @HttpCode(HttpStatus.CREATED)
  public async generateReport(
    @Request() req: AuthenticatedRequest,
    @Body()
    reportRequest: {
      reportType:
        | 'user_activity'
        | 'performance'
        | 'business_metrics'
        | 'usage_trends'
        | 'comprehensive';
      format: 'pdf' | 'excel' | 'csv' | 'json';
      dateRange: { startDate: string; endDate: string };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filters?: Record<string, any>;
      sections?: string[];
      recipients?: string[];
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    try {
      if (!req.user.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const report = await this.analyticsService.generateReport({
        ...reportRequest,
        organizationId: req.user.organizationId,
        requestedBy: req.user.id,
        dateRange: {
          startDate: new Date(reportRequest.dateRange.startDate),
          endDate: new Date(reportRequest.dateRange.endDate),
        },
      });

      return {
        success: true,
        message: 'Report generation started successfully',
        data: {
          reportId: report.reportId,
          reportType: report.reportType,
          status: report.status,
          estimatedTime: report.estimatedCompletionTime,
          downloadUrl: report.downloadUrl,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to generate report',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Retrieves reports.
   * @param req - The req.
   * @param page - The page.
   * @param limit - The limit.
   * @param status - The status.
   * @param reportType - The report type.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: 'Get report status and history',
    description: 'Get report generation status and historical records',
  })
  @ApiResponse({ status: 200, description: 'Report list retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, description: 'Report status filter' })
  @ApiQuery({
    name: 'reportType',
    required: false,
    description: 'Report type filter',
  })
  @UseGuards(RolesGuard)
  @Permissions(Permission.READ_ANALYSIS)
  @Get('reports')
  public async getReports(
    @Request() req: AuthenticatedRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('reportType') reportType?: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    try {
      if (!req.user.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const reports = await this.analyticsService.getReports(
        req.user.organizationId,
        {
          page: Math.max(page, 1),
          limit: Math.min(limit, 100),
          status,
          reportType,
          requestedBy: req.user.id,
        },
      );

      return {
        success: true,
        data: {
          reports: reports.reports,
          totalCount: reports.totalCount,
          page: page,
          totalPages: Math.ceil(reports.totalCount / limit),
          hasNext: page * limit < reports.totalCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve reports',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Retrieves report.
   * @param req - The req.
   * @param reportId - The report id.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: 'Get specified report details',
    description: 'Get detailed information and download link for the specified report',
  })
  @ApiResponse({ status: 200, description: 'Report details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.READ_ANALYSIS)
  @Get('reports/:reportId')
  public async getReport(
    @Request() req: AuthenticatedRequest,
    @Param('reportId') reportId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    try {
      if (!req.user.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const report = await this.analyticsService.getReport(
        reportId,
        req.user.organizationId,
      );

      if (!report) {
        throw new NotFoundException('Report not found');
      }

      return {
        success: true,
        data: report,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve report',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Removes report.
   * @param req - The req.
   * @param reportId - The report id.
   * @param deleteRequest - The delete request.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: 'Delete report',
    description: 'Delete the specified analytics report and associated files',
  })
  @ApiResponse({ status: 200, description: 'Report deleted successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.DELETE_RESUME)
  @Delete('reports/:reportId')
  @HttpCode(HttpStatus.OK)
  public async deleteReport(
    @Request() req: AuthenticatedRequest,
    @Param('reportId') reportId: string,
    @Body() deleteRequest: { reason?: string; hardDelete?: boolean },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    try {
      if (!req.user.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      await this.analyticsService.deleteReport(
        reportId,
        req.user.organizationId,
        req.user.id,
        deleteRequest.reason,
        deleteRequest.hardDelete || false,
      );

      return {
        success: true,
        message: 'Report deleted successfully',
        data: {
          reportId,
          deletedAt: new Date().toISOString(),
          deletedBy: req.user.id,
          hardDelete: deleteRequest.hardDelete || false,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to delete report',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the configure data retention operation.
   * @param req - The req.
   * @param retentionConfig - The retention config.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: 'Configure analytics data retention policy',
    description: 'Configure retention time and cleanup policy for analytics data',
  })
  @ApiResponse({ status: 200, description: 'Retention policy configured successfully' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.SYSTEM_CONFIG)
  @Put('data-retention')
  @HttpCode(HttpStatus.OK)
  public async configureDataRetention(
    @Request() req: AuthenticatedRequest,
    @Body()
    retentionConfig: {
      eventDataRetentionDays: number;
      metricDataRetentionDays: number;
      reportRetentionDays: number;
      anonymizeAfterDays?: number;
      enableAutoCleanup: boolean;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    try {
      if (!req.user.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const config = await this.analyticsService.configureDataRetention(
        req.user.organizationId,
        retentionConfig,
        req.user.id,
      );

      return {
        success: true,
        message: 'Data retention policy configured successfully',
        data: config,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to configure data retention',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the export analytics data operation.
   * @param req - The req.
   * @param format - The format.
   * @param exportRequest - The export request.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: 'Export analytics data',
    description: 'Export analytics data for specified time range in various formats',
  })
  @ApiResponse({ status: 200, description: 'Data export started successfully' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'json', 'excel'],
    description: 'Export format',
  })
  @UseGuards(RolesGuard)
  @Permissions(Permission.GENERATE_REPORT)
  @Post('export')
  @HttpCode(HttpStatus.OK)
  public async exportAnalyticsData(
    @Request() req: AuthenticatedRequest,
    @Query('format') format: 'csv' | 'json' | 'excel' = 'csv',
    @Body()
    exportRequest: {
      dataTypes: string[];
      dateRange: { startDate: string; endDate: string };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filters?: Record<string, any>;
      includeMetadata?: boolean;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    try {
      if (!req.user.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const exportResult = await this.analyticsService.exportData(
        req.user.organizationId,
        {
          ...exportRequest,
          format,
          requestedBy: req.user.id,
          dateRange: {
            startDate: new Date(exportRequest.dateRange.startDate),
            endDate: new Date(exportRequest.dateRange.endDate),
          },
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
        error: 'Failed to export analytics data',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
