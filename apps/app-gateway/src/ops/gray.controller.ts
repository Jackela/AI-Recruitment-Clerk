import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { OpsGuard } from './ops.guard';
import { OpsPermissionsGuard } from './ops-permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';
import { featureFlags } from '../config/feature-flags.config';

@Controller('ops/release')
@UseGuards(OpsGuard, OpsPermissionsGuard)
export class GrayController {
  @Post('gray')
  @HttpCode(200)
  @Permissions(Permission.SYSTEM_CONFIG)
  setPercentage(@Body() body: { flagKey?: string; percentage: number }) {
    const pct = Math.max(0, Math.min(100, Number(body.percentage)));
    featureFlags.rolloutPercentage = pct;
    return { flagKey: body.flagKey || 'default', percentage: pct };
  }
}
