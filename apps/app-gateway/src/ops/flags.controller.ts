import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import type { FeatureFlag } from './flags.store';
import { FlagsStore } from './flags.store';
import { OpsGuard } from './ops.guard';
import { OpsPermissionsGuard } from './ops-permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';

interface FlagsListResponse {
  items: FeatureFlag[];
}

@Controller('ops/flags')
@UseGuards(OpsGuard, OpsPermissionsGuard)
export class FlagsController {
  @Get()
  @Permissions(Permission.SYSTEM_CONFIG)
  public list(): FlagsListResponse {
    return { items: FlagsStore.list() };
  }

  @Get(':key')
  @Permissions(Permission.SYSTEM_CONFIG)
  public get(@Param('key') key: string): FeatureFlag {
    const flag = FlagsStore.get(key);
    if (!flag) throw new NotFoundException('Flag not found');
    return flag;
  }

  @Post()
  @Permissions(Permission.SYSTEM_CONFIG)
  public upsert(@Body() body: FeatureFlag): FeatureFlag {
    // basic normalization
    const pct = Math.max(0, Math.min(100, Number(body.rolloutPercentage ?? 0)));
    return FlagsStore.upsert({ ...body, rolloutPercentage: pct, enabled: !!body.enabled, key: body.key });
  }

  @Delete(':key')
  @HttpCode(204)
  @Permissions(Permission.SYSTEM_CONFIG)
  public remove(@Param('key') key: string): void {
    const existed = FlagsStore.delete(key);
    if (!existed) throw new NotFoundException('Flag not found');
  }
}
