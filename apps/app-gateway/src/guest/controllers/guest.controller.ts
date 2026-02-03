import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { GuestUsageService } from '../services/guest-usage.service';
import { GuestGuard } from '../guards/guest.guard';
import type { RequestWithDeviceId } from '../guards/guest.guard';
import type {
  RedeemFeedbackCodeDto} from '../dto/guest.dto';
import {
  GuestUsageResponseDto,
  GuestStatusDto
} from '../dto/guest.dto';

/**
 * Exposes endpoints for guest.
 */
@ApiTags('Guest Services')
@Controller('guest')
@UseGuards(GuestGuard)
@ApiHeader({
  name: 'X-Device-ID',
  description: 'Unique device identifier for guest access',
  required: true,
  schema: { type: 'string', example: 'uuid-device-12345' },
})
export class GuestController {
  private readonly logger = new Logger(GuestController.name);

  /**
   * Initializes a new instance of the Guest Controller.
   * @param guestUsageService - The guest usage service.
   */
  constructor(private readonly guestUsageService: GuestUsageService) {}

  /**
   * Generates feedback code.
   * @param req - The req.
   * @returns The result of the operation.
   */
  @Post('feedback-code')
  @ApiOperation({
    summary: 'Generate feedback code for guest user',
    description:
      'Generate a unique feedback code when guest reaches usage limit',
  })
  @ApiResponse({
    status: 200,
    description: 'Feedback code generated successfully',
    schema: {
      type: 'object',
      properties: {
        feedbackCode: {
          type: 'string',
          example: 'fb-uuid-12345-67890',
          description: 'Unique feedback code for survey participation',
        },
        surveyUrl: {
          type: 'string',
          example: 'https://wj.qq.com/s2/xxxxx',
          description: 'Survey URL with embedded feedback code',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Feedback code not needed or invalid device',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid device ID',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests from this device',
  })
  public async generateFeedbackCode(@Req() req: RequestWithDeviceId): Promise<{
    feedbackCode: string;
    surveyUrl: string;
    message: string;
  }> {
    try {
      const deviceId = req.deviceId ?? '';
      const feedbackCode =
        await this.guestUsageService.generateFeedbackCode(deviceId);

      // Construct survey URL with feedback code
      const surveyUrl = `${process.env.GUEST_FEEDBACK_URL || 'https://wj.qq.com/s2/default'}?code=${feedbackCode}`;

      this.logger.log(
        `Feedback code generated for guest: ${this.maskDeviceId(deviceId)}`,
      );

      return {
        feedbackCode,
        surveyUrl,
        message:
          '请复制此码，并点击下方链接前往问卷填写。提交成功后，您将获得奖励和新的使用次数！',
      };
    } catch (error) {
      this.logger.error('Error generating feedback code:', error);
      const err = error as Error & { status?: number };
      throw new HttpException(
        err.message || 'Failed to generate feedback code',
        err.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retrieves usage status.
   * @param req - The req.
   * @returns A promise that resolves to GuestUsageResponseDto.
   */
  @Get('status')
  @ApiOperation({
    summary: 'Get guest usage status',
    description:
      'Retrieve current usage status and remaining quota for guest user',
  })
  @ApiResponse({
    status: 200,
    description: 'Usage status retrieved successfully',
    type: GuestUsageResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid device ID',
  })
  public async getUsageStatus(
    @Req() req: RequestWithDeviceId,
  ): Promise<GuestUsageResponseDto> {
    try {
      const deviceId = req.deviceId ?? '';
      const status = await this.guestUsageService.getUsageStatus(deviceId);

      this.logger.debug(
        `Usage status retrieved for guest: ${this.maskDeviceId(deviceId)}`,
      );
      return status;
    } catch (error) {
      this.logger.error('Error getting usage status:', error);
      const err = error as Error & { status?: number };
      throw new HttpException(
        err.message || 'Failed to get usage status',
        err.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retrieves guest details.
   * @param req - The req.
   * @returns A promise that resolves to GuestStatusDto.
   */
  @Get('details')
  @ApiOperation({
    summary: 'Get detailed guest information',
    description:
      'Retrieve detailed guest status including usage history and feedback code status',
  })
  @ApiResponse({
    status: 200,
    description: 'Guest details retrieved successfully',
    type: GuestStatusDto,
  })
  @ApiBadRequestResponse({
    description: 'Guest record not found',
  })
  public async getGuestDetails(
    @Req() req: RequestWithDeviceId,
  ): Promise<GuestStatusDto> {
    try {
      const deviceId = req.deviceId ?? '';
      const details = await this.guestUsageService.getGuestStatus(deviceId);

      this.logger.debug(
        `Guest details retrieved for: ${this.maskDeviceId(deviceId)}`,
      );
      return details;
    } catch (error) {
      this.logger.error('Error getting guest details:', error);
      const err = error as Error & { status?: number };
      throw new HttpException(
        err.message || 'Failed to get guest details',
        err.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Performs the redeem feedback code operation.
   * @param redeemDto - The redeem dto.
   * @returns The result of the operation.
   */
  @Post('redeem')
  @ApiOperation({
    summary: 'Redeem feedback code',
    description:
      'Redeem a feedback code to reset usage limit after survey completion',
  })
  @ApiResponse({
    status: 200,
    description: 'Feedback code redeemed successfully',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: '反馈码兑换成功！您已获得5次新的免费使用次数。',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid or already redeemed feedback code',
  })
  public async redeemFeedbackCode(@Body() redeemDto: RedeemFeedbackCodeDto): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const success = await this.guestUsageService.redeemFeedbackCode(
        redeemDto.feedbackCode,
      );

      this.logger.log(`Feedback code redeemed: ${redeemDto.feedbackCode}`);

      return {
        success,
        message: '反馈码兑换成功！您已获得5次新的免费使用次数。',
      };
    } catch (error) {
      this.logger.error('Error redeeming feedback code:', error);
      const err = error as Error & { status?: number };
      throw new HttpException(
        err.message || 'Failed to redeem feedback code',
        err.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retrieves service stats.
   * @returns The result of the operation.
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get service statistics (Admin only)',
    description: 'Retrieve guest service usage statistics for monitoring',
  })
  @ApiResponse({
    status: 200,
    description: 'Service statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalGuests: { type: 'number', example: 1250 },
        activeGuests: { type: 'number', example: 340 },
        pendingFeedbackCodes: { type: 'number', example: 45 },
        redeemedFeedbackCodes: { type: 'number', example: 123 },
      },
    },
  })
  public async getServiceStats(): Promise<{
    totalGuests: number;
    activeGuests: number;
    pendingFeedbackCodes: number;
    redeemedFeedbackCodes: number;
  }> {
    try {
      const stats = await this.guestUsageService.getServiceStats();
      this.logger.debug('Service statistics retrieved');
      return stats;
    } catch (error) {
      this.logger.error('Error getting service stats:', error);
      throw new HttpException(
        'Failed to get service statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Performs the check usage operation.
   * @param req - The req.
   * @returns The result of the operation.
   */
  @Post('check-usage')
  @ApiOperation({
    summary: 'Check if guest can use service',
    description: 'Check usage limit and increment counter if allowed',
  })
  @ApiResponse({
    status: 200,
    description: 'Usage check completed',
    schema: {
      type: 'object',
      properties: {
        canUse: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Service usage allowed' },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Usage limit exceeded',
    schema: {
      type: 'object',
      properties: {
        canUse: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Usage limit exceeded. Please get feedback code.',
        },
      },
    },
  })
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  public async checkUsage(@Req() req: RequestWithDeviceId) {
    try {
      const deviceId = req.deviceId ?? '';
      const canUse = await this.guestUsageService.canUse(deviceId);

      if (!canUse) {
        this.logger.debug(
          `Usage limit exceeded for guest: ${this.maskDeviceId(deviceId)}`,
        );
        throw new HttpException(
          {
            canUse: false,
            message:
              '免费次数已用完！参与问卷反馈(奖励￥3现金)可再获5次使用权！',
            needsFeedbackCode: true,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return {
        canUse: true,
        message: 'Service usage allowed',
      };
    } catch (error) {
      // Re-throw HttpException as-is, wrap other errors
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Error checking usage:', error);
      throw new HttpException(
        'Failed to check usage',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private maskDeviceId(deviceId: string): string {
    if (deviceId.length <= 8) return '***';
    return (
      deviceId.substring(0, 4) + '***' + deviceId.substring(deviceId.length - 4)
    );
  }
}
