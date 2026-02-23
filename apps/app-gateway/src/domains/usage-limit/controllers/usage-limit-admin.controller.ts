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
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';
import type { BonusType } from '@ai-recruitment-clerk/usage-management-domain';
import type { UsageLimitIntegrationService } from '../usage-limit-integration.service';
import type {
  AuthenticatedRequest,
  ControllerResponse,
  UsageLimitsListData,
  UsageLimitDetailData,
  PolicyUpdateData,
  ResetResultData,
  BatchOperationData} from './usage-limit.types';
import {
  UsageLimitControllerUtils,
} from './usage-limit.types';

/**
 * Handles admin operations for usage limits.
 */
@ApiTags('usage-limits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('usage-limits')
export class UsageLimitAdminController {
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
  ): Promise<ControllerResponse<UsageLimitsListData>> {
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
      return UsageLimitControllerUtils.createErrorResponse(
        error,
        'Failed to retrieve usage limits',
      );
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
  ): Promise<ControllerResponse<UsageLimitDetailData>> {
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
        data: usageDetail as UsageLimitDetailData,
      };
    } catch (error) {
      return UsageLimitControllerUtils.createErrorResponse(
        error,
        'Failed to retrieve usage limit detail',
      );
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
  ): Promise<ControllerResponse<PolicyUpdateData>> {
    try {
      // Validate policy data
      if (policyData.dailyLimit < 1 || policyData.dailyLimit > 100) {
        return {
          success: false,
          error: 'Invalid daily limit',
          message: 'Daily limit must be between 1 and 100',
        };
      }

      if (policyData.resetTimeUTC < 0 || policyData.resetTimeUTC > 23) {
        return {
          success: false,
          error: 'Invalid reset time',
          message: 'Reset time must be between 0 and 23 hours',
        };
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
          updatedAt:
            updatedPolicy.updatedAt?.toISOString() || new Date().toISOString(),
          affectedIPs: updatedPolicy.affectedIPCount,
          effectiveFrom: new Date().toISOString(),
        },
      };
    } catch (error) {
      return UsageLimitControllerUtils.createErrorResponse(
        error,
        'Failed to update usage limit policy',
      );
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
  ): Promise<ControllerResponse<ResetResultData>> {
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
      return UsageLimitControllerUtils.createErrorResponse(
        error,
        'Failed to reset usage limit',
      );
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
  ): Promise<ControllerResponse<BatchOperationData>> {
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
      return UsageLimitControllerUtils.createErrorResponse(
        error,
        'Batch operation failed',
      );
    }
  }
}
