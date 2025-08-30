/**
 * Candidate Scoring Domain - Scoring Templates DTOs
 * Moved from libs/shared-dtos/src/prompts/prompt-templates.ts
 */

/**
 * Standardized prompt templates for consistent AI responses across services
 */

export class ScoringPromptTemplates {
  /**
   * Skills Assessment Template
   */
  static getSkillsAssessmentPrompt(requiredSkills: string[], candidateSkills: string[]): string {
    return `
Perform a detailed skills gap analysis between job requirements and candidate qualifications.

REQUIRED SKILLS:
${requiredSkills.join(', ')}

CANDIDATE SKILLS:
${candidateSkills.join(', ')}

ANALYSIS REQUIREMENTS:
1. Direct Matches: Skills that exactly match between required and candidate
2. Related Skills: Similar or transferable skills that could substitute
3. Missing Critical Skills: Required skills not present in candidate profile
4. Additional Skills: Candidate skills not required but potentially valuable
5. Skill Level Assessment: Estimated proficiency based on resume evidence

MATCHING CRITERIA:
- Exact matches (same technology/tool/skill)
- Equivalent matches (similar tools in same category)
- Transferable matches (related skills with learning curve)
- Framework matches (experience with similar frameworks/concepts)

OUTPUT REQUIREMENTS:
- Percentage match score with breakdown
- Specific skill gaps and recommendations
- Learning curve assessment for missing skills
- Value-add skills the candidate brings
- Training recommendations for skill development

Provide actionable insights for both hiring decisions and onboarding planning.`;
  }

  /**
   * Scoring Explanation Template
   */
  static getScoringExplanationPrompt(score: number, breakdown: any): string {
    return `
Provide a clear explanation of the candidate scoring methodology and results.

OVERALL SCORE: ${Math.round(score * 100)}%

SCORING COMPONENTS:
${JSON.stringify(breakdown, null, 2)}

EXPLANATION REQUIREMENTS:
1. Methodology Overview: How scores are calculated
2. Component Breakdown: What each score category measures
3. Weighting Rationale: Why certain factors are weighted higher
4. Score Interpretation: What different score ranges indicate
5. Improvement Areas: Specific recommendations for score enhancement

SCORE RANGES:
- 90-100%: Exceptional fit, immediate hire recommendation
- 80-89%: Strong candidate, minor gaps acceptable
- 70-79%: Good candidate, some development needed
- 60-69%: Moderate fit, significant gaps to address
- Below 60%: Poor fit, major concerns present

Provide specific, actionable feedback that helps understand the candidate's profile relative to job requirements.`;
  }

  /**
   * Candidate Comparison Template
   */
  static getCandidateComparisonPrompt(candidateCount: number): string {
    return `
Create a detailed side-by-side comparison of ${candidateCount} candidates for this position.

COMPARISON FRAMEWORK:
1. Skills Matrix: Technical and professional competencies
2. Experience Analysis: Depth, relevance, and progression
3. Education Comparison: Qualifications and relevance
4. Cultural Fit Indicators: Based on resume presentation and experience
5. Growth Potential: Career trajectory and learning indicators

ANALYSIS STRUCTURE:
- Comparative tables for key metrics
- Strength/weakness analysis for each candidate
- Fit assessment for role requirements
- Risk assessment for each hiring decision
- Recommended interview focus areas

EVALUATION CRITERIA:
- Technical skill alignment with job requirements
- Experience relevance and career progression
- Educational background and continuous learning
- Achievement indicators and impact metrics
- Communication and presentation quality (from resume)

Provide specific, evidence-based comparisons that enable confident hiring decisions.`;
  }

  /**
   * Interview Guide Template
   */
  static getInterviewGuidePrompt(candidateName: string): string {
    return `
Create a comprehensive interview guide for ${candidateName} based on their background and the position requirements.

INTERVIEW STRUCTURE:
1. Technical Assessment (40% of time)
   - Core technical skills validation
   - Problem-solving scenarios
   - Tool and technology proficiency
   - Code review or technical discussion

2. Experience Deep-Dive (30% of time)
   - Career progression and decisions
   - Project examples and achievements
   - Challenge resolution examples
   - Leadership and collaboration

3. Behavioral Assessment (20% of time)
   - Cultural fit evaluation
   - Communication style
   - Learning agility
   - Motivation and goals

4. Role-Specific Questions (10% of time)
   - Position understanding
   - Expectations alignment
   - Availability and logistics

QUESTION GUIDELINES:
- Include follow-up questions for each main question
- Provide "good answer" indicators
- Include red flag responses to watch for
- Suggest time allocation for each section
- Include candidate questions to ask

Create 15-20 targeted questions that thoroughly assess the candidate's fit for this specific role.`;
  }
}

export interface ScoringPromptOptions {
  temperature?: number;
  maxTokens?: number;
  includeExamples?: boolean;
  validationLevel?: 'strict' | 'moderate' | 'lenient';
}

export class ScoringPromptBuilder {
  static buildWithOptions(basePrompt: string, options: ScoringPromptOptions = {}): string {
    let prompt = basePrompt;

    if (options.validationLevel === 'strict') {
      prompt += '\n\nSTRICT VALIDATION: Ensure 100% accuracy. Use null for any uncertain information.';
    } else if (options.validationLevel === 'lenient') {
      prompt += '\n\nFLEXIBLE EXTRACTION: Make reasonable inferences where information is implied.';
    }

    if (options.includeExamples) {
      prompt += '\n\nProvide examples or context for your extraction decisions when helpful.';
    }

    return prompt;
  }

  static addJsonSchemaInstruction(prompt: string, schema: string): string {
    return `${prompt}

RESPONSE FORMAT:
Return only valid JSON that strictly follows this schema:
${schema}

Important:
- Use exact field names as specified
- Include all required fields
- Use null for missing optional fields
- Ensure data types match schema requirements
- No additional text or explanation outside JSON`;
  }
}