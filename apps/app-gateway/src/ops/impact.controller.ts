import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { MetricsService } from './metrics.service';
import { OpsGuard } from './ops.guard';
import { OpsPermissionsGuard } from './ops-permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';

interface ImpactSummary {
  cohort: string;
  percentage: string;
  exposure: number;
  success: number;
  error: number;
  cancel: number;
  successRate: number;
}

@Controller('ops/impact')
@UseGuards(OpsGuard, OpsPermissionsGuard)
export class ImpactController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Permissions(Permission.VIEW_ANALYTICS)
  public summary(@Query('cohort') cohort?: string, @Query('percentage') percentage?: string): ImpactSummary {
    // Prototype returns global metrics; cohort/percentage reserved for future use
    return { cohort: cohort ?? 'all', percentage: percentage ?? 'global', ...this.metrics.getSnapshot() };
  }
}
