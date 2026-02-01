import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
  Req,
  Logger,
  HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiHeader,
  ApiParam,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { GuestGuard } from '../guards/guest.guard';
import type { RequestWithDeviceId } from '../guards/guest.guard';
import { OptionalJwtAuthGuard } from '../guards/optional-jwt-auth.guard';
import type { GuestUsageService } from '../services/guest-usage.service';
import type { AppGatewayNatsService } from '../../nats/app-gateway-nats.service';
import type { ResumeSubmittedEvent } from '@ai-recruitment-clerk/resume-processing-domain';
import type {
  GridFsService,
  ResumeFileMetadata,
} from '../../services/gridfs.service';

interface GuestResumeUploadDto {
  candidateName?: string;
  candidateEmail?: string;
  notes?: string;
}

// Lightweight file validator compatible with ParseFilePipe expectations
const resumeFileValidator: {
  isValid: (file?: any) => boolean;
  buildErrorMessage: () => string;
} = {
  buildErrorMessage: () =>
    'Invalid file type. Only PDF, DOC, and DOCX files are allowed.',
  isValid: (file?: any): boolean => {
    if (!file) return false;
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const allowedExtensions = /\.(pdf|doc|docx)$/i;
    const mimeTypeValid = allowedMimeTypes.includes(file.mimetype);
    const extensionValid = allowedExtensions.test(file.originalname);
    return mimeTypeValid && extensionValid;
  },
};

/**
 * Exposes endpoints for guest resume.
 */
@ApiTags('Guest Resume Processing')
@Public()
@Controller('guest')
@ApiHeader({
  name: 'X-Device-ID',
  description: 'Unique device identifier for guest access',
  required: true,
  schema: { type: 'string', example: 'uuid-device-12345' },
})
export class GuestResumeController {
  private readonly logger = new Logger(GuestResumeController.name);

  /**
   * Initializes a new instance of the Guest Resume Controller.
   * @param guestUsageService - The guest usage service.
   * @param natsClient - The nats client.
   * @param gridFsService - The GridFS service for file storage.
   */
  constructor(
    private readonly guestUsageService: GuestUsageService,
    private readonly natsClient: AppGatewayNatsService,
    private readonly gridFsService: GridFsService,
  ) {}

  /**
   * Performs the analyze resume operation.
   * @param req - The req.
   * @param file - The file.
   * @param uploadData - The upload data.
   * @returns The result of the operation.
   */
  @Post('resume/analyze')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard, GuestGuard)
  @UseInterceptors(FileInterceptor('resume'))
  @ApiOperation({
    summary: 'Upload and analyze resume (Guest Mode)',
    description:
      'Upload a resume file for analysis - available to both authenticated users and guests with usage limits',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 202,
    description: 'Resume uploaded successfully and analysis started',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            analysisId: { type: 'string', example: 'analysis-uuid-12345' },
            filename: { type: 'string', example: 'resume.pdf' },
            uploadedAt: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
            estimatedCompletionTime: { type: 'string', example: '2-3 minutes' },
            isGuestMode: { type: 'boolean', example: true },
            remainingUsage: { type: 'number', example: 3 },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid file format or file too large',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing device ID or invalid authentication',
  })
  @ApiTooManyRequestsResponse({
    description: 'Guest usage limit exceeded - feedback code required',
  })
  async analyzeResume(
    @Req() req: RequestWithDeviceId,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB limit for guests
          resumeFileValidator as any,
        ],
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    file: any, // Express.Multer.File type fix
    @Body() uploadData: GuestResumeUploadDto,
  ) {
    try {
      const deviceId = req.deviceId!;
      const isAuthenticated = !!req.user;

      // For guest users, check usage limit first
      if (!isAuthenticated) {
        const canUse = await this.guestUsageService.canUse(deviceId);
        if (!canUse) {
          const usageStatus =
            await this.guestUsageService.getUsageStatus(deviceId);
          throw new HttpException(
            {
              success: false,
              error: 'Usage limit exceeded',
              message:
                '免费次数已用完！参与问卷反馈(奖励￥3现金)可再获5次使用权！',
              needsFeedbackCode: usageStatus.needsFeedbackCode,
              feedbackCode: usageStatus.feedbackCode,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      // Generate analysis ID
      const analysisId = `guest-analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // For guest mode, we'll create a simplified analysis request
      const analysisRequest = {
        analysisId,
        deviceId: isAuthenticated ? undefined : deviceId,
        userId: isAuthenticated ? (req.user as any)?.id : undefined,
        filename: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
        candidateName: uploadData.candidateName || 'Anonymous',
        candidateEmail: uploadData.candidateEmail,
        notes: uploadData.notes,
        isGuestMode: !isAuthenticated,
        uploadedAt: new Date(),
      };

      // Store the file in GridFS and publish resume submission event to NATS
      let tempGridFsUrl = '';
      try {
        const resumeId = analysisId; // reuse analysisId as resumeId for correlation
        const jobId = isAuthenticated
          ? `user-job-${(req.user as any)?.id || 'unknown'}`
          : `guest-job-${deviceId}`;

        // ✅ PRIORITY 1 FIX: Store file in GridFS first
        this.logger.debug(
          `Storing resume file in GridFS for analysis: ${analysisId}`,
        );

        const fileMetadata: ResumeFileMetadata = {
          fileType: 'resume',
          analysisId,
          deviceId: isAuthenticated ? undefined : deviceId,
          userId: isAuthenticated ? (req.user as any)?.id : undefined,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date(),
          candidateName: uploadData.candidateName,
          candidateEmail: uploadData.candidateEmail,
          notes: uploadData.notes,
          isGuestMode: !isAuthenticated,
        };

        // Store file buffer in GridFS and get the URL
        tempGridFsUrl = await this.gridFsService.storeResumeFile(
          file.buffer,
          file.originalname,
          fileMetadata,
        );

        this.logger.log(
          `Resume file stored in GridFS successfully: ${tempGridFsUrl}`,
          {
            analysisId,
            originalFilename: file.originalname,
            fileSize: file.size,
            gridFsUrl: tempGridFsUrl,
          },
        );

        // ✅ PRIORITY 1 FIX: Use actual GridFS URL in NATS event
        const event: ResumeSubmittedEvent = {
          jobId,
          resumeId,
          originalFilename: file.originalname,
          tempGridFsUrl, // Now contains actual GridFS URL instead of empty string
        };

        const publishResult =
          await this.natsClient.publishResumeSubmitted(event);
        if (!publishResult.success) {
          this.logger.warn(
            `NATS publish failed for resumeId=${resumeId}: ${publishResult.error}`,
          );
          // If NATS publish fails, clean up the GridFS file
          try {
            await this.gridFsService.deleteResumeFile(tempGridFsUrl);
            this.logger.debug(
              `Cleaned up GridFS file after NATS failure: ${tempGridFsUrl}`,
            );
          } catch (cleanupErr) {
            this.logger.error(
              'Failed to cleanup GridFS file after NATS failure',
              cleanupErr,
            );
          }
        } else {
          this.logger.log(
            `NATS publish succeeded for resumeId=${resumeId}, msgId=${publishResult.messageId}`,
            {
              analysisId,
              gridFsUrl: tempGridFsUrl,
              messageId: publishResult.messageId,
            },
          );
        }
      } catch (err) {
        this.logger.error(
          'Error storing file or publishing resume submission to NATS',
          err,
          {
            analysisId,
            originalFilename: file.originalname,
            fileSize: file.size,
          },
        );

        // If GridFS storage was successful but NATS failed, attempt cleanup
        if (tempGridFsUrl) {
          try {
            await this.gridFsService.deleteResumeFile(tempGridFsUrl);
            this.logger.debug(
              `Cleaned up GridFS file after error: ${tempGridFsUrl}`,
            );
          } catch (cleanupErr) {
            this.logger.error(
              'Failed to cleanup GridFS file after error',
              cleanupErr,
            );
          }
        }

        // Re-throw the error to let the outer catch handle the HTTP response
        throw new HttpException(
          {
            success: false,
            error: 'File storage failed',
            message: 'Failed to store resume file for analysis',
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      this.logger.log(
        `Resume analysis initiated for ${isAuthenticated ? 'user' : 'guest'}: ${analysisId}`,
      );

      // Get remaining usage for guest users
      let remainingUsage: number | undefined = undefined;
      if (!isAuthenticated) {
        const usageStatus =
          await this.guestUsageService.getUsageStatus(deviceId);
        remainingUsage = usageStatus.remainingCount;
      }

      // Wait for real parsing result from pipeline (analysis.resume.parsed)
      try {
        const parsed = await this.natsClient.waitForAnalysisParsed(
          analysisId,
          20000,
        );
        this.logger.log(
          `Received analysis.resume.parsed for resumeId=${analysisId} (jobId=${parsed.jobId})`,
        );

        return {
          success: true,
          data: {
            analysisId,
            filename: file.originalname,
            uploadedAt: analysisRequest.uploadedAt.toISOString(),
            isGuestMode: !isAuthenticated,
            fileSize: file.size,
            remainingUsage,
            results: parsed.resumeDto,
            completedAt: new Date().toISOString(),
          },
        };
      } catch (waitErr) {
        this.logger.warn(
          `Timed out waiting for analysis result for resumeId=${analysisId}, returning queued response: ${waitErr}`,
        );

        return {
          success: true,
          message: 'Resume queued for analysis',
          data: {
            analysisId,
            filename: file.originalname,
            uploadedAt: analysisRequest.uploadedAt.toISOString(),
            estimatedCompletionTime: '2-3 minutes',
            isGuestMode: !isAuthenticated,
            fileSize: file.size,
            remainingUsage,
          },
        };
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Error processing resume upload:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Resume processing failed',
          message: error.message || 'An unexpected error occurred',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retrieves analysis results.
   * @param req - The req.
   * @param analysisId - The analysis id.
   * @returns The result of the operation.
   */
  @Get('resume/analysis/:analysisId')
  @UseGuards(OptionalJwtAuthGuard, GuestGuard)
  @ApiOperation({
    summary: 'Get resume analysis results (Guest Mode)',
    description:
      'Retrieve the analysis results for a previously uploaded resume',
  })
  @ApiResponse({
    status: 200,
    description: 'Analysis results retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            analysisId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['processing', 'completed', 'failed'],
            },
            progress: { type: 'number', minimum: 0, maximum: 100 },
            results: {
              type: 'object',
              properties: {
                personalInfo: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    email: { type: 'string' },
                    phone: { type: 'string' },
                    location: { type: 'string' },
                  },
                },
                skills: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      category: { type: 'string' },
                      proficiency: { type: 'string' },
                    },
                  },
                },
                experience: {
                  type: 'object',
                  properties: {
                    totalYears: { type: 'number' },
                    positions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          title: { type: 'string' },
                          company: { type: 'string' },
                          duration: { type: 'string' },
                          responsibilities: {
                            type: 'array',
                            items: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
                education: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      degree: { type: 'string' },
                      school: { type: 'string' },
                      year: { type: 'string' },
                      major: { type: 'string' },
                    },
                  },
                },
                summary: {
                  type: 'object',
                  properties: {
                    overallScore: { type: 'number', minimum: 0, maximum: 100 },
                    strengths: { type: 'array', items: { type: 'string' } },
                    recommendations: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                },
              },
            },
            completedAt: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiParam({
    name: 'analysisId',
    description: 'Analysis ID returned from upload',
  })
  async getAnalysisResults(
    @Req() _req: RequestWithDeviceId,
    @Param('analysisId') analysisId: string,
  ) {
    try {
      // Validate analysis ID format
      if (!analysisId || !analysisId.startsWith('guest-analysis-')) {
        throw new HttpException('Invalid analysis ID', HttpStatus.BAD_REQUEST);
      }

      // 🚧 演示版本 - 返回模拟数据
      // 生产版本将集成真实的AI简历解析服务
      // TODO: 集成 ResumeParserService 进行真实文件解析
      const mockResults = {
        analysisId,
        status: 'completed',
        progress: 100,
        results: {
          personalInfo: {
            name: 'John Doe',
            email: 'john.doe@email.com',
            phone: '+1234567890',
            location: 'New York, NY',
          },
          skills: [
            {
              name: 'JavaScript',
              category: 'Programming',
              proficiency: 'Advanced',
            },
            { name: 'React', category: 'Frontend', proficiency: 'Advanced' },
            {
              name: 'Node.js',
              category: 'Backend',
              proficiency: 'Intermediate',
            },
            {
              name: 'Project Management',
              category: 'Soft Skills',
              proficiency: 'Advanced',
            },
          ],
          experience: {
            totalYears: 5,
            positions: [
              {
                title: 'Senior Frontend Developer',
                company: 'Tech Corp',
                duration: '2021-Present',
                responsibilities: [
                  'Lead frontend development team',
                  'Architect scalable React applications',
                  'Mentor junior developers',
                ],
              },
              {
                title: 'Frontend Developer',
                company: 'StartupXYZ',
                duration: '2019-2021',
                responsibilities: [
                  'Developed responsive web applications',
                  'Collaborated with UX/UI designers',
                  'Implemented automated testing',
                ],
              },
            ],
          },
          education: [
            {
              degree: "Bachelor's in Computer Science",
              school: 'University of Technology',
              year: '2019',
              major: 'Software Engineering',
            },
          ],
          summary: {
            overallScore: 85,
            strengths: [
              'Strong frontend development skills',
              'Leadership experience',
              'Continuous learning mindset',
              'Good communication skills',
            ],
            recommendations: [
              'Consider expanding backend development skills',
              'Explore cloud technologies (AWS/Azure)',
              'Develop more experience with microservices architecture',
            ],
          },
        },
        completedAt: new Date().toISOString(),
      };

      this.logger.debug(`Analysis results retrieved: ${analysisId}`);

      return {
        success: true,
        data: mockResults,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Error retrieving analysis results:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to retrieve analysis results',
          message: error.message || 'An unexpected error occurred',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retrieves demo analysis.
   * @param req - The req.
   * @returns The result of the operation.
   */
  @Get('resume/demo-analysis')
  @UseGuards(OptionalJwtAuthGuard, GuestGuard)
  @ApiOperation({
    summary: 'Get demo analysis (Guest Mode)',
    description:
      'Get a demo analysis result without uploading a file - useful for showcasing capabilities',
  })
  @ApiResponse({
    status: 200,
    description: 'Demo analysis returned successfully',
  })
  async getDemoAnalysis(@Req() req: RequestWithDeviceId) {
    try {
      const deviceId = req.deviceId!;
      const isAuthenticated = !!req.user;

      // For guest users, check usage limit
      if (!isAuthenticated) {
        const canUse = await this.guestUsageService.canUse(deviceId);
        if (!canUse) {
          const usageStatus =
            await this.guestUsageService.getUsageStatus(deviceId);
          throw new HttpException(
            {
              success: false,
              error: 'Usage limit exceeded',
              message:
                '免费次数已用完！参与问卷反馈(奖励￥3现金)可再获5次使用权！',
              needsFeedbackCode: usageStatus.needsFeedbackCode,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      const demoAnalysis = {
        analysisId: 'demo-analysis-' + Date.now(),
        status: 'completed',
        filename: 'demo-resume.pdf',
        results: {
          personalInfo: {
            name: 'Alice Chen',
            email: 'alice.chen@email.com',
            phone: '+86 138 0013 8000',
            location: 'Shanghai, China',
          },
          skills: [
            { name: 'Python', category: 'Programming', proficiency: 'Expert' },
            {
              name: 'Machine Learning',
              category: 'AI/ML',
              proficiency: 'Advanced',
            },
            { name: 'TensorFlow', category: 'AI/ML', proficiency: 'Advanced' },
            {
              name: 'Data Analysis',
              category: 'Analytics',
              proficiency: 'Expert',
            },
            {
              name: 'Leadership',
              category: 'Soft Skills',
              proficiency: 'Advanced',
            },
          ],
          experience: {
            totalYears: 7,
            positions: [
              {
                title: 'Senior Data Scientist',
                company: 'AI Innovations Ltd',
                duration: '2022-Present',
                responsibilities: [
                  'Lead ML model development for recommendation systems',
                  'Manage team of 5 junior data scientists',
                  'Collaborate with product teams on AI strategy',
                ],
              },
              {
                title: 'Data Scientist',
                company: 'FinTech Solutions',
                duration: '2020-2022',
                responsibilities: [
                  'Developed fraud detection algorithms',
                  'Implemented real-time analytics pipeline',
                  'Reduced false positives by 40%',
                ],
              },
            ],
          },
          education: [
            {
              degree: "Master's in Data Science",
              school: 'Tsinghua University',
              year: '2020',
              major: 'Computer Science & Statistics',
            },
            {
              degree: "Bachelor's in Mathematics",
              school: 'Peking University',
              year: '2018',
              major: 'Applied Mathematics',
            },
          ],
          summary: {
            overallScore: 92,
            strengths: [
              'Exceptional technical skills in ML/AI',
              'Strong leadership and team management',
              'Proven track record of delivering business value',
              'Excellent educational background',
            ],
            recommendations: [
              'Consider expanding into MLOps and deployment',
              'Explore deep learning and neural networks',
              'Develop expertise in cloud platforms (AWS/GCP)',
            ],
          },
        },
        isGuestMode: !isAuthenticated,
        completedAt: new Date().toISOString(),
      };

      // Get remaining usage for guest users
      if (!isAuthenticated) {
        const usageStatus =
          await this.guestUsageService.getUsageStatus(deviceId);
        demoAnalysis['remainingUsage'] = usageStatus.remainingCount;
      }

      this.logger.log(
        `Demo analysis provided for ${isAuthenticated ? 'user' : 'guest'}`,
      );

      return {
        success: true,
        message: 'Demo analysis generated successfully',
        data: demoAnalysis,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Error generating demo analysis:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to generate demo analysis',
          message: error.message || 'An unexpected error occurred',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
