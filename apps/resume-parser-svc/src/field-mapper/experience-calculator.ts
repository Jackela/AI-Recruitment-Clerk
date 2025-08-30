/**
 * Experience calculation and analysis utilities for resume processing
 */

import { DateParser, DateRange } from './date-parser';
import { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';

export interface ExperienceAnalysis {
  totalExperienceMonths: number;
  totalExperienceYears: number;
  relevantExperienceMonths: number;
  relevantExperienceYears: number;
  seniorityLevel: 'Entry' | 'Mid' | 'Senior' | 'Expert';
  experienceGaps: DateRange[];
  overlappingPositions: DateRange[];
  confidenceScore: number;
  experienceDetails: {
    totalPositions: number;
    averagePositionDuration: number;
    longestPosition: number;
    shortestPosition: number;
    currentPosition: boolean;
  };
}

export interface PositionAnalysis {
  company: string;
  position: string;
  dateRange: DateRange;
  isRelevant: boolean;
  relevanceScore: number;
  skillsExtracted: string[];
  seniorityIndicators: string[];
}

export class ExperienceCalculator {
  private static readonly SENIORITY_KEYWORDS = {
    'Entry': ['junior', 'associate', 'trainee', 'intern', 'graduate', 'entry level', 'level 1', 'i', 'assistant'],
    'Mid': ['developer', 'engineer', 'analyst', 'specialist', 'consultant', 'level 2', 'ii', 'mid level'],
    'Senior': ['senior', 'lead', 'principal', 'level 3', 'iii', 'sr', 'experienced'],
    'Expert': ['architect', 'director', 'manager', 'head of', 'chief', 'vp', 'vice president', 'cto', 'cio', 'level 4', 'iv', 'staff', 'distinguished']
  };

  private static readonly RELEVANCE_KEYWORDS = {
    'Technical': ['developer', 'engineer', 'programmer', 'architect', 'technical', 'software', 'systems', 'database', 'web', 'mobile', 'cloud'],
    'Management': ['manager', 'director', 'lead', 'supervisor', 'coordinator', 'head', 'chief', 'vp', 'president'],
    'Product': ['product', 'business analyst', 'requirements', 'stakeholder', 'strategy', 'roadmap'],
    'Quality': ['qa', 'quality assurance', 'tester', 'testing', 'quality engineer'],
    'DevOps': ['devops', 'infrastructure', 'deployment', 'ci/cd', 'operations', 'sre', 'reliability']
  };

  private static readonly MIN_REASONABLE_DURATION_MONTHS = 1; // 1 month minimum
  private static readonly MAX_REASONABLE_DURATION_MONTHS = 600; // 50 years maximum
  private static readonly RECENT_EXPERIENCE_WEIGHT = 1.2; // Weight recent experience 20% higher
  private static readonly RECENT_YEARS_THRESHOLD = 3; // Last 3 years considered "recent"

  /**
   * Calculate comprehensive experience analysis from work experience data
   */
  static analyzeExperience(workExperience: ResumeDTO['workExperience'], targetSkills?: string[]): ExperienceAnalysis {
    if (!workExperience || workExperience.length === 0) {
      return this.createEmptyAnalysis();
    }

    // Parse all positions and create date ranges
    const positions = workExperience.map(exp => this.analyzePosition(exp, targetSkills));
    const validPositions = positions.filter(pos => pos.dateRange.duration.totalMonths > 0);

    if (validPositions.length === 0) {
      return this.createEmptyAnalysis();
    }

    // Calculate total experience
    const totalMonths = this.calculateTotalExperience(validPositions);
    const relevantMonths = this.calculateRelevantExperience(validPositions, targetSkills);

    // Detect gaps and overlaps
    const gaps = this.detectExperienceGaps(validPositions);
    const overlaps = this.detectOverlappingPositions(validPositions);

    // Determine seniority level
    const seniorityLevel = this.determineSeniorityLevel(validPositions, totalMonths);

    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(validPositions);

    // Calculate experience details
    const experienceDetails = this.calculateExperienceDetails(validPositions);

    return {
      totalExperienceMonths: totalMonths,
      totalExperienceYears: Math.round(totalMonths / 12 * 10) / 10,
      relevantExperienceMonths: relevantMonths,
      relevantExperienceYears: Math.round(relevantMonths / 12 * 10) / 10,
      seniorityLevel,
      experienceGaps: gaps,
      overlappingPositions: overlaps,
      confidenceScore,
      experienceDetails
    };
  }

  /**
   * Analyze individual position
   */
  private static analyzePosition(experience: ResumeDTO['workExperience'][0], targetSkills?: string[]): PositionAnalysis {
    const dateRange = DateParser.createDateRange(experience.startDate, experience.endDate);
    const isRelevant = this.isPositionRelevant(experience, targetSkills);
    const relevanceScore = this.calculateRelevanceScore(experience, targetSkills);
    const skillsExtracted = this.extractSkillsFromPosition(experience);
    const seniorityIndicators = this.extractSeniorityIndicators(experience);

    return {
      company: experience.company,
      position: experience.position,
      dateRange,
      isRelevant,
      relevanceScore,
      skillsExtracted,
      seniorityIndicators
    };
  }

  /**
   * Calculate total experience with overlap handling
   */
  private static calculateTotalExperience(positions: PositionAnalysis[]): number {
    if (positions.length === 0) return 0;

    // Sort positions by start date
    const sortedPositions = positions
      .filter(pos => pos.dateRange.start.date && (pos.dateRange.end.date || pos.dateRange.end.isPresent))
      .sort((a, b) => {
        const aStart = a.dateRange.start.date!;
        const bStart = b.dateRange.start.date!;
        return aStart.getTime() - bStart.getTime();
      });

    if (sortedPositions.length === 0) return 0;

    let totalMonths = 0;
    let currentEnd = sortedPositions[0].dateRange.start.date!;

    for (const position of sortedPositions) {
      const start = position.dateRange.start.date!;
      const end = position.dateRange.end.isPresent ? new Date() : position.dateRange.end.date!;

      if (start > currentEnd) {
        // No overlap, add full duration
        const duration = position.dateRange.duration.totalMonths;
        totalMonths += duration;
        currentEnd = end;
      } else {
        // Overlap detected, only add non-overlapping portion
        if (end > currentEnd) {
          const nonOverlapStart = currentEnd;
          const monthsDiff = (end.getFullYear() - nonOverlapStart.getFullYear()) * 12 + 
                           (end.getMonth() - nonOverlapStart.getMonth());
          totalMonths += Math.max(0, monthsDiff);
          currentEnd = end;
        }
      }
    }

    return Math.max(0, totalMonths);
  }

  /**
   * Calculate relevant experience based on target skills or position relevance
   */
  private static calculateRelevantExperience(positions: PositionAnalysis[], targetSkills?: string[]): number {
    let relevantMonths = 0;
    const currentDate = new Date();
    const recentThreshold = new Date();
    recentThreshold.setFullYear(currentDate.getFullYear() - this.RECENT_YEARS_THRESHOLD);

    for (const position of positions) {
      if (position.isRelevant || position.relevanceScore > 0.7) {
        let duration = position.dateRange.duration.totalMonths;
        
        // Apply recent experience weight
        const start = position.dateRange.start.date;
        if (start && start > recentThreshold) {
          duration *= this.RECENT_EXPERIENCE_WEIGHT;
        }

        relevantMonths += duration * position.relevanceScore;
      }
    }

    return Math.round(relevantMonths);
  }

  /**
   * Determine seniority level based on experience and position titles
   */
  private static determineSeniorityLevel(positions: PositionAnalysis[], totalMonths: number): ExperienceAnalysis['seniorityLevel'] {
    const totalYears = totalMonths / 12;

    // Check for explicit seniority indicators in recent positions
    const recentPositions = positions
      .filter(pos => pos.dateRange.end.isPresent || 
        (pos.dateRange.end.date && pos.dateRange.end.date.getFullYear() >= new Date().getFullYear() - 2))
      .slice(-3); // Last 3 positions

    // Check for expert-level indicators
    const hasExpertIndicators = recentPositions.some(pos => 
      pos.seniorityIndicators.some(indicator => 
        this.SENIORITY_KEYWORDS.Expert.some(keyword => 
          indicator.toLowerCase().includes(keyword)
        )
      )
    );

    // Check for senior-level indicators
    const hasSeniorIndicators = recentPositions.some(pos => 
      pos.seniorityIndicators.some(indicator => 
        this.SENIORITY_KEYWORDS.Senior.some(keyword => 
          indicator.toLowerCase().includes(keyword)
        )
      )
    );

    // Check for entry-level indicators
    const hasEntryIndicators = recentPositions.some(pos => 
      pos.seniorityIndicators.some(indicator => 
        this.SENIORITY_KEYWORDS.Entry.some(keyword => 
          indicator.toLowerCase().includes(keyword)
        )
      )
    );

    // Determine seniority based on experience and indicators
    if (hasExpertIndicators || totalYears >= 10) {
      return 'Expert';
    } else if (hasSeniorIndicators || totalYears >= 5) {
      return 'Senior';
    } else if (hasEntryIndicators || totalYears <= 2) {
      return 'Entry';
    } else {
      return 'Mid';
    }
  }

  /**
   * Detect experience gaps between positions
   */
  private static detectExperienceGaps(positions: PositionAnalysis[]): DateRange[] {
    const gaps: DateRange[] = [];
    
    const sortedPositions = positions
      .filter(pos => pos.dateRange.start.date && (pos.dateRange.end.date || pos.dateRange.end.isPresent))
      .sort((a, b) => {
        const aStart = a.dateRange.start.date!;
        const bStart = b.dateRange.start.date!;
        return aStart.getTime() - bStart.getTime();
      });

    for (let i = 1; i < sortedPositions.length; i++) {
      const prevEnd = sortedPositions[i - 1].dateRange.end.isPresent ? 
        new Date() : sortedPositions[i - 1].dateRange.end.date!;
      const currentStart = sortedPositions[i].dateRange.start.date!;

      // Check for gap (more than 1 month)
      const monthsDiff = (currentStart.getFullYear() - prevEnd.getFullYear()) * 12 + 
                        (currentStart.getMonth() - prevEnd.getMonth());

      if (monthsDiff > 1) {
        const gapStart = DateParser.parseDate(prevEnd.toISOString());
        const gapEnd = DateParser.parseDate(currentStart.toISOString());
        gaps.push({
          start: gapStart,
          end: gapEnd,
          duration: DateParser.calculateDuration(gapStart, gapEnd)
        });
      }
    }

    return gaps;
  }

  /**
   * Detect overlapping positions
   */
  private static detectOverlappingPositions(positions: PositionAnalysis[]): DateRange[] {
    const overlaps: DateRange[] = [];

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        if (DateParser.checkDateRangeOverlap(positions[i].dateRange, positions[j].dateRange)) {
          overlaps.push(positions[i].dateRange);
          overlaps.push(positions[j].dateRange);
        }
      }
    }

    return overlaps;
  }

  /**
   * Check if position is relevant based on title and summary
   */
  private static isPositionRelevant(experience: ResumeDTO['workExperience'][0], targetSkills?: string[]): boolean {
    const positionText = `${experience.position} ${experience.summary}`.toLowerCase();
    
    // Check against relevance keywords
    const hasRelevantKeywords = Object.values(this.RELEVANCE_KEYWORDS).some(keywords =>
      keywords.some(keyword => positionText.includes(keyword.toLowerCase()))
    );

    // Check against target skills if provided
    const matchesTargetSkills = targetSkills ? 
      targetSkills.some(skill => positionText.includes(skill.toLowerCase())) : false;

    return hasRelevantKeywords || matchesTargetSkills;
  }

  /**
   * Calculate relevance score for a position
   */
  private static calculateRelevanceScore(experience: ResumeDTO['workExperience'][0], targetSkills?: string[]): number {
    const positionText = `${experience.position} ${experience.summary}`.toLowerCase();
    let score = 0.5; // Base score

    // Check technical keywords
    const technicalMatches = this.RELEVANCE_KEYWORDS.Technical.filter(keyword =>
      positionText.includes(keyword.toLowerCase())
    ).length;
    score += Math.min(0.3, technicalMatches * 0.05);

    // Check target skills matches
    if (targetSkills) {
      const skillMatches = targetSkills.filter(skill =>
        positionText.includes(skill.toLowerCase())
      ).length;
      score += Math.min(0.4, skillMatches * 0.1);
    }

    // Check for management indicators
    const managementMatches = this.RELEVANCE_KEYWORDS.Management.filter(keyword =>
      positionText.includes(keyword.toLowerCase())
    ).length;
    if (managementMatches > 0) {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  /**
   * Extract skills mentioned in position title and summary
   */
  private static extractSkillsFromPosition(experience: ResumeDTO['workExperience'][0]): string[] {
    const positionText = `${experience.position} ${experience.summary}`;
    const extractedSkills: string[] = [];

    // Simple keyword extraction (could be enhanced with NLP)
    const techKeywords = [
      'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node.js', 'express',
      'sql', 'mongodb', 'postgresql', 'mysql', 'aws', 'azure', 'docker', 'kubernetes',
      'git', 'jenkins', 'ci/cd', 'agile', 'scrum', 'rest', 'api', 'microservices'
    ];

    techKeywords.forEach(keyword => {
      if (positionText.toLowerCase().includes(keyword)) {
        extractedSkills.push(keyword);
      }
    });

    return extractedSkills;
  }

  /**
   * Extract seniority indicators from position
   */
  private static extractSeniorityIndicators(experience: ResumeDTO['workExperience'][0]): string[] {
    const indicators: string[] = [];
    const positionText = `${experience.position} ${experience.summary}`.toLowerCase();

    Object.entries(this.SENIORITY_KEYWORDS).forEach(([level, keywords]) => {
      keywords.forEach(keyword => {
        if (positionText.includes(keyword.toLowerCase())) {
          indicators.push(`${level}: ${keyword}`);
        }
      });
    });

    return indicators;
  }

  /**
   * Calculate confidence score based on data quality
   */
  private static calculateConfidenceScore(positions: PositionAnalysis[]): number {
    if (positions.length === 0) return 0;

    let totalScore = 0;
    let maxScore = 0;

    positions.forEach(position => {
      let positionScore = 0;
      let positionMaxScore = 0;

      // Date quality (40% of score)
      positionMaxScore += 40;
      if (position.dateRange.start.confidence > 0.8 && 
          (position.dateRange.end.confidence > 0.8 || position.dateRange.end.isPresent)) {
        positionScore += 40;
      } else if (position.dateRange.start.confidence > 0.6) {
        positionScore += 20;
      }

      // Position title quality (30% of score)
      positionMaxScore += 30;
      if (position.position.length > 5) {
        positionScore += 30;
      } else if (position.position.length > 2) {
        positionScore += 15;
      }

      // Company name quality (20% of score)
      positionMaxScore += 20;
      if (position.company.length > 2) {
        positionScore += 20;
      }

      // Duration reasonableness (10% of score)
      positionMaxScore += 10;
      const months = position.dateRange.duration.totalMonths;
      if (months >= this.MIN_REASONABLE_DURATION_MONTHS && 
          months <= this.MAX_REASONABLE_DURATION_MONTHS) {
        positionScore += 10;
      }

      totalScore += positionScore;
      maxScore += positionMaxScore;
    });

    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) / 100 : 0;
  }

  /**
   * Calculate detailed experience statistics
   */
  private static calculateExperienceDetails(positions: PositionAnalysis[]): ExperienceAnalysis['experienceDetails'] {
    if (positions.length === 0) {
      return {
        totalPositions: 0,
        averagePositionDuration: 0,
        longestPosition: 0,
        shortestPosition: 0,
        currentPosition: false
      };
    }

    const durations = positions.map(pos => pos.dateRange.duration.totalMonths);
    const hasCurrentPosition = positions.some(pos => pos.dateRange.end.isPresent);
    
    return {
      totalPositions: positions.length,
      averagePositionDuration: Math.round(durations.reduce((sum, dur) => sum + dur, 0) / durations.length),
      longestPosition: Math.max(...durations),
      shortestPosition: Math.min(...durations),
      currentPosition: hasCurrentPosition
    };
  }

  /**
   * Create empty analysis structure
   */
  private static createEmptyAnalysis(): ExperienceAnalysis {
    return {
      totalExperienceMonths: 0,
      totalExperienceYears: 0,
      relevantExperienceMonths: 0,
      relevantExperienceYears: 0,
      seniorityLevel: 'Entry',
      experienceGaps: [],
      overlappingPositions: [],
      confidenceScore: 0,
      experienceDetails: {
        totalPositions: 0,
        averagePositionDuration: 0,
        longestPosition: 0,
        shortestPosition: 0,
        currentPosition: false
      }
    };
  }

  /**
   * Get experience summary text
   */
  static getExperienceSummary(analysis: ExperienceAnalysis): string {
    if (analysis.totalExperienceYears === 0) {
      return 'No work experience found';
    }

    const totalYears = analysis.totalExperienceYears;
    const relevantYears = analysis.relevantExperienceYears;
    const level = analysis.seniorityLevel;
    const positions = analysis.experienceDetails.totalPositions;

    let summary = `${totalYears} years total experience (${level} level) across ${positions} position${positions !== 1 ? 's' : ''}`;
    
    if (relevantYears !== totalYears && relevantYears > 0) {
      summary += `, including ${relevantYears} years of relevant experience`;
    }

    if (analysis.experienceGaps.length > 0) {
      summary += ` with ${analysis.experienceGaps.length} career gap${analysis.experienceGaps.length !== 1 ? 's' : ''}`;
    }

    if (analysis.experienceDetails.currentPosition) {
      summary += ' (currently employed)';
    }

    return summary;
  }
}