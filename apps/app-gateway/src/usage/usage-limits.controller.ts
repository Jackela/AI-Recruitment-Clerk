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
import { UsageLimitsService } from './usage-limits.service';
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
  check() {
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
  record(@Body() _body: RecordUsageDto) {
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
  bonus(@Body() body: GrantBonusDto) {
    const amount = Number(body?.amount ?? 0);
    return this.usageLimitsService.addBonusQuota(amount);
  }
}
