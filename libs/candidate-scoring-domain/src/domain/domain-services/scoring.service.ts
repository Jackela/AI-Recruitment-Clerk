/**
 * Candidate Scoring Domain - Scoring Service
 * Domain service for calculating candidate-job match scores
 */

import { SkillsTaxonomy } from './skills-taxonomy';

export interface ScoringCriteria {
  skillsWeight: number;
  experienceWeight: number;
  educationWeight: number;
  certificationsWeight: number;
  languagesWeight: number;
}

export interface CandidateProfile {
  skills: string[];
  experienceYears: number;
  educationLevel?: string;
  certifications?: string[];
  languages?: string[];
}

export interface JobRequirements {
  requiredSkills: string[];
  preferredSkills?: string[];
  minExperienceYears: number;
  maxExperienceYears?: number;
  educationLevel?: string;
  requiredCertifications?: string[];
  requiredLanguages?: string[];
}

export interface ScoringResult {
  totalScore: number;
  normalizedScore: number; // 0-100
  skillScore: number;
  experienceScore: number;
  educationScore: number;
  certificationsScore: number;
  languagesScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  extraSkills: string[];
  details: {
    skillsMatch: number;
    experienceMatch: number;
    educationMatch: number;
    certificationsMatch: number;
    languagesMatch: number;
  };
}

export interface SkillMatchResult {
  matched: string[];
  missing: string[];
  extra: string[];
  matchPercentage: number;
}

export class ScoringService {
  private static readonly DEFAULT_CRITERIA: ScoringCriteria = {
    skillsWeight: 0.4,
    experienceWeight: 0.25,
    educationWeight: 0.15,
    certificationsWeight: 0.1,
    languagesWeight: 0.1,
  };

  private static readonly MAX_SCORE = 100;

  /**
   * Calculate basic score without weights
   */
  static calculateBasicScore(
    candidate: CandidateProfile,
    requirements: JobRequirements,
  ): number {
    const result = this.calculateDetailedScore(candidate, requirements);
    return result.totalScore;
  }

  /**
   * Calculate weighted score with custom criteria
   */
  static calculateWeightedScore(
    candidate: CandidateProfile,
    requirements: JobRequirements,
    criteria: Partial<ScoringCriteria> = {},
  ): ScoringResult {
    const mergedCriteria = { ...this.DEFAULT_CRITERIA, ...criteria };
    return this.calculateDetailedScore(candidate, requirements, mergedCriteria);
  }

  /**
   * Normalize score to 0-100 range
   */
  static normalizeScore(
    score: number,
    maxScore: number = this.MAX_SCORE,
  ): number {
    if (maxScore === 0) return 0;
    const normalized = (score / maxScore) * 100;
    return Math.min(100, Math.max(0, normalized));
  }

  /**
   * Match skills between candidate and job requirements
   */
  static matchSkills(
    candidateSkills: string[],
    requiredSkills: string[],
    preferredSkills: string[] = [],
  ): SkillMatchResult {
    const normalizedCandidateSkills = candidateSkills.map((skill) =>
      SkillsTaxonomy.normalizeSkill(skill),
    );
    const normalizedRequiredSkills = requiredSkills.map((skill) =>
      SkillsTaxonomy.normalizeSkill(skill),
    );
    const normalizedPreferredSkills = preferredSkills.map((skill) =>
      SkillsTaxonomy.normalizeSkill(skill),
    );

    const matched: string[] = [];
    const missing: string[] = [];
    const extra: string[] = [];

    // Check required skills
    for (const required of normalizedRequiredSkills) {
      if (normalizedCandidateSkills.includes(required)) {
        matched.push(required);
      } else {
        missing.push(required);
      }
    }

    // Check preferred skills (count as half points)
    for (const preferred of normalizedPreferredSkills) {
      if (
        normalizedCandidateSkills.includes(preferred) &&
        !matched.includes(preferred)
      ) {
        matched.push(preferred);
      }
    }

    // Find extra skills
    for (const candidateSkill of normalizedCandidateSkills) {
      if (
        !normalizedRequiredSkills.includes(candidateSkill) &&
        !normalizedPreferredSkills.includes(candidateSkill)
      ) {
        extra.push(candidateSkill);
      }
    }

    const totalRequired =
      normalizedRequiredSkills.length + normalizedPreferredSkills.length * 0.5;
    const matchPercentage =
      totalRequired > 0 ? (matched.length / totalRequired) * 100 : 100;

    return {
      matched,
      missing,
      extra,
      matchPercentage: Math.min(100, matchPercentage),
    };
  }

  /**
   * Calculate detailed score with all components
   */
  private static calculateDetailedScore(
    candidate: CandidateProfile,
    requirements: JobRequirements,
    criteria: ScoringCriteria = this.DEFAULT_CRITERIA,
  ): ScoringResult {
    // Skills matching
    const skillMatch = this.matchSkills(
      candidate.skills,
      requirements.requiredSkills,
      requirements.preferredSkills || [],
    );

    const skillScore = skillMatch.matchPercentage * criteria.skillsWeight;

    // Experience matching
    const experienceScore =
      this.calculateExperienceScore(
        candidate.experienceYears,
        requirements.minExperienceYears,
        requirements.maxExperienceYears,
      ) * criteria.experienceWeight;

    // Education matching
    const educationScore =
      this.calculateEducationScore(
        candidate.educationLevel,
        requirements.educationLevel,
      ) * criteria.educationWeight;

    // Certifications matching
    const certificationsScore =
      this.calculateCertificationsScore(
        candidate.certifications || [],
        requirements.requiredCertifications || [],
      ) * criteria.certificationsWeight;

    // Languages matching
    const languagesScore =
      this.calculateLanguagesScore(
        candidate.languages || [],
        requirements.requiredLanguages || [],
      ) * criteria.languagesWeight;

    const totalScore =
      skillScore +
      experienceScore +
      educationScore +
      certificationsScore +
      languagesScore;

    const normalizedScore = this.normalizeScore(totalScore);

    return {
      totalScore,
      normalizedScore,
      skillScore,
      experienceScore,
      educationScore,
      certificationsScore,
      languagesScore,
      matchedSkills: skillMatch.matched,
      missingSkills: skillMatch.missing,
      extraSkills: skillMatch.extra,
      details: {
        skillsMatch: skillMatch.matchPercentage,
        experienceMatch: experienceScore / criteria.experienceWeight || 0,
        educationMatch: educationScore / criteria.educationWeight || 0,
        certificationsMatch:
          certificationsScore / criteria.certificationsWeight || 0,
        languagesMatch: languagesScore / criteria.languagesWeight || 0,
      },
    };
  }

  /**
   * Calculate experience score
   */
  private static calculateExperienceScore(
    candidateYears: number,
    minYears: number,
    maxYears?: number,
  ): number {
    if (candidateYears < minYears) {
      // Partial credit for near misses
      return Math.max(0, (candidateYears / minYears) * 50);
    }

    if (maxYears !== undefined && candidateYears > maxYears) {
      // Overqualified - slight penalty but not zero
      return 90;
    }

    // Ideal range
    return 100;
  }

  /**
   * Calculate education score
   */
  private static calculateEducationScore(
    candidateLevel?: string,
    requiredLevel?: string,
  ): number {
    if (!requiredLevel) return 100; // No requirement means full credit
    if (!candidateLevel) return 0;

    const levels = ['high_school', 'associate', 'bachelor', 'master', 'phd'];
    const candidateIndex = levels.indexOf(candidateLevel.toLowerCase());
    const requiredIndex = levels.indexOf(requiredLevel.toLowerCase());

    if (candidateIndex === -1 || requiredIndex === -1) {
      // Unknown levels - give benefit of doubt if candidate has any education
      return candidateLevel ? 70 : 0;
    }

    if (candidateIndex >= requiredIndex) {
      return 100;
    }

    // Partial credit
    return Math.max(0, (candidateIndex / requiredIndex) * 100);
  }

  /**
   * Calculate certifications score
   */
  private static calculateCertificationsScore(
    candidateCerts: string[],
    requiredCerts: string[],
  ): number {
    if (requiredCerts.length === 0) return 100;
    if (candidateCerts.length === 0) return 0;

    const normalizedCandidate = candidateCerts.map((c) =>
      c.toLowerCase().trim(),
    );
    const normalizedRequired = requiredCerts.map((c) => c.toLowerCase().trim());

    let matchedCount = 0;
    for (const required of normalizedRequired) {
      if (
        normalizedCandidate.some(
          (c) => c.includes(required) || required.includes(c),
        )
      ) {
        matchedCount++;
      }
    }

    return (matchedCount / normalizedRequired.length) * 100;
  }

  /**
   * Calculate languages score
   */
  private static calculateLanguagesScore(
    candidateLanguages: string[],
    requiredLanguages: string[],
  ): number {
    if (requiredLanguages.length === 0) return 100;
    if (candidateLanguages.length === 0) return 0;

    const normalizedCandidate = candidateLanguages.map((l) =>
      l.toLowerCase().trim(),
    );
    const normalizedRequired = requiredLanguages.map((l) =>
      l.toLowerCase().trim(),
    );

    let matchedCount = 0;
    for (const required of normalizedRequired) {
      if (normalizedCandidate.includes(required)) {
        matchedCount++;
      }
    }

    return (matchedCount / normalizedRequired.length) * 100;
  }

  /**
   * Calculate batch scores for multiple candidates
   */
  static calculateBatchScores(
    candidates: Array<{ id: string; profile: CandidateProfile }>,
    requirements: JobRequirements,
    criteria?: Partial<ScoringCriteria>,
  ): Array<{ candidateId: string; result: ScoringResult }> {
    return candidates.map((candidate) => ({
      candidateId: candidate.id,
      result: this.calculateWeightedScore(
        candidate.profile,
        requirements,
        criteria,
      ),
    }));
  }

  /**
   * Rank candidates by score
   */
  static rankCandidates(
    scores: Array<{ candidateId: string; result: ScoringResult }>,
  ): Array<{ candidateId: string; result: ScoringResult; rank: number }> {
    const sorted = [...scores].sort(
      (a, b) => b.result.normalizedScore - a.result.normalizedScore,
    );

    return sorted.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }

  /**
   * Check if score meets minimum threshold
   */
  static meetsThreshold(score: number, threshold = 60): boolean {
    return score >= threshold;
  }

  /**
   * Get score interpretation
   */
  static getScoreInterpretation(score: number): string {
    if (score >= 90) return 'Excellent match';
    if (score >= 75) return 'Good match';
    if (score >= 60) return 'Fair match';
    if (score >= 40) return 'Poor match';
    return 'Not a match';
  }
}
