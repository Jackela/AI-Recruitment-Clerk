describe('Application DTOs Index', () => {
  it('should export application dtos module', () => {
    const module = require('./index');
    expect(module).toBeDefined();
  });

  it('should export ReportPromptTemplates', () => {
    const module = require('./index');
    expect(module.ReportPromptTemplates).toBeDefined();
    expect(typeof module.ReportPromptTemplates.getJobDescriptionPrompt).toBe(
      'function',
    );
    expect(typeof module.ReportPromptTemplates.getResumeParsingPrompt).toBe(
      'function',
    );
    expect(typeof module.ReportPromptTemplates.getResumeVisionPrompt).toBe(
      'function',
    );
    expect(typeof module.ReportPromptTemplates.getReportGenerationPrompt).toBe(
      'function',
    );
  });

  it('should export ReportPromptBuilder', () => {
    const module = require('./index');
    expect(module.ReportPromptBuilder).toBeDefined();
    expect(typeof module.ReportPromptBuilder.buildWithOptions).toBe('function');
    expect(typeof module.ReportPromptBuilder.addJsonSchemaInstruction).toBe(
      'function',
    );
  });

  it('should export ReportPromptBuilder class', () => {
    const module = require('./index');
    expect(module.ReportPromptBuilder).toBeDefined();
    expect(typeof module.ReportPromptBuilder.buildWithOptions).toBe('function');
  });
});
