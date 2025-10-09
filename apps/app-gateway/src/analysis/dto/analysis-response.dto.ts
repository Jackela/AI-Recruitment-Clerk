import { ApiProperty } from '@nestjs/swagger';

/**
 * Describes the analysis initiated response data transfer object.
 */
export class AnalysisInitiatedResponseDto {
  @ApiProperty({
    description: '分析会话ID',
    example: 'analysis_xyz789',
  })
  analysisId: string;

  @ApiProperty({
    description: '分析状态',
    example: 'processing',
    enum: ['initiated', 'processing', 'completed', 'failed'],
  })
  status: 'initiated' | 'processing' | 'completed' | 'failed';

  @ApiProperty({
    description: '状态消息',
    example: 'Analysis pipeline initiated successfully',
  })
  message: string;

  @ApiProperty({
    description: '预计处理时间（秒）',
    example: 30,
  })
  estimatedProcessingTime?: number;

  @ApiProperty({
    description: '处理步骤',
    example: ['jd_extraction', 'resume_parsing', 'skill_matching', 'scoring'],
  })
  processingSteps?: string[];

  @ApiProperty({
    description: '创建时间戳',
    example: '2025-09-30T13:15:00.000Z',
  })
  timestamp: string;
}

/**
 * Describes the skill match data transfer object.
 */
export class SkillMatchDto {
  @ApiProperty({
    description: '技能名称',
    example: 'AWS',
  })
  skill: string;

  @ApiProperty({
    description: '匹配置信度 (0-1)',
    example: 0.95,
  })
  confidence: number;

  @ApiProperty({
    description: '技能分类',
    example: 'cloud_technology',
  })
  category?: string;
}

/**
 * Describes the analysis result data transfer object.
 */
export class AnalysisResultDto {
  @ApiProperty({
    description: '分析会话ID',
    example: 'analysis_xyz789',
  })
  analysisId: string;

  @ApiProperty({
    description: '整体匹配分数 (0-100)',
    example: 85,
  })
  overallScore: number;

  @ApiProperty({
    description: '匹配的技能列表',
    type: [SkillMatchDto],
  })
  matchedSkills: SkillMatchDto[];

  @ApiProperty({
    description: '缺失的关键技能',
    example: ['Azure', 'Terraform'],
  })
  missingSkills: string[];

  @ApiProperty({
    description: '分析总结',
    example: '该候选人具有强的云架构背景，特别是在AWS和Kubernetes方面，但缺乏Azure和Terraform经验。',
  })
  summary: string;

  @ApiProperty({
    description: '推荐建议',
    example: ['建议进行技术面试验证AWS技能', '可考虑提供Azure培训'],
  })
  recommendations: string[];

  @ApiProperty({
    description: '处理时间统计（毫秒）',
    example: { jdExtraction: 1200, resumeParsing: 2300, skillMatching: 800, scoring: 500 },
  })
  processingTimes?: Record<string, number>;

  @ApiProperty({
    description: '完成时间戳',
    example: '2025-09-30T13:15:30.000Z',
  })
  completedAt: string;
}