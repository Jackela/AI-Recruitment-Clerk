import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Describes the analysis request data transfer object.
 */
export class AnalysisRequestDto {
  @ApiProperty({
    description: '职位描述文本',
    example: 'We are seeking a Senior Cloud Architect to lead the design and implementation of large-scale, highly available cloud platforms. Required Skills: AWS, Kubernetes, Docker...',
    maxLength: 10000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000, { message: '职位描述不能超过10,000个字符' })
  jdText: string;

  @ApiProperty({
    description: '分析会话ID（可选，用于关联多次分析）',
    example: 'session_abc123',
    required: false,
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({
    description: '分析配置选项（可选）',
    example: '{"extractSkills": true, "matchThreshold": 0.7}',
    required: false,
  })
  @IsOptional()
  @IsString()
  options?: string;
}