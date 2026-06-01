import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';
import type {
  CompanyProfile,
  CulturalFitIndicators,
  CulturalFitScore,
  SoftSkillsAssessment,
} from '../cultural-fit-analyzer.service';

/**
 * Provides deterministic fallback cultural-fit data when AI analysis is not available.
 */
export class CulturalFitFallbackHelper {
  public createCulturalFitAnalysis(
    resume: ResumeDTO,
    _companyProfile: CompanyProfile,
  ): CulturalFitScore {
    const indicators = this.createCulturalIndicators(resume);
    const softSkills = this.createSoftSkillsAssessment(resume);
    const alignmentScores = {
      companySizeAlignment: 60,
      workStyleAlignment: 60,
      leadershipAlignment: 60,
      innovationAlignment: 60,
      communicationAlignment: 60,
    };

    return {
      overallScore: 60,
      indicators,
      softSkills,
      alignmentScores,
      confidence: 0.6,
      recommendations: {
        strengths: ['Professional background'],
        concerns: ['Limited analysis data'],
        developmentAreas: ['Communication', 'Leadership'],
      },
    };
  }

  public createCulturalIndicators(_resume: ResumeDTO): CulturalFitIndicators {
    return {
      companySize: {
        preference: 'mixed',
        confidence: 50,
        evidence: ['Limited data for analysis'],
      },
      workStyle: {
        remoteReadiness: 70,
        collaborationStyle: 'hybrid',
        adaptabilityScore: 60,
        evidence: ['General assessment based on modern work trends'],
      },
      communicationSkills: {
        writtenCommunication: 60,
        verbalCommunication: 60,
        presentationSkills: 60,
        evidence: ['Resume presentation quality'],
      },
      leadershipPotential: {
        score: 50,
        style: 'collaborative',
        mentorshipEvidence: [],
        teamBuildingEvidence: [],
      },
      innovationMindset: {
        score: 60,
        creativityIndicators: [],
        problemSolvingApproach: 'analytical',
      },
      professionalMaturity: {
        score: 70,
        reliabilityIndicators: ['Work history consistency'],
        accountability: 70,
        continuousLearning: 60,
      },
    };
  }

  public createSoftSkillsAssessment(_resume: ResumeDTO): SoftSkillsAssessment {
    return {
      technicalCommunication: 60,
      problemSolving: 60,
      adaptability: 60,
      teamwork: 60,
      leadership: 50,
      timeManagement: 60,
      criticalThinking: 60,
      emotionalIntelligence: 50,
      evidence: {
        technicalCommunication: ['Resume clarity'],
        problemSolving: ['Technical skills listed'],
        adaptability: ['Work experience variety'],
        teamwork: ['Professional background'],
        leadership: ['Job titles'],
        timeManagement: ['Work history'],
        criticalThinking: ['Technical expertise'],
        emotionalIntelligence: ['Professional presentation'],
      },
    };
  }
}
