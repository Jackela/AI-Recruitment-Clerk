import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsIn,
  Length,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Describes the generate feedback code data transfer object.
 */
export class GenerateFeedbackCodeDto {
  @ApiProperty({
    description: 'Unique device identifier',
    example: 'uuid-device-12345',
  })
  @IsString()
  @Length(8, 128)
  public deviceId!: string;
}

/**
 * Describes the guest usage response data transfer object.
 */
export class GuestUsageResponseDto {
  @ApiProperty({
    description: 'Whether the guest can use the service',
    example: true,
  })
  @IsBoolean()
  public canUse!: boolean;

  @ApiProperty({
    description: 'Remaining usage count for the guest',
    example: 3,
    minimum: 0,
    maximum: 5,
  })
  @IsNumber()
  @Min(0)
  @Max(5)
  public remainingCount!: number;

  @ApiProperty({
    description: 'Whether the guest needs a feedback code to continue',
    example: false,
  })
  @IsBoolean()
  public needsFeedbackCode!: boolean;

  @ApiPropertyOptional({
    description: 'Current feedback code if generated',
    example: 'fb-code-uuid-67890',
  })
  @IsOptional()
  @IsString()
  public feedbackCode?: string;
}

/**
 * Describes the redeem feedback code data transfer object.
 */
export class RedeemFeedbackCodeDto {
  @ApiProperty({
    description: 'Feedback code to redeem',
    example: 'fb-code-uuid-67890',
  })
  @IsString()
  @Length(10, 256)
  public feedbackCode!: string;
}

/**
 * Describes the guest status data transfer object.
 */
export class GuestStatusDto {
  @ApiProperty({
    description: 'Device identifier',
    example: 'uuid-device-12345',
  })
  @IsString()
  public deviceId!: string;

  @ApiProperty({
    description: 'Current usage count',
    example: 2,
  })
  @IsNumber()
  @Min(0)
  public usageCount!: number;

  @ApiProperty({
    description: 'Maximum allowed usage count',
    example: 5,
  })
  @IsNumber()
  @Min(1)
  public maxUsage!: number;

  @ApiProperty({
    description: 'Whether usage is currently limited',
    example: false,
  })
  @IsBoolean()
  public isLimited!: boolean;

  @ApiPropertyOptional({
    description: 'Status of feedback code if exists',
    example: 'generated',
    enum: ['generated', 'redeemed'],
  })
  @IsOptional()
  @IsIn(['generated', 'redeemed'])
  public feedbackCodeStatus?: 'generated' | 'redeemed';

  @ApiProperty({
    description: 'Last usage timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  public lastUsed!: Date;
}
