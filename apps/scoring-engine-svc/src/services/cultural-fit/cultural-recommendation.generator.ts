import { Injectable, Logger } from '@nestjs/common';
import type { GeminiClient } from '@ai-recruitment-clerk/shared-dtos';
import type {
  AlignmentScores,
  CompanyProfile,
  CulturalFitIndicators,
  CulturalRecommendations,
  SoftSkillsAssessment,
} from '../cultural-fit-analyzer.service';

@Injectable()
export class CulturalRecommendationGenerator {
  private readonly logger = new Logger(CulturalRecommendationGenerator.name);

  constructor(private readonly geminiClient: GeminiClient) {}

  public async generate(
    _indicators: CulturalFitIndicators,
    softSkills: SoftSkillsAssessment,
    companyProfile: CompanyProfile,
    alignmentScores: AlignmentScores,
  ): Promise<CulturalRecommendations> {
    try {
      const prompt = `
        Generate hiring recommendations based on cultural fit analysis:

        ALIGNMENT SCORES:
        - Company Size: ${alignmentScores.companySizeAlignment}%
        - Work Style: ${alignmentScores.workStyleAlignment}%
        - Leadership: ${alignmentScores.leadershipAlignment}%
        - Innovation: ${alignmentScores.innovationAlignment}%
        - Communication: ${alignmentScores.communicationAlignment}%

        SOFT SKILLS SCORES:
        - Technical Communication: ${softSkills.technicalCommunication}%
        - Problem Solving: ${softSkills.problemSolving}%
        - Adaptability: ${softSkills.adaptability}%
        - Teamwork: ${softSkills.teamwork}%
        - Leadership: ${softSkills.leadership}%

        COMPANY PROFILE:
        ${JSON.stringify(companyProfile, null, 2)}

        Provide recommendations in JSON format:
        {
          "strengths": ["3-5 key strengths for this role"],
          "concerns": ["2-3 potential concerns or risks"],
          "developmentAreas": ["2-3 areas for professional development"]
        }
      `;

      const response = await this.geminiClient.generateStructuredResponse(
        prompt,
        `{
          "strengths": ["array of strength strings"],
          "concerns": ["array of concern strings"],
          "developmentAreas": ["array of development area strings"]
        }`,
      );

      return response.data as CulturalRecommendations;
    } catch (error) {
      this.logger.warn(
        'Failed to generate recommendations, using fallback',
        error,
      );
      return {
        strengths: ['Strong technical background', 'Professional experience'],
        concerns: ['Limited cultural fit data'],
        developmentAreas: ['Communication skills', 'Leadership development'],
      };
    }
  }
}
