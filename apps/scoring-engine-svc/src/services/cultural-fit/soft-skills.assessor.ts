import { Injectable, Logger } from '@nestjs/common';
import type { GeminiClient } from '@ai-recruitment-clerk/shared-dtos';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';
import type { JobRequirements } from '../experience-analyzer.service';
import type { SoftSkillsAssessment } from '../cultural-fit-analyzer.service';
import { CulturalFitFallbackHelper } from './cultural-fit-fallback.helper';

@Injectable()
export class SoftSkillsAssessor {
  private readonly logger = new Logger(SoftSkillsAssessor.name);

  constructor(
    private readonly geminiClient: GeminiClient,
    private readonly fallbackHelper = new CulturalFitFallbackHelper(),
  ) {}

  public async assess(
    resume: ResumeDTO,
    _jobRequirements: JobRequirements,
  ): Promise<SoftSkillsAssessment> {
    const experienceText = resume.workExperience
      .map((exp) => `${exp.position} at ${exp.company}: ${exp.summary}`)
      .join('\n');

    const prompt = `
      Assess soft skills based on this professional background:

      EXPERIENCE:
      ${experienceText}

      SKILLS MENTIONED:
      ${resume.skills.join(', ')}

      EDUCATION:
      ${resume.education.map((edu) => `${edu.degree} in ${edu.major || 'N/A'} from ${edu.school}`).join(', ')}

      Rate the following soft skills (0-100) based on evidence in the background:

      1. Technical Communication - ability to explain complex concepts
      2. Problem Solving - analytical and creative problem-solving abilities
      3. Adaptability - flexibility in changing environments
      4. Teamwork - collaboration and team contribution
      5. Leadership - ability to guide and influence others
      6. Time Management - project delivery and organizational skills
      7. Critical Thinking - analytical reasoning and decision-making
      8. Emotional Intelligence - interpersonal skills and self-awareness

      Provide evidence for each assessment from the resume content.

      Return in JSON format:
      {
        "technicalCommunication": number (0-100),
        "problemSolving": number (0-100),
        "adaptability": number (0-100),
        "teamwork": number (0-100),
        "leadership": number (0-100),
        "timeManagement": number (0-100),
        "criticalThinking": number (0-100),
        "emotionalIntelligence": number (0-100),
        "evidence": {
          "technicalCommunication": ["evidence array"],
          "problemSolving": ["evidence array"],
          "adaptability": ["evidence array"],
          "teamwork": ["evidence array"],
          "leadership": ["evidence array"],
          "timeManagement": ["evidence array"],
          "criticalThinking": ["evidence array"],
          "emotionalIntelligence": ["evidence array"]
        }
      }
    `;

    try {
      const response = await this.geminiClient.generateStructuredResponse(
        prompt,
        `{
          "technicalCommunication": "number between 0-100",
          "problemSolving": "number between 0-100",
          "adaptability": "number between 0-100",
          "teamwork": "number between 0-100",
          "leadership": "number between 0-100",
          "timeManagement": "number between 0-100",
          "criticalThinking": "number between 0-100",
          "emotionalIntelligence": "number between 0-100",
          "evidence": {
            "technicalCommunication": ["array of evidence strings"],
            "problemSolving": ["array of evidence strings"],
            "adaptability": ["array of evidence strings"],
            "teamwork": ["array of evidence strings"],
            "leadership": ["array of evidence strings"],
            "timeManagement": ["array of evidence strings"],
            "criticalThinking": ["array of evidence strings"],
            "emotionalIntelligence": ["array of evidence strings"]
          }
        }`,
      );

      return response.data as SoftSkillsAssessment;
    } catch (error) {
      this.logger.warn(
        'AI soft skills assessment failed, using fallback',
        error,
      );
      return this.fallbackHelper.createSoftSkillsAssessment(resume);
    }
  }
}
