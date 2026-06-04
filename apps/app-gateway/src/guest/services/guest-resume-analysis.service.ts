import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-dto';
import { AppGatewayNatsService } from '../../nats/app-gateway-nats.service';
import type { RequestWithDeviceId } from '../guards/guest.guard';
import type {
  GuestResumeAnalysisDocument,
  GuestResumeAnalysisStatus,
} from '../schemas/guest-resume-analysis.schema';
import { GuestResumeAnalysis } from '../schemas/guest-resume-analysis.schema';

export interface CreateGuestResumeAnalysisInput {
  analysisId: string;
  deviceId?: string;
  userId?: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  gridFsUrl?: string;
  candidateName?: string;
  candidateEmail?: string;
  notes?: string;
  isGuestMode: boolean;
  uploadedAt: Date;
}

interface ParsedResumeEvent {
  jobId?: string;
  resumeId: string;
  resumeDto?: ResumeDTO;
  timestamp?: string;
  processingTimeMs?: number;
}

interface FailedResumeEvent {
  resumeId?: string;
  analysisId?: string;
  error?: string;
  message?: string;
}

export interface AnalysisResultsPayload {
  analysisId: string;
  status: GuestResumeAnalysisStatus;
  progress: number;
  results?: {
    personalInfo: {
      name: string;
      email?: string;
      phone?: string;
      location?: string;
    };
    skills: Array<{
      name: string;
      category: string;
      proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    }>;
    experience: {
      totalYears: number;
      positions: Array<{
        title: string;
        company: string;
        startDate: string;
        endDate?: string;
        duration: string;
        description?: string;
      }>;
    };
    education: Array<{
      degree: string;
      institution: string;
      graduationYear?: number;
      major?: string;
    }>;
    summary: {
      overallScore: number;
      strengths: string[];
      recommendations: string[];
      keyHighlights: string[];
      improvementAreas: string[];
    };
  };
  completedAt?: string;
  errorMessage?: string;
}

export interface DetailedAnalysisPayload {
  sessionId: string;
  candidateName: string;
  candidateEmail: string;
  targetPosition: string;
  analysisTime: string;
  score: number;
  summary: string;
  keySkills: string[];
  experience: string;
  education: string;
  recommendations: string[];
  skillAnalysis: {
    technical: number;
    communication: number;
    problemSolving: number;
    teamwork: number;
    leadership: number;
  };
  experienceDetails: Array<{
    company: string;
    position: string;
    duration: string;
    description: string;
  }>;
  educationDetails: {
    degree: string;
    major: string;
    university: string;
    graduationYear: string;
  };
  strengths: string[];
  improvements: string[];
  reportUrl: string;
}

@Injectable()
export class GuestResumeAnalysisService implements OnModuleInit {
  private readonly logger = new Logger(GuestResumeAnalysisService.name);

  constructor(
    @InjectModel(GuestResumeAnalysis.name)
    private readonly analysisModel: Model<GuestResumeAnalysisDocument>,
    @Inject(AppGatewayNatsService)
    private readonly natsClient: AppGatewayNatsService,
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.subscribeToPipelineEvents();
  }

  public async createQueued(
    input: CreateGuestResumeAnalysisInput,
  ): Promise<GuestResumeAnalysisDocument> {
    return this.analysisModel.findOneAndUpdate(
      { analysisId: input.analysisId },
      {
        ...input,
        sessionId: input.analysisId,
        status: 'queued',
        progress: 10,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  public async markProcessing(
    analysisId: string,
    gridFsUrl: string,
  ): Promise<void> {
    await this.analysisModel.updateOne(
      { analysisId },
      {
        $set: {
          status: 'processing',
          progress: 30,
          gridFsUrl,
        },
      },
    );
  }

  public async markCompleted(event: ParsedResumeEvent): Promise<void> {
    const completedAt = event.timestamp
      ? new Date(event.timestamp)
      : new Date();
    await this.analysisModel.updateOne(
      { analysisId: event.resumeId },
      {
        $set: {
          status: 'completed',
          progress: 100,
          result: event.resumeDto ?? null,
          completedAt,
        },
        $unset: { errorMessage: 1, failedAt: 1 },
      },
    );
  }

  public async markFailed(
    analysisId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.analysisModel.updateOne(
      { analysisId },
      {
        $set: {
          status: 'failed',
          progress: 100,
          errorMessage,
          failedAt: new Date(),
        },
      },
    );
  }

  public async findForRequest(
    analysisId: string,
    request: RequestWithDeviceId,
  ): Promise<GuestResumeAnalysisDocument | null> {
    const userId = this.getUserId(request);
    const query: Record<string, unknown> = { analysisId };

    if (userId) {
      query.userId = userId;
    } else {
      query.deviceId = request.deviceId ?? '';
    }

    return this.analysisModel.findOne(query).exec();
  }

  public async findByAnalysisId(
    analysisId: string,
  ): Promise<GuestResumeAnalysisDocument | null> {
    return this.analysisModel.findOne({ analysisId }).exec();
  }

  public toAnalysisResults(
    record: GuestResumeAnalysisDocument,
  ): AnalysisResultsPayload {
    const resume = this.getResume(record);
    const mapped = resume ? this.mapResumeToAnalysisResults(resume) : undefined;

    return {
      analysisId: record.analysisId,
      status: record.status,
      progress: record.progress,
      results: mapped,
      completedAt: record.completedAt?.toISOString(),
      errorMessage: record.errorMessage,
    };
  }

  public toDetailedResult(
    record: GuestResumeAnalysisDocument,
  ): DetailedAnalysisPayload {
    const resume = this.getResume(record);
    if (!resume) {
      throw new Error('Analysis result is not available yet');
    }

    const totalYears = this.calculateTotalYears(resume.workExperience ?? []);
    const keySkills = resume.skills ?? [];
    const summary = resume.summary || this.buildSummary(record, resume);
    const education = resume.education?.[0];

    return {
      sessionId: record.sessionId,
      candidateName:
        record.candidateName || resume.contactInfo?.name || 'Unknown candidate',
      candidateEmail:
        record.candidateEmail || resume.contactInfo?.email || 'not-provided',
      targetPosition: record.notes || 'General role fit',
      analysisTime: (
        record.completedAt ??
        record.uploadedAt ??
        new Date()
      ).toISOString(),
      score: this.calculateOverallScore(resume),
      summary,
      keySkills,
      experience: `${totalYears} years`,
      education: education
        ? [education.degree, education.major, education.school]
            .filter(Boolean)
            .join(', ')
        : 'Not provided',
      recommendations: this.buildRecommendations(resume),
      skillAnalysis: this.buildSkillAnalysis(resume),
      experienceDetails: (resume.workExperience ?? []).map((item) => ({
        company: item.company || 'Unknown company',
        position: item.position || 'Unknown role',
        duration: this.formatDuration(item.startDate, item.endDate),
        description: item.summary || 'No description provided',
      })),
      educationDetails: {
        degree: education?.degree || 'Not provided',
        major: education?.major || 'Not provided',
        university: education?.school || 'Not provided',
        graduationYear: 'Not provided',
      },
      strengths: this.buildStrengths(resume),
      improvements: this.buildImprovements(resume),
      reportUrl: `/api/reports/${record.sessionId}`,
    };
  }

  private async subscribeToPipelineEvents(): Promise<void> {
    if (!this.natsClient.isConnected) {
      this.logger.warn(
        'NATS is not connected; guest analysis records will be updated by synchronous responses only.',
      );
      return;
    }

    try {
      await this.natsClient.subscribe(
        'analysis.resume.parsed',
        async (event) => {
          const parsed = event as ParsedResumeEvent;
          if (!parsed.resumeId) return;
          await this.markCompleted(parsed);
        },
      );

      await this.natsClient.subscribe('job.resume.failed', async (event) => {
        const failed = event as FailedResumeEvent;
        const analysisId = failed.resumeId ?? failed.analysisId;
        if (!analysisId) return;
        await this.markFailed(
          analysisId,
          failed.error ?? failed.message ?? 'Resume analysis failed',
        );
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Guest analysis event subscription unavailable: ${message}`,
      );
    }
  }

  private getResume(record: GuestResumeAnalysisDocument): ResumeDTO | null {
    if (!record.result || typeof record.result !== 'object') {
      return null;
    }
    return record.result as ResumeDTO;
  }

  private mapResumeToAnalysisResults(
    resume: ResumeDTO,
  ): NonNullable<AnalysisResultsPayload['results']> {
    return {
      personalInfo: {
        name: resume.contactInfo?.name || 'Unknown candidate',
        email: resume.contactInfo?.email ?? undefined,
        phone: resume.contactInfo?.phone ?? undefined,
      },
      skills: (resume.skills ?? []).map((skill) => ({
        name: skill,
        category: this.inferSkillCategory(skill),
        proficiency: 'intermediate',
      })),
      experience: {
        totalYears: this.calculateTotalYears(resume.workExperience ?? []),
        positions: (resume.workExperience ?? []).map((item) => ({
          title: item.position,
          company: item.company,
          startDate: item.startDate,
          endDate: item.endDate === 'present' ? undefined : item.endDate,
          duration: this.formatDuration(item.startDate, item.endDate),
          description: item.summary,
        })),
      },
      education: (resume.education ?? []).map((item) => ({
        degree: item.degree,
        institution: item.school,
        major: item.major ?? undefined,
      })),
      summary: {
        overallScore: this.calculateOverallScore(resume),
        strengths: this.buildStrengths(resume),
        recommendations: this.buildRecommendations(resume),
        keyHighlights: this.buildStrengths(resume).slice(0, 3),
        improvementAreas: this.buildImprovements(resume),
      },
    };
  }

  private getUserId(request: RequestWithDeviceId): string | undefined {
    const user = request.user as { id?: string; userId?: string } | undefined;
    return user?.id ?? user?.userId;
  }

  private calculateOverallScore(resume: ResumeDTO): number {
    let score = 45;
    score += Math.min((resume.skills?.length ?? 0) * 3, 25);
    score += Math.min((resume.workExperience?.length ?? 0) * 8, 20);
    score += Math.min((resume.education?.length ?? 0) * 5, 10);
    if (resume.summary) score += 5;
    if (resume.contactInfo?.email) score += 3;
    if (resume.contactInfo?.phone) score += 2;
    return Math.max(0, Math.min(100, score));
  }

  private calculateTotalYears(
    workExperience: ResumeDTO['workExperience'],
  ): number {
    const totalMonths = workExperience.reduce((sum, item) => {
      const start = Date.parse(item.startDate);
      const end =
        item.endDate === 'present' ? Date.now() : Date.parse(item.endDate);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return sum;
      }
      return sum + Math.round((end - start) / (1000 * 60 * 60 * 24 * 30));
    }, 0);
    return Math.max(0, Math.round((totalMonths / 12) * 10) / 10);
  }

  private formatDuration(startDate: string, endDate: string): string {
    if (!startDate && !endDate) return 'Not provided';
    return `${startDate || 'Unknown'} - ${endDate || 'present'}`;
  }

  private inferSkillCategory(skill: string): string {
    const normalized = skill.toLowerCase();
    if (
      [
        'javascript',
        'typescript',
        'java',
        'python',
        'go',
        'node',
        'react',
      ].some((token) => normalized.includes(token))
    ) {
      return 'Technical';
    }
    if (
      ['leadership', 'communication', 'teamwork', 'management'].some((token) =>
        normalized.includes(token),
      )
    ) {
      return 'Soft Skills';
    }
    return 'Professional';
  }

  private buildSummary(
    record: GuestResumeAnalysisDocument,
    resume: ResumeDTO,
  ): string {
    const name =
      record.candidateName || resume.contactInfo?.name || 'This candidate';
    const skillCount = resume.skills?.length ?? 0;
    const years = this.calculateTotalYears(resume.workExperience ?? []);
    return `${name} has ${skillCount} parsed skills and ${years} years of detected work experience.`;
  }

  private buildStrengths(resume: ResumeDTO): string[] {
    const strengths: string[] = [];
    if ((resume.skills?.length ?? 0) >= 5) {
      strengths.push('Broad skill coverage');
    }
    if ((resume.workExperience?.length ?? 0) > 0) {
      strengths.push('Documented work experience');
    }
    if ((resume.education?.length ?? 0) > 0) {
      strengths.push('Education background provided');
    }
    if (resume.summary) {
      strengths.push('Professional summary included');
    }
    return strengths.length > 0
      ? strengths
      : ['Resume content parsed successfully'];
  }

  private buildImprovements(resume: ResumeDTO): string[] {
    const improvements: string[] = [];
    if (!resume.summary)
      improvements.push('Add a concise professional summary');
    if ((resume.skills?.length ?? 0) < 5) {
      improvements.push('List more role-relevant skills');
    }
    if ((resume.workExperience?.length ?? 0) === 0) {
      improvements.push('Add measurable work experience');
    }
    if (!resume.contactInfo?.email) {
      improvements.push('Include a contact email');
    }
    return improvements.length > 0
      ? improvements
      : ['Add more quantified achievements to strengthen the profile'];
  }

  private buildRecommendations(resume: ResumeDTO): string[] {
    return [
      ...this.buildImprovements(resume),
      'Tailor the resume keywords to the target role before submission',
    ].slice(0, 4);
  }

  private buildSkillAnalysis(
    resume: ResumeDTO,
  ): DetailedAnalysisPayload['skillAnalysis'] {
    const skills = (resume.skills ?? []).map((skill) => skill.toLowerCase());
    const has = (tokens: string[]) =>
      tokens.some((token) => skills.some((skill) => skill.includes(token)));

    return {
      technical: Math.min(100, 45 + skills.length * 6),
      communication: has(['communication', 'presentation', 'writing'])
        ? 82
        : 62,
      problemSolving: has(['architecture', 'algorithm', 'analysis', 'design'])
        ? 84
        : 66,
      teamwork: has(['team', 'collaboration', 'scrum', 'agile']) ? 82 : 64,
      leadership: has(['lead', 'manager', 'mentor', 'owner']) ? 85 : 58,
    };
  }
}
