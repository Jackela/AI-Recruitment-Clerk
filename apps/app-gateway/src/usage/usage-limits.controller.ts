import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

let currentUsage = 0;
let quota = 100;

@Controller('usage-limits')
export class UsageLimitsController {
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

  @UseGuards(JwtAuthGuard)
  @Post('bonus')
  @HttpCode(HttpStatus.CREATED)
  bonus(@Body() body: any) {
    const amount = Number(body?.amount || 0);
    if (amount > 0) quota += amount;
    return { newTotalQuota: quota };
  }
}

