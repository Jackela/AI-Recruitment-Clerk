import {
  ScoringPromptTemplates,
  ScoringPromptBuilder,
  ScoringPromptOptions,
} from './scoring-templates.dto';

describe('ScoringPromptTemplates', () => {
  describe('getSkillsAssessmentPrompt', () => {
    it('should generate prompt with required and candidate skills', () => {
      const requiredSkills = ['JavaScript', 'TypeScript', 'React'];
      const candidateSkills = ['JavaScript', 'React', 'Node.js'];

      const prompt = ScoringPromptTemplates.getSkillsAssessmentPrompt(
        requiredSkills,
        candidateSkills,
      );

      expect(prompt).toContain('REQUIRED SKILLS:');
      expect(prompt).toContain('CANDIDATE SKILLS:');
      expect(prompt).toContain('JavaScript');
      expect(prompt).toContain('TypeScript');
      expect(prompt).toContain('React');
    });

    it('should include analysis requirements', () => {
      const prompt = ScoringPromptTemplates.getSkillsAssessmentPrompt([], []);

      expect(prompt).toContain('Direct Matches');
      expect(prompt).toContain('Related Skills');
      expect(prompt).toContain('Missing Critical Skills');
      expect(prompt).toContain('Additional Skills');
      expect(prompt).toContain('Skill Level Assessment');
    });

    it('should include matching criteria', () => {
      const prompt = ScoringPromptTemplates.getSkillsAssessmentPrompt([], []);

      expect(prompt).toContain('Exact matches');
      expect(prompt).toContain('Equivalent matches');
      expect(prompt).toContain('Transferable matches');
      expect(prompt).toContain('Framework matches');
    });

    it('should include output requirements', () => {
      const prompt = ScoringPromptTemplates.getSkillsAssessmentPrompt([], []);

      expect(prompt).toContain('Percentage match score');
      expect(prompt).toContain('Specific skill gaps');
      expect(prompt).toContain('Learning curve assessment');
      expect(prompt).toContain('Training recommendations');
    });

    it('should handle empty skills arrays', () => {
      const prompt = ScoringPromptTemplates.getSkillsAssessmentPrompt([], []);

      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should handle single skill', () => {
      const prompt = ScoringPromptTemplates.getSkillsAssessmentPrompt(
        ['JavaScript'],
        ['JavaScript'],
      );

      expect(prompt).toContain('JavaScript');
    });

    it('should handle many skills', () => {
      const requiredSkills = [
        'JavaScript',
        'TypeScript',
        'React',
        'Node.js',
        'Python',
        'Go',
        'AWS',
        'Docker',
      ];
      const candidateSkills = ['JavaScript', 'Python', 'Docker'];

      const prompt = ScoringPromptTemplates.getSkillsAssessmentPrompt(
        requiredSkills,
        candidateSkills,
      );

      expect(prompt).toContain('JavaScript');
      expect(prompt).toContain('Python');
      expect(prompt).toContain('Docker');
    });
  });

  describe('getScoringExplanationPrompt', () => {
    it('should include score in prompt', () => {
      const breakdown = {
        skillsMatch: 80,
        experienceMatch: 90,
        educationMatch: 100,
      };

      const prompt = ScoringPromptTemplates.getScoringExplanationPrompt(
        0.85,
        breakdown,
      );

      expect(prompt).toContain('OVERALL SCORE');
      expect(prompt).toContain('85'); // Rounded from 0.85
    });

    it('should include breakdown JSON', () => {
      const breakdown = {
        skillsMatch: 80,
        experienceMatch: 90,
      };

      const prompt = ScoringPromptTemplates.getScoringExplanationPrompt(
        0.75,
        breakdown,
      );

      expect(prompt).toContain('SCORING COMPONENTS');
      expect(prompt).toContain('skillsMatch');
      expect(prompt).toContain('experienceMatch');
    });

    it('should include explanation requirements', () => {
      const prompt = ScoringPromptTemplates.getScoringExplanationPrompt(
        0.5,
        {},
      );

      expect(prompt).toContain('Methodology Overview');
      expect(prompt).toContain('Component Breakdown');
      expect(prompt).toContain('Weighting Rationale');
      expect(prompt).toContain('Score Interpretation');
      expect(prompt).toContain('Improvement Areas');
    });

    it('should include score ranges', () => {
      const prompt = ScoringPromptTemplates.getScoringExplanationPrompt(
        0.5,
        {},
      );

      expect(prompt).toContain('90-100%');
      expect(prompt).toContain('80-89%');
      expect(prompt).toContain('70-79%');
      expect(prompt).toContain('60-69%');
      expect(prompt).toContain('Below 60%');
    });

    it('should handle edge case scores', () => {
      const prompt0 = ScoringPromptTemplates.getScoringExplanationPrompt(0, {});
      const prompt1 = ScoringPromptTemplates.getScoringExplanationPrompt(1, {});

      expect(prompt0).toContain('OVERALL SCORE');
      expect(prompt1).toContain('OVERALL SCORE');
    });

    it('should handle empty breakdown', () => {
      const prompt = ScoringPromptTemplates.getScoringExplanationPrompt(
        0.5,
        {},
      );

      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
    });
  });

  describe('getCandidateComparisonPrompt', () => {
    it('should include candidate count in prompt', () => {
      const prompt = ScoringPromptTemplates.getCandidateComparisonPrompt(5);

      expect(prompt).toContain('5 candidates');
    });

    it('should include comparison framework', () => {
      const prompt = ScoringPromptTemplates.getCandidateComparisonPrompt(3);

      expect(prompt).toContain('Skills Matrix');
      expect(prompt).toContain('Experience Analysis');
      expect(prompt).toContain('Education Comparison');
      expect(prompt).toContain('Cultural Fit Indicators');
      expect(prompt).toContain('Growth Potential');
    });

    it('should include analysis structure', () => {
      const prompt = ScoringPromptTemplates.getCandidateComparisonPrompt(2);

      expect(prompt).toContain('Comparative tables');
      expect(prompt).toContain('Strength/weakness analysis');
      expect(prompt).toContain('Fit assessment');
      expect(prompt).toContain('Risk assessment');
      expect(prompt).toContain('Recommended interview focus areas');
    });

    it('should include evaluation criteria', () => {
      const prompt = ScoringPromptTemplates.getCandidateComparisonPrompt(3);

      expect(prompt).toContain('Technical skill alignment');
      expect(prompt).toContain('Experience relevance');
      expect(prompt).toContain('Educational background');
      expect(prompt).toContain('Achievement indicators');
      expect(prompt).toContain('Communication and presentation');
    });

    it('should handle single candidate', () => {
      const prompt = ScoringPromptTemplates.getCandidateComparisonPrompt(1);

      expect(prompt).toContain('1 candidates');
    });

    it('should handle many candidates', () => {
      const prompt = ScoringPromptTemplates.getCandidateComparisonPrompt(10);

      expect(prompt).toContain('10 candidates');
    });
  });

  describe('getInterviewGuidePrompt', () => {
    it('should include candidate name in prompt', () => {
      const prompt = ScoringPromptTemplates.getInterviewGuidePrompt('John Doe');

      expect(prompt).toContain('John Doe');
    });

    it('should include interview structure', () => {
      const prompt =
        ScoringPromptTemplates.getInterviewGuidePrompt('Jane Smith');

      expect(prompt).toContain('Technical Assessment');
      expect(prompt).toContain('Experience Deep-Dive');
      expect(prompt).toContain('Behavioral Assessment');
      expect(prompt).toContain('Role-Specific Questions');
    });

    it('should include time allocations', () => {
      const prompt =
        ScoringPromptTemplates.getInterviewGuidePrompt('Test User');

      expect(prompt).toContain('40%');
      expect(prompt).toContain('30%');
      expect(prompt).toContain('20%');
      expect(prompt).toContain('10%');
    });

    it('should include question guidelines', () => {
      const prompt =
        ScoringPromptTemplates.getInterviewGuidePrompt('Test User');

      expect(prompt).toContain('follow-up questions');
      expect(prompt).toContain('good answer');
      expect(prompt).toContain('red flag responses');
      expect(prompt).toContain('time allocation');
      expect(prompt).toContain('candidate questions');
    });

    it('should mention targeted questions count', () => {
      const prompt =
        ScoringPromptTemplates.getInterviewGuidePrompt('Test User');

      expect(prompt).toContain('15-20');
    });

    it('should handle special characters in name', () => {
      const prompt =
        ScoringPromptTemplates.getInterviewGuidePrompt("O'Connor-Smith");

      expect(prompt).toContain("O'Connor-Smith");
    });

    it('should handle unicode in name', () => {
      const prompt =
        ScoringPromptTemplates.getInterviewGuidePrompt('José García');

      expect(prompt).toContain('José García');
    });
  });
});

describe('ScoringPromptBuilder', () => {
  describe('buildWithOptions', () => {
    it('should return base prompt when no options provided', () => {
      const basePrompt = 'Test prompt';
      const result = ScoringPromptBuilder.buildWithOptions(basePrompt);

      expect(result).toBe(basePrompt);
    });

    it('should add strict validation when specified', () => {
      const basePrompt = 'Test prompt';
      const options: ScoringPromptOptions = {
        validationLevel: 'strict',
      };

      const result = ScoringPromptBuilder.buildWithOptions(basePrompt, options);

      expect(result).toContain('STRICT VALIDATION');
      expect(result).toContain('100% accuracy');
    });

    it('should add lenient validation when specified', () => {
      const basePrompt = 'Test prompt';
      const options: ScoringPromptOptions = {
        validationLevel: 'lenient',
      };

      const result = ScoringPromptBuilder.buildWithOptions(basePrompt, options);

      expect(result).toContain('FLEXIBLE EXTRACTION');
      expect(result).toContain('reasonable inferences');
    });

    it('should add examples when includeExamples is true', () => {
      const basePrompt = 'Test prompt';
      const options: ScoringPromptOptions = {
        includeExamples: true,
      };

      const result = ScoringPromptBuilder.buildWithOptions(basePrompt, options);

      expect(result).toContain('Provide examples');
    });

    it('should not add examples when includeExamples is false', () => {
      const basePrompt = 'Test prompt';
      const options: ScoringPromptOptions = {
        includeExamples: false,
      };

      const result = ScoringPromptBuilder.buildWithOptions(basePrompt, options);

      expect(result).not.toContain('Provide examples');
    });

    it('should handle moderate validation level', () => {
      const basePrompt = 'Test prompt';
      const options: ScoringPromptOptions = {
        validationLevel: 'moderate',
      };

      const result = ScoringPromptBuilder.buildWithOptions(basePrompt, options);

      expect(result).toBe(basePrompt);
    });

    it('should combine multiple options', () => {
      const basePrompt = 'Test prompt';
      const options: ScoringPromptOptions = {
        validationLevel: 'strict',
        includeExamples: true,
        temperature: 0.7,
        maxTokens: 1000,
      };

      const result = ScoringPromptBuilder.buildWithOptions(basePrompt, options);

      expect(result).toContain('STRICT VALIDATION');
      expect(result).toContain('Provide examples');
    });

    it('should handle empty base prompt', () => {
      const result = ScoringPromptBuilder.buildWithOptions('');

      expect(result).toBe('');
    });

    it('should handle very long base prompt', () => {
      const longPrompt = 'A'.repeat(10000);
      const result = ScoringPromptBuilder.buildWithOptions(longPrompt);

      expect(result).toContain(longPrompt);
    });
  });

  describe('addJsonSchemaInstruction', () => {
    it('should add JSON schema instruction', () => {
      const prompt = 'Extract candidate information';
      const schema = '{ "name": "string", "skills": "array" }';

      const result = ScoringPromptBuilder.addJsonSchemaInstruction(
        prompt,
        schema,
      );

      expect(result).toContain(prompt);
      expect(result).toContain('RESPONSE FORMAT');
      expect(result).toContain('valid JSON');
      expect(result).toContain(schema);
    });

    it('should include JSON requirements', () => {
      const prompt = 'Test prompt';
      const schema = '{ "test": "boolean" }';

      const result = ScoringPromptBuilder.addJsonSchemaInstruction(
        prompt,
        schema,
      );

      expect(result).toContain('exact field names');
      expect(result).toContain('required fields');
      expect(result).toContain('null for missing');
      expect(result).toContain('data types');
      expect(result).toContain('No additional text');
    });

    it('should handle complex schema', () => {
      const prompt = 'Extract data';
      const complexSchema = `{
        "type": "object",
        "properties": {
          "candidates": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "score": { "type": "number" }
              }
            }
          }
        }
      }`;

      const result = ScoringPromptBuilder.addJsonSchemaInstruction(
        prompt,
        complexSchema,
      );

      expect(result).toContain(complexSchema);
    });

    it('should handle empty schema', () => {
      const prompt = 'Test prompt';
      const result = ScoringPromptBuilder.addJsonSchemaInstruction(prompt, '');

      expect(result).toContain(prompt);
      expect(result).toContain('RESPONSE FORMAT');
    });

    it('should preserve prompt content', () => {
      const prompt = 'Important instructions for extraction';
      const schema = '{ "field": "string" }';

      const result = ScoringPromptBuilder.addJsonSchemaInstruction(
        prompt,
        schema,
      );

      expect(result).toContain('Important instructions for extraction');
    });
  });

  describe('ScoringPromptOptions', () => {
    it('should accept all option combinations', () => {
      const options: ScoringPromptOptions = {
        temperature: 0.5,
        maxTokens: 2000,
        includeExamples: true,
        validationLevel: 'strict',
      };

      expect(options.temperature).toBe(0.5);
      expect(options.maxTokens).toBe(2000);
      expect(options.includeExamples).toBe(true);
      expect(options.validationLevel).toBe('strict');
    });

    it('should accept partial options', () => {
      const options1: ScoringPromptOptions = { temperature: 0.9 };
      const options2: ScoringPromptOptions = { validationLevel: 'lenient' };

      expect(options1.temperature).toBe(0.9);
      expect(options2.validationLevel).toBe('lenient');
    });

    it('should accept empty options', () => {
      const options: ScoringPromptOptions = {};

      expect(Object.keys(options)).toHaveLength(0);
    });
  });
});
