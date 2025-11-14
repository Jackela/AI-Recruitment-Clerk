import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { FlagsStore } from './flags.store';
import type { FeatureFlag } from './flags.store';
import { OpsGuard } from './ops.guard';
import { OpsPermissionsGuard } from './ops-permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';

@Controller('ops/flags')
@UseGuards(OpsGuard, OpsPermissionsGuard)
export class FlagsController {
  @Get()
  @Permissions(Permission.SYSTEM_CONFIG)
  list() {
    return { items: FlagsStore.list() };
  }

  @Get(':key')
  @Permissions(Permission.SYSTEM_CONFIG)
  get(@Param('key') key: string) {
    const flag = FlagsStore.get(key);
    if (!flag) throw new NotFoundException('Flag not found');
    return flag;
  }

  @Post()
  @Permissions(Permission.SYSTEM_CONFIG)
  upsert(@Body() body: FeatureFlag) {
    // basic normalization
    const pct = Math.max(0, Math.min(100, Number(body.rolloutPercentage ?? 0)));
    return FlagsStore.upsert({ ...body, rolloutPercentage: pct, enabled: !!body.enabled, key: body.key });
  }

  @Delete(':key')
  @HttpCode(204)
  @Permissions(Permission.SYSTEM_CONFIG)
  remove(@Param('key') key: string) {
    const existed = FlagsStore.delete(key);
    if (!existed) throw new NotFoundException('Flag not found');
  }
}
