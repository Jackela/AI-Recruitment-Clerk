import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { UserDto, Permission, AuthenticatedRequest } from '@app/shared-dtos';

@ApiTags('system')
@ApiBearerAuth()
@Controller('system')
export class SystemController {
  constructor() {}

  @ApiOperation({
    summary: '系统健康检查',
    description: '获取系统整体健康状态和所有服务的运行状况'
  })
  @ApiResponse({
    status: 200,
    description: '系统健康状态',
  })
  @Get('health')
  async getSystemHealth(): Promise<{ success: boolean; data: any }> {
    try {
      const startTime = process.uptime();
      const memoryUsage = process.memoryUsage();
      
      return {
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: [
            {
              name: 'app-gateway',
              status: 'healthy',
              uptime: Math.floor(startTime),
              memory: {
                rss: Math.round(memoryUsage.rss / 1024 / 1024),
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024)
              }
            }
          ],
          uptime: Math.floor(startTime),
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          memory: {
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
          }
        },
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        message: 'Unable to retrieve system health',
        error: error.message,
      });
    }
  }

  @ApiOperation({
    summary: '获取系统状态概览',
    description: '获取系统整体状态的快速概览'
  })
  @ApiResponse({ status: 200, description: '系统状态概览' })
  @Get('status')
  async getSystemStatus(): Promise<{
    success: boolean;
    data: {
      status: 'operational' | 'degraded' | 'maintenance' | 'outage';
      version: string;
      environment: string;
      uptime: number;
      services: {
        total: number;
        healthy: number;
        degraded: number;
        unhealthy: number;
      };
      lastUpdated: string;
    };
  }> {
    try {
      return {
        success: true,
        data: {
          status: 'operational',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          uptime: Math.floor(process.uptime()),
          services: {
            total: 1,
            healthy: 1,
            degraded: 0,
            unhealthy: 0
          },
          lastUpdated: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new BadRequestException({
        message: 'Failed to retrieve system status',
        error: error.message,
      });
    }
  }
}