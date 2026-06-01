import { Injectable, Logger } from '@nestjs/common';
import type { GeminiClient } from '@ai-recruitment-clerk/shared-dtos';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';
import type {
  CompanyProfile,
  CulturalFitIndicators,
} from '../cultural-fit-analyzer.service';
import { CulturalFitFallbackHelper } from './cultural-fit-fallback.helper';

@Injectable()
export class CulturalFitIndicatorsAnalyzer {
  private readonly logger = new Logger(CulturalFitIndicatorsAnalyzer.name);

  constructor(
    private readonly geminiClient: GeminiClient,
    private readonly fallbackHelper = new CulturalFitFallbackHelper(),
  ) {}

  public async analyze(
    resume: ResumeDTO,
    companyProfile: CompanyProfile,
  ): Promise<CulturalFitIndicators> {
    const experienceText = resume.workExperience
      .map(
        (exp) =>
          `${exp.position} at ${exp.company} (${exp.startDate} to ${exp.endDate}): ${exp.summary}`,
      )
      .join('\n\n');

    const prompt = `
      Analyze this professional background for cultural fit indicators:

      WORK EXPERIENCE:
      ${experienceText}

      SKILLS:
      ${resume.skills.join(', ')}

      TARGET COMPANY PROFILE:
      - Size: ${companyProfile.size}
      - Culture: ${JSON.stringify(companyProfile.culture)}
      - Team Structure: ${JSON.stringify(companyProfile.teamStructure)}

      Analyze the following cultural fit dimensions:

      1. Company Size Preference (based on work history pattern)
      2. Work Style (remote readiness, collaboration, adaptability)
      3. Communication Skills (written, verbal, presentation abilities)
      4. Leadership Potential (style, mentorship, team building)
      5. Innovation Mindset (creativity, problem-solving approach)
      6. Professional Maturity (reliability, accountability, learning)

      Return analysis in JSON format:
      {
        "companySize": {
          "preference": "startup|scaleup|enterprise|mixed|unknown",
          "confidence": number (0-100),
          "evidence": ["array of evidence from experience"]
        },
        "workStyle": {
          "remoteReadiness": number (0-100),
          "collaborationStyle": "independent|collaborative|hybrid",
          "adaptabilityScore": number (0-100),
          "evidence": ["array of evidence"]
        },
        "communicationSkills": {
          "writtenCommunication": number (0-100),
          "verbalCommunication": number (0-100),
          "presentationSkills": number (0-100),
          "evidence": ["array of evidence"]
        },
        "leadershipPotential": {
          "score": number (0-100),
          "style": "directive|collaborative|servant|transformational|situational",
          "mentorshipEvidence": ["array"],
          "teamBuildingEvidence": ["array"]
        },
        "innovationMindset": {
          "score": number (0-100),
          "creativityIndicators": ["array"],
          "problemSolvingApproach": "analytical|creative|systematic|intuitive"
        },
        "professionalMaturity": {
          "score": number (0-100),
          "reliabilityIndicators": ["array"],
          "accountability": number (0-100),
          "continuousLearning": number (0-100)
        }
      }
    `;

    try {
      const response = await this.geminiClient.generateStructuredResponse(
        prompt,
        `{
          "companySize": {
            "preference": "string",
            "confidence": "number",
            "evidence": ["array of strings"]
          },
          "workStyle": {
            "remoteReadiness": "number",
            "collaborationStyle": "string",
            "adaptabilityScore": "number",
            "evidence": ["array of strings"]
          },
          "communicationSkills": {
            "writtenCommunication": "number",
            "verbalCommunication": "number",
            "presentationSkills": "number",
            "evidence": ["array of strings"]
          },
          "leadershipPotential": {
            "score": "number",
            "style": "string",
            "mentorshipEvidence": ["array of strings"],
            "teamBuildingEvidence": ["array of strings"]
          },
          "innovationMindset": {
            "score": "number",
            "creativityIndicators": ["array of strings"],
            "problemSolvingApproach": "string"
          },
          "professionalMaturity": {
            "score": "number",
            "reliabilityIndicators": ["array of strings"],
            "accountability": "number",
            "continuousLearning": "number"
          }
        }`,
      );

      return response.data as CulturalFitIndicators;
    } catch (error) {
      this.logger.warn(
        'AI cultural indicators analysis failed, using fallback',
        error,
      );
      return this.fallbackHelper.createCulturalIndicators(resume);
    }
  }
}
