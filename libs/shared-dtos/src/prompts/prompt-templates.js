"use strict";
/**
 * Standardized prompt templates for consistent AI responses across services
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptBuilder = exports.PromptTemplates = void 0;
class PromptTemplates {
    /**
     * Job Description Extraction Template
     */
    static getJobDescriptionPrompt(jdText) {
        return `
Analyze this job description and extract structured information with high accuracy.

JOB DESCRIPTION:
${jdText}

EXTRACTION REQUIREMENTS:
1. Required Skills: Identify technical skills with importance weights (0.1-1.0)
   - Weight 1.0: Must-have, critical skills mentioned multiple times
   - Weight 0.7: Important skills explicitly required
   - Weight 0.4: Nice-to-have skills mentioned as preferred
   - Weight 0.1: Optional skills mentioned briefly

2. Experience: Determine minimum and maximum years required
   - Look for explicit year requirements (e.g., "3-5 years", "minimum 2 years")
   - If only minimum mentioned, set max as min + 3
   - If no experience mentioned, use 0 for entry-level

3. Education: Choose most appropriate level
   - "bachelor" for Bachelor's degree requirements
   - "master" for Master's/MBA requirements  
   - "phd" for PhD/Doctorate requirements
   - "any" if no specific education mentioned

4. Additional Information: Extract when clearly mentioned
   - Job title, department, location
   - Employment type (full-time, part-time, contract, internship)
   - Responsibilities and qualifications
   - Benefits and salary range

ACCURACY GUIDELINES:
- Extract only information that is clearly present in the text
- Do not infer or assume information not explicitly stated
- Use exact terms and phrases from the original text
- Be conservative with skill weights - only assign high weights to clearly critical skills
- For ambiguous requirements, choose the most reasonable interpretation

Return only valid JSON matching the specified schema.`;
    }
    /**
     * Resume Parsing Template (Text-based)
     */
    static getResumeParsingPrompt(resumeText) {
        return `
Extract comprehensive information from this resume with maximum accuracy.

RESUME TEXT:
${resumeText}

EXTRACTION REQUIREMENTS:
1. Contact Information:
   - Full name (as it appears on resume)
   - Email address (validate format)
   - Phone number (include country code if present)

2. Skills:
   - Technical skills (programming languages, tools, technologies)
   - Software proficiency
   - Professional skills and competencies
   - Certifications and specializations
   - Do NOT include soft skills like "communication" or "teamwork"

3. Work Experience:
   - Company names (exact as written)
   - Job titles/positions (exact as written)
   - Employment dates in YYYY-MM-DD format
   - Use "present" for current positions
   - Job descriptions and achievements (summarize key responsibilities)

4. Education:
   - Institution names (universities, colleges, schools)
   - Degrees obtained (Bachelor's, Master's, PhD, etc.)
   - Field of study/major
   - Graduation dates if available

ACCURACY GUIDELINES:
- Extract information exactly as it appears in the resume
- Do not interpret abbreviations unless context is clear
- Use null for any missing information
- Validate email format before including
- Convert dates to ISO format (YYYY-MM-DD) when possible
- For ongoing positions, use "present" as end date
- Include only information that is clearly readable and unambiguous

Return only valid JSON matching the specified schema.`;
    }
    /**
     * Resume Vision Parsing Template
     */
    static getResumeVisionPrompt() {
        return `
Carefully analyze this resume document image and extract all visible information with high precision.

VISUAL ANALYSIS REQUIREMENTS:
1. Read ALL text content thoroughly
2. Identify document structure (headers, sections, formatting)
3. Extract information from tables, lists, and formatted content
4. Pay attention to dates, email addresses, phone numbers
5. Identify skills from various sections (technical skills, tools, technologies)
6. Extract complete work history with dates and descriptions
7. Find education information including degrees and institutions

EXTRACTION FOCUS:
- Contact details at the top of the document
- Technical skills sections (often labeled as "Skills", "Technologies", "Tools")
- Work experience with company names, titles, dates, and responsibilities
- Education section with degrees, schools, and majors
- Professional certifications and achievements

ACCURACY REQUIREMENTS:
- Only extract text that is clearly visible and readable
- Use null for information that cannot be determined with confidence
- Format dates as YYYY-MM-DD when clear, use "present" for current positions
- Include complete company names and job titles as they appear
- List skills exactly as written, avoiding interpretation

Be thorough and precise - extract all visible information while maintaining high accuracy standards.

Return only valid JSON matching the specified schema.`;
    }
    /**
     * Report Generation Template
     */
    static getReportGenerationPrompt(context) {
        return `
Generate a comprehensive, professional recruitment analysis report for the position: "${context.jobTitle}"

REPORT REQUIREMENTS:
- Professional tone suitable for hiring managers and HR teams
- Data-driven analysis with specific examples and metrics
- Clear structure with well-defined sections
- Actionable insights and recommendations
- Confidential handling of candidate information (use "Candidate A", "Candidate B", etc.)

REQUIRED SECTIONS:
1. Executive Summary (2-3 paragraphs overview)
2. Position Analysis (job requirements assessment)
3. Candidate Evaluation (individual assessments)
4. Comparative Analysis (ranking with justification)
5. Skills Gap Analysis (common missing skills, market insights)
6. Interview Recommendations (suggested questions and focus areas)
7. Hiring Strategy (next steps and recommendations)

ANALYSIS DEPTH:
- Quantify findings where possible (percentages, scores, counts)
- Highlight both strengths and development areas for each candidate
- Provide specific examples from candidate profiles
- Include market context and hiring difficulty assessment
- Suggest mitigation strategies for identified gaps

OUTPUT FORMAT:
- Use proper Markdown formatting with headers, lists, and tables
- Include summary tables for easy comparison
- Use professional language avoiding bias
- Maintain consistent candidate identification throughout
- Include confidence levels for recommendations where appropriate

Focus on delivering actionable insights that help the hiring team make informed decisions.`;
    }
    /**
     * Candidate Comparison Template
     */
    static getCandidateComparisonPrompt(candidateCount) {
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
    static getInterviewGuidePrompt(candidateName) {
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
    /**
     * Skills Assessment Template
     */
    static getSkillsAssessmentPrompt(requiredSkills, candidateSkills) {
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
    static getScoringExplanationPrompt(score, breakdown) {
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
}
exports.PromptTemplates = PromptTemplates;
class PromptBuilder {
    static buildWithOptions(basePrompt, options = {}) {
        let prompt = basePrompt;
        if (options.validationLevel === 'strict') {
            prompt += '\n\nSTRICT VALIDATION: Ensure 100% accuracy. Use null for any uncertain information.';
        }
        else if (options.validationLevel === 'lenient') {
            prompt += '\n\nFLEXIBLE EXTRACTION: Make reasonable inferences where information is implied.';
        }
        if (options.includeExamples) {
            prompt += '\n\nProvide examples or context for your extraction decisions when helpful.';
        }
        return prompt;
    }
    static addJsonSchemaInstruction(prompt, schema) {
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
exports.PromptBuilder = PromptBuilder;
