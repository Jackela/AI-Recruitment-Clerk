/**
 * Value objects for questionnaire domain.
 * @module questionnaire-value-objects.dto
 */

import { ValueObject } from '../base/value-object';
import type {
  QuestionnaireUserRole,
  CompanySize,
  ScreeningMethod,
  Rating,
} from './questionnaire-types.dto';

// ========================
// User Profile Value Objects
// ========================

/**
 * Represents the user profile.
 */
export class UserProfile extends ValueObject<{
  role: QuestionnaireUserRole;
  industry: string;
  companySize: CompanySize;
  location: string;
}> {
  public get role(): QuestionnaireUserRole {
    return this.props.role;
  }
  public get industry(): string {
    return this.props.industry;
  }
  public get companySize(): CompanySize {
    return this.props.companySize;
  }
  public get location(): string {
    return this.props.location;
  }
}

/**
 * Represents the user experience.
 */
export class UserExperience extends ValueObject<{
  overallSatisfaction: Rating;
  accuracyRating: Rating;
  speedRating: Rating;
  uiRating: Rating;
  mostUsefulFeature: string;
  mainPainPoint?: string;
  improvementSuggestion?: string;
}> {
  public get overallSatisfaction(): Rating {
    return this.props.overallSatisfaction;
  }
  public get accuracyRating(): Rating {
    return this.props.accuracyRating;
  }
  public get speedRating(): Rating {
    return this.props.speedRating;
  }
  public get uiRating(): Rating {
    return this.props.uiRating;
  }
  public get mostUsefulFeature(): string {
    return this.props.mostUsefulFeature;
  }
  public get mainPainPoint(): string | undefined {
    return this.props.mainPainPoint;
  }
  public get improvementSuggestion(): string | undefined {
    return this.props.improvementSuggestion;
  }
}

/**
 * Represents the business value.
 */
export class BusinessValue extends ValueObject<{
  currentScreeningMethod: ScreeningMethod;
  timeSpentPerResume: number;
  resumesPerWeek: number;
  timeSavingPercentage: number;
  willingnessToPayMonthly: number;
  recommendLikelihood: Rating;
}> {
  public get currentScreeningMethod(): ScreeningMethod {
    return this.props.currentScreeningMethod;
  }
  public get timeSpentPerResume(): number {
    return this.props.timeSpentPerResume;
  }
  public get resumesPerWeek(): number {
    return this.props.resumesPerWeek;
  }
  public get timeSavingPercentage(): number {
    return this.props.timeSavingPercentage;
  }
  public get willingnessToPayMonthly(): number {
    return this.props.willingnessToPayMonthly;
  }
  public get recommendLikelihood(): Rating {
    return this.props.recommendLikelihood;
  }
}

/**
 * Represents the feature needs.
 */
export class FeatureNeeds extends ValueObject<{
  priorityFeatures: string[];
  integrationNeeds: string[];
}> {}

/**
 * Represents the optional info.
 */
export class OptionalInfo extends ValueObject<{
  additionalFeedback?: string;
  contactPreference?: string;
}> {
  public get additionalFeedback(): string | undefined {
    return this.props.additionalFeedback;
  }
  public get contactPreference(): string | undefined {
    return this.props.contactPreference;
  }
}

// ========================
// Metadata Value Objects
// ========================

/**
 * Represents the submission metadata.
 */
export class SubmissionMetadata extends ValueObject<{
  ip: string;
  userAgent: string;
  timestamp: Date;
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static restore(data: any): SubmissionMetadata {
    return new SubmissionMetadata({
      ...data,
      timestamp: new Date(data.timestamp),
    });
  }

  public get ip(): string {
    return this.props.ip;
  }
}

// ========================
// Quality Value Objects
// ========================

/**
 * Represents the quality score.
 */
export class QualityScore extends ValueObject<{ value: number }> {
  public get value(): number {
    return this.props.value;
  }
}

/**
 * Represents the submission summary.
 */
export class SubmissionSummary extends ValueObject<{
  role: string;
  industry: string;
  overallSatisfaction: number;
  willingnessToPayMonthly: number;
  textLength: number;
  completionRate: number;
}> {
  public get role(): string {
    return this.props.role;
  }
  public get industry(): string {
    return this.props.industry;
  }
  public get overallSatisfaction(): number {
    return this.props.overallSatisfaction;
  }
  public get willingnessToPayMonthly(): number {
    return this.props.willingnessToPayMonthly;
  }
  public get textLength(): number {
    return this.props.textLength;
  }
  public get completionRate(): number {
    return this.props.completionRate;
  }
}

/**
 * Represents the answer.
 */
export class Answer extends ValueObject<{
  questionId: string;
  value: string;
}> {}

/**
 * Represents the quality metrics.
 */
export class QualityMetrics extends ValueObject<{
  totalTextLength: number;
  detailedAnswers: number;
  completionRate: number;
  qualityScore: number;
  bonusEligible: boolean;
  qualityReasons: string[];
}> {
  public get totalTextLength(): number {
    return this.props.totalTextLength;
  }
  public get detailedAnswers(): number {
    return this.props.detailedAnswers;
  }
  public get completionRate(): number {
    return this.props.completionRate;
  }
  public get qualityScore(): number {
    return this.props.qualityScore;
  }
  public get bonusEligible(): boolean {
    return this.props.bonusEligible;
  }
  public get qualityReasons(): string[] {
    return this.props.qualityReasons;
  }
}
