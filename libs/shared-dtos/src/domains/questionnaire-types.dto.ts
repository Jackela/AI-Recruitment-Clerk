import type { QuestionnaireStatus } from './questionnaire.dto';

// Re-export QuestionnaireStatus for convenience
export { QuestionnaireStatus } from './questionnaire.dto';

// ========================
// Domain Types
// ========================

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

// ========================
// Enum Types
// ========================

export type QuestionnaireUserRole =
  | 'hr'
  | 'recruiter'
  | 'manager'
  | 'founder'
  | 'other';

export type CompanySize =
  | 'startup'
  | 'small'
  | 'medium'
  | 'large'
  | 'enterprise'
  | 'unknown';

export type ScreeningMethod = 'manual' | 'ats' | 'hybrid' | 'other';

export type Rating = 1 | 2 | 3 | 4 | 5;

// ========================
// Data Interfaces
// ========================

/**
 * Defines the shape of the raw submission data.
 */
export interface RawSubmissionData {
  userProfile?: {
    role?: QuestionnaireUserRole;
    industry?: string;
    companySize?: CompanySize;
    location?: string;
  };
  userExperience?: {
    overallSatisfaction?: Rating;
    accuracyRating?: Rating;
    speedRating?: Rating;
    uiRating?: Rating;
    mostUsefulFeature?: string;
    mainPainPoint?: string;
    improvementSuggestion?: string;
  };
  businessValue?: {
    currentScreeningMethod?: ScreeningMethod;
    timeSpentPerResume?: number;
    resumesPerWeek?: number;
    timeSavingPercentage?: number;
    willingnessToPayMonthly?: number;
    recommendLikelihood?: Rating;
  };
  featureNeeds?: {
    priorityFeatures?: string[];
    integrationNeeds?: string[];
  };
  optional?: {
    additionalFeedback?: string;
    contactPreference?: string;
  };
}

/**
 * Defines the shape of the questionnaire data.
 */
export interface QuestionnaireData {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  template: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  submission: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quality: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  status: QuestionnaireStatus;
}
