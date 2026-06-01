import { Injectable } from '@nestjs/common';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';
import type {
  AlignmentScores,
  CompanyProfile,
  CulturalFitIndicators,
  SoftSkillsAssessment,
} from '../cultural-fit-analyzer.service';

@Injectable()
export class CulturalAlignmentScorer {
  public calculateAlignmentScores(
    indicators: CulturalFitIndicators,
    companyProfile: CompanyProfile,
  ): AlignmentScores {
    return {
      companySizeAlignment: this.calculateCompanySizeAlignment(
        indicators.companySize.preference,
        companyProfile.size,
      ),
      workStyleAlignment: this.calculateWorkStyleAlignment(
        indicators.workStyle,
        companyProfile.culture,
      ),
      leadershipAlignment: this.calculateLeadershipAlignment(
        indicators.leadershipPotential,
        companyProfile.teamStructure.managementLayers,
      ),
      innovationAlignment: this.calculateInnovationAlignment(
        indicators.innovationMindset.score,
        companyProfile.culture.innovation,
      ),
      communicationAlignment: this.calculateCommunicationAlignment(
        indicators.communicationSkills,
        companyProfile.teamStructure.collaborationStyle,
      ),
    };
  }

  public calculateOverallScore(
    alignmentScores: AlignmentScores,
    softSkills: SoftSkillsAssessment,
  ): number {
    const alignmentWeight = 0.6;
    const softSkillsWeight = 0.4;
    const avgAlignmentScore =
      (Object.values(alignmentScores) as number[]).reduce(
        (sum: number, score: number) => sum + score,
        0,
      ) / Object.keys(alignmentScores).length;
    const softSkillValues = [
      softSkills.technicalCommunication,
      softSkills.problemSolving,
      softSkills.adaptability,
      softSkills.teamwork,
      softSkills.leadership,
      softSkills.timeManagement,
      softSkills.criticalThinking,
      softSkills.emotionalIntelligence,
    ];
    const avgSoftSkillsScore =
      softSkillValues.reduce((sum, score) => sum + score, 0) /
      softSkillValues.length;

    return Math.round(
      avgAlignmentScore * alignmentWeight +
        avgSoftSkillsScore * softSkillsWeight,
    );
  }

  public calculateConfidence(
    indicators: CulturalFitIndicators,
    softSkills: SoftSkillsAssessment,
    resume: ResumeDTO,
  ): number {
    let confidence = 0.8;

    if (resume.workExperience.length < 2) confidence -= 0.15;

    if (resume.workExperience.length > 0) {
      const emptyDescriptions = resume.workExperience.filter(
        (exp) => !exp.summary || exp.summary.trim().length < 20,
      ).length;
      confidence -= (emptyDescriptions / resume.workExperience.length) * 0.2;
    } else {
      confidence -= 0.2;
    }

    const totalEvidence = Object.values(softSkills.evidence).flat().length;
    if (totalEvidence > 15) confidence += 0.1;
    if (indicators.companySize.confidence > 80) confidence += 0.05;

    return Math.max(0.4, Math.min(1.0, Math.round(confidence * 100) / 100));
  }

  public calculateCompanySizeAlignment(
    candidatePreference: CulturalFitIndicators['companySize']['preference'],
    companySize: CompanyProfile['size'],
  ): number {
    const alignmentMatrix: Record<
      CulturalFitIndicators['companySize']['preference'],
      Record<CompanyProfile['size'], number>
    > = {
      startup: { startup: 100, scaleup: 70, enterprise: 30 },
      scaleup: { startup: 70, scaleup: 100, enterprise: 80 },
      enterprise: { startup: 40, scaleup: 80, enterprise: 100 },
      mixed: { startup: 85, scaleup: 90, enterprise: 85 },
      unknown: { startup: 60, scaleup: 60, enterprise: 60 },
    };

    return alignmentMatrix[candidatePreference]?.[companySize] || 50;
  }

  public calculateWorkStyleAlignment(
    workStyle: CulturalFitIndicators['workStyle'],
    culture: CompanyProfile['culture'],
  ): number {
    let score = 70;

    if (culture.workStyle === 'remote' && workStyle.remoteReadiness > 80) {
      score += 20;
    }
    if (culture.workStyle === 'on-site' && workStyle.remoteReadiness < 40) {
      score += 10;
    }
    if (culture.workStyle === 'hybrid') score += 10;

    if (
      culture.decisionMaking === 'collaborative' &&
      workStyle.collaborationStyle === 'collaborative'
    ) {
      score += 15;
    }
    if (
      culture.decisionMaking === 'autonomous' &&
      workStyle.collaborationStyle === 'independent'
    ) {
      score += 15;
    }

    return Math.min(100, Math.max(0, score));
  }

  public calculateLeadershipAlignment(
    leadership: CulturalFitIndicators['leadershipPotential'],
    managementLayers: number,
  ): number {
    let score = leadership.score;

    if (managementLayers > 3 && leadership.style === 'directive') score += 10;
    if (managementLayers <= 2 && leadership.style === 'collaborative') {
      score += 15;
    }
    if (managementLayers === 1 && leadership.style === 'servant') score += 10;

    return Math.min(100, Math.max(0, score));
  }

  public calculateInnovationAlignment(
    innovationScore: number,
    companyInnovation: CompanyProfile['culture']['innovation'],
  ): number {
    const innovationRequirements: Record<
      CompanyProfile['culture']['innovation'],
      number
    > = {
      high: 80,
      medium: 60,
      low: 40,
    };

    const required = innovationRequirements[companyInnovation] || 60;
    return Math.min(100, (innovationScore / required) * 100);
  }

  public calculateCommunicationAlignment(
    communication: CulturalFitIndicators['communicationSkills'],
    collaborationStyle: string,
  ): number {
    let score =
      (communication.writtenCommunication + communication.verbalCommunication) /
      2;

    if (
      collaborationStyle === 'cross-functional' &&
      communication.presentationSkills > 70
    ) {
      score += 10;
    }
    if (
      collaborationStyle === 'matrix' &&
      communication.verbalCommunication > 80
    ) {
      score += 10;
    }

    return Math.min(100, score);
  }
}
