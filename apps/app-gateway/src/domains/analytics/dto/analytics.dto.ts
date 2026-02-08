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
// Fallback enums for analytics
enum EventType {
  USER_INTERACTION = 'user_interaction',
  SYSTEM_EVENT = 'system_event',
  ERROR_EVENT = 'error_event',
}

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
  public sessionId = '';

  @ApiProperty({
    description: '事件类型',
    enum: EventType,
    example: EventType.USER_INTERACTION,
  })
  @IsEnum(EventType)
  public eventType: EventType = EventType.USER_INTERACTION;

  @ApiProperty({
    description: '事件数据',
    example: { action: 'click', target: 'submit_button' },
  })
  @IsObject()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public eventData: any;

  @ApiProperty({
    description: '事件上下文（可选）',
    example: { pageUrl: '/questionnaire', userAgent: 'Chrome/91.0' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public context?: any;
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
  public metricName = '';

  @ApiProperty({ description: '指标值', example: 85.5 })
  @IsNumber()
  @Min(0)
  public metricValue = 0;

  @ApiProperty({
    description: '指标单位',
    enum: MetricUnit,
    example: MetricUnit.PERCENTAGE,
  })
  @IsEnum(MetricUnit)
  public metricUnit: MetricUnit = MetricUnit.COUNT;

  @ApiProperty({
    description: '指标维度（可选）',
    example: { source: 'web', region: 'us-east' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  public dimensions?: Record<string, string>;
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
  public eventIds: string[] = [];
}

/**
 * 会话分析响应DTO
 */
export class SessionAnalyticsDto {
  @ApiProperty({ description: '会话ID' })
  public sessionId = '';

  @ApiProperty({ description: '用户ID' })
  public userId?: string;

  @ApiProperty({ description: '会话开始时间' })
  public startTime: Date = new Date();

  @ApiProperty({ description: '会话结束时间' })
  public endTime: Date = new Date();

  @ApiProperty({ description: '事件数量' })
  public eventCount = 0;

  @ApiProperty({ description: '最后活动时间' })
  public lastActivityTime: Date = new Date();

  @ApiProperty({ description: '是否活跃中' })
  public isActive = false;

  @ApiProperty({ description: '平均事件间隔（毫秒）' })
  public averageEventInterval = 0;
}

/**
 * 事件处理性能指标DTO
 */
export class ProcessingMetricsDto {
  @ApiProperty({ description: '总事件数' })
  public totalEvents = 0;

  @ApiProperty({ description: '已处理事件数' })
  public processedEvents = 0;

  @ApiProperty({ description: '失败事件数' })
  public failedEvents = 0;

  @ApiProperty({ description: '平均处理时间（毫秒）' })
  public averageProcessingTime = 0;

  @ApiProperty({ description: '每秒吞吐量' })
  public throughputPerSecond = 0;

  @ApiProperty({ description: '错误率（百分比）' })
  public errorRate = 0;
}

/**
 * 数据隐私指标DTO
 */
export class PrivacyMetricsDto {
  @ApiProperty({ description: '总事件数' })
  public totalEvents = 0;

  @ApiProperty({ description: '已匿名化事件数' })
  public anonymizedEvents = 0;

  @ApiProperty({ description: '已过期事件数' })
  public expiredEvents = 0;

  @ApiProperty({ description: '待匿名化事件数' })
  public pendingAnonymization = 0;

  @ApiProperty({ description: '合规分数（0-100）' })
  public complianceScore = 0;

  @ApiProperty({
    description: '风险等级',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  })
  public riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
}

/**
 * 报告访问权限响应DTO
 */
export class ReportingAccessDto {
  @ApiProperty({ description: '是否有访问权限' })
  public hasAccess = false;

  @ApiProperty({ description: '权限列表' })
  public permissions: string[] = [];

  @ApiProperty({ description: '访问限制' })
  public restrictions: string[] = [];

  @ApiProperty({ description: '数据范围限制' })
  public dataScope = '';

  @ApiProperty({ description: '过期时间' })
  public expiresAt?: Date;
}

/**
 * 数据保留报告DTO
 */
export class DataRetentionReportDto {
  @ApiProperty({ description: '报告周期' })
  public reportPeriod: {
    startDate: Date;
    endDate: Date;
  } = {
    startDate: new Date(),
    endDate: new Date(),
  };

  @ApiProperty({ description: '总事件数' })
  public totalEvents = 0;

  @ApiProperty({ description: '待删除事件数' })
  public eventsToDelete = 0;

  @ApiProperty({ description: '待匿名化事件数' })
  public eventsToAnonymize = 0;

  @ApiProperty({ description: '按事件类型统计' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public eventTypeStatistics: Record<string, any> = {};

  @ApiProperty({ description: '保留策略列表' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public retentionPolicies: any[] = [];
}

/**
 * 事件创建结果DTO
 */
export class EventCreationResultDto {
  @ApiProperty({ description: '是否成功' })
  public success = false;

  @ApiProperty({ description: '事件摘要', required: false })
  public data?: {
    id: string;
    sessionId: string;
    userId?: string;
    eventType: EventType;
    timestamp: string;
    status: string;
  };

  @ApiProperty({ description: '错误信息', required: false })
  public errors?: string[];
}

/**
 * 批量处理结果DTO
 */
export class BatchProcessingResultDto {
  @ApiProperty({ description: '是否成功' })
  public success = false;

  @ApiProperty({ description: '处理结果', required: false })
  public data?: {
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
  public errors?: string[];
}
