// 枚举类型
export enum QuestionnaireStatus {
  SUBMITTED = 'submitted',
  PROCESSED = 'processed',
  REWARDED = 'rewarded',
  LOW_QUALITY = 'low_quality',
}

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
