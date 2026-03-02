import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import type { UserDto } from '@ai-recruitment-clerk/user-management-domain';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';
import type {
  BonusType,
} from '@ai-recruitment-clerk/usage-management-domain';
import type { UsageLimitIntegrationService } from './usage-limit-integration.service';

interface AuthenticatedRequest extends Request {
  user: UserDto & { id: string; organizationId: string };
}

/**
 * Exposes endpoints for quota management.
 */
@ApiTags('usage-limits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('usage-limits')
export class QuotasController {
  /**
   * Initializes a new instance of the Quotas Controller.
   * @param usageLimitService - The usage limit service.
   */
  constructor(
    private readonly usageLimitService: UsageLimitIntegrationService,
  ) {}

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
  ): Promise<{
    success: boolean;
    message?: string;
    data?: {
      ip: string;
      bonusType: BonusType;
      bonusAmount: number;
      newTotalQuota: number;
      reason: string;
      grantedBy: string;
      grantedAt: string;
    };
    error?: string;
  }> {
    try {
      const targetIP =
        bonusData.ip ||
        ((req as Request & { socket?: { remoteAddress?: string } }).socket?.remoteAddress ||
          this.getHeaderValue(req.headers, 'x-forwarded-for') ||
            'unknown');

      // Validate bonus amount
      if (bonusData.amount <= 0 || bonusData.amount > 50) {
        throw new BadRequestException('Bonus amount must be between 1 and 50');
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
      return {
        success: false,
        error: 'Failed to add bonus quota',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the batch manage usage limits operation.
   * @param req - The req.
   * @param batchRequest - The batch request.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '批量操作使用限制',
    description: '批量重置、添加配额或更新多个IP的使用限制',
  })
  @ApiResponse({ status: 200, description: '批量操作完成' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.MANAGE_QUOTAS)
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  public async batchManageUsageLimits(
    @Request() req: AuthenticatedRequest,
    @Body()
    batchRequest: {
      ips: string[];
      action: 'reset' | 'add_bonus' | 'update_quota';
      parameters: {
        reason?: string;
        bonusType?: BonusType;
        bonusAmount?: number;
        newQuotaAmount?: number;
      };
    },
  ): Promise<{
    success: boolean;
    message?: string;
    data?: {
      totalProcessed: number;
      successful: number;
      failed: number;
      results: unknown[];
      action: string;
      operatedBy: string;
    };
    error?: string;
  }> {
    try {
      const batchResult = await this.usageLimitService.batchManageUsageLimits(
        batchRequest.ips,
        batchRequest.action,
        req.user.organizationId,
        {
          ...batchRequest.parameters,
          operatedBy: req.user.id,
        },
      );

      return {
        success: true,
        message: 'Batch operation completed',
        data: {
          totalProcessed: batchResult.totalProcessed,
          successful: batchResult.successful,
          failed: batchResult.failed,
          results: batchResult.results,
          action: batchRequest.action,
          operatedBy: req.user.id,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Batch operation failed',
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
