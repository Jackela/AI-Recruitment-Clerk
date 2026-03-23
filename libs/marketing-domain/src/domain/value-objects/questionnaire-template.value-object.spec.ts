import type {
  QuestionSection,
  QualityThreshold} from './questionnaire-template.value-object.js';
import {
  QuestionnaireTemplate
} from './questionnaire-template.value-object.js';

describe('QuestionnaireTemplate', () => {
  describe('createDefault', () => {
    it('should create template with provided id', () => {
      const template = QuestionnaireTemplate.createDefault('template-001');
      expect(template).toBeInstanceOf(QuestionnaireTemplate);
    });

    it('should create template with version 1.0', () => {
      const template = QuestionnaireTemplate.createDefault('template-001');
      const props = (template as any).props;
      expect(props.version).toBe('1.0');
    });

    it('should create template with all required sections', () => {
      const template = QuestionnaireTemplate.createDefault('template-001');
      const props = (template as any).props;
      expect(props.sections).toHaveLength(5);

      const sectionIds = props.sections.map((s: QuestionSection) => s.id);
      expect(sectionIds).toContain('profile');
      expect(sectionIds).toContain('experience');
      expect(sectionIds).toContain('business');
      expect(sectionIds).toContain('features');
      expect(sectionIds).toContain('optional');
    });

    it('should mark profile, experience, business as required sections', () => {
      const template = QuestionnaireTemplate.createDefault('template-001');
      const props = (template as any).props;

      const requiredSections = props.sections.filter(
        (s: QuestionSection) => s.required,
      );
      expect(requiredSections.map((s: QuestionSection) => s.id)).toEqual([
        'profile',
        'experience',
        'business',
      ]);
    });

    it('should mark features and optional as non-required sections', () => {
      const template = QuestionnaireTemplate.createDefault('template-001');
      const props = (template as any).props;

      const optionalSections = props.sections.filter(
        (s: QuestionSection) => !s.required,
      );
      expect(optionalSections.map((s: QuestionSection) => s.id)).toEqual([
        'features',
        'optional',
      ]);
    });

    it('should have correct required questions', () => {
      const template = QuestionnaireTemplate.createDefault('template-001');
      const props = (template as any).props;

      expect(props.requiredQuestions).toEqual([
        'role',
        'industry',
        'overallSatisfaction',
        'currentScreeningMethod',
        'willingnessToPayMonthly',
      ]);
    });

    it('should have quality thresholds', () => {
      const template = QuestionnaireTemplate.createDefault('template-001');
      const props = (template as any).props;

      expect(props.qualityThresholds).toHaveLength(3);

      const textLengthThreshold = props.qualityThresholds.find(
        (t: QualityThreshold) => t.metric === 'textLength',
      );
      expect(textLengthThreshold.minValue).toBe(50);

      const completionRateThreshold = props.qualityThresholds.find(
        (t: QualityThreshold) => t.metric === 'completionRate',
      );
      expect(completionRateThreshold.minValue).toBe(0.8);

      const detailedAnswersThreshold = props.qualityThresholds.find(
        (t: QualityThreshold) => t.metric === 'detailedAnswers',
      );
      expect(detailedAnswersThreshold.minValue).toBe(3);
    });
  });

  describe('restore', () => {
    it('should restore template from data', () => {
      const data = {
        id: 'template-002',
        version: '2.0',
        sections: [{ id: 'custom', name: 'Custom Section', required: true }],
        requiredQuestions: ['customQuestion'],
        qualityThresholds: [{ metric: 'custom', minValue: 100 }],
      };

      const template = QuestionnaireTemplate.restore(data);
      expect(template).toBeInstanceOf(QuestionnaireTemplate);

      const props = (template as any).props;
      expect(props.id).toBe('template-002');
      expect(props.version).toBe('2.0');
      expect(props.sections).toHaveLength(1);
    });

    it('should restore with empty arrays', () => {
      const data = {
        id: 'template-003',
        version: '1.0',
        sections: [],
        requiredQuestions: [],
        qualityThresholds: [],
      };

      const template = QuestionnaireTemplate.restore(data);
      const props = (template as any).props;
      expect(props.sections).toHaveLength(0);
      expect(props.requiredQuestions).toHaveLength(0);
      expect(props.qualityThresholds).toHaveLength(0);
    });
  });

  describe('section structure', () => {
    it('should have proper section names', () => {
      const template = QuestionnaireTemplate.createDefault('template-001');
      const props = (template as any).props;

      const profileSection = props.sections.find(
        (s: QuestionSection) => s.id === 'profile',
      );
      expect(profileSection.name).toBe('User Profile');

      const experienceSection = props.sections.find(
        (s: QuestionSection) => s.id === 'experience',
      );
      expect(experienceSection.name).toBe('User Experience');
    });
  });
});

describe('QuestionSection interface', () => {
  it('should have correct structure', () => {
    const section: QuestionSection = {
      id: 'test',
      name: 'Test Section',
      required: true,
    };
    expect(section.id).toBe('test');
    expect(section.name).toBe('Test Section');
    expect(section.required).toBe(true);
  });
});

describe('QualityThreshold interface', () => {
  it('should have correct structure', () => {
    const threshold: QualityThreshold = {
      metric: 'textLength',
      minValue: 50,
    };
    expect(threshold.metric).toBe('textLength');
    expect(threshold.minValue).toBe(50);
  });
});
