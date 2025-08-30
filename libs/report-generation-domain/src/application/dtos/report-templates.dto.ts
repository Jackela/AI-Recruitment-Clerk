/**
 * Report Generation Domain - Report Templates DTOs
 * Extracted report-related templates from libs/shared-dtos/src/prompts/prompt-templates.ts
 */

export class ReportPromptTemplates {
  /**
   * Job Description Extraction Template
   */
  static getJobDescriptionPrompt(jdText: string): string {
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
  static getResumeParsingPrompt(resumeText: string): string {
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
  static getResumeVisionPrompt(): string {
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
  static getReportGenerationPrompt(context: {
    jobTitle: string;
    candidateCount: number;
    hasRequirements: boolean;
    hasScoring: boolean;
  }): string {
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
}

export interface ReportPromptOptions {
  temperature?: number;
  maxTokens?: number;
  includeExamples?: boolean;
  validationLevel?: 'strict' | 'moderate' | 'lenient';
}

export class ReportPromptBuilder {
  static buildWithOptions(basePrompt: string, options: ReportPromptOptions = {}): string {
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