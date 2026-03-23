import {
  PromptTemplates,
  PromptBuilder,
  PromptOptions,
} from './prompt-templates';

describe('PromptTemplates', () => {
  describe('getJobDescriptionPrompt', () => {
    it('should include JD text in prompt', () => {
      const jdText = 'Software Engineer needed';
      const prompt = PromptTemplates.getJobDescriptionPrompt(jdText);

      expect(prompt).toContain(jdText);
    });

    it('should include extraction requirements', () => {
      const prompt = PromptTemplates.getJobDescriptionPrompt('Test JD');

      expect(prompt).toContain('Required Skills');
      expect(prompt).toContain('Experience');
      expect(prompt).toContain('Education');
      expect(prompt).toContain('Additional Information');
    });

    it('should include accuracy guidelines', () => {
      const prompt = PromptTemplates.getJobDescriptionPrompt('Test JD');

      expect(prompt).toContain('ACCURACY GUIDELINES');
      expect(prompt).toContain('Extract only information');
    });

    it('should mention JSON response', () => {
      const prompt = PromptTemplates.getJobDescriptionPrompt('Test JD');

      expect(prompt).toContain('JSON');
    });
  });

  describe('getResumeParsingPrompt', () => {
    it('should include resume text in prompt', () => {
      const resumeText = 'John Doe, Software Engineer';
      const prompt = PromptTemplates.getResumeParsingPrompt(resumeText);

      expect(prompt).toContain(resumeText);
    });

    it('should include extraction requirements for contact info', () => {
      const prompt = PromptTemplates.getResumeParsingPrompt('Test resume');

      expect(prompt).toContain('Contact Information');
      expect(prompt).toContain('Full name');
      expect(prompt).toContain('Email address');
    });

    it('should include extraction requirements for skills', () => {
      const prompt = PromptTemplates.getResumeParsingPrompt('Test resume');

      expect(prompt).toContain('Skills');
      expect(prompt).toContain('Technical skills');
      expect(prompt).toContain('Certifications');
    });

    it('should include extraction requirements for work experience', () => {
      const prompt = PromptTemplates.getResumeParsingPrompt('Test resume');

      expect(prompt).toContain('Work Experience');
      expect(prompt).toContain('Company names');
      expect(prompt).toContain('Employment dates');
    });

    it('should include extraction requirements for education', () => {
      const prompt = PromptTemplates.getResumeParsingPrompt('Test resume');

      expect(prompt).toContain('Education');
      expect(prompt).toContain('Institution names');
      expect(prompt).toContain('Degrees');
    });

    it('should exclude soft skills from technical skills', () => {
      const prompt = PromptTemplates.getResumeParsingPrompt('Test resume');

      expect(prompt).toContain('Do NOT include soft skills');
    });
  });

  describe('getResumeVisionPrompt', () => {
    it('should include visual analysis requirements', () => {
      const prompt = PromptTemplates.getResumeVisionPrompt();

      expect(prompt).toContain('VISUAL ANALYSIS REQUIREMENTS');
      expect(prompt).toContain('Read ALL text content');
      expect(prompt).toContain('document structure');
    });

    it('should include extraction focus', () => {
      const prompt = PromptTemplates.getResumeVisionPrompt();

      expect(prompt).toContain('EXTRACTION FOCUS');
      expect(prompt).toContain('Technical skills sections');
    });

    it('should mention accuracy requirements', () => {
      const prompt = PromptTemplates.getResumeVisionPrompt();

      expect(prompt).toContain('ACCURACY REQUIREMENTS');
      expect(prompt).toContain('clearly visible');
    });
  });

  describe('getReportGenerationPrompt', () => {
    it('should include job title in prompt', () => {
      const context = {
        jobTitle: 'Software Engineer',
        candidateCount: 5,
        hasRequirements: true,
        hasScoring: true,
      };
      const prompt = PromptTemplates.getReportGenerationPrompt(context);

      expect(prompt).toContain('Software Engineer');
    });

    it('should include report requirements', () => {
      const context = {
        jobTitle: 'Test',
        candidateCount: 3,
        hasRequirements: true,
        hasScoring: true,
      };
      const prompt = PromptTemplates.getReportGenerationPrompt(context);

      expect(prompt).toContain('REPORT REQUIREMENTS');
      expect(prompt).toContain('REQUIRED SECTIONS');
    });

    it('should include executive summary section', () => {
      const context = {
        jobTitle: 'Test',
        candidateCount: 3,
        hasRequirements: true,
        hasScoring: true,
      };
      const prompt = PromptTemplates.getReportGenerationPrompt(context);

      expect(prompt).toContain('Executive Summary');
    });

    it('should mention candidate count', () => {
      const context = {
        jobTitle: 'Test',
        candidateCount: 10,
        hasRequirements: true,
        hasScoring: true,
      };
      const prompt = PromptTemplates.getReportGenerationPrompt(context);

      expect(prompt).toContain('Test');
    });
  });

  describe('getCandidateComparisonPrompt', () => {
    it('should include candidate count', () => {
      const prompt = PromptTemplates.getCandidateComparisonPrompt(5);

      expect(prompt).toContain('5 candidates');
    });

    it('should include comparison framework', () => {
      const prompt = PromptTemplates.getCandidateComparisonPrompt(3);

      expect(prompt).toContain('COMPARISON FRAMEWORK');
      expect(prompt).toContain('Skills Matrix');
      expect(prompt).toContain('Experience Analysis');
    });
  });

  describe('getInterviewGuidePrompt', () => {
    it('should include candidate name', () => {
      const prompt = PromptTemplates.getInterviewGuidePrompt('John Doe');

      expect(prompt).toContain('John Doe');
    });

    it('should include interview structure', () => {
      const prompt = PromptTemplates.getInterviewGuidePrompt('Test Candidate');

      expect(prompt).toContain('INTERVIEW STRUCTURE');
      expect(prompt).toContain('Technical Assessment');
      expect(prompt).toContain('Experience Deep-Dive');
      expect(prompt).toContain('Behavioral Assessment');
    });

    it('should include question guidelines', () => {
      const prompt = PromptTemplates.getInterviewGuidePrompt('Test Candidate');

      expect(prompt).toContain('QUESTION GUIDELINES');
      expect(prompt).toContain('follow-up questions');
    });
  });

  describe('getSkillsAssessmentPrompt', () => {
    it('should include required skills', () => {
      const requiredSkills = ['JavaScript', 'TypeScript', 'React'];
      const candidateSkills = ['JavaScript', 'Python'];
      const prompt = PromptTemplates.getSkillsAssessmentPrompt(
        requiredSkills,
        candidateSkills,
      );

      expect(prompt).toContain('JavaScript, TypeScript, React');
    });

    it('should include candidate skills', () => {
      const requiredSkills = ['JavaScript'];
      const candidateSkills = ['JavaScript', 'Python'];
      const prompt = PromptTemplates.getSkillsAssessmentPrompt(
        requiredSkills,
        candidateSkills,
      );

      expect(prompt).toContain('JavaScript, Python');
    });

    it('should include analysis requirements', () => {
      const prompt = PromptTemplates.getSkillsAssessmentPrompt(['JS'], ['TS']);

      expect(prompt).toContain('ANALYSIS REQUIREMENTS');
      expect(prompt).toContain('Direct Matches');
      expect(prompt).toContain('Missing Critical Skills');
    });
  });

  describe('getScoringExplanationPrompt', () => {
    it('should include score in prompt', () => {
      const breakdown = { skillMatch: 0.8, experience: 0.9 };
      const prompt = PromptTemplates.getScoringExplanationPrompt(
        0.85,
        breakdown,
      );

      expect(prompt).toContain('85%');
    });

    it('should include breakdown in prompt', () => {
      const breakdown = { skillMatch: 0.8, experience: 0.9 };
      const prompt = PromptTemplates.getScoringExplanationPrompt(
        0.5,
        breakdown,
      );

      expect(prompt).toContain('skillMatch');
      expect(prompt).toContain('experience');
    });

    it('should include score ranges', () => {
      const prompt = PromptTemplates.getScoringExplanationPrompt(0.75, {});

      expect(prompt).toContain('SCORE RANGES');
      expect(prompt).toContain('90-100%');
      expect(prompt).toContain('Exceptional fit');
    });
  });
});

describe('PromptBuilder', () => {
  describe('buildWithOptions', () => {
    it('should return base prompt unchanged without options', () => {
      const base = 'Base prompt';
      const result = PromptBuilder.buildWithOptions(base);

      expect(result).toBe(base);
    });

    it('should add strict validation instruction', () => {
      const base = 'Base prompt';
      const result = PromptBuilder.buildWithOptions(base, {
        validationLevel: 'strict',
      });

      expect(result).toContain('STRICT VALIDATION');
      expect(result).toContain('100% accuracy');
    });

    it('should add lenient validation instruction', () => {
      const base = 'Base prompt';
      const result = PromptBuilder.buildWithOptions(base, {
        validationLevel: 'lenient',
      });

      expect(result).toContain('FLEXIBLE EXTRACTION');
      expect(result).toContain('reasonable inferences');
    });

    it('should add examples instruction when includeExamples is true', () => {
      const base = 'Base prompt';
      const result = PromptBuilder.buildWithOptions(base, {
        includeExamples: true,
      });

      expect(result).toContain('examples');
    });

    it('should combine multiple options', () => {
      const base = 'Base prompt';
      const result = PromptBuilder.buildWithOptions(base, {
        validationLevel: 'strict',
        includeExamples: true,
      });

      expect(result).toContain('STRICT VALIDATION');
      expect(result).toContain('examples');
    });
  });

  describe('addJsonSchemaInstruction', () => {
    it('should add schema instruction to prompt', () => {
      const prompt = 'Extract user data';
      const schema = '{ "name": "string", "age": "number" }';
      const result = PromptBuilder.addJsonSchemaInstruction(prompt, schema);

      expect(result).toContain(prompt);
      expect(result).toContain('RESPONSE FORMAT');
      expect(result).toContain('JSON');
      expect(result).toContain(schema);
    });

    it('should include important notes', () => {
      const prompt = 'Test prompt';
      const schema = '{}';
      const result = PromptBuilder.addJsonSchemaInstruction(prompt, schema);

      expect(result).toContain('exact field names');
      expect(result).toContain('required fields');
      expect(result).toContain('null for missing');
    });

    it('should not include additional text outside JSON', () => {
      const prompt = 'Test prompt';
      const schema = '{ "field": "string" }';
      const result = PromptBuilder.addJsonSchemaInstruction(prompt, schema);

      expect(result).toContain('No additional text or explanation');
    });
  });
});

describe('PromptOptions interface', () => {
  it('should accept valid options object', () => {
    const options: PromptOptions = {
      temperature: 0.7,
      maxTokens: 1000,
      includeExamples: true,
      validationLevel: 'moderate',
    };

    expect(options.temperature).toBe(0.7);
    expect(options.maxTokens).toBe(1000);
    expect(options.validationLevel).toBe('moderate');
  });
});
