import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
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
import { ContactInfo } from '@ai-recruitment-clerk/shared-dtos';
import type { AuthenticatedRequest } from '@ai-recruitment-clerk/user-management-domain';
import type { IncentiveIntegrationService } from './incentive-integration.service';

/**
 * Exposes endpoints for referral program management.
 */
@ApiTags('incentive-system')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('incentives')
export class ReferralsController {
  /**
   * Initializes a new instance of the Referrals Controller.
   * @param incentiveService - The incentive service.
   */
  constructor(private readonly incentiveService: IncentiveIntegrationService) {}

  /**
   * Creates referral incentive.
   * @param req - The req.
   * @param referralData - The referral data.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '创建推荐激励',
    description: '为成功推荐新用户的推荐人创建激励奖励',
  })
  @ApiResponse({ status: 201, description: '推荐激励创建成功' })
  @UseGuards(RolesGuard)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Permissions('create_job' as any)
  @Post('referral')
  @HttpCode(HttpStatus.CREATED)
  public async createReferralIncentive(
    @Request() req: AuthenticatedRequest,
    @Body()
    referralData: {
      referrerIP: string;
      referredIP: string;
      contactInfo: {
        email?: string;
        phone?: string;
        wechat?: string;
        alipay?: string;
      };
      referralType?: string;
      expectedValue?: number;
      metadata?: Record<string, unknown>;
    },
  ): Promise<{
    success: boolean;
    data?: {
      incentiveId: string;
      rewardAmount: number;
      currency: string;
      status: string;
      canBePaid: boolean;
    };
    error?: string;
    message?: string;
  }> {
    try {
      const contactInfo = new ContactInfo(referralData.contactInfo);

      const incentive = await this.incentiveService.createReferralIncentive(
        referralData.referrerIP,
        referralData.referredIP,
        contactInfo,
        referralData.referralType || 'general',
        referralData.expectedValue || 0,
        { organizationId: req.user.organizationId, ...referralData.metadata },
      );

      const summary = {
        id: incentive.id,
        type: incentive.type,
        status: incentive.status,
        createdAt: incentive.createdAt,
        rewardAmount: incentive.expectedValue || 0,
        rewardCurrency: 'USD',
        canBePaid: false,
      };

      return {
        success: true,
        message: 'Referral incentive created successfully',
        data: {
          incentiveId: summary.id,
          rewardAmount: summary.rewardAmount,
          currency: summary.rewardCurrency,
          status: summary.status,
          canBePaid: summary.canBePaid,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create referral incentive',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
