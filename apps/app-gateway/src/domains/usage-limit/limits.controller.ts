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
import type { UsageLimitIntegrationService } from './usage-limit-integration.service';

interface AuthenticatedRequest extends Request {
  user: UserDto & { id: string; organizationId: string };
}

/**
 * Exposes endpoints for limit enforcement.
 */
@ApiTags('usage-limits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('usage-limits')
export class LimitsController {
  /**
   * Initializes a new instance of the Limits Controller.
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
