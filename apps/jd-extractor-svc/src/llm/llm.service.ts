import { Injectable, Logger } from '@nestjs/common';
import { JdDTO, LlmExtractionRequest, LlmExtractionResponse } from '../dto/jd.dto';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  async extractJobRequirements(jdText: string): Promise<JdDTO> {
    this.logger.log('Extracting job requirements from JD text');
    
    // For now, provide a mock implementation that extracts basic structure
    // In production, this would integrate with actual LLM APIs (Gemini, OpenAI, etc.)
    const extractedData: JdDTO = {
      requirements: {
        technical: this.extractTechnicalSkills(jdText),
        soft: this.extractSoftSkills(jdText),
        experience: this.extractExperienceLevel(jdText),
        education: this.extractEducationRequirement(jdText),
      },
      responsibilities: this.extractResponsibilities(jdText),
      benefits: this.extractBenefits(jdText),
      company: {
        name: this.extractCompanyName(jdText),
        industry: this.extractIndustry(jdText),
        size: this.extractCompanySize(jdText),
      },
    };

    return extractedData;
  }

  async extractStructuredData(request: LlmExtractionRequest): Promise<LlmExtractionResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Extracting structured data for job: ${request.jobTitle}`);
      
      const extractedData = await this.extractJobRequirements(request.jdText);
      
      // Validate the extracted data
      const isValid = await this.validateExtractedData(extractedData);
      if (!isValid) {
        this.logger.warn('Extracted data validation failed, using fallback data');
      }

      const processingTimeMs = Date.now() - startTime;
      
      return {
        extractedData,
        confidence: isValid ? 0.85 : 0.5, // Mock confidence score
        processingTimeMs,
      };
    } catch (error) {
      this.logger.error('Failed to extract structured data', error);
      throw error;
    }
  }

  async validateExtractedData(data: JdDTO): Promise<boolean> {
    // Basic validation logic
    if (!data.requirements || !data.responsibilities) {
      return false;
    }
    
    // Check if technical skills are present
    if (!data.requirements.technical || data.requirements.technical.length === 0) {
      return false;
    }
    
    // Check if responsibilities are present
    if (!data.responsibilities || data.responsibilities.length === 0) {
      return false;
    }
    
    return true;
  }

  private extractTechnicalSkills(jdText: string): string[] {
    // Simple keyword extraction - in production this would use LLM
    const techKeywords = ['JavaScript', 'TypeScript', 'React', 'Angular', 'Node.js', 'Python', 'Java', 'Docker', 'Kubernetes', 'AWS', 'Azure'];
    return techKeywords.filter(skill => 
      jdText.toLowerCase().includes(skill.toLowerCase())
    );
  }

  private extractSoftSkills(jdText: string): string[] {
    const softSkillKeywords = ['communication', 'teamwork', 'leadership', 'problem-solving', 'analytical', 'creative'];
    return softSkillKeywords.filter(skill => 
      jdText.toLowerCase().includes(skill.toLowerCase())
    );
  }

  private extractExperienceLevel(jdText: string): string {
    const text = jdText.toLowerCase();
    if (text.includes('senior') || text.includes('5+ years') || text.includes('lead')) {
      return 'Senior (5+ years)';
    } else if (text.includes('mid') || text.includes('3+ years')) {
      return 'Mid-level (3-5 years)';
    } else if (text.includes('junior') || text.includes('entry') || text.includes('1+ year')) {
      return 'Junior (1-3 years)';
    }
    return 'Not specified';
  }

  private extractEducationRequirement(jdText: string): string {
    const text = jdText.toLowerCase();
    if (text.includes('phd') || text.includes('doctorate')) {
      return 'PhD/Doctorate';
    } else if (text.includes('master') || text.includes('msc') || text.includes('mba')) {
      return 'Master\'s degree';
    } else if (text.includes('bachelor') || text.includes('degree')) {
      return 'Bachelor\'s degree';
    }
    return 'Not specified';
  }

  private extractResponsibilities(jdText: string): string[] {
    // Simple extraction - in production would use LLM parsing
    const responsibilityIndicators = ['responsible for', 'duties include', 'you will', 'responsibilities'];
    const lines = jdText.split('\n');
    const responsibilities: string[] = [];
    
    lines.forEach(line => {
      if (responsibilityIndicators.some(indicator => 
        line.toLowerCase().includes(indicator.toLowerCase())
      )) {
        responsibilities.push(line.trim());
      }
    });
    
    return responsibilities.length > 0 ? responsibilities : ['Key responsibilities to be defined'];
  }

  private extractBenefits(jdText: string): string[] {
    const benefitKeywords = ['health insurance', 'dental', 'vacation', 'remote work', 'flexible hours', '401k', 'stock options'];
    return benefitKeywords.filter(benefit => 
      jdText.toLowerCase().includes(benefit.toLowerCase())
    );
  }

  private extractCompanyName(jdText: string): string | undefined {
    // Simple extraction - would use NER in production
    const lines = jdText.split('\n');
    for (const line of lines.slice(0, 5)) { // Check first few lines
      if (line.trim().length > 0 && !line.includes('Job') && !line.includes('Position')) {
        return line.trim();
      }
    }
    return undefined;
  }

  private extractIndustry(jdText: string): string | undefined {
    const industries = ['Technology', 'Finance', 'Healthcare', 'Education', 'Retail', 'Manufacturing'];
    const text = jdText.toLowerCase();
    
    for (const industry of industries) {
      if (text.includes(industry.toLowerCase())) {
        return industry;
      }
    }
    return undefined;
  }

  private extractCompanySize(jdText: string): string | undefined {
    const text = jdText.toLowerCase();
    if (text.includes('startup') || text.includes('small')) {
      return 'Small (1-50 employees)';
    } else if (text.includes('medium') || text.includes('growing')) {
      return 'Medium (51-500 employees)';
    } else if (text.includes('enterprise') || text.includes('large')) {
      return 'Large (500+ employees)';
    }
    return undefined;
  }
}