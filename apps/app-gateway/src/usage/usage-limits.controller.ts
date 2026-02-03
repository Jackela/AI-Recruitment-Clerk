import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { UsageLimitsService } from './usage-limits.service';
import type { RecordUsageDto } from './dto/record-usage.dto';
import type { GrantBonusDto } from './dto/grant-bonus.dto';

/**
 * Exposes endpoints for usage limits.
 */
@Controller('usage-limits')
export class UsageLimitsController {
  constructor(private readonly usageLimitsService: UsageLimitsService) {}
  /**
   * Performs the check operation.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Get('check')
  @HttpCode(HttpStatus.OK)
  public check(): { currentUsage: number; availableQuota: number; canUse: boolean } {
    return this.usageLimitsService.getUsageStatus();
  }

  /**
   * Performs the record operation.
   * @param _body - The body.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Post('record')
  @HttpCode(HttpStatus.CREATED)
  public record(@Body() _body: RecordUsageDto): { currentUsage: number; remainingQuota: number } {
    return this.usageLimitsService.recordUsage();
  }

  /**
   * Performs the bonus operation.
   * @param body - The body.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Post('bonus')
  @HttpCode(HttpStatus.CREATED)
  public bonus(@Body() body: GrantBonusDto): { newTotalQuota: number } {
    const amount = Number(body?.amount ?? 0);
    return this.usageLimitsService.addBonusQuota(amount);
  }
}
