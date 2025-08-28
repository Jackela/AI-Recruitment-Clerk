import { Injectable, Logger } from '@nestjs/common';
import { GeminiClient, GeminiConfig } from '../../../../libs/shared-dtos/src';

interface ReportEvent {
  jobId: string;
  resumeIds: string[];
  jobData?: {
    title?: string;
    description?: string;
    requirements?: any;
  };
  resumesData?: Array<{
    id: string;
    candidateName?: string;
    extractedData?: any;
    score?: number;
    matchingSkills?: string[];
    missingSkills?: string[];
  }>;
  scoringResults?: Array<{
    resumeId: string;
    score: number;
    breakdown?: any;
    recommendations?: string[];
  }>;
  metadata?: {
    generatedAt?: Date;
    reportType?: string;
    requestedBy?: string;
  };
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly geminiClient: GeminiClient;

  constructor() {
    const config: GeminiConfig = {
      apiKey: process.env.GEMINI_API_KEY || 'your_gemini_api_key_here',
      model: 'gemini-1.5-flash',
      temperature: 0.4, // Balanced creativity for report writing
      maxOutputTokens: 16384, // Allow longer reports
    };

    this.geminiClient = new GeminiClient(config);
  }

  async generateReportMarkdown(event: ReportEvent): Promise<string> {
    this.logger.debug(`Starting report generation for job: ${event.jobId}`);

    try {
      const prompt = this.buildReportPrompt(event);
      const response = await this.geminiClient.generateText(prompt);
      
      // Clean and format the markdown response
      const formattedReport = this.formatMarkdownReport(response.data, event);
      
      this.logger.debug(`Report generation completed in ${response.processingTimeMs}ms`);
      return formattedReport;
    } catch (error) {
      this.logger.error('Failed to generate report', error);
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }

  private buildReportPrompt(event: ReportEvent): string {
    const jobTitle = event.jobData?.title || `Job ${event.jobId}`;
    const reportDate = event.metadata?.generatedAt || new Date();
    const resumeCount = event.resumeIds?.length || 0;

    let prompt = `
Generate a comprehensive recruitment analysis report in Markdown format for the following job position.

# Job Information
**Position:** ${jobTitle}
**Job ID:** ${event.jobId}
**Report Generated:** ${reportDate.toISOString().split('T')[0]}
**Resumes Analyzed:** ${resumeCount}

`;

    // Add job description if available
    if (event.jobData?.description) {
      prompt += `## Job Description\n${event.jobData.description}\n\n`;
    }

    // Add job requirements if available
    if (event.jobData?.requirements) {
      prompt += `## Requirements\n`;
      if (event.jobData.requirements.requiredSkills) {
        prompt += `**Required Skills:**\n`;
        event.jobData.requirements.requiredSkills.forEach((skill: any) => {
          prompt += `- ${skill.name} (Weight: ${skill.weight})\n`;
        });
        prompt += `\n`;
      }
      if (event.jobData.requirements.experienceYears) {
        prompt += `**Experience:** ${event.jobData.requirements.experienceYears.min}-${event.jobData.requirements.experienceYears.max} years\n`;
      }
      if (event.jobData.requirements.educationLevel) {
        prompt += `**Education:** ${event.jobData.requirements.educationLevel}\n`;
      }
      prompt += `\n`;
    }

    // Add candidate analysis if available
    if (event.resumesData && event.resumesData.length > 0) {
      prompt += `# Candidate Analysis\n\n`;
      
      event.resumesData.forEach((resume, index) => {
        prompt += `## Candidate ${index + 1}: ${resume.candidateName || `Resume ${resume.id}`}\n`;
        prompt += `**Resume ID:** ${resume.id}\n`;
        
        if (resume.score !== undefined) {
          prompt += `**Overall Score:** ${Math.round(resume.score * 100)}%\n`;
        }
        
        if (resume.matchingSkills && resume.matchingSkills.length > 0) {
          prompt += `**Matching Skills:** ${resume.matchingSkills.join(', ')}\n`;
        }
        
        if (resume.missingSkills && resume.missingSkills.length > 0) {
          prompt += `**Missing Skills:** ${resume.missingSkills.join(', ')}\n`;
        }
        
        if (resume.extractedData) {
          if (resume.extractedData.workExperience) {
            prompt += `**Experience:** ${resume.extractedData.workExperience.length} positions\n`;
          }
          if (resume.extractedData.education) {
            prompt += `**Education:** ${resume.extractedData.education.length} entries\n`;
          }
        }
        
        prompt += `\n`;
      });
    }

    // Add scoring results if available
    if (event.scoringResults && event.scoringResults.length > 0) {
      prompt += `# Scoring Analysis\n\n`;
      
      event.scoringResults.forEach((result, index) => {
        prompt += `## Scoring Result ${index + 1}\n`;
        prompt += `**Resume ID:** ${result.resumeId}\n`;
        prompt += `**Score:** ${Math.round(result.score * 100)}%\n`;
        
        if (result.breakdown) {
          prompt += `**Score Breakdown:**\n`;
          Object.entries(result.breakdown).forEach(([key, value]) => {
            prompt += `- ${key}: ${value}\n`;
          });
        }
        
        if (result.recommendations && result.recommendations.length > 0) {
          prompt += `**Recommendations:**\n`;
          result.recommendations.forEach(rec => {
            prompt += `- ${rec}\n`;
          });
        }
        
        prompt += `\n`;
      });
    }

    prompt += `
# Report Generation Instructions

Based on the above information, generate a professional recruitment analysis report with the following sections:

1. **Executive Summary** - High-level overview of findings
2. **Job Requirements Analysis** - Analysis of position requirements
3. **Candidate Evaluation** - Individual candidate assessments
4. **Ranking and Recommendations** - Ranked list of candidates with rationale
5. **Skills Gap Analysis** - Common missing skills and market insights
6. **Hiring Recommendations** - Strategic recommendations for the hiring process
7. **Next Steps** - Recommended actions for the hiring team

Guidelines:
- Use professional, objective language
- Provide data-driven insights where possible
- Include specific examples and evidence
- Offer actionable recommendations
- Structure the report with clear headings and bullet points
- Use tables or lists where appropriate for clarity
- Maintain candidate confidentiality (use "Candidate A", "Candidate B" etc.)
- Focus on job-relevant qualifications and skills
- Provide balanced assessments highlighting both strengths and areas for development

Generate ONLY the markdown report content, no additional explanations.`;

    return prompt;
  }

  private formatMarkdownReport(rawMarkdown: string, event: ReportEvent): string {
    // Clean up any potential formatting issues
    let formattedReport = rawMarkdown.trim();
    
    // Ensure proper markdown formatting
    formattedReport = formattedReport.replace(/#{4,}/g, '###'); // Limit heading depth
    formattedReport = formattedReport.replace(/\n{3,}/g, '\n\n'); // Clean up excessive newlines
    
    // Add report metadata header if not present
    if (!formattedReport.startsWith('#')) {
      const jobTitle = event.jobData?.title || `Job ${event.jobId}`;
      const reportDate = event.metadata?.generatedAt || new Date();
      
      const header = `# Recruitment Analysis Report

**Position:** ${jobTitle}  
**Job ID:** ${event.jobId}  
**Generated:** ${reportDate.toISOString().split('T')[0]}  
**Resumes Analyzed:** ${event.resumeIds?.length || 0}  

---

`;
      
      formattedReport = header + formattedReport;
    }
    
    // Add footer
    const footer = `

---

*This report was generated by the AI Recruitment Clerk system. All candidate information is confidential and should be handled according to company privacy policies.*

**Report ID:** ${event.jobId}-${Date.now()}  
**Generated At:** ${new Date().toISOString()}`;
    
    formattedReport += footer;
    
    return formattedReport;
  }

  async generateCandidateComparison(candidates: any[]): Promise<string> {
    this.logger.debug(`Generating candidate comparison for ${candidates.length} candidates`);
    
    try {
      const prompt = this.buildComparisonPrompt(candidates);
      const response = await this.geminiClient.generateText(prompt);
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to generate candidate comparison', error);
      throw new Error(`Candidate comparison generation failed: ${error.message}`);
    }
  }

  private buildComparisonPrompt(candidates: any[]): string {
    let prompt = `Generate a detailed candidate comparison analysis in Markdown format.\n\nCandidates to Compare:\n`;
    
    candidates.forEach((candidate, index) => {
      prompt += `\n## Candidate ${String.fromCharCode(65 + index)}: ${candidate.name || `Resume ${candidate.id}`}\n`;
      prompt += `**Score:** ${Math.round((candidate.score || 0) * 100)}%\n`;
      
      if (candidate.skills) {
        prompt += `**Skills:** ${candidate.skills.join(', ')}\n`;
      }
      
      if (candidate.experience) {
        prompt += `**Experience:** ${candidate.experience.length} positions\n`;
      }
      
      if (candidate.education) {
        prompt += `**Education:** ${candidate.education.map(edu => `${edu.degree} from ${edu.school}`).join(', ')}\n`;
      }
    });
    
    prompt += `\n\nGenerate a comprehensive comparison including:\n1. Side-by-side skills comparison\n2. Experience level analysis\n3. Strengths and weaknesses of each candidate\n4. Recommended ranking with justification\n5. Interview focus areas for each candidate\n\nUse professional language and provide specific, actionable insights.`;
    
    return prompt;
  }

  async generateInterviewGuide(candidateData: any, jobRequirements: any): Promise<string> {
    this.logger.debug(`Generating interview guide for candidate: ${candidateData.name || candidateData.id}`);
    
    try {
      const prompt = `Generate a comprehensive interview guide for this candidate based on their background and the job requirements.\n\nCandidate Profile:\n${JSON.stringify(candidateData, null, 2)}\n\nJob Requirements:\n${JSON.stringify(jobRequirements, null, 2)}\n\nGenerate interview questions covering:\n1. Technical skills assessment\n2. Experience validation\n3. Behavioral questions\n4. Scenario-based questions\n5. Areas needing clarification from resume\n\nProvide 15-20 questions with suggested follow-up questions and what to look for in answers.`;
      
      const response = await this.geminiClient.generateText(prompt);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to generate interview guide', error);
      throw new Error(`Interview guide generation failed: ${error.message}`);
    }
  }

  async generateSkillsAssessmentReport(
    candidateData: any,
    jobRequirements: any,
    skillsGapAnalysis?: any
  ): Promise<string> {
    this.logger.debug(`Generating skills assessment report for candidate: ${candidateData.name || candidateData.id}`);
    
    try {
      const prompt = `Generate a comprehensive skills assessment report for this candidate.

Candidate Profile:
${JSON.stringify(candidateData, null, 2)}

Job Requirements:
${JSON.stringify(jobRequirements, null, 2)}

${skillsGapAnalysis ? `Skills Gap Analysis:\n${JSON.stringify(skillsGapAnalysis, null, 2)}\n` : ''}

Generate a detailed skills assessment report including:

1. **Skills Matrix Analysis**
   - Technical skills evaluation with proficiency levels
   - Gap identification for required vs. actual skills
   - Skill transferability assessment
   - Learning curve estimation for missing skills

2. **Competency Assessment**
   - Core competencies evaluation
   - Leadership and soft skills assessment
   - Problem-solving and analytical capabilities
   - Communication and collaboration skills

3. **Professional Development Plan**
   - Recommended training programs for skill gaps
   - Certification recommendations
   - Timeline for skill development
   - Resources for continuous learning

4. **Skills Benchmarking**
   - Industry standard comparisons
   - Peer-level assessment
   - Market competitiveness analysis

5. **Action Items**
   - Immediate development priorities
   - 30/60/90-day skill development goals
   - Success metrics and evaluation criteria

Use professional language, provide specific recommendations, and include actionable insights that help both the candidate and hiring team understand development opportunities.`;
      
      const response = await this.geminiClient.generateText(prompt);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to generate skills assessment report', error);
      throw new Error(`Skills assessment report generation failed: ${error.message}`);
    }
  }

  async generateExecutiveSummary(
    jobData: any,
    candidatesData: any[],
    overallAnalysis: any
  ): Promise<string> {
    this.logger.debug(`Generating executive summary for ${candidatesData.length} candidates`);
    
    try {
      const prompt = `Generate an executive summary for recruitment analysis.

Position Details:
${JSON.stringify(jobData, null, 2)}

Candidates Analyzed: ${candidatesData.length}

Candidates Overview:
${candidatesData.map((candidate, index) => `
Candidate ${index + 1}: ${candidate.name || candidate.id}
- Overall Score: ${Math.round((candidate.score || 0) * 100)}%
- Recommendation: ${candidate.recommendation || 'Review'}
- Key Skills: ${candidate.skills?.slice(0, 5).join(', ') || 'Not specified'}
`).join('')}

Overall Analysis:
${JSON.stringify(overallAnalysis, null, 2)}

Generate a concise executive summary (500-800 words) covering:

1. **Position Overview**
   - Role requirements and expectations
   - Critical success factors
   - Market context and urgency

2. **Candidate Pool Analysis**
   - Quality of applicant pool
   - Top 3 recommended candidates with brief rationale
   - Overall market competitiveness assessment

3. **Key Findings**
   - Common strengths across candidates
   - Most significant skill gaps identified
   - Cultural fit considerations

4. **Strategic Recommendations**
   - Hiring recommendation priority ranking
   - Interview process suggestions
   - Salary and offer considerations
   - Timeline recommendations

5. **Risk Assessment**
   - Potential challenges in candidate selection
   - Market competition risks
   - Alternative sourcing strategies if needed

Format for C-level executives with focus on business impact, ROI, and strategic decision-making. Use data-driven insights and clear recommendations.`;

      const response = await this.geminiClient.generateText(prompt);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to generate executive summary', error);
      throw new Error(`Executive summary generation failed: ${error.message}`);
    }
  }

  async generateBatchAnalysisReport(
    jobData: any,
    candidatesData: any[],
    aggregatedMetrics: any,
    comparisonCriteria: any
  ): Promise<string> {
    this.logger.debug(`Generating batch analysis report for ${candidatesData.length} candidates`);
    
    try {
      const prompt = `Generate a comprehensive batch analysis report for multiple candidates.

Position Details:
${JSON.stringify(jobData, null, 2)}

Total Candidates Analyzed: ${candidatesData.length}

Aggregated Metrics:
${JSON.stringify(aggregatedMetrics, null, 2)}

Comparison Criteria:
${JSON.stringify(comparisonCriteria, null, 2)}

Top Candidates Summary:
${candidatesData.slice(0, 10).map((candidate, index) => `
Rank ${index + 1}: ${candidate.name || candidate.id}
- Overall Score: ${Math.round((candidate.score || 0) * 100)}%
- Key Strengths: ${candidate.strengths?.slice(0, 3).join(', ') || 'Not specified'}
- Areas for Development: ${candidate.concerns?.slice(0, 2).join(', ') || 'None identified'}
- Recommendation: ${candidate.recommendation || 'Review'}
`).join('')}

Generate a detailed batch analysis including:

1. **Candidate Pool Overview**
   - Total applications and screening funnel
   - Quality distribution analysis
   - Geographic and background diversity
   - Experience level breakdown

2. **Comparative Analysis**
   - Top 5 candidates detailed comparison
   - Skills gap analysis across all candidates
   - Cultural fit assessment summary
   - Compensation expectations alignment

3. **Statistical Insights**
   - Score distribution and percentiles
   - Common strengths and weaknesses patterns
   - Educational background analysis
   - Industry experience clustering

4. **Hiring Recommendations**
   - Tier 1 (Immediate hire) candidates with rationale
   - Tier 2 (Strong consideration) candidates with requirements
   - Tier 3 (Backup options) candidates with development needs
   - Alternative sourcing recommendations if needed

5. **Process Optimization**
   - Recruitment funnel effectiveness analysis
   - Interview process recommendations
   - Screening criteria refinement suggestions
   - Timeline and resource optimization

6. **Strategic Insights**
   - Market competitiveness assessment
   - Salary benchmarking recommendations
   - Team composition and balance considerations
   - Long-term talent pipeline development

Provide actionable insights that enable data-driven hiring decisions while highlighting both individual candidate merits and overall recruitment strategy effectiveness.`;

      const response = await this.geminiClient.generateText(prompt);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to generate batch analysis report', error);
      throw new Error(`Batch analysis report generation failed: ${error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      return await this.geminiClient.healthCheck();
    } catch {
      return false;
    }
  }
}
