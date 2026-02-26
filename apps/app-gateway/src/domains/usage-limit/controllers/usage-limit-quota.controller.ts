import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
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
import { ThrottlerGuard } from '@nestjs/throttler';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';
import type { BonusType } from '@ai-recruitment-clerk/usage-management-domain';
import type { UsageLimitIntegrationService } from '../usage-limit-integration.service';
import type {
  AuthenticatedRequest,
  ControllerResponse,
  UsageCheckData,
  UsageRecordData,
  BonusQuotaData} from './usage-limit.types';
import {
  UsageLimitControllerUtils,
} from './usage-limit.types';

/**
 * Handles quota-related operations (check, record, bonus).
 */
@ApiTags('usage-limits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('usage-limits')
export class UsageLimitQuotaController {
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
  ): Promise<ControllerResponse<UsageCheckData>> {
    try {
      const targetIP = UsageLimitControllerUtils.getTargetIP(req, ip);

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
      return UsageLimitControllerUtils.createErrorResponse(
        error,
        'Failed to check usage limit',
      );
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
  ): Promise<ControllerResponse<UsageRecordData>> {
    try {
      const targetIP = UsageLimitControllerUtils.getTargetIP(
        req,
        usageData?.userIP,
      );

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
              ((recordResult.currentUsage ?? 0) +
                (recordResult.remainingQuota ?? 1))) *
              100,
          ),
          recordedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return UsageLimitControllerUtils.createErrorResponse(
        error,
        'Failed to record usage',
      );
    }
  }

  /**
   * Performs the add bonus quota operation.
   * @param req - The req.
   * @param bonusData - The bonus data.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '添加奖励配额',
    description: '为指定IP添加奖励配额，如问卷完成奖励或推荐奖励',
  })
  @ApiResponse({ status: 201, description: '奖励配额添加成功' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.MANAGE_QUOTAS)
  @Post('bonus')
  @HttpCode(HttpStatus.CREATED)
  public async addBonusQuota(
    @Request() req: AuthenticatedRequest,
    @Body()
    bonusData: {
      ip?: string;
      bonusType: BonusType;
      amount: number;
      reason: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<ControllerResponse<BonusQuotaData>> {
    try {
      const targetIP = bonusData.ip ||
        UsageLimitControllerUtils.getHeaderValue(req.headers, 'x-forwarded-for') ||
        'unknown';

      // Validate bonus amount
      if (bonusData.amount <= 0 || bonusData.amount > 50) {
        return {
          success: false,
          error: 'Invalid bonus amount',
          message: 'Bonus amount must be between 1 and 50',
        };
      }

      const bonusResult = await this.usageLimitService.addBonusQuota(
        targetIP,
        bonusData.bonusType,
        bonusData.amount,
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
          grantedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return UsageLimitControllerUtils.createErrorResponse(
        error,
        'Failed to add bonus quota',
      );
    }
  }
}
