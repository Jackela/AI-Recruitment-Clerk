import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, UseGuards, BadRequestException } from '@nestjs/common';
import type { FeatureFlag } from './flags.store';
import { FlagsStore } from './flags.store';
import { OpsGuard } from './ops.guard';
import { OpsPermissionsGuard } from './ops-permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';

interface FlagsListResponse {
  items: FeatureFlag[];
}

// Validate flag keys to prevent injection attacks
// Only allow alphanumeric, hyphen, underscore, and dot characters
const FLAG_KEY_REGEX = /^[a-zA-Z0-9._-]+$/;

function validateFlagKey(key: string): void {
  if (!key || typeof key !== 'string') {
    throw new BadRequestException('Flag key must be a non-empty string');
  }
  if (!FLAG_KEY_REGEX.test(key)) {
    throw new BadRequestException('Flag key contains invalid characters');
  }
  if (key.length > 100) {
    throw new BadRequestException('Flag key is too long (max 100 characters)');
  }
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
    validateFlagKey(key);
    const flag = FlagsStore.get(key);
    if (!flag) throw new NotFoundException('Flag not found');
    return flag;
  }

  @Post()
  @Permissions(Permission.SYSTEM_CONFIG)
  public upsert(@Body() body: FeatureFlag): FeatureFlag {
    // Validate the key before using it
    validateFlagKey(body.key);
    // basic normalization
    const pct = Math.max(0, Math.min(100, Number(body.rolloutPercentage ?? 0)));
    return FlagsStore.upsert({ ...body, rolloutPercentage: pct, enabled: !!body.enabled, key: body.key });
  }

  @Delete(':key')
  @HttpCode(204)
  @Permissions(Permission.SYSTEM_CONFIG)
  public remove(@Param('key') key: string): void {
    validateFlagKey(key);
    const existed = FlagsStore.delete(key);
    if (!existed) throw new NotFoundException('Flag not found');
  }
}
