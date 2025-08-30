import { Controller, Logger, OnModuleInit } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { JdDTO } from '@ai-recruitment-clerk/job-management-domain';
import { 
  JDExtractorException,
  ErrorCorrelationManager
} from '@ai-recruitment-clerk/infrastructure-shared';
import { JobJdSubmittedEvent } from '../dto/events.dto';
import { JdExtractorNatsService } from '../services/jd-extractor-nats.service';

@Controller()
export class JdEventsController implements OnModuleInit {
  private readonly logger = new Logger(JdEventsController.name);

  constructor(private readonly natsService: JdExtractorNatsService) {}

  async onModuleInit() {
    // Subscribe to job.jd.submitted events using the shared NATS client
    await this.natsService.subscribeToJobSubmissions(this.handleJobSubmitted.bind(this));
  }

  @EventPattern('job.jd.submitted')
  async handleJobSubmitted(payload: JobJdSubmittedEvent): Promise<void> {
    try {
      this.logger.log(`[JD-EXTRACTOR-SVC] Processing job.jd.submitted event for jobId: ${payload.jobId}`);
      
      // Validate payload with correlation context
      const correlationContext = ErrorCorrelationManager.getContext();
      
      if (!payload.jobId || !payload.jdText) {
        throw new JDExtractorException(
          'INVALID_EVENT_DATA',
          {
            provided: {
              jobId: !!payload.jobId,
              jdText: !!payload.jdText
            },
            correlationId: correlationContext?.traceId
          }
        );
      }
      
      const startTime = Date.now();
      
      // Extract JD data (mock implementation for now)
      const extractedData: JdDTO = await this.extractJobDescriptionData(payload.jdText);
      
      const processingTimeMs = Date.now() - startTime;
      
      // Publish analysis.jd.extracted event using the shared NATS service
      await this.natsService.publishAnalysisJdExtracted({
        jobId: payload.jobId,
        extractedData,
        processingTimeMs,
        confidence: 0.85, // Default confidence for mock extraction
        extractionMethod: 'mock-llm',
      });
      
      this.logger.log(`[JD-EXTRACTOR-SVC] Successfully processed and published analysis.jd.extracted for jobId: ${payload.jobId} in ${processingTimeMs}ms`);
      
    } catch (error) {
      this.logger.error(`[JD-EXTRACTOR-SVC] Error processing job.jd.submitted for jobId: ${payload.jobId}:`, error);
      
      // Publish error event using the shared NATS service
      await this.natsService.publishProcessingError(payload.jobId, error as Error, {
        stage: 'jd-extraction',
        inputSize: payload.jdText?.length,
        retryAttempt: 1,
      });
    }
  }

  private async extractJobDescriptionData(jdText: string): Promise<JdDTO> {
    // Validate input
    if (!jdText || typeof jdText !== 'string' || jdText.trim().length === 0) {
      throw new JdExtractorException(
        'INVALID_JD_TEXT',
        {
          provided: typeof jdText,
          length: jdText?.length || 0
        }
      );
    }
    
    // Mock JD extraction logic - in real implementation, this would use AI/ML models
    // to parse and extract structured data from the job description text
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      requirements: {
        technical: ['JavaScript', 'TypeScript', 'Node.js', 'React'],
        soft: ['Communication', 'Team collaboration', 'Problem solving'],
        experience: '3+ years in software development',
        education: 'Bachelor\'s degree in Computer Science or related field',
      },
      responsibilities: [
        'Develop and maintain web applications',
        'Collaborate with cross-functional teams',
        'Write clean, maintainable code',
        'Participate in code reviews'
      ],
      benefits: [
        'Competitive salary',
        'Health insurance',
        'Remote work options',
        'Professional development opportunities'
      ],
      company: {
        name: 'Tech Company',
        industry: 'Software Development',
        size: '100-500 employees',
      }
    };
  }
}
