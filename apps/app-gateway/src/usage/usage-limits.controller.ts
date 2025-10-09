import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

let currentUsage = 0;
let quota = 100;

/**
 * Exposes endpoints for usage limits.
 */
@Controller('usage-limits')
export class UsageLimitsController {
  /**
   * Performs the check operation.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Get('check')
  @HttpCode(HttpStatus.OK)
  check() {
    return {
      currentUsage,
      availableQuota: Math.max(0, quota - currentUsage),
      canUse: currentUsage < quota,
    };
  }

  /**
   * Performs the record operation.
   * @param _body - The body.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Post('record')
  @HttpCode(HttpStatus.CREATED)
  record(@Body() _body: any) {
    currentUsage += 1;
    return {
      currentUsage,
      remainingQuota: Math.max(0, quota - currentUsage),
    };
  }

  /**
   * Performs the bonus operation.
   * @param body - The body.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Post('bonus')
  @HttpCode(HttpStatus.CREATED)
  bonus(@Body() body: any) {
    const amount = Number(body?.amount || 0);
    if (amount > 0) quota += amount;
    return { newTotalQuota: quota };
  }
}

