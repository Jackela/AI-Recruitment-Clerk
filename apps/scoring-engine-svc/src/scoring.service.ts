import { Injectable } from '@nestjs/common';
import { ResumeDTO } from '../../../libs/shared-dtos/src/models/resume.dto';
import { NatsClient } from './nats/nats.client';

export interface JdDTO {
  requiredSkills: { name: string; weight: number }[];
  experienceYears: { min: number; max: number };
  educationLevel: 'bachelor' | 'master' | 'phd' | 'any';
  softSkills: string[];
}

export interface ScoreComponent {
  score: number;
  details: string;
}

export interface ScoreDTO {
  overallScore: number;
  skillScore: ScoreComponent;
  experienceScore: ScoreComponent;
  educationScore: ScoreComponent;
}

@Injectable()
export class ScoringEngineService {
  private readonly jdCache = new Map<string, JdDTO>();

  constructor(private readonly natsClient: NatsClient) {}

  handleJdExtractedEvent(event: { jobId: string; jdDto: JdDTO }): void {
    this.jdCache.set(event.jobId, event.jdDto);
  }

  async handleResumeParsedEvent(event: {
    jobId: string;
    resumeId: string;
    resumeDto: ResumeDTO;
  }): Promise<void> {
    const jdDto = this.jdCache.get(event.jobId);
    if (!jdDto) {
      throw new Error('JD not found');
    }
    const score = this._calculateMatchScore(jdDto, event.resumeDto);
    await this.natsClient.emit('analysis.match.scored', {
      jobId: event.jobId,
      resumeId: event.resumeId,
      scoreDto: score,
    });
  }

  protected _calculateMatchScore(jdDto: JdDTO, resumeDto: ResumeDTO): ScoreDTO {
    throw new Error('Not implemented');
  }
}
