/**
 * Questionnaire submission-related value objects.
 * Contains QuestionnaireTemplate, QuestionnaireSubmission, and SubmissionQuality.
 * @module questionnaire-submission.dto
 */

import { ValueObject } from '../base/value-object';
import type { QuestionSection, QualityThreshold, RawSubmissionData } from './questionnaire-types.dto';
import {
  UserProfile,
  UserExperience,
  BusinessValue,
  FeatureNeeds,
  OptionalInfo,
  SubmissionSummary,
  Answer,
  QualityScore,
  QualityMetrics,
} from './questionnaire-value-objects.dto';

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
  public static createDefault(templateId: string): QuestionnaireTemplate {
    return new QuestionnaireTemplate({
      id: templateId,
      version: '1.0',
      sections: [
        { id: 'profile', name: 'User Profile', required: true },
        { id: 'experience', name: 'User Experience', required: true },
        { id: 'business', name: 'Business Value', required: true },
        { id: 'features', name: 'Feature Needs', required: false },
        { id: 'optional', name: 'Optional Info', required: false },
      ],
      requiredQuestions: [
        'role',
        'industry',
        'overallSatisfaction',
        'currentScreeningMethod',
        'willingnessToPayMonthly',
      ],
      qualityThresholds: [
        { metric: 'textLength', minValue: 50 },
        { metric: 'completionRate', minValue: 0.8 },
        { metric: 'detailedAnswers', minValue: 3 },
      ],
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static restore(data: any): QuestionnaireTemplate {
    return new QuestionnaireTemplate(data);
  }
}

/**
 * Represents the questionnaire submission.
 */
export class QuestionnaireSubmission extends ValueObject<{
  userProfile: UserProfile;
  userExperience: UserExperience;
  businessValue: BusinessValue;
  featureNeeds: FeatureNeeds;
  optional: OptionalInfo;
  submittedAt: Date;
}> {
  public static fromRawData(data: RawSubmissionData): QuestionnaireSubmission {
    return new QuestionnaireSubmission({
      userProfile: new UserProfile({
        role: data.userProfile?.role || 'other',
        industry: data.userProfile?.industry || '',
        companySize: data.userProfile?.companySize || 'unknown',
        location: data.userProfile?.location || '',
      }),
      userExperience: new UserExperience({
        overallSatisfaction: data.userExperience?.overallSatisfaction || 1,
        accuracyRating: data.userExperience?.accuracyRating || 1,
        speedRating: data.userExperience?.speedRating || 1,
        uiRating: data.userExperience?.uiRating || 1,
        mostUsefulFeature: data.userExperience?.mostUsefulFeature || '',
        mainPainPoint: data.userExperience?.mainPainPoint,
        improvementSuggestion: data.userExperience?.improvementSuggestion,
      }),
      businessValue: new BusinessValue({
        currentScreeningMethod:
          data.businessValue?.currentScreeningMethod || 'manual',
        timeSpentPerResume: data.businessValue?.timeSpentPerResume || 0,
        resumesPerWeek: data.businessValue?.resumesPerWeek || 0,
        timeSavingPercentage: data.businessValue?.timeSavingPercentage || 0,
        willingnessToPayMonthly:
          data.businessValue?.willingnessToPayMonthly || 0,
        recommendLikelihood: data.businessValue?.recommendLikelihood || 1,
      }),
      featureNeeds: new FeatureNeeds({
        priorityFeatures: data.featureNeeds?.priorityFeatures || [],
        integrationNeeds: data.featureNeeds?.integrationNeeds || [],
      }),
      optional: new OptionalInfo({
        additionalFeedback: data.optional?.additionalFeedback,
        contactPreference: data.optional?.contactPreference,
      }),
      submittedAt: new Date(),
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static restore(data: any): QuestionnaireSubmission {
    return new QuestionnaireSubmission({
      ...data,
      submittedAt: new Date(data.submittedAt),
    });
  }

  public getUserProfile(): UserProfile {
    return this.props.userProfile;
  }

  public getUserExperience(): UserExperience {
    return this.props.userExperience;
  }

  public getBusinessValue(): BusinessValue {
    return this.props.businessValue;
  }

  public getOptionalInfo(): OptionalInfo {
    return this.props.optional;
  }

  public getSummary(): SubmissionSummary {
    return new SubmissionSummary({
      role: this.props.userProfile.role,
      industry: this.props.userProfile.industry,
      overallSatisfaction: this.props.userExperience.overallSatisfaction,
      willingnessToPayMonthly: this.props.businessValue.willingnessToPayMonthly,
      textLength: this.calculateTotalTextLength(),
      completionRate: this.calculateCompletionRate(),
    });
  }

  public getAnswer(questionId: string): Answer | null {
    const answers = {
      role: this.props.userProfile.role,
      industry: this.props.userProfile.industry,
      overallSatisfaction:
        this.props.userExperience.overallSatisfaction.toString(),
      mostUsefulFeature: this.props.userExperience.mostUsefulFeature,
    };

    const value = answers[questionId as keyof typeof answers];
    return value ? new Answer({ questionId, value: value.toString() }) : null;
  }

  private calculateTotalTextLength(): number {
    const textFields = [
      this.props.userProfile.industry,
      this.props.userProfile.location,
      this.props.userExperience.mostUsefulFeature,
      this.props.userExperience.mainPainPoint || '',
      this.props.userExperience.improvementSuggestion || '',
      this.props.optional.additionalFeedback || '',
    ];

    return textFields.join(' ').length;
  }

  private calculateCompletionRate(): number {
    const requiredFields = 5;
    const completedFields = [
      this.props.userProfile.role,
      this.props.userProfile.industry,
      this.props.userExperience.overallSatisfaction,
      this.props.businessValue.currentScreeningMethod,
      this.props.businessValue.willingnessToPayMonthly,
    ].filter((field) => field && field !== 0).length;

    return completedFields / requiredFields;
  }
}

/**
 * Represents the submission quality.
 */
export class SubmissionQuality extends ValueObject<{
  totalTextLength: number;
  detailedAnswers: number;
  completionRate: number;
  qualityScore: number;
  bonusEligible: boolean;
  qualityReasons: string[];
}> {
  public static calculate(submission: QuestionnaireSubmission): SubmissionQuality {
    const totalTextLength = submission.getSummary().textLength;
    const completionRate = submission.getSummary().completionRate;
    const detailedAnswers = SubmissionQuality.countDetailedAnswers(submission);

    let qualityScore = 0;
    const qualityReasons: string[] = [];

    const completionScore = completionRate * 40;
    qualityScore += completionScore;
    if (completionRate >= 0.8) {
      qualityReasons.push('High completion rate');
    }

    const textQualityScore = Math.min(30, totalTextLength / 10);
    qualityScore += textQualityScore;
    if (totalTextLength >= 50) {
      qualityReasons.push('Detailed text responses');
    }

    const businessValueScore =
      SubmissionQuality.calculateBusinessValueScore(submission);
    qualityScore += businessValueScore;
    if (businessValueScore >= 20) {
      qualityReasons.push('High business value responses');
    }

    const finalScore = Math.min(100, Math.round(qualityScore));
    const bonusEligible =
      finalScore >= 70 && totalTextLength >= 50 && detailedAnswers >= 3;

    return new SubmissionQuality({
      totalTextLength,
      detailedAnswers,
      completionRate,
      qualityScore: finalScore,
      bonusEligible,
      qualityReasons,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static restore(data: any): SubmissionQuality {
    return new SubmissionQuality(data);
  }

  private static countDetailedAnswers(submission: QuestionnaireSubmission): number {
    const userExp = submission.getUserExperience();
    const optional = submission.getOptionalInfo();
    let count = 0;

    if ((userExp.mainPainPoint || '').length > 20) count++;
    if ((userExp.improvementSuggestion || '').length > 20) count++;
    if ((optional.additionalFeedback || '').length > 30) count++;

    return count;
  }

  private static calculateBusinessValueScore(submission: QuestionnaireSubmission): number {
    const businessValue = submission.getBusinessValue();
    let score = 0;

    if (businessValue.willingnessToPayMonthly > 0) {
      score += Math.min(15, businessValue.willingnessToPayMonthly / 10);
    }

    if (businessValue.recommendLikelihood >= 4) {
      score += 10;
    } else if (businessValue.recommendLikelihood >= 3) {
      score += 5;
    }

    if (businessValue.timeSavingPercentage >= 50) {
      score += 5;
    }

    return score;
  }

  public calculateScore(): QualityScore {
    return new QualityScore({ value: this.props.qualityScore });
  }

  public isBonusEligible(): boolean {
    return this.props.bonusEligible;
  }

  public getQualityScore(): number {
    return this.props.qualityScore;
  }

  public getQualityReasons(): string[] {
    return this.props.qualityReasons;
  }

  public getMetrics(): QualityMetrics {
    return new QualityMetrics(this.props);
  }

  public getTotalTextLength(): number {
    return this.props.totalTextLength;
  }

  public hasDetailedFeedback(): boolean {
    return this.props.detailedAnswers >= 3;
  }
}
