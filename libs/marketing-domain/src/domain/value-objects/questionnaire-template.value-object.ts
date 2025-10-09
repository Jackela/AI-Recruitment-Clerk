import { ValueObject } from './base/value-object.js';

/**
 * Defines the shape of the question section.
 */
export interface QuestionSection {
  id: string;
  name: string;
  required: boolean;
}

/**
 * Defines the shape of the quality threshold.
 */
export interface QualityThreshold {
  metric: string;
  minValue: number;
}

/**
 * Represents the questionnaire template.
 */
export class QuestionnaireTemplate extends ValueObject<{
  id: string;
  version: string;
  sections: QuestionSection[];
  requiredQuestions: string[];
  qualityThresholds: QualityThreshold[];
}> {
  /**
   * Creates default.
   * @param templateId - The template id.
   * @returns The QuestionnaireTemplate.
   */
  static createDefault(templateId: string): QuestionnaireTemplate {
    return new QuestionnaireTemplate({
      id: templateId,
      version: '1.0',
      sections: [
        { id: 'profile', name: 'User Profile', required: true },
        { id: 'experience', name: 'User Experience', required: true },
        { id: 'business', name: 'Business Value', required: true },
        { id: 'features', name: 'Feature Needs', required: false },
        { id: 'optional', name: 'Optional Info', required: false }
      ],
      requiredQuestions: ['role', 'industry', 'overallSatisfaction', 'currentScreeningMethod', 'willingnessToPayMonthly'],
      qualityThresholds: [
        { metric: 'textLength', minValue: 50 },
        { metric: 'completionRate', minValue: 0.8 },
        { metric: 'detailedAnswers', minValue: 3 }
      ]
    });
  }
  
  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The QuestionnaireTemplate.
   */
  static restore(data: any): QuestionnaireTemplate {
    return new QuestionnaireTemplate(data);
  }
}
