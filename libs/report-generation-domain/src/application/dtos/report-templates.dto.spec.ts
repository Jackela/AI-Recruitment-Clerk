import {
  ReportPromptTemplates,
  ReportPromptBuilder,
  ReportPromptOptions,
} from '../../application/dtos/report-templates.dto';

describe('ReportPromptTemplates Extended Coverage', () => {
  describe('getJobDescriptionPrompt', () => {
    it('should handle empty job description', () => {
      const prompt = ReportPromptTemplates.getJobDescriptionPrompt('');
      expect(prompt).toContain('JOB DESCRIPTION');
      expect(prompt).toContain('EXTRACTION REQUIREMENTS');
    });

    it('should handle long job description', () => {
      const longJd = 'A'.repeat(1000);
      const prompt = ReportPromptTemplates.getJobDescriptionPrompt(longJd);
      expect(prompt).toContain(longJd);
    });

    it('should include all skill weight levels', () => {
      const prompt = ReportPromptTemplates.getJobDescriptionPrompt('test');
      expect(prompt).toContain('Weight 1.0');
      expect(prompt).toContain('Weight 0.7');
      expect(prompt).toContain('Weight 0.4');
      expect(prompt).toContain('Weight 0.1');
    });

    it('should include education level options', () => {
      const prompt = ReportPromptTemplates.getJobDescriptionPrompt('test');
      expect(prompt).toContain('bachelor');
      expect(prompt).toContain('master');
      expect(prompt).toContain('phd');
      expect(prompt).toContain('any');
    });

    it('should include accuracy guidelines', () => {
      const prompt = ReportPromptTemplates.getJobDescriptionPrompt('test');
      expect(prompt).toContain('ACCURACY GUIDELINES');
      expect(prompt).toContain('Extract only information');
    });
  });

  describe('getResumeParsingPrompt', () => {
    it('should handle empty resume text', () => {
      const prompt = ReportPromptTemplates.getResumeParsingPrompt('');
      expect(prompt).toContain('RESUME TEXT');
      expect(prompt).toContain('EXTRACTION REQUIREMENTS');
    });

    it('should specify skills extraction requirements', () => {
      const prompt = ReportPromptTemplates.getResumeParsingPrompt('test');
      expect(prompt).toContain('Technical skills');
      expect(prompt).toContain('Software proficiency');
      expect(prompt).toContain('Certifications');
    });

    it('should include work experience requirements', () => {
      const prompt = ReportPromptTemplates.getResumeParsingPrompt('test');
      expect(prompt).toContain('Work Experience');
      expect(prompt).toContain('Company names');
      expect(prompt).toContain('Employment dates');
    });

    it('should include education requirements', () => {
      const prompt = ReportPromptTemplates.getResumeParsingPrompt('test');
      expect(prompt).toContain('Education');
      expect(prompt).toContain('Institution names');
      expect(prompt).toContain('Degrees obtained');
    });

    it('should exclude soft skills from extraction', () => {
      const prompt = ReportPromptTemplates.getResumeParsingPrompt('test');
      expect(prompt).toContain('Do NOT include soft skills');
    });
  });

  describe('getResumeVisionPrompt', () => {
    it('should handle visual analysis requirements', () => {
      const prompt = ReportPromptTemplates.getResumeVisionPrompt();
      expect(prompt).toContain('Read ALL text content');
      expect(prompt).toContain('document structure');
    });

    it('should include table and list extraction', () => {
      const prompt = ReportPromptTemplates.getResumeVisionPrompt();
      expect(prompt).toContain('tables, lists');
    });

    it('should mention date and contact extraction', () => {
      const prompt = ReportPromptTemplates.getResumeVisionPrompt();
      expect(prompt).toContain('dates, email addresses');
    });

    it('should specify precision requirements', () => {
      const prompt = ReportPromptTemplates.getResumeVisionPrompt();
      expect(prompt).toContain('high precision');
    });

    it('should include null usage for uncertain info', () => {
      const prompt = ReportPromptTemplates.getResumeVisionPrompt();
      expect(prompt).toContain('null');
    });
  });

  describe('getReportGenerationPrompt', () => {
    it('should include candidate count in context', () => {
      const context = {
        jobTitle: 'Developer',
        candidateCount: 10,
        hasRequirements: true,
        hasScoring: true,
      };
      const prompt = ReportPromptTemplates.getReportGenerationPrompt(context);
      expect(prompt).toContain('Developer');
    });

    it('should mention professional tone', () => {
      const context = {
        jobTitle: 'Manager',
        candidateCount: 5,
        hasRequirements: false,
        hasScoring: false,
      };
      const prompt = ReportPromptTemplates.getReportGenerationPrompt(context);
      expect(prompt).toContain('Professional tone');
    });

    it('should mention data-driven analysis', () => {
      const context = {
        jobTitle: 'Analyst',
        candidateCount: 3,
        hasRequirements: true,
        hasScoring: false,
      };
      const prompt = ReportPromptTemplates.getReportGenerationPrompt(context);
      expect(prompt).toContain('Data-driven analysis');
    });

    it('should require actionable insights', () => {
      const context = {
        jobTitle: 'Consultant',
        candidateCount: 2,
        hasRequirements: true,
        hasScoring: true,
      };
      const prompt = ReportPromptTemplates.getReportGenerationPrompt(context);
      expect(prompt).toContain('Actionable insights');
    });

    it('should require confidential candidate identification', () => {
      const context = {
        jobTitle: 'Engineer',
        candidateCount: 4,
        hasRequirements: true,
        hasScoring: true,
      };
      const prompt = ReportPromptTemplates.getReportGenerationPrompt(context);
      expect(prompt).toContain('Confidential');
      expect(prompt).toContain('Candidate A');
    });

    it('should mention markdown formatting', () => {
      const context = {
        jobTitle: 'Designer',
        candidateCount: 1,
        hasRequirements: true,
        hasScoring: false,
      };
      const prompt = ReportPromptTemplates.getReportGenerationPrompt(context);
      expect(prompt).toContain('Markdown formatting');
    });
  });

  describe('ReportPromptBuilder - buildWithOptions edge cases', () => {
    it('should handle moderate validation level', () => {
      const base = 'Test prompt';
      const options: ReportPromptOptions = { validationLevel: 'moderate' };
      const result = ReportPromptBuilder.buildWithOptions(base, options);
      expect(result).toContain(base);
    });

    it('should not add anything for undefined options', () => {
      const base = 'Test prompt';
      const result = ReportPromptBuilder.buildWithOptions(base, undefined);
      expect(result).toBe(base);
    });

    it('should handle temperature option alone', () => {
      const base = 'Test';
      const options: ReportPromptOptions = { temperature: 0.5 };
      const result = ReportPromptBuilder.buildWithOptions(base, options);
      expect(result).toBe(base);
    });

    it('should handle maxTokens option alone', () => {
      const base = 'Test';
      const options: ReportPromptOptions = { maxTokens: 500 };
      const result = ReportPromptBuilder.buildWithOptions(base, options);
      expect(result).toBe(base);
    });

    it('should handle all options combined', () => {
      const base = 'Test';
      const options: ReportPromptOptions = {
        temperature: 0.7,
        maxTokens: 1000,
        includeExamples: true,
        validationLevel: 'strict',
      };
      const result = ReportPromptBuilder.buildWithOptions(base, options);
      expect(result).toContain('STRICT VALIDATION');
      expect(result).toContain('examples');
    });
  });

  describe('ReportPromptBuilder - addJsonSchemaInstruction', () => {
    it('should handle complex JSON schema', () => {
      const prompt = 'Extract data';
      const schema = `{
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "age": { "type": "number" }
        },
        "required": ["name"]
      }`;
      const result = ReportPromptBuilder.addJsonSchemaInstruction(
        prompt,
        schema,
      );
      expect(result).toContain('RESPONSE FORMAT');
      expect(result).toContain('valid JSON');
      expect(result).toContain('exact field names');
    });

    it('should handle empty schema', () => {
      const prompt = 'Test';
      const result = ReportPromptBuilder.addJsonSchemaInstruction(prompt, '{}');
      expect(result).toContain('RESPONSE FORMAT');
    });

    it('should preserve original prompt content', () => {
      const prompt = 'Important: Extract all information accurately';
      const result = ReportPromptBuilder.addJsonSchemaInstruction(prompt, '{}');
      expect(result).toContain('Important: Extract all information accurately');
    });

    it('should include all validation requirements', () => {
      const prompt = 'Test';
      const result = ReportPromptBuilder.addJsonSchemaInstruction(prompt, '{}');
      expect(result).toContain('exact field names');
      expect(result).toContain('required fields');
      expect(result).toContain('missing optional fields');
      expect(result).toContain('data types');
      expect(result).toContain('No additional text');
    });

    it('should handle schema with arrays', () => {
      const prompt = 'Extract items';
      const schema = '{"type":"array","items":{"type":"string"}}';
      const result = ReportPromptBuilder.addJsonSchemaInstruction(
        prompt,
        schema,
      );
      expect(result).toContain(schema);
    });

    it('should handle schema with nested objects', () => {
      const prompt = 'Extract nested';
      const schema =
        '{"type":"object","properties":{"user":{"type":"object","properties":{"name":{"type":"string"}}}}}}';
      const result = ReportPromptBuilder.addJsonSchemaInstruction(
        prompt,
        schema,
      );
      expect(result).toContain(schema);
    });
  });
});
