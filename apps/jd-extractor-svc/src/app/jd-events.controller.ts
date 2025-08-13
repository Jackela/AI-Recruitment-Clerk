import { Controller, Logger, OnModuleInit } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { JobJdSubmittedEvent, JdDTO } from '../../../../libs/shared-dtos/src';
import { NatsClient } from '../nats/nats.client';

@Controller()
export class JdEventsController implements OnModuleInit {
  private readonly logger = new Logger(JdEventsController.name);

  constructor(private readonly natsClient: NatsClient) {}

  async onModuleInit() {
    // Subscribe to job.jd.submitted events
    await this.natsClient.subscribe('job.jd.submitted', this.handleJobSubmitted.bind(this), {
      durableName: 'jd-extractor-job-submitted',
    });
  }

  @EventPattern('job.jd.submitted')
  async handleJobSubmitted(payload: JobJdSubmittedEvent): Promise<void> {
    try {
      this.logger.log(`[JD-EXTRACTOR-SVC] Processing job.jd.submitted event for jobId: ${payload.jobId}`);
      
      const startTime = Date.now();
      
      // Extract JD data (mock implementation for now)
      const extractedData: JdDTO = await this.extractJobDescriptionData(payload.jdText);
      
      const processingTimeMs = Date.now() - startTime;
      
      // Publish analysis.jd.extracted event
      await this.natsClient.publishAnalysisExtracted({
        jobId: payload.jobId,
        extractedData,
        processingTimeMs,
        timestamp: new Date().toISOString(),
      });
      
      this.logger.log(`[JD-EXTRACTOR-SVC] Successfully processed and published analysis.jd.extracted for jobId: ${payload.jobId} in ${processingTimeMs}ms`);
      
    } catch (error) {
      this.logger.error(`[JD-EXTRACTOR-SVC] Error processing job.jd.submitted for jobId: ${payload.jobId}:`, error);
      
      // Publish error event
      await this.natsClient.publishProcessingError(payload.jobId, error as Error);
    }
  }

  private async extractJobDescriptionData(jdText: string): Promise<JdDTO> {
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
