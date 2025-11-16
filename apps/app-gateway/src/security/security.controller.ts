import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  HttpStatus,
  HttpException,
  Logger,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  SecurityMonitorService,
  SecurityEvent,
  SecurityMetrics,
} from './security-monitor.service';
import { EnhancedRateLimitMiddleware } from '../middleware/enhanced-rate-limit.middleware';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

interface SecurityEventsMetadata {
  requestedBy: string;
  requestedAt: string;
  filters: SecurityEventsQuery;
}

interface SecurityEventsResponse {
  events: SecurityEvent[];
  total: number;
  metadata: SecurityEventsMetadata;
}

type SecurityEventsQuery = {
  limit: number;
  offset: number;
  severity?: string[];
  type?: string[];
  resolved?: boolean;
  ip?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
};

interface SecurityMetricsResponse extends SecurityMetrics {
  metadata: {
    period: 'hour' | 'day' | 'week';
    requestedBy: string;
    requestedAt: string;
  };
}

type RateLimitStats = Awaited<
  ReturnType<EnhancedRateLimitMiddleware['getSecurityStats']>
>;

interface RateLimitStatsResponse extends RateLimitStats {
  metadata: {
    period: 'hour' | 'day' | 'week';
    requestedBy: string;
    requestedAt: string;
  };
}

type LockedIpRecord = Awaited<
  ReturnType<EnhancedRateLimitMiddleware['getLockedIPs']>
>[number];

interface LockedIpsResponse {
  lockedIPs: LockedIpRecord[];
  metadata: {
    requestedBy: string;
    requestedAt: string;
  };
}

interface UnlockIpRequestDto {
  ip: string;
  reason?: string;
}

interface UnlockIpResponse {
  success: boolean;
  message: string;
}

interface ResolveSecurityEventDto {
  resolution: string;
}

interface TestAlertResponse {
  success: boolean;
  message: string;
  eventId: string;
}

/**
 * Exposes endpoints for security.
 */
@ApiTags('Security Monitoring')
@Controller('security')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SecurityController {
  private readonly logger = new Logger(SecurityController.name);

  /**
   * Initializes a new instance of the Security Controller.
   * @param securityMonitorService - The security monitor service.
   * @param rateLimitService - The rate limit service.
   */
  constructor(
    private readonly securityMonitorService: SecurityMonitorService,
    private readonly rateLimitService: EnhancedRateLimitMiddleware,
  ) {}

  /**
   * Retrieves security events.
   * @param req - The req.
   * @param limit - The limit.
   * @param offset - The offset.
   * @param severity - The severity.
   * @param type - The type.
   * @param resolved - The resolved.
   * @param ip - The ip.
   * @param userId - The user id.
   * @param startDate - The start date.
   * @param endDate - The end date.
   * @returns A promise that resolves to { events: SecurityEvent[]; total: number; metadata: any }.
   */
  @Get('events')
  @ApiOperation({ summary: 'Get security events (Admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'severity', required: false, type: [String] })
  @ApiQuery({ name: 'type', required: false, type: [String] })
  @ApiQuery({ name: 'resolved', required: false, type: Boolean })
  @ApiQuery({ name: 'ip', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Security events retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getSecurityEvents(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('severity') severity?: string | string[],
    @Query('type') type?: string | string[],
    @Query('resolved') resolved?: boolean,
    @Query('ip') ip?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<SecurityEventsResponse> {
    // Check if user has admin role
    if (!this.isAdmin(req.user)) {
      throw new HttpException('Admin access required', HttpStatus.FORBIDDEN);
    }

    try {
      const severityArray = Array.isArray(severity)
        ? severity
        : severity
          ? [severity]
          : undefined;
      const typeArray = Array.isArray(type) ? type : type ? [type] : undefined;

      const options: SecurityEventsQuery = {
        limit: limit || 50,
        offset: offset || 0,
        severity: severityArray,
        type: typeArray,
        resolved,
        ip,
        userId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      };

      const result =
        await this.securityMonitorService.getSecurityEvents(options);

      return {
        ...result,
        metadata: {
          requestedBy: req.user.sub,
          requestedAt: new Date().toISOString(),
          filters: options,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get security events: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        'Failed to retrieve security events',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retrieves security metrics.
   * @param req - The req.
   * @param period - The period.
   * @returns A promise that resolves to SecurityMetrics & { metadata: any }.
   */
  @Get('metrics')
  @ApiOperation({ summary: 'Get security metrics dashboard (Admin only)' })
  @ApiQuery({ name: 'period', required: false, enum: ['hour', 'day', 'week'] })
  @ApiResponse({
    status: 200,
    description: 'Security metrics retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getSecurityMetrics(
    @Request() req: AuthenticatedRequest,
    @Query('period') period: 'hour' | 'day' | 'week' = 'day',
  ): Promise<SecurityMetricsResponse> {
    // Check if user has admin role
    if (!this.isAdmin(req.user)) {
      throw new HttpException('Admin access required', HttpStatus.FORBIDDEN);
    }

    try {
      const metrics =
        await this.securityMonitorService.getSecurityMetrics(period);

      return {
        ...metrics,
        metadata: {
          period,
          requestedBy: req.user.sub,
          requestedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get security metrics: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        'Failed to retrieve security metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Resolves security event.
   * @param req - The req.
   * @param eventId - The event id.
   * @param body - The body.
   * @returns A promise that resolves to { success: boolean; message: string }.
   */
  @Post('events/:eventId/resolve')
  @ApiOperation({ summary: 'Resolve a security event (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Security event resolved successfully',
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Security event not found' })
  async resolveSecurityEvent(
    @Request() req: AuthenticatedRequest,
    @Param('eventId') eventId: string,
    @Body() body: ResolveSecurityEventDto,
  ): Promise<UnlockIpResponse> {
    // Check if user has admin role
    if (!this.isAdmin(req.user)) {
      throw new HttpException('Admin access required', HttpStatus.FORBIDDEN);
    }

    try {
      const resolved = await this.securityMonitorService.resolveSecurityEvent(
        eventId,
        req.user.sub,
        body.resolution,
      );

      if (!resolved) {
        throw new HttpException(
          'Security event not found',
          HttpStatus.NOT_FOUND,
        );
      }

      this.logger.log(
        `Security event ${eventId} resolved by ${req.user.email}`,
      );

      return {
        success: true,
        message: 'Security event resolved successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to resolve security event: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to resolve security event',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retrieves rate limit stats.
   * @param req - The req.
   * @param period - The period.
   * @returns The result of the operation.
   */
  @Get('rate-limit/stats')
  @ApiOperation({ summary: 'Get rate limiting statistics (Admin only)' })
  @ApiQuery({ name: 'period', required: false, enum: ['hour', 'day', 'week'] })
  @ApiResponse({
    status: 200,
    description: 'Rate limiting stats retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getRateLimitStats(
    @Request() req: AuthenticatedRequest,
    @Query('period') period: 'hour' | 'day' | 'week' = 'day',
  ): Promise<RateLimitStatsResponse> {
    // Check if user has admin role
    if (!this.isAdmin(req.user)) {
      throw new HttpException('Admin access required', HttpStatus.FORBIDDEN);
    }

    try {
      const stats = await this.rateLimitService.getSecurityStats(period);

      return {
        ...stats,
        metadata: {
          period,
          requestedBy: req.user.sub,
          requestedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get rate limit stats: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        'Failed to retrieve rate limit statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retrieves locked i ps.
   * @param req - The req.
   * @returns The result of the operation.
   */
  @Get('rate-limit/locked-ips')
  @ApiOperation({ summary: 'Get currently locked IP addresses (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Locked IPs retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getLockedIPs(@Request() req: AuthenticatedRequest): Promise<LockedIpsResponse> {
    // Check if user has admin role
    if (!this.isAdmin(req.user)) {
      throw new HttpException('Admin access required', HttpStatus.FORBIDDEN);
    }

    try {
      const lockedIPs = await this.rateLimitService.getLockedIPs();

      return {
        lockedIPs,
        metadata: {
          requestedBy: req.user.sub,
          requestedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get locked IPs: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        'Failed to retrieve locked IPs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Performs the unlock ip operation.
   * @param req - The req.
   * @param body - The body.
   * @returns A promise that resolves to { success: boolean; message: string }.
   */
  @Post('rate-limit/unlock-ip')
  @ApiOperation({ summary: 'Unlock an IP address (Admin only)' })
  @ApiResponse({ status: 200, description: 'IP address unlocked successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({
    status: 404,
    description: 'IP address not found or not locked',
  })
  async unlockIP(
    @Request() req: AuthenticatedRequest,
    @Body() body: UnlockIpRequestDto,
  ): Promise<UnlockIpResponse> {
    // Check if user has admin role
    if (!this.isAdmin(req.user)) {
      throw new HttpException('Admin access required', HttpStatus.FORBIDDEN);
    }

    try {
      const reason = `Manual unlock by ${req.user.email}: ${body.reason || 'No reason provided'}`;
      const unlocked = await this.rateLimitService.unlockIp(body.ip, reason);

      if (!unlocked) {
        throw new HttpException(
          'IP address not found or not locked',
          HttpStatus.NOT_FOUND,
        );
      }

      this.logger.log(`IP ${body.ip} manually unlocked by ${req.user.email}`);

      // Record this as a security event
      await this.securityMonitorService.recordSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'LOW',
        ip: req.ip || req.socket?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        userId: req.user.sub,
        details: {
          action: 'ip_unlock',
          unlockedIP: body.ip,
          reason: body.reason,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        success: true,
        message: `IP address ${body.ip} unlocked successfully`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to unlock IP: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to unlock IP address',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retrieves security health.
   * @param req - The req.
   * @returns The result of the operation.
   */
  @Get('health')
  @ApiOperation({ summary: 'Security system health check' })
  @ApiResponse({ status: 200, description: 'Security system status' })
  async getSecurityHealth(@Request() _req: AuthenticatedRequest) {
    try {
      const metrics =
        await this.securityMonitorService.getSecurityMetrics('hour');
      const isHealthy =
        metrics.criticalEvents === 0 && metrics.highSeverityEvents < 10;

      return {
        status: isHealthy ? 'healthy' : 'warning',
        timestamp: new Date().toISOString(),
        metrics: {
          criticalEvents: metrics.criticalEvents,
          highSeverityEvents: metrics.highSeverityEvents,
          totalEvents: metrics.totalEvents,
        },
        services: {
          securityMonitor: true,
          rateLimiting: true,
          alerting: true,
        },
      };
    } catch (error) {
      this.logger.error(
        `Security health check failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        services: {
          securityMonitor: false,
          rateLimiting: false,
          alerting: false,
        },
      };
    }
  }

  /**
   * Performs the test security alert operation.
   * @param req - The req.
   * @returns The result of the operation.
   */
  @Post('test-alert')
  @ApiOperation({ summary: 'Test security alert system (Admin only)' })
  @ApiResponse({ status: 200, description: 'Test alert sent successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async testSecurityAlert(
    @Request() req: AuthenticatedRequest,
  ): Promise<TestAlertResponse> {
    // Check if user has admin role
    if (!this.isAdmin(req.user)) {
      throw new HttpException('Admin access required', HttpStatus.FORBIDDEN);
    }

    try {
      const eventId = await this.securityMonitorService.recordSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        ip: req.ip || req.socket?.remoteAddress || 'test-ip',
        userAgent: req.headers['user-agent'] || 'test-agent',
        userId: req.user.sub,
        details: {
          action: 'security_alert_test',
          testTriggeredBy: req.user.email,
          timestamp: new Date().toISOString(),
        },
      });

      this.logger.log(
        `Security alert test triggered by ${req.user.email}, event ID: ${eventId}`,
      );

      return {
        success: true,
        message: 'Test security alert sent successfully',
        eventId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send test alert: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        'Failed to send test alert',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private isAdmin(user: AuthenticatedRequest['user'] | undefined): boolean {
    const role = String(user?.rawRole ?? user?.role ?? '').toLowerCase();
    return role === 'admin';
  }
}
