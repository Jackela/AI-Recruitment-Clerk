import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsArray,
  Min,
} from 'class-validator';
import { EventType } from '@ai-recruitment-clerk/shared-dtos';

enum MetricUnit {
  COUNT = 'count',
  PERCENTAGE = 'percentage',
  MILLISECONDS = 'milliseconds',
}

/**
 * 用户交互事件追踪DTO
 */
export class TrackEventDto {
  @ApiProperty({ description: '会话ID', example: 'session_12345' })
  @IsString()
  @IsNotEmpty()
  sessionId = '';

  @ApiProperty({
    description: '事件类型',
    enum: EventType,
    example: EventType.USER_INTERACTION,
  })
  @IsEnum(EventType)
  eventType: EventType = EventType.USER_INTERACTION;

  @ApiProperty({
    description: '事件数据',
    example: { action: 'click', target: 'submit_button' },
  })
  @IsObject()
  eventData: Record<string, unknown> = {};

  @ApiProperty({
    description: '事件上下文（可选）',
    example: { pageUrl: '/questionnaire', userAgent: 'Chrome/91.0' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

/**
 * 业务指标记录DTO
 */
export class RecordMetricDto {
  @ApiProperty({
    description: '指标名称',
    example: 'questionnaire_completion_rate',
  })
  @IsString()
  @IsNotEmpty()
  metricName = '';

  @ApiProperty({ description: '指标值', example: 85.5 })
  @IsNumber()
  @Min(0)
  metricValue = 0;

  @ApiProperty({
    description: '指标单位',
    enum: MetricUnit,
    example: MetricUnit.PERCENTAGE,
  })
  @IsEnum(MetricUnit)
  metricUnit: MetricUnit = MetricUnit.COUNT;

  @ApiProperty({
    description: '指标维度（可选）',
    example: { source: 'web', region: 'us-east' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  dimensions?: Record<string, string>;
}

/**
 * 批量处理事件DTO
 */
export class BatchProcessDto {
  @ApiProperty({
    description: '待处理的事件ID列表',
    example: ['event_1', 'event_2', 'event_3'],
  })
  @IsArray()
  @IsString({ each: true })
  eventIds: string[] = [];
}

/**
 * 会话分析响应DTO
 */
export class SessionAnalyticsDto {
  @ApiProperty({ description: '会话ID' })
  sessionId = '';

  @ApiProperty({ description: '用户ID' })
  userId?: string;

  @ApiProperty({ description: '会话开始时间' })
  startTime: Date = new Date();

  @ApiProperty({ description: '会话结束时间' })
  endTime: Date = new Date();

  @ApiProperty({ description: '事件数量' })
  eventCount = 0;

  @ApiProperty({ description: '最后活动时间' })
  lastActivityTime: Date = new Date();

  @ApiProperty({ description: '是否活跃中' })
  isActive = false;

  @ApiProperty({ description: '平均事件间隔（毫秒）' })
  averageEventInterval = 0;
}

/**
 * 事件处理性能指标DTO
 */
export class ProcessingMetricsDto {
  @ApiProperty({ description: '总事件数' })
  totalEvents = 0;

  @ApiProperty({ description: '已处理事件数' })
  processedEvents = 0;

  @ApiProperty({ description: '失败事件数' })
  failedEvents = 0;

  @ApiProperty({ description: '平均处理时间（毫秒）' })
  averageProcessingTime = 0;

  @ApiProperty({ description: '每秒吞吐量' })
  throughputPerSecond = 0;

  @ApiProperty({ description: '错误率（百分比）' })
  errorRate = 0;
}

/**
 * 数据隐私指标DTO
 */
export class PrivacyMetricsDto {
  @ApiProperty({ description: '总事件数' })
  totalEvents = 0;

  @ApiProperty({ description: '已匿名化事件数' })
  anonymizedEvents = 0;

  @ApiProperty({ description: '已过期事件数' })
  expiredEvents = 0;

  @ApiProperty({ description: '待匿名化事件数' })
  pendingAnonymization = 0;

  @ApiProperty({ description: '合规分数（0-100）' })
  complianceScore = 0;

  @ApiProperty({
    description: '风险等级',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  })
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
}

/**
 * 报告访问权限响应DTO
 */
export class ReportingAccessDto {
  @ApiProperty({ description: '是否有访问权限' })
  hasAccess = false;

  @ApiProperty({ description: '权限列表' })
  permissions: string[] = [];

  @ApiProperty({ description: '访问限制' })
  restrictions: string[] = [];

  @ApiProperty({ description: '数据范围限制' })
  dataScope = '';

  @ApiProperty({ description: '过期时间' })
  expiresAt?: Date;
}

/**
 * 数据保留报告DTO
 */
export class DataRetentionReportDto {
  @ApiProperty({ description: '报告周期' })
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  } = {
    startDate: new Date(),
    endDate: new Date(),
  };

  @ApiProperty({ description: '总事件数' })
  totalEvents = 0;

  @ApiProperty({ description: '待删除事件数' })
  eventsToDelete = 0;

  @ApiProperty({ description: '待匿名化事件数' })
  eventsToAnonymize = 0;

  @ApiProperty({ description: '按事件类型统计' })
  eventTypeStatistics: Record<string, unknown> = {};

  @ApiProperty({ description: '保留策略列表' })
  retentionPolicies: Array<Record<string, unknown>> = [];
}

/**
 * 事件创建结果DTO
 */
export class EventCreationResultDto {
  @ApiProperty({ description: '是否成功' })
  success = false;

  @ApiProperty({ description: '事件摘要', required: false })
  data?: {
    id: string;
    sessionId: string;
    userId?: string;
    eventType: EventType;
    timestamp: string;
    status: string;
  };

  @ApiProperty({ description: '错误信息', required: false })
  errors?: string[];
}

/**
 * 批量处理结果DTO
 */
export class BatchProcessingResultDto {
  @ApiProperty({ description: '是否成功' })
  success = false;

  @ApiProperty({ description: '处理结果', required: false })
  data?: {
    totalEvents: number;
    successCount: number;
    failureCount: number;
    results: Array<{
      eventId: string;
      success: boolean;
      processedAt?: Date;
      error?: string;
    }>;
  };

  @ApiProperty({ description: '错误信息', required: false })
  errors?: string[];
}
