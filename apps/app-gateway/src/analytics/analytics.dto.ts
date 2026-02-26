import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsEnum,
  IsNumber,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Analytics event types
 */
export enum AnalyticsEventType {
  PAGE_VIEW = 'page_view',
  USER_ACTION = 'user_action',
  RESUME_UPLOAD = 'resume_upload',
  JOB_CREATE = 'job_create',
  MATCH_SCORE = 'match_score',
  ERROR = 'error',
}

/**
 * DTO for analytics event submission
 */
export class AnalyticsEventDto {
  @ApiProperty({ description: 'Event type', enum: AnalyticsEventType })
  @IsEnum(AnalyticsEventType)
  @IsNotEmpty()
  eventType!: AnalyticsEventType;

  @ApiPropertyOptional({ description: 'User ID associated with the event' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Event timestamp in ISO format' })
  @IsDateString()
  @IsOptional()
  timestamp?: string;

  @ApiPropertyOptional({ description: 'Additional event data' })
  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;
}

/**
 * DTO for performance metrics submission
 */
export class PerformanceMetricDto {
  @ApiProperty({ description: 'Metric name' })
  @IsString()
  @IsNotEmpty()
  metricName!: string;

  @ApiProperty({ description: 'Metric value' })
  @IsNumber()
  @IsNotEmpty()
  value!: number;

  @ApiPropertyOptional({ description: 'Metric unit (ms, bytes, count, etc.)' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional({ description: 'Tags for filtering/grouping' })
  @IsObject()
  @IsOptional()
  tags?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Metric timestamp in ISO format' })
  @IsDateString()
  @IsOptional()
  timestamp?: string;
}

/**
 * DTO for business metrics submission
 */
export class BusinessMetricDto {
  @ApiProperty({ description: 'Business metric name' })
  @IsString()
  @IsNotEmpty()
  metricName!: string;

  @ApiProperty({ description: 'Metric value' })
  @IsNumber()
  @IsNotEmpty()
  value!: number;

  @ApiPropertyOptional({ description: 'Associated entity type (job, resume, user)' })
  @IsString()
  @IsOptional()
  entityType?: string;

  @ApiPropertyOptional({ description: 'Associated entity ID' })
  @IsString()
  @IsOptional()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Additional context' })
  @IsObject()
  @IsOptional()
  context?: Record<string, unknown>;
}

/**
 * Report type enum
 */
export enum ReportType {
  COMPREHENSIVE = 'comprehensive',
  RESUME_ANALYSIS = 'resume_analysis',
  JOB_PERFORMANCE = 'job_performance',
  USER_ACTIVITY = 'user_activity',
  MATCH_STATISTICS = 'match_statistics',
}

/**
 * DTO for report filters
 */
export class ReportFiltersDto {
  @ApiPropertyOptional({ description: 'Minimum match score filter' })
  @IsNumber()
  @IsOptional()
  minMatchScore?: number;

  @ApiPropertyOptional({ description: 'Maximum match score filter' })
  @IsNumber()
  @IsOptional()
  maxMatchScore?: number;

  @ApiPropertyOptional({ description: 'Status filter' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Additional filter properties' })
  @IsObject()
  @IsOptional()
  custom?: Record<string, unknown>;
}

/**
 * DTO for report generation request
 */
export class GenerateReportDto {
  @ApiProperty({ description: 'Type of report to generate', enum: ReportType })
  @IsEnum(ReportType)
  @IsNotEmpty()
  reportType!: ReportType;

  @ApiPropertyOptional({ description: 'Start date for report period' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for report period' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by job ID' })
  @IsString()
  @IsOptional()
  jobId?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Additional filters' })
  @ValidateNested()
  @IsOptional()
  @Type(() => ReportFiltersDto)
  filters?: ReportFiltersDto;
}
