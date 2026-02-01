import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { MetricsService } from './metrics.service';
import { OpsGuard } from './ops.guard';
import { OpsPermissionsGuard } from './ops-permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';

@Controller('ops/observability')
@UseGuards(OpsGuard, OpsPermissionsGuard)
export class ObservabilityController {
  constructor(private readonly metrics: MetricsService) {}

  @Get('funnels')
  @Permissions(Permission.VIEW_ANALYTICS)
  funnels(@Query('window') _window?: string) {
    // Window ignored for in-memory prototype
    return { window: _window || '24h', ...this.metrics.getSnapshot() };
  }

  @Get('health')
  @Permissions(Permission.VIEW_ANALYTICS)
  health() {
    return { status: 'ok' };
  }
}
