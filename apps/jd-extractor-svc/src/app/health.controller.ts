import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

interface HealthResponse {
  status: 'ok';
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  checks: {
    database?: 'healthy' | 'unhealthy';
    nats?: 'healthy' | 'unhealthy';
    llm?: 'healthy' | 'unhealthy';
  };
}

/**
 * Exposes endpoints for health.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  /**
   * Retrieves health.
   * @returns The HealthResponse.
   */
  @Get()
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Returns the health status of the JD Extractor service',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        service: { type: 'string', example: 'jd-extractor-svc' },
        version: { type: 'string', example: '1.0.0' },
        uptime: { type: 'number', example: 12345 },
        checks: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'healthy' },
            nats: { type: 'string', example: 'healthy' },
            llm: { type: 'string', example: 'healthy' },
          },
        },
      },
    },
  })
  getHealth(): HealthResponse {
    const uptime = Date.now() - this.startTime;

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'jd-extractor-svc',
      version: '1.0.0',
      uptime,
      checks: {
        // Basic checks - in a real implementation, these would be actual health checks
        nats: 'healthy',
        llm: 'healthy',
      },
    };
  }
}
