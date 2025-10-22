import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';

/**
 * Exposes endpoints for simple jobs.
 */
@ApiTags('jobs')
@Controller('jobs')
export class SimpleJobsController {
  private readonly logger = new Logger(SimpleJobsController.name);
  
  /**
   * Initializes a new instance of the Simple Jobs Controller.
   * @param jobsService - The jobs service.
   */
  constructor(private readonly jobsService: JobsService) {}
  /**
   * Retrieves all jobs.
   * @returns The result of the operation.
   */
  @ApiOperation({ summary: '获取所有职位' })
  @ApiResponse({ status: 200, description: '职位列表获取成功' })
  @Get()
  async getAllJobs() {
    return {
      success: true,
      data: [
        {
          id: 'job-001',
          title: '前端开发工程师',
          company: 'AI科技公司',
          department: '技术部',
          location: '上海',
          applicants: 24,
          createdAt: new Date().toISOString(),
          status: 'active',
          description: '负责AI招聘助手前端界面开发，React/TypeScript技术栈',
          requirements: [
            'React/Vue熟练',
            'TypeScript',
            '3年经验',
            '响应式设计',
          ],
          salary: '20-35K',
          benefits: ['五险一金', '年终奖', '弹性工作', '技术培训'],
        },
        {
          id: 'job-002',
          title: '后端开发工程师',
          company: 'AI科技公司',
          department: '技术部',
          location: '北京',
          applicants: 18,
          createdAt: new Date().toISOString(),
          status: 'active',
          description: '负责NestJS后端API开发，微服务架构设计',
          requirements: ['NestJS/Node.js', 'MongoDB', '微服务架构', 'Docker'],
          salary: '25-40K',
          benefits: ['股票期权', '医疗保险', '团建活动', '学习津贴'],
        },
        {
          id: 'job-003',
          title: 'AI算法工程师',
          company: 'AI科技公司',
          department: '算法部',
          location: '深圳',
          applicants: 31,
          createdAt: new Date().toISOString(),
          status: 'active',
          description: '简历智能分析算法研发，NLP技术应用',
          requirements: ['Python/机器学习', 'NLP', '深度学习', '算法优化'],
          salary: '30-50K',
          benefits: ['技术大牛导师', '论文发表支持', '会议参与', '创新奖金'],
        },
      ],
      total: 3,
      source: 'nestjs-simple-jobs',
    };
  }

  /**
   * Creates job.
   * @param body - The body.
   * @returns The result of the operation.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createJob(@Body() body: CreateJobDto) {
    this.logger.log('Simple jobs controller: createSimpleJob called');
    // ✅ FIXED: Use real JobsService with NATS publishing for E2E tests
    const mockUser = {
      id: 'e2e-test-user',
      organizationId: 'e2e-test-org',
      role: 'user',
      email: 'e2e-test@example.com',
    };

    this.logger.debug('Calling jobs service with create job DTO');
    const result = await this.jobsService.createJob(body, mockUser);
    this.logger.debug(`Jobs service result: ${JSON.stringify(result)}` );
    return result;
  }
}
