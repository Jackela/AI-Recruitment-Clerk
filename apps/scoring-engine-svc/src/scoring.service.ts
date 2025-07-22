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
    const jdSkills = new Set(
      jdDto.requiredSkills.map((s) => s.name.toLowerCase()),
    );
    const resumeSkills = new Set(
      resumeDto.skills.map((s) => s.toLowerCase()),
    );
    const matchedSkills = [...jdSkills].filter((s) => resumeSkills.has(s));
    const skillScoreValue =
      jdSkills.size > 0 ? matchedSkills.length / jdSkills.size : 0;

    const totalYears = resumeDto.workExperience.reduce((acc, w) => {
      const start = new Date(w.startDate);
      const end = w.endDate === 'present' ? new Date() : new Date(w.endDate);
      const months = (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth());
      return acc + months;
    }, 0) / 12;

    let experienceScoreValue = 0;
    if (totalYears >= jdDto.experienceYears.min) {
      experienceScoreValue = 1;
    } else if (jdDto.experienceYears.min > 0) {
      experienceScoreValue = totalYears / jdDto.experienceYears.min;
    }

    const degreeMap: Record<string, number> = {
      any: 0,
      bachelor: 1,
      master: 2,
      phd: 3,
    };
    const highest = resumeDto.education.reduce((acc, e) => {
      const level = degreeMap[e.degree.toLowerCase()] ?? 0;
      return Math.max(acc, level);
    }, 0);
    const educationScoreValue =
      highest >= degreeMap[jdDto.educationLevel] ? 1 : 0;

    const overallScore = Math.round(
      (skillScoreValue * 0.5 + experienceScoreValue * 0.3 + educationScoreValue * 0.2) *
        100,
    );

    return {
      overallScore,
      skillScore: {
        score: skillScoreValue,
        details: `${matchedSkills.length} of ${jdSkills.size} skills matched.`,
      },
      experienceScore: {
        score: experienceScoreValue,
        details: '',
      },
      educationScore: {
        score: educationScoreValue,
        details: '',
      },
    };
  }
}
