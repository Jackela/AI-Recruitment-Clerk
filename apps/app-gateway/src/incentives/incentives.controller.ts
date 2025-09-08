import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

const incentives = new Map<string, { id: string; amount: number; status: 'approved' | 'pending' }>();

@Controller('incentives')
export class IncentivesController {
  @UseGuards(JwtAuthGuard)
  @Post('questionnaire')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any) {
    const incentiveId = id('inc');
    const amount = Math.max(1, Math.round((body?.qualityScore || 80) / 10));
    incentives.set(incentiveId, { id: incentiveId, amount, status: 'pending' });
    return { incentiveId, rewardAmount: amount };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/validate')
  @HttpCode(HttpStatus.OK)
  validate(@Param('id') id: string) {
    return { isValid: incentives.has(id) };
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Param('id') id: string, @Body() _body: any) {
    const rec = incentives.get(id) || { id, amount: 1, status: 'pending' as const };
    rec.status = 'approved';
    incentives.set(id, rec);
    return { approvedAt: new Date().toISOString(), approvalStatus: 'approved' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats/overview')
  @HttpCode(HttpStatus.OK)
  stats(@Query('timeRange') _timeRange?: string) {
    const totalRewards = Array.from(incentives.values()).reduce((s, r) => s + r.amount, 0);
    return {
      overview: {
        totalRewards,
      },
    };
  }
}

