import { Injectable, Logger } from '@nestjs/common';
import { GeminiClient, GeminiResponse } from '@ai-recruitment-clerk/ai-services-shared';
import { SkillsTaxonomy } from '@ai-recruitment-clerk/candidate-scoring-domain';

export interface SkillMatchResult {
  skill: string;
  matchedJobSkill: string;
  matchScore: number;
  matchType: 'exact' | 'semantic' | 'fuzzy' | 'related';
  confidence: number;
  explanation?: string;
}

export interface SkillGapAnalysis {
  missingCriticalSkills: string[];
  missingOptionalSkills: string[];
  improvementSuggestions: {
    skill: string;
    priority: 'high' | 'medium' | 'low';
    reason: string;
  }[];
}

export interface EnhancedSkillScore {
  overallScore: number;
  matches: SkillMatchResult[];
  gapAnalysis: SkillGapAnalysis;
  confidence: number;
  breakdown: {
    exactMatches: number;
    semanticMatches: number;
    fuzzyMatches: number;
    relatedMatches: number;
  };
}

export interface JobSkillRequirement {
  name: string;
  weight: number;
  required: boolean;
  category?: string;
  synonyms?: string[];
  description?: string;
}

@Injectable()
export class EnhancedSkillMatcherService {
  private readonly logger = new Logger(EnhancedSkillMatcherService.name);

  constructor(private readonly geminiClient: GeminiClient) {}

  /**
   * Enhanced skill matching with AI-driven semantic analysis
   */
  async matchSkills(
    resumeSkills: string[],
    jobSkills: JobSkillRequirement[],
    industryContext?: string
  ): Promise<EnhancedSkillScore> {
    const startTime = Date.now();
    
    try {
      // Normalize resume skills using taxonomy
      const normalizedResumeSkills = resumeSkills
        .map(skill => SkillsTaxonomy.normalizeSkill(skill))
        .filter(skill => skill.length > 0);

      // Group skills by category for better analysis
      const resumeSkillsByCategory = SkillsTaxonomy.groupSkillsByCategory(normalizedResumeSkills);
      
      const matches: SkillMatchResult[] = [];
      const breakdown = {
        exactMatches: 0,
        semanticMatches: 0,
        fuzzyMatches: 0,
        relatedMatches: 0
      };

      // Process each job skill requirement
      for (const jobSkill of jobSkills) {
        const matchResult = await this.findBestSkillMatch(
          normalizedResumeSkills,
          jobSkill,
          industryContext
        );
        
        if (matchResult) {
          matches.push(matchResult);
          breakdown[`${matchResult.matchType}Matches`]++;
        }
      }

      // Generate gap analysis
      const gapAnalysis = await this.analyzeSkillGaps(
        normalizedResumeSkills,
        jobSkills,
        matches,
        industryContext
      );

      // Calculate overall score with weighted factors
      const overallScore = this.calculateWeightedSkillScore(matches, jobSkills);
      
      // Calculate confidence based on match quality and coverage
      const confidence = this.calculateMatchConfidence(matches, jobSkills);

      const processingTime = Date.now() - startTime;
      this.logger.log(`Enhanced skill matching completed in ${processingTime}ms`);

      return {
        overallScore,
        matches,
        gapAnalysis,
        confidence,
        breakdown
      };

    } catch (error) {
      this.logger.error('Error in enhanced skill matching', error);
      // Fallback to basic matching
      return this.fallbackBasicMatching(resumeSkills, jobSkills);
    }
  }

  /**
   * Find the best match for a job skill requirement
   */
  private async findBestSkillMatch(
    resumeSkills: string[],
    jobSkill: JobSkillRequirement,
    industryContext?: string
  ): Promise<SkillMatchResult | null> {
    const normalizedJobSkill = SkillsTaxonomy.normalizeSkill(jobSkill.name);

    // 1. Try exact match
    for (const resumeSkill of resumeSkills) {
      if (resumeSkill === normalizedJobSkill) {
        return {
          skill: resumeSkill,
          matchedJobSkill: normalizedJobSkill,
          matchScore: 1.0,
          matchType: 'exact',
          confidence: 0.95,
          explanation: 'Exact skill match found'
        };
      }
    }

    // 2. Try synonym/fuzzy match from taxonomy
    for (const resumeSkill of resumeSkills) {
      const fuzzyMatch = SkillsTaxonomy.fuzzyMatchSkill(jobSkill.name, 0.8);
      if (fuzzyMatch && fuzzyMatch === resumeSkill) {
        return {
          skill: resumeSkill,
          matchedJobSkill: normalizedJobSkill,
          matchScore: 0.9,
          matchType: 'fuzzy',
          confidence: 0.85,
          explanation: 'Fuzzy match found using skills taxonomy'
        };
      }
    }

    // 3. Try related skills match
    const relatedSkills = SkillsTaxonomy.getRelatedSkills(normalizedJobSkill);
    for (const resumeSkill of resumeSkills) {
      if (relatedSkills.includes(resumeSkill)) {
        return {
          skill: resumeSkill,
          matchedJobSkill: normalizedJobSkill,
          matchScore: 0.7,
          matchType: 'related',
          confidence: 0.75,
          explanation: `Related skill match: ${resumeSkill} is related to ${normalizedJobSkill}`
        };
      }
    }

    // 4. Try AI semantic matching for complex cases
    if (jobSkill.required || jobSkill.weight > 0.7) {
      const semanticMatch = await this.performSemanticMatching(
        resumeSkills,
        jobSkill,
        industryContext
      );
      if (semanticMatch) {
        return semanticMatch;
      }
    }

    return null;
  }

  /**
   * Perform AI-driven semantic skill matching
   */
  private async performSemanticMatching(
    resumeSkills: string[],
    jobSkill: JobSkillRequirement,
    industryContext?: string
  ): Promise<SkillMatchResult | null> {
    try {
      const prompt = `
        Analyze if any of these resume skills match the job requirement:
        
        Resume Skills: ${resumeSkills.join(', ')}
        
        Job Skill Requirement: ${jobSkill.name}
        Job Skill Description: ${jobSkill.description || 'N/A'}
        Industry Context: ${industryContext || 'General'}
        
        Consider:
        1. Semantic similarity and conceptual overlap
        2. Industry-specific terminology and variations
        3. Skills that enable or substitute for the required skill
        4. Framework/library relationships (e.g., React knowledge implies JavaScript)
        
        Return the analysis in this JSON format:
        {
          "hasMatch": boolean,
          "matchedSkill": string | null,
          "matchScore": number (0.0-1.0),
          "confidence": number (0.0-1.0),
          "explanation": string
        }
      `;

      const response: GeminiResponse<{
        hasMatch: boolean;
        matchedSkill: string | null;
        matchScore: number;
        confidence: number;
        explanation: string;
      }> = await this.geminiClient.generateStructuredResponse(
        prompt,
        `{
          "hasMatch": "boolean",
          "matchedSkill": "string or null",
          "matchScore": "number between 0.0 and 1.0",
          "confidence": "number between 0.0 and 1.0", 
          "explanation": "string explaining the reasoning"
        }`
      );

      if (response.data.hasMatch && response.data.matchedSkill && response.data.matchScore >= 0.6) {
        return {
          skill: response.data.matchedSkill,
          matchedJobSkill: jobSkill.name,
          matchScore: response.data.matchScore,
          matchType: 'semantic',
          confidence: response.data.confidence,
          explanation: response.data.explanation
        };
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to perform semantic matching', error);
      return null;
    }
  }

  /**
   * Analyze skill gaps and provide improvement suggestions
   */
  private async analyzeSkillGaps(
    resumeSkills: string[],
    jobSkills: JobSkillRequirement[],
    matches: SkillMatchResult[],
    industryContext?: string
  ): Promise<SkillGapAnalysis> {
    const matchedJobSkills = new Set(matches.map(m => m.matchedJobSkill));
    const missingCriticalSkills = jobSkills
      .filter(skill => skill.required && !matchedJobSkills.has(skill.name))
      .map(skill => skill.name);
    
    const missingOptionalSkills = jobSkills
      .filter(skill => !skill.required && skill.weight > 0.5 && !matchedJobSkills.has(skill.name))
      .map(skill => skill.name);

    // Generate AI-powered improvement suggestions
    const improvementSuggestions = await this.generateImprovementSuggestions(
      resumeSkills,
      missingCriticalSkills,
      missingOptionalSkills,
      industryContext
    );

    return {
      missingCriticalSkills,
      missingOptionalSkills,
      improvementSuggestions
    };
  }

  /**
   * Generate AI-powered skill improvement suggestions
   */
  private async generateImprovementSuggestions(
    resumeSkills: string[],
    missingCritical: string[],
    missingOptional: string[],
    industryContext?: string
  ): Promise<{ skill: string; priority: 'high' | 'medium' | 'low'; reason: string }[]> {
    if (missingCritical.length === 0 && missingOptional.length === 0) {
      return [];
    }

    try {
      const prompt = `
        Based on the candidate's current skills and missing requirements, suggest skill improvement priorities:
        
        Current Skills: ${resumeSkills.join(', ')}
        Missing Critical Skills: ${missingCritical.join(', ')}
        Missing Optional Skills: ${missingOptional.join(', ')}
        Industry: ${industryContext || 'General'}
        
        Provide improvement suggestions considering:
        1. Learning curve and time investment
        2. Career impact and market demand
        3. Synergy with existing skills
        4. Industry relevance and growth trends
        
        Return up to 5 suggestions in JSON format:
        {
          "suggestions": [
            {
              "skill": "skill name",
              "priority": "high|medium|low",
              "reason": "detailed explanation of why this skill should be prioritized"
            }
          ]
        }
      `;

      const response = await this.geminiClient.generateStructuredResponse(
        prompt,
        `{
          "suggestions": [
            {
              "skill": "string",
              "priority": "high or medium or low",
              "reason": "string"
            }
          ]
        }`
      );

      return (response.data as any).suggestions || [];
    } catch (error) {
      this.logger.warn('Failed to generate improvement suggestions', error);
      return missingCritical.map(skill => ({
        skill,
        priority: 'high' as const,
        reason: 'Critical skill required for this position'
      }));
    }
  }

  /**
   * Calculate weighted skill score based on job requirements
   */
  private calculateWeightedSkillScore(
    matches: SkillMatchResult[],
    jobSkills: JobSkillRequirement[]
  ): number {
    let totalPossibleScore = 0;
    let achievedScore = 0;

    for (const jobSkill of jobSkills) {
      const weight = jobSkill.required ? jobSkill.weight * 1.5 : jobSkill.weight;
      totalPossibleScore += weight;

      const match = matches.find(m => m.matchedJobSkill === jobSkill.name);
      if (match) {
        // Apply match type multipliers
        const typeMultiplier = this.getMatchTypeMultiplier(match.matchType);
        achievedScore += weight * match.matchScore * typeMultiplier;
      }
    }

    return totalPossibleScore > 0 ? Math.round((achievedScore / totalPossibleScore) * 100) : 0;
  }

  /**
   * Get multiplier based on match type quality
   */
  private getMatchTypeMultiplier(matchType: string): number {
    const multipliers = {
      exact: 1.0,
      fuzzy: 0.95,
      semantic: 0.9,
      related: 0.8
    };
    return multipliers[matchType] || 0.7;
  }

  /**
   * Calculate confidence score for the overall matching
   */
  private calculateMatchConfidence(
    matches: SkillMatchResult[],
    jobSkills: JobSkillRequirement[]
  ): number {
    if (jobSkills.length === 0) return 1.0;

    const criticalSkills = jobSkills.filter(skill => skill.required);
    const criticalMatches = matches.filter(m => 
      criticalSkills.some(cs => cs.name === m.matchedJobSkill)
    );

    // Base confidence on coverage of critical skills
    const criticalCoverage = criticalSkills.length > 0 
      ? criticalMatches.length / criticalSkills.length 
      : 1.0;

    // Average confidence of individual matches
    const avgMatchConfidence = matches.length > 0
      ? matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length
      : 0.5;

    // Overall match coverage
    const overallCoverage = matches.length / jobSkills.length;

    // Weighted confidence calculation
    return Math.round(
      (criticalCoverage * 0.5 + avgMatchConfidence * 0.3 + overallCoverage * 0.2) * 100
    ) / 100;
  }

  /**
   * Fallback to basic skill matching when AI analysis fails
   */
  private fallbackBasicMatching(
    resumeSkills: string[],
    jobSkills: JobSkillRequirement[]
  ): EnhancedSkillScore {
    const normalizedResumeSkills = resumeSkills
      .map(skill => SkillsTaxonomy.normalizeSkill(skill))
      .filter(skill => skill.length > 0);

    const matches: SkillMatchResult[] = [];
    const breakdown = {
      exactMatches: 0,
      semanticMatches: 0,
      fuzzyMatches: 0,
      relatedMatches: 0
    };

    for (const jobSkill of jobSkills) {
      const normalizedJobSkill = SkillsTaxonomy.normalizeSkill(jobSkill.name);
      
      if (normalizedResumeSkills.includes(normalizedJobSkill)) {
        matches.push({
          skill: normalizedJobSkill,
          matchedJobSkill: normalizedJobSkill,
          matchScore: 1.0,
          matchType: 'exact',
          confidence: 0.8,
          explanation: 'Basic exact match (fallback mode)'
        });
        breakdown.exactMatches++;
      }
    }

    const overallScore = this.calculateWeightedSkillScore(matches, jobSkills);
    const confidence = Math.max(0.6, this.calculateMatchConfidence(matches, jobSkills));

    return {
      overallScore,
      matches,
      gapAnalysis: {
        missingCriticalSkills: jobSkills
          .filter(skill => skill.required && !matches.some(m => m.matchedJobSkill === skill.name))
          .map(skill => skill.name),
        missingOptionalSkills: jobSkills
          .filter(skill => !skill.required && !matches.some(m => m.matchedJobSkill === skill.name))
          .map(skill => skill.name),
        improvementSuggestions: []
      },
      confidence,
      breakdown
    };
  }
}