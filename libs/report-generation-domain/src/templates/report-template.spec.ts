import {
  ReportPromptTemplates,
  ReportPromptBuilder,
  ReportPromptOptions,
} from '../application/dtos/report-templates.dto';

describe('ReportPromptTemplates', () => {
  describe('getJobDescriptionPrompt', () => {
    it('should include job description text in prompt', () => {
      const jdText =
        'Senior Software Engineer position requiring 5 years experience';
      const prompt = ReportPromptTemplates.getJobDescriptionPrompt(jdText);

      expect(prompt).toContain(jdText);
      expect(prompt).toContain('JOB DESCRIPTION');
      expect(prompt).toContain('EXTRACTION REQUIREMENTS');
    });

    it('should include skill weight guidelines', () => {
      const prompt = ReportPromptTemplates.getJobDescriptionPrompt('test');

      expect(prompt).toContain('Weight 1.0');
      expect(prompt).toContain('Weight 0.7');
      expect(prompt).toContain('Weight 0.4');
    });
  });

  describe('getResumeParsingPrompt', () => {
    it('should include resume text in prompt', () => {
      const resumeText = 'John Doe, Software Engineer with 10 years experience';
      const prompt = ReportPromptTemplates.getResumeParsingPrompt(resumeText);

      expect(prompt).toContain(resumeText);
      expect(prompt).toContain('RESUME TEXT');
    });

    it('should specify contact information extraction', () => {
      const prompt = ReportPromptTemplates.getResumeParsingPrompt('test');

      expect(prompt).toContain('Contact Information');
      expect(prompt).toContain('Email address');
    });
  });

  describe('getResumeVisionPrompt', () => {
    it('should return vision analysis prompt', () => {
      const prompt = ReportPromptTemplates.getResumeVisionPrompt();

      expect(prompt).toContain('VISUAL ANALYSIS REQUIREMENTS');
      expect(prompt).toContain('resume document image');
    });

    it('should include extraction focus areas', () => {
      const prompt = ReportPromptTemplates.getResumeVisionPrompt();

      expect(prompt).toContain('EXTRACTION FOCUS');
      expect(prompt).toContain('Contact details');
      expect(prompt).toContain('Technical skills');
    });
  });

  describe('getReportGenerationPrompt', () => {
    it('should include job title in prompt', () => {
      const context = {
        jobTitle: 'Senior Developer',
        candidateCount: 5,
        hasRequirements: true,
        hasScoring: true,
      };
      const prompt = ReportPromptTemplates.getReportGenerationPrompt(context);

      expect(prompt).toContain('Senior Developer');
      expect(prompt).toContain('REPORT REQUIREMENTS');
    });

    it('should include all required sections', () => {
      const context = {
        jobTitle: 'Test Position',
        candidateCount: 3,
        hasRequirements: true,
        hasScoring: false,
      };
      const prompt = ReportPromptTemplates.getReportGenerationPrompt(context);

      expect(prompt).toContain('Executive Summary');
      expect(prompt).toContain('Position Analysis');
      expect(prompt).toContain('Candidate Evaluation');
      expect(prompt).toContain('Comparative Analysis');
      expect(prompt).toContain('Skills Gap Analysis');
      expect(prompt).toContain('Interview Recommendations');
      expect(prompt).toContain('Hiring Strategy');
    });
  });
});

describe('ReportPromptBuilder', () => {
  describe('buildWithOptions', () => {
    it('should return base prompt without options', () => {
      const basePrompt = 'Generate a report';
      const result = ReportPromptBuilder.buildWithOptions(basePrompt);

      expect(result).toBe(basePrompt);
    });

    it('should add strict validation instruction', () => {
      const basePrompt = 'Generate a report';
      const options: ReportPromptOptions = { validationLevel: 'strict' };
      const result = ReportPromptBuilder.buildWithOptions(basePrompt, options);

      expect(result).toContain('STRICT VALIDATION');
      expect(result).toContain('100% accuracy');
    });

    it('should add lenient validation instruction', () => {
      const basePrompt = 'Generate a report';
      const options: ReportPromptOptions = { validationLevel: 'lenient' };
      const result = ReportPromptBuilder.buildWithOptions(basePrompt, options);

      expect(result).toContain('FLEXIBLE EXTRACTION');
    });

    it('should add examples instruction when enabled', () => {
      const basePrompt = 'Generate a report';
      const options: ReportPromptOptions = { includeExamples: true };
      const result = ReportPromptBuilder.buildWithOptions(basePrompt, options);

      expect(result).toContain('examples');
    });

    it('should combine multiple options', () => {
      const basePrompt = 'Generate a report';
      const options: ReportPromptOptions = {
        validationLevel: 'strict',
        includeExamples: true,
      };
      const result = ReportPromptBuilder.buildWithOptions(basePrompt, options);

      expect(result).toContain('STRICT VALIDATION');
      expect(result).toContain('examples');
    });
  });

  describe('addJsonSchemaInstruction', () => {
    it('should append JSON schema instruction', () => {
      const prompt = 'Extract data';
      const schema = '{ "type": "object" }';
      const result = ReportPromptBuilder.addJsonSchemaInstruction(
        prompt,
        schema,
      );

      expect(result).toContain('Extract data');
      expect(result).toContain('RESPONSE FORMAT');
      expect(result).toContain(schema);
      expect(result).toContain('valid JSON');
    });

    it('should include field requirements', () => {
      const prompt = 'Test';
      const schema = '{}';
      const result = ReportPromptBuilder.addJsonSchemaInstruction(
        prompt,
        schema,
      );

      expect(result).toContain('exact field names');
      expect(result).toContain('required fields');
    });
  });
});
