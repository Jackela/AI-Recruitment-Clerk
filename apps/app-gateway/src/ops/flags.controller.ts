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

/**
 * Validates and sanitizes the description field.
 * Only allows safe characters: letters, numbers, spaces, and basic punctuation.
 * This prevents XSS by blocking HTML tags, JavaScript protocols, and event handlers.
 */
function validateAndSanitizeDescription(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const str = String(value);
  // Only allow safe characters: alphanumeric, spaces, and basic punctuation
  // Block: <, >, &, ", ', javascript:, data:, vbscript:, and any event handler patterns
  const SAFE_DESCRIPTION_REGEX = /^[a-zA-Z0-9\s\-._,:;!?@#$%()+=[\]{}|\\/]*$/;

  if (!SAFE_DESCRIPTION_REGEX.test(str)) {
    throw new BadRequestException('Description contains invalid characters');
  }
  // Additionally, check for dangerous patterns that might pass the regex
  const dangerousPatterns = [
    /javascript:/gi,
    /data:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<[^>]*>/gi, // HTML tags
  ];
  for (const pattern of dangerousPatterns) {
    if (pattern.test(str)) {
      throw new BadRequestException('Description contains dangerous content');
    }
  }
  return str.slice(0, 500); // Limit length
}

/**
 * Validates cohort identifiers.
 * Only allows alphanumeric, hyphen, underscore, and forward slash (for namespaced cohorts).
 */
function validateCohort(value: unknown): string {
  const str = String(value);
  // Only allow safe characters for cohort identifiers
  const SAFE_COHORT_REGEX = /^[a-zA-Z0-9_\-/]+$/;

  if (!SAFE_COHORT_REGEX.test(str)) {
    throw new BadRequestException(`Cohort "${str}" contains invalid characters`);
  }
  return str.slice(0, 100); // Limit length
}

/**
 * Validates the updatedBy field (username/user identifier).
 * Only allows alphanumeric, hyphen, underscore, dot, and @ for email-like formats.
 */
function validateUpdatedBy(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const str = String(value);
  // Allow usernames and email-like formats
  const SAFE_USER_REGEX = /^[a-zA-Z0-9._@-]+$/;

  if (!SAFE_USER_REGEX.test(str)) {
    throw new BadRequestException('UpdatedBy contains invalid characters');
  }
  return str.slice(0, 100); // Limit length
}

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
    // Data is already validated when stored, no additional sanitization needed
    return { items: FlagsStore.list() };
  }

  @Get(':key')
  @Permissions(Permission.SYSTEM_CONFIG)
  public get(@Param('key') key: string): FeatureFlag {
    validateFlagKey(key);
    const flag = FlagsStore.get(key);
    if (!flag) throw new NotFoundException('Flag not found');
    // Data is already validated when stored
    return flag;
  }

  @Post()
  @Permissions(Permission.SYSTEM_CONFIG)
  public upsert(@Body() body: FeatureFlag): FeatureFlag {
    // Validate the key before using it
    validateFlagKey(body.key);

    // Validate and sanitize string fields at input time
    // This prevents malicious data from ever being stored
    const description = validateAndSanitizeDescription(body.description);
    const cohorts = body.cohorts?.map(c => validateCohort(c));
    const updatedBy = validateUpdatedBy(body.updatedBy);

    // basic normalization
    const pct = Math.max(0, Math.min(100, Number(body.rolloutPercentage ?? 0)));
    // Only store validated fields - do NOT spread body to avoid including unvalidated properties
    return FlagsStore.upsert({
      key: body.key,
      rolloutPercentage: pct,
      enabled: !!body.enabled,
      description,
      cohorts,
      updatedBy,
    });
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
