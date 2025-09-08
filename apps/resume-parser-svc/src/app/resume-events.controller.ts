import { Controller, Logger, OnModuleInit } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import {
  ResumeSubmittedEvent,
  ResumeDTO,
} from '@ai-recruitment-clerk/resume-processing-domain';
import { ResumeParserNatsService } from '../services/resume-parser-nats.service';

@Controller()
export class ResumeEventsController implements OnModuleInit {
  private readonly logger = new Logger(ResumeEventsController.name);

  constructor(private readonly natsService: ResumeParserNatsService) {}

  async onModuleInit() {
    // Subscribe to job.resume.submitted events using the shared NATS service
    await this.natsService.subscribeToResumeSubmissions(
      this.handleResumeSubmitted.bind(this),
    );
  }

  @EventPattern('job.resume.submitted')
  async handleResumeSubmitted(payload: ResumeSubmittedEvent): Promise<void> {
    try {
      this.logger.log(
        `[RESUME-PARSER-SVC] Processing job.resume.submitted event for resumeId: ${payload.resumeId} on jobId: ${payload.jobId}`,
      );

      const startTime = Date.now();

      // Parse resume data (mock implementation for now)
      const resumeDto: ResumeDTO = await this.parseResumeData(payload);

      const processingTimeMs = Date.now() - startTime;

      // Publish analysis.resume.parsed event using the shared NATS service
      await this.natsService.publishAnalysisResumeParsed({
        jobId: payload.jobId,
        resumeId: payload.resumeId,
        resumeDto,
        processingTimeMs,
        confidence: 0.85, // Default confidence for mock parsing
        parsingMethod: 'mock-ai-vision',
      });

      this.logger.log(
        `[RESUME-PARSER-SVC] Successfully processed and published analysis.resume.parsed for resumeId: ${payload.resumeId} in ${processingTimeMs}ms`,
      );
    } catch (error) {
      this.logger.error(
        `[RESUME-PARSER-SVC] Error processing job.resume.submitted for resumeId: ${payload.resumeId}:`,
        error,
      );

      // Publish error event using the shared NATS service
      await this.natsService.publishProcessingError(
        payload.jobId,
        payload.resumeId,
        error as Error,
        {
          stage: 'resume-parsing',
          inputSize: payload.originalFilename?.length,
          retryAttempt: 1,
        },
      );
    }
  }

  private async parseResumeData(
    payload: ResumeSubmittedEvent,
  ): Promise<ResumeDTO> {
    // Mock resume parsing logic - in real implementation, this would use AI/ML models
    // to parse and extract structured data from the resume file

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Extract candidate name from filename for mock data
    const candidateName = this.extractCandidateName(payload.originalFilename);

    return {
      contactInfo: {
        name: candidateName,
        email: `${candidateName.toLowerCase().replace(/\s+/g, '.')}@email.com`,
        phone: '(555) 123-4567',
      },
      summary: `Experienced software developer with strong technical skills and passion for innovation. Proven track record in ${this.getRandomTechStack().join(', ')}.`,
      skills: this.getRandomTechStack(),
      workExperience: [
        {
          company: 'Tech Corp',
          position: 'Senior Software Developer',
          startDate: '2021-01-01',
          endDate: 'present',
          summary:
            'Led development of microservices architecture, improved system performance by 40%. Designed scalable APIs, mentored junior developers, implemented CI/CD pipelines.',
        },
        {
          company: 'StartupXYZ',
          position: 'Software Engineer',
          startDate: '2019-06-01',
          endDate: '2020-12-31',
          summary:
            'Developed full-stack web applications using modern technologies. Built responsive web applications, integrated third-party APIs, optimized database queries.',
        },
      ],
      education: [
        {
          school: 'University of Technology',
          degree: 'Bachelor of Science',
          major: 'Computer Science',
        },
      ],
      certifications: [
        'AWS Certified Solutions Architect',
        'Certified Kubernetes Administrator',
      ],
      languages: ['English (Native)', 'Spanish (Conversational)'],
    };
  }

  private extractCandidateName(filename: string): string {
    // Simple name extraction from filename
    const nameMatch = filename.match(/^([^_\.]+)/);
    return nameMatch ? nameMatch[1].replace(/[-_]/g, ' ') : 'John Doe';
  }

  private getRandomTechStack(): string[] {
    const allSkills = [
      'JavaScript',
      'TypeScript',
      'Python',
      'Java',
      'Go',
      'Rust',
      'React',
      'Vue.js',
      'Angular',
      'Node.js',
      'Express.js',
      'MongoDB',
      'PostgreSQL',
      'MySQL',
      'Redis',
      'Docker',
      'Kubernetes',
      'AWS',
      'Azure',
      'GCP',
      'Git',
      'CI/CD',
      'Microservices',
      'REST APIs',
      'GraphQL',
    ];

    // Return 8-12 random skills
    const skillCount = Math.floor(Math.random() * 5) + 8;
    const shuffled = allSkills.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, skillCount);
  }
}
