import { Injectable } from '@nestjs/common';
import type {
  ResumeDTO,
  DataQualityAssessment,
  DataQualityFactors,
} from './confidence.types';

/**
 * DataQualityService - Handles data quality assessment for resume scoring.
 *
 * Analyzes resume data to determine completeness, consistency, recency, and detail level
 * which are critical factors in determining scoring confidence.
 *
 * @since v1.0.0
 */
@Injectable()
export class DataQualityService {
  /**
   * Assess data quality factors for a resume.
   *
   * @param resume - Parsed resume data
   * @returns Data quality assessment with score, factors, and issues
   */
  public assessDataQuality(resume: ResumeDTO): DataQualityAssessment {
    // Completeness assessment
    const completeness = this.assessCompleteness(resume);

    // Consistency assessment
    const consistency = this.assessConsistency(resume);

    // Recency assessment
    const recency = this.assessRecency(resume);

    // Detail level assessment
    const detail = this.assessDetailLevel(resume);

    const factors: DataQualityFactors = {
      completeness,
      consistency,
      recency,
      detail,
    };

    // Overall data quality score
    const score = Math.round(
      completeness * 0.3 + consistency * 0.25 + recency * 0.2 + detail * 0.25,
    );

    // Identify data quality issues
    const issues = this.identifyDataQualityIssues(factors, resume);

    return {
      score,
      factors,
      issues,
    };
  }

  private assessCompleteness(resume: ResumeDTO): number {
    let score = 100;

    // Contact info completeness
    if (!resume.contactInfo.name) score -= 15;
    if (!resume.contactInfo.email) score -= 15;
    if (!resume.contactInfo.phone) score -= 10;

    // Work experience completeness
    if (resume.workExperience.length === 0) score -= 30;
    const incompleteExperience = resume.workExperience.filter(
      (exp) => !exp.company || !exp.position || !exp.startDate || !exp.summary,
    ).length;
    score -= (incompleteExperience / resume.workExperience.length) * 20;

    // Education completeness
    if (resume.education.length === 0) score -= 15;
    const incompleteEducation = resume.education.filter(
      (edu) => !edu.school || !edu.degree,
    ).length;
    score -= (incompleteEducation / Math.max(1, resume.education.length)) * 10;

    // Skills completeness
    if (resume.skills.length === 0) score -= 20;
    if (resume.skills.length < 5) score -= 10;

    return Math.max(0, score);
  }

  private assessConsistency(resume: ResumeDTO): number {
    let score = 100;

    // Date consistency in work experience
    const dateInconsistencies = this.checkDateConsistency(
      resume.workExperience,
    );
    score -= dateInconsistencies * 10;

    // Position progression consistency
    const progressionIssues = this.checkProgressionConsistency(
      resume.workExperience,
    );
    score -= progressionIssues * 5;

    // Skills vs experience consistency
    const skillConsistencyScore = this.checkSkillConsistency(resume);
    score = Math.min(score, skillConsistencyScore);

    return Math.max(0, score);
  }

  private assessRecency(resume: ResumeDTO): number {
    if (resume.workExperience.length === 0) return 50;

    // Check most recent experience
    const mostRecent = resume.workExperience.reduce((latest, exp) => {
      const expEndDate =
        exp.endDate === 'present' ? new Date() : new Date(exp.endDate);
      const latestEndDate =
        latest.endDate === 'present' ? new Date() : new Date(latest.endDate);
      return expEndDate > latestEndDate ? exp : latest;
    });

    const endDate =
      mostRecent.endDate === 'present'
        ? new Date()
        : new Date(mostRecent.endDate);
    const monthsSinceLastJob =
      (new Date().getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

    // Score based on recency
    if (monthsSinceLastJob <= 3) return 100;
    if (monthsSinceLastJob <= 6) return 90;
    if (monthsSinceLastJob <= 12) return 80;
    if (monthsSinceLastJob <= 24) return 60;
    return 40;
  }

  private assessDetailLevel(resume: ResumeDTO): number {
    let score = 0;
    let totalItems = 0;

    // Work experience detail
    for (const exp of resume.workExperience) {
      totalItems++;
      if (exp.summary && exp.summary.length > 50) score += 25;
      else if (exp.summary && exp.summary.length > 20) score += 15;
      else if (exp.summary) score += 5;
    }

    // Education detail
    for (const edu of resume.education) {
      totalItems++;
      if (edu.major) score += 15;
      else score += 5;
    }

    // Skills detail
    if (resume.skills.length > 10) score += 20;
    else if (resume.skills.length > 5) score += 15;
    else if (resume.skills.length > 0) score += 10;
    totalItems++;

    return totalItems > 0 ? Math.min(100, score / totalItems) : 0;
  }

  private identifyDataQualityIssues(
    factors: DataQualityFactors,
    resume: ResumeDTO,
  ): string[] {
    const issues: string[] = [];

    if (factors.completeness < 70) {
      issues.push(
        'Missing critical information (contact, experience, or education)',
      );
    }

    if (factors.consistency < 70) {
      issues.push('Inconsistencies in dates or career progression');
    }

    if (factors.recency < 70) {
      issues.push('Resume may not reflect recent experience');
    }

    if (factors.detail < 50) {
      issues.push('Insufficient detail in job descriptions');
    }

    if (resume.workExperience.length === 0) {
      issues.push('No work experience provided');
    }

    if (resume.skills.length < 3) {
      issues.push('Very few skills listed');
    }

    return issues;
  }

  private checkDateConsistency(
    workExperience: ResumeDTO['workExperience'],
  ): number {
    let inconsistencies = 0;

    for (const exp of workExperience) {
      try {
        const startDate = new Date(exp.startDate);
        const endDate =
          exp.endDate === 'present' ? new Date() : new Date(exp.endDate);

        if (startDate > endDate) inconsistencies++;
        if (startDate > new Date()) inconsistencies++;
      } catch {
        inconsistencies++;
      }
    }

    return inconsistencies;
  }

  private checkProgressionConsistency(
    workExperience: ResumeDTO['workExperience'],
  ): number {
    if (workExperience.length < 2) return 0;

    // Sort by start date
    const sorted = [...workExperience].sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

    // Check for overlapping positions (might indicate inconsistency)
    let overlaps = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prevEnd =
        sorted[i - 1].endDate === 'present'
          ? new Date()
          : new Date(sorted[i - 1].endDate);
      const currentStart = new Date(sorted[i].startDate);

      if (currentStart < prevEnd) overlaps++;
    }

    return overlaps;
  }

  private checkSkillConsistency(resume: ResumeDTO): number {
    // Check if skills mentioned align with work experience descriptions
    const skillsLower = resume.skills.map((s) => s.toLowerCase());
    const experienceText = resume.workExperience
      .map((exp) => exp.summary.toLowerCase())
      .join(' ');

    const alignedSkills = skillsLower.filter(
      (skill) =>
        experienceText.includes(skill) ||
        experienceText.includes(skill.replace(/\./g, '')),
    );

    return resume.skills.length > 0
      ? Math.round((alignedSkills.length / resume.skills.length) * 100)
      : 100;
  }
}
