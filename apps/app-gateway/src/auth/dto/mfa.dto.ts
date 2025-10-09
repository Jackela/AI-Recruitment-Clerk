import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsPhoneNumber,
  IsBoolean,
  IsOptional,
  Length,
  Matches,
  IsEnum,
  ArrayMaxSize,
  IsArray,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MfaMethod {
  SMS = 'sms',
  EMAIL = 'email',
  TOTP = 'totp',
}

/**
 * Describes the enable mfa data transfer object.
 */
export class EnableMfaDto {
  @ApiProperty({ enum: MfaMethod, description: 'MFA method to enable' })
  @IsEnum(MfaMethod)
  @IsNotEmpty()
  method: MfaMethod = MfaMethod.TOTP;

  @ApiPropertyOptional({ description: 'Phone number for SMS MFA' })
  @ValidateIf((o) => o.method === MfaMethod.SMS)
  @IsPhoneNumber()
  @IsNotEmpty()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Email address for email MFA' })
  @ValidateIf((o) => o.method === MfaMethod.EMAIL)
  @IsEmail()
  @IsNotEmpty()
  email?: string;

  @ApiPropertyOptional({ description: 'TOTP secret for authenticator app' })
  @ValidateIf((o) => o.method === MfaMethod.TOTP)
  @IsString()
  @IsOptional()
  totpSecret?: string;

  @ApiProperty({ description: 'Current password for verification' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string = '';
}

/**
 * Describes the verify mfa data transfer object.
 */
export class VerifyMfaDto {
  @ApiProperty({ description: 'MFA token/code' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 8)
  @Matches(/^[0-9]+$/, { message: 'Token must contain only numbers' })
  token: string = '';

  @ApiPropertyOptional({ description: 'MFA method used' })
  @IsEnum(MfaMethod)
  @IsOptional()
  method?: MfaMethod;

  @ApiPropertyOptional({ description: 'Remember this device for 30 days' })
  @IsBoolean()
  @IsOptional()
  rememberDevice?: boolean = false;
}

/**
 * Describes the disable mfa data transfer object.
 */
export class DisableMfaDto {
  @ApiProperty({ description: 'Current password for verification' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string = '';

  @ApiProperty({ description: 'MFA token for verification' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 8)
  @Matches(/^[0-9]+$/, { message: 'Token must contain only numbers' })
  mfaToken: string = '';
}

/**
 * Describes the generate backup codes data transfer object.
 */
export class GenerateBackupCodesDto {
  @ApiProperty({ description: 'Current password for verification' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string = '';

  @ApiProperty({ description: 'MFA token for verification' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 8)
  @Matches(/^[0-9]+$/, { message: 'Token must contain only numbers' })
  mfaToken: string = '';
}

/**
 * Describes the use backup code data transfer object.
 */
export class UseBackupCodeDto {
  @ApiProperty({ description: 'Backup recovery code' })
  @IsString()
  @IsNotEmpty()
  @Length(8, 12)
  @Matches(/^[A-Z0-9-]+$/, { message: 'Invalid backup code format' })
  backupCode: string = '';
}

/**
 * Describes the mfa status data transfer object.
 */
export class MfaStatusDto {
  @ApiProperty({ description: 'Whether MFA is enabled' })
  @IsBoolean()
  enabled: boolean = false;

  @ApiProperty({ description: 'List of enabled MFA methods', type: [String] })
  @IsArray()
  @IsEnum(MfaMethod, { each: true })
  @ArrayMaxSize(3)
  methods: MfaMethod[] = [];

  @ApiProperty({ description: 'Number of remaining backup codes' })
  remainingBackupCodes: number = 0;

  @ApiProperty({ description: 'Whether device is trusted (MFA not required)' })
  @IsBoolean()
  deviceTrusted: boolean = false;

  @ApiProperty({ description: 'Backup codes available' })
  @IsBoolean()
  hasBackupCodes: boolean = false;
}

/**
 * Describes the mfa setup response data transfer object.
 */
export class MfaSetupResponseDto {
  @ApiProperty({ description: 'Whether setup was successful' })
  success: boolean = false;

  @ApiProperty({
    description: 'QR code for TOTP setup (base64 encoded)',
    required: false,
  })
  qrCode?: string;

  @ApiProperty({
    description: 'Secret key for manual TOTP setup',
    required: false,
  })
  secretKey?: string;

  @ApiProperty({
    description: 'Backup codes for recovery',
    type: [String],
    required: false,
  })
  backupCodes?: string[];

  @ApiProperty({ description: 'Setup message or instructions' })
  message: string = '';
}
