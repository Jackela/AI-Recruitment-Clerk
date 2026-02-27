import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
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
 * Metrics Controller - Handles metrics collection and retrieval
 */
@ApiTags('analytics-reporting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class MetricsController {
  /**
   * Initializes a new instance of the Metrics Controller.
   * @param analyticsService - The analytics service.
   */
  constructor(private readonly analyticsService: AnalyticsIntegrationService) {}

  /**
   * Performs the track event operation.
   * @param req - The req.
   * @param eventData - The event data.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: 'Record user behavior event',
    description:
      'Record various user behavior events in the system for user experience analysis and system optimization',
  })
  @ApiResponse({
    status: 201,
    description: 'Event recorded successfully',
    schema: {
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            eventId: { type: 'string' },
            timestamp: { type: 'string' },
            eventType: { type: 'string' },
            processed: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.READ_ANALYSIS)
  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  public async trackEvent(
    @Request() req: AuthenticatedRequest,
    @Body()
    eventData: {
      eventType: string;
      category: string;
      action: string;
      label?: string;
      value?: number;
      metadata?: Record<string, unknown>;
      sessionId?: string;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    try {
      if (!req.user.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const event = await this.analyticsService.trackEvent({
        ...eventData,
        userId: req.user.id,
        organizationId: req.user.organizationId,
        timestamp: new Date(),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      return {
        success: true,
        message: 'Event tracked successfully',
        data: {
          eventId: event.eventId,
          timestamp: event.timestamp,
          eventType: event.eventType,
          processed: event.processed,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to track event',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the record performance metric operation.
   * @param req - The req.
   * @param metricData - The metric data.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: 'Record system performance metrics',
    description:
      'Record performance data for system key operations, including response time, error rate, throughput, etc.',
  })
  @ApiResponse({ status: 201, description: 'Performance metric recorded successfully' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.TRACK_METRICS)
  @Post('metrics/performance')
  @HttpCode(HttpStatus.CREATED)
  public async recordPerformanceMetric(
    @Request() req: AuthenticatedRequest,
    @Body()
    metricData: {
      metricName: string;
      value: number;
      unit: string;
      operation: string;
      service: string;
      status: 'success' | 'error' | 'timeout';
      duration?: number;
      metadata?: Record<string, unknown>;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    try {
      if (!req.user.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const metric = await this.analyticsService.recordMetric({
        ...metricData,
        organizationId: req.user.organizationId,
        recordedBy: req.user.id,
        timestamp: new Date(),
        category: 'performance',
      });

      return {
        success: true,
        message: 'Performance metric recorded successfully',
        data: {
          metricId: metric.metricId,
          metricName: metric.metricName,
          value: metric.value,
          timestamp: metric.timestamp,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to record performance metric',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the record business metric operation.
   * @param req - The req.
   * @param metricData - The metric data.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: 'Record business metrics',
    description:
      'Record key business KPIs, such as user conversion rate, retention rate, revenue metrics, etc.',
  })
  @ApiResponse({ status: 201, description: 'Business metric recorded successfully' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.TRACK_METRICS)
  @Post('metrics/business')
  @HttpCode(HttpStatus.CREATED)
  public async recordBusinessMetric(
    @Request() req: AuthenticatedRequest,
    @Body()
    metricData: {
      metricName: string;
      value: number;
      unit: string;
      category: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dimensions?: Record<string, any>;
      tags?: string[];
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    try {
      if (!req.user.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const metric = await this.analyticsService.recordMetric({
        ...metricData,
        organizationId: req.user.organizationId,
        recordedBy: req.user.id,
        timestamp: new Date(),
        category: 'business',
      });

      return {
        success: true,
        message: 'Business metric recorded successfully',
        data: {
          metricId: metric.metricId,
          metricName: metric.metricName,
          value: metric.value,
          category: metric.category,
          timestamp: metric.timestamp,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to record business metric',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Retrieves dashboard.
   * @param req - The req.
   * @param timeRange - The time range.
   * @param metrics - The metrics.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: 'Get analytics dashboard data',
    description:
      'Get the core analytics data dashboard for the organization, including key metrics and trends',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
  })
  @ApiQuery({
    name: 'timeRange',
    required: false,
    enum: ['24h', '7d', '30d', '90d'],
    description: 'Time range',
  })
  @ApiQuery({
    name: 'metrics',
    required: false,
    description: 'List of specified metrics (comma-separated)',
  })
  @UseGuards(RolesGuard)
  @Permissions(Permission.VIEW_ANALYTICS)
  @Get('dashboard')
  public async getDashboard(
    @Request() req: AuthenticatedRequest,
    @Query('timeRange') timeRange = '7d',
    @Query('metrics') metrics?: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    try {
      if (!req.user.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const metricsArray = metrics ? metrics.split(',') : undefined;
      const dashboard = await this.analyticsService.getDashboard(
        req.user.organizationId,
        timeRange,
        metricsArray,
      );

      return {
        success: true,
        data: dashboard,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve dashboard data',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Retrieves realtime data.
   * @param req - The req.
   * @param metrics - The metrics.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: 'Get realtime analytics data',
    description: 'Get realtime system metrics and user activity data',
  })
  @ApiResponse({ status: 200, description: 'Realtime data retrieved successfully' })
  @ApiQuery({ name: 'metrics', required: false, description: 'Specified realtime metrics' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.VIEW_ANALYTICS)
  @Get('realtime')
  public async getRealtimeData(
    @Request() req: AuthenticatedRequest,
    @Query('metrics') metrics?: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    try {
      if (!req.user.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const metricsArray = metrics ? metrics.split(',') : [];
      const realtimeData = await this.analyticsService.getRealtimeData(
        req.user.organizationId,
        metricsArray,
      );

      return {
        success: true,
        data: realtimeData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve realtime data',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the health check operation.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: 'Service health check',
    description: 'Check the health status and system metrics of the analytics service',
  })
  @ApiResponse({ status: 200, description: 'Service status' })
  @Get('health')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async healthCheck(): Promise<any> {
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
          dataRetention: health.dataRetention,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'analytics-reporting',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
