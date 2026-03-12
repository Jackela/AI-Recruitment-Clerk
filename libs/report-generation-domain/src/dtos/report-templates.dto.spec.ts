import {
  ReportPromptTemplates,
  ReportPromptBuilder,
  ReportPromptOptions,
} from '../application/dtos/report-templates.dto';

describe('Report Templates DTO', () => {
  describe('ReportPromptTemplates', () => {
    it('should generate job description prompt with text', () => {
      const jdText = 'Software Engineer position';
      const prompt = ReportPromptTemplates.getJobDescriptionPrompt(jdText);

      expect(prompt).toContain(jdText);
      expect(prompt).toContain('EXTRACTION REQUIREMENTS');
    });

    it('should generate resume parsing prompt', () => {
      const resumeText = 'John Doe resume content';
      const prompt = ReportPromptTemplates.getResumeParsingPrompt(resumeText);

      expect(prompt).toContain(resumeText);
      expect(prompt).toContain('Contact Information');
    });

    it('should generate vision parsing prompt', () => {
      const prompt = ReportPromptTemplates.getResumeVisionPrompt();

      expect(prompt).toContain('VISUAL ANALYSIS');
      expect(prompt.length).toBeGreaterThan(100);
    });

    it('should generate report generation prompt with context', () => {
      const context = {
        jobTitle: 'Senior Developer',
        candidateCount: 5,
        hasRequirements: true,
        hasScoring: true,
      };
      const prompt = ReportPromptTemplates.getReportGenerationPrompt(context);

      expect(prompt).toContain(context.jobTitle);
      expect(prompt).toContain('Executive Summary');
    });
  });

  describe('ReportPromptBuilder', () => {
    it('should build with default options', () => {
      const base = 'Test prompt';
      const result = ReportPromptBuilder.buildWithOptions(base);

      expect(result).toBe(base);
    });

    it('should add strict validation', () => {
      const base = 'Test';
      const options: ReportPromptOptions = { validationLevel: 'strict' };
      const result = ReportPromptBuilder.buildWithOptions(base, options);

      expect(result).toContain('STRICT VALIDATION');
    });

    it('should add lenient validation', () => {
      const base = 'Test';
      const options: ReportPromptOptions = { validationLevel: 'lenient' };
      const result = ReportPromptBuilder.buildWithOptions(base, options);

      expect(result).toContain('FLEXIBLE EXTRACTION');
    });

    it('should add examples when requested', () => {
      const base = 'Test';
      const options: ReportPromptOptions = { includeExamples: true };
      const result = ReportPromptBuilder.buildWithOptions(base, options);

      expect(result).toContain('examples');
    });

    it('should add JSON schema instruction', () => {
      const prompt = 'Extract data';
      const schema = '{"type":"object"}';
      const result = ReportPromptBuilder.addJsonSchemaInstruction(
        prompt,
        schema,
      );

      expect(result).toContain('RESPONSE FORMAT');
      expect(result).toContain(schema);
    });

    it('should handle all options together', () => {
      const base = 'Test';
      const options: ReportPromptOptions = {
        validationLevel: 'moderate',
        maxTokens: 1000,
        temperature: 0.7,
        includeExamples: true,
      };
      const result = ReportPromptBuilder.buildWithOptions(base, options);

      expect(result).toContain(base);
      expect(result).toContain('examples');
    });
  });
});
