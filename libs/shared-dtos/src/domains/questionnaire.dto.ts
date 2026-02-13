import { ValueObject } from '../base/value-object';
import type { DomainEvent } from '../base/domain-event';
import {
  QuestionnaireSubmittedEvent,
  HighQualitySubmissionEvent,
} from './questionnaire-events.dto';
import type {
  QuestionSection,
  QualityThreshold,
  QuestionnaireUserRole,
  CompanySize,
  ScreeningMethod,
  Rating,
  RawSubmissionData,
  QuestionnaireData,
} from './questionnaire-types.dto';

// Re-export types for backward compatibility
export type {
  QuestionSection,
  QualityThreshold,
  QuestionnaireUserRole,
  CompanySize,
  ScreeningMethod,
  Rating,
  RawSubmissionData,
  QuestionnaireData,
} from './questionnaire-types.dto';

// Re-export events
export type {
  QuestionnaireSubmittedEvent,
  HighQualitySubmissionEvent,
} from './questionnaire-events.dto';

// Re-export controller DTOs
export type {
  CreateQuestionnaireDto,
  UpdateQuestionnaireDto,
  QuestionnaireResponseDto,
  QuestionnaireAnalyticsDto,
} from './questionnaire-interfaces.dto';

// 问卷聚合根
/**
 * Represents the questionnaire.
 */
export class Questionnaire {
  private uncommittedEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: QuestionnaireId,
    private readonly _template: QuestionnaireTemplate,
    private readonly submission: QuestionnaireSubmission,
    private readonly quality: SubmissionQuality,
    private readonly metadata: SubmissionMetadata,
    private status: QuestionnaireStatus,
  ) {}

  // 工厂方法
  /**
   * Creates the entity.
   * @param templateId - The template id.
   * @param submission - The submission.
   * @param metadata - The metadata.
   * @returns The Questionnaire.
   */
  public static create(
    templateId: string,
    submission: RawSubmissionData,
    metadata: SubmissionMetadata,
  ): Questionnaire {
    const id = QuestionnaireId.generate();
    const template = QuestionnaireTemplate.createDefault(templateId);
    const questionnaireSubmission =
      QuestionnaireSubmission.fromRawData(submission);
    const quality = SubmissionQuality.calculate(questionnaireSubmission);

    const questionnaire = new Questionnaire(
      id,
      template,
      questionnaireSubmission,
      quality,
      metadata,
      QuestionnaireStatus.SUBMITTED,
    );

    questionnaire.addEvent(
      new QuestionnaireSubmittedEvent(
        id.getValue(),
        metadata.ip,
        quality.getQualityScore(),
        quality.isBonusEligible(),
        questionnaireSubmission.getSummary(),
        new Date(),
      ),
    );

    if (quality.isBonusEligible()) {
      questionnaire.addEvent(
        new HighQualitySubmissionEvent(
          id.getValue(),
          metadata.ip,
          quality.getQualityScore(),
          quality.getQualityReasons(),
          new Date(),
        ),
      );
    }

    return questionnaire;
  }

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The Questionnaire.
   */
  public static restore(data: QuestionnaireData): Questionnaire {
    return new Questionnaire(
      new QuestionnaireId({ value: data.id }),
      QuestionnaireTemplate.restore(data.template),
      QuestionnaireSubmission.restore(data.submission),
      SubmissionQuality.restore(data.quality),
      SubmissionMetadata.restore(data.metadata),
      data.status,
    );
  }

  // 核心业务方法
  /**
   * Validates submission.
   * @returns The QuestionnaireValidationResult.
   */
  public validateSubmission(): QuestionnaireValidationResult {
    // Touch template to satisfy TS6138 for private readonly field
    void this._template;
    const errors: string[] = [];

    // 检查必填字段
    const profile = this.submission.getUserProfile();
    const experience = this.submission.getUserExperience();
    const business = this.submission.getBusinessValue();

    if (!profile) {
      errors.push('User profile is required');
      return new QuestionnaireValidationResult(false, errors);
    }

    if (!experience) {
      errors.push('User experience is required');
      return new QuestionnaireValidationResult(false, errors);
    }

    if (!business) {
      errors.push('Business value is required');
      return new QuestionnaireValidationResult(false, errors);
    }

    // 验证具体字段
    if (!profile.role || profile.role === 'other') {
      errors.push('Valid user role is required');
    }

    if (!profile.industry || profile.industry === '') {
      errors.push('Industry is required');
    }

    if (
      !experience.overallSatisfaction ||
      experience.overallSatisfaction === 1
    ) {
      errors.push('Overall satisfaction rating (above 1) is required');
    }

    if (
      !business.currentScreeningMethod ||
      business.currentScreeningMethod === 'manual'
    ) {
      errors.push('Current screening method other than manual is required');
    }

    if (business.willingnessToPayMonthly === 0) {
      errors.push('Willingness to pay must be greater than 0');
    }

    return new QuestionnaireValidationResult(errors.length === 0, errors);
  }

  /**
   * Calculates quality score.
   * @returns The QualityScore.
   */
  public calculateQualityScore(): QualityScore {
    return this.quality.calculateScore();
  }

  /**
   * Performs the is eligible for bonus operation.
   * @returns The boolean value.
   */
  public isEligibleForBonus(): boolean {
    return this.quality.isBonusEligible();
  }

  /**
   * Retrieves submission summary.
   * @returns The SubmissionSummary.
   */
  public getSubmissionSummary(): SubmissionSummary {
    return this.submission.getSummary();
  }

  // 状态转换
  /**
   * Performs the mark as processed operation.
   */
  public markAsProcessed(): void {
    this.status = QuestionnaireStatus.PROCESSED;
  }

  /**
   * Performs the mark as rewarded operation.
   */
  public markAsRewarded(): void {
    this.status = QuestionnaireStatus.REWARDED;
  }

  /**
   * Performs the flag as low quality operation.
   */
  public flagAsLowQuality(): void {
    this.status = QuestionnaireStatus.LOW_QUALITY;
  }

  // 查询方法
  /**
   * Retrieves answer by question id.
   * @param questionId - The question id.
   * @returns The Answer | null.
   */
  public getAnswerByQuestionId(questionId: string): Answer | null {
    return this.submission.getAnswer(questionId);
  }

  /**
   * Retrieves quality metrics.
   * @returns The QualityMetrics.
   */
  public getQualityMetrics(): QualityMetrics {
    return this.quality.getMetrics();
  }

  /**
   * Retrieves total text length.
   * @returns The number value.
   */
  public getTotalTextLength(): number {
    return this.quality.getTotalTextLength();
  }

  /**
   * Performs the has detailed feedback operation.
   * @returns The boolean value.
   */
  public hasDetailedFeedback(): boolean {
    return this.quality.hasDetailedFeedback();
  }

  // 领域事件管理
  /**
   * Retrieves uncommitted events.
   * @returns The an array of DomainEvent.
   */
  public getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  /**
   * Performs the mark events as committed operation.
   */
  public markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  private addEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
  }

  // Getters
  /**
   * Retrieves id.
   * @returns The QuestionnaireId.
   */
  public getId(): QuestionnaireId {
    return this.id;
  }

  /**
   * Retrieves submitter ip.
   * @returns The string value.
   */
  public getSubmitterIP(): string {
    return this.metadata.ip;
  }

  /**
   * Retrieves status.
   * @returns The QuestionnaireStatus.
   */
  public getStatus(): QuestionnaireStatus {
    return this.status;
  }
}

// 值对象
/**
 * Represents the questionnaire id.
 */
export class QuestionnaireId extends ValueObject<{ value: string }> {
  /**
   * Generates the result.
   * @returns The QuestionnaireId.
   */
  public static generate(): QuestionnaireId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return new QuestionnaireId({ value: `quest_${timestamp}_${random}` });
  }

  /**
   * Retrieves value.
   * @returns The string value.
   */
  public getValue(): string {
    return this.props.value;
  }
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

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The QuestionnaireTemplate.
   */
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
  /**
   * Performs the from raw data operation.
   * @param data - The data.
   * @returns The QuestionnaireSubmission.
   */
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

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The QuestionnaireSubmission.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static restore(data: any): QuestionnaireSubmission {
    return new QuestionnaireSubmission({
      ...data,
      submittedAt: new Date(data.submittedAt),
    });
  }

  /**
   * Retrieves user profile.
   * @returns The UserProfile.
   */
  public getUserProfile(): UserProfile {
    return this.props.userProfile;
  }

  /**
   * Retrieves user experience.
   * @returns The UserExperience.
   */
  public getUserExperience(): UserExperience {
    return this.props.userExperience;
  }

  /**
   * Retrieves business value.
   * @returns The BusinessValue.
   */
  public getBusinessValue(): BusinessValue {
    return this.props.businessValue;
  }

  /**
   * Retrieves optional info.
   * @returns The OptionalInfo.
   */
  public getOptionalInfo(): OptionalInfo {
    return this.props.optional;
  }

  /**
   * Retrieves summary.
   * @returns The SubmissionSummary.
   */
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

  /**
   * Retrieves answer.
   * @param questionId - The question id.
   * @returns The Answer | null.
   */
  public getAnswer(questionId: string): Answer | null {
    // 简化实现，实际应该有更复杂的映射
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
    const requiredFields = 5; // role, industry, satisfaction, screening method, willingness to pay
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
  /**
   * Calculates the result.
   * @param submission - The submission.
   * @returns The SubmissionQuality.
   */
  public static calculate(submission: QuestionnaireSubmission): SubmissionQuality {
    const totalTextLength = submission.getSummary().textLength;
    const completionRate = submission.getSummary().completionRate;
    const detailedAnswers = SubmissionQuality.countDetailedAnswers(submission);

    let qualityScore = 0;
    const qualityReasons: string[] = [];

    // 完成度评分 (40分)
    const completionScore = completionRate * 40;
    qualityScore += completionScore;
    if (completionRate >= 0.8) {
      qualityReasons.push('High completion rate');
    }

    // 文本质量评分 (30分)
    const textQualityScore = Math.min(30, totalTextLength / 10); // 每10字符1分，最多30分
    qualityScore += textQualityScore;
    if (totalTextLength >= 50) {
      qualityReasons.push('Detailed text responses');
    }

    // 商业价值评分 (30分)
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

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The SubmissionQuality.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static restore(data: any): SubmissionQuality {
    return new SubmissionQuality(data);
  }

  private static countDetailedAnswers(
    submission: QuestionnaireSubmission,
  ): number {
    const userExp = submission.getUserExperience();
    const optional = submission.getOptionalInfo();
    let count = 0;

    if ((userExp.mainPainPoint || '').length > 20) count++;
    if ((userExp.improvementSuggestion || '').length > 20) count++;
    if ((optional.additionalFeedback || '').length > 30) count++;

    return count;
  }

  private static calculateBusinessValueScore(
    submission: QuestionnaireSubmission,
  ): number {
    const businessValue = submission.getBusinessValue();
    let score = 0;

    // 愿意付费金额评分
    if (businessValue.willingnessToPayMonthly > 0) {
      score += Math.min(15, businessValue.willingnessToPayMonthly / 10); // 每10元1分，最多15分
    }

    // 推荐可能性评分
    if (businessValue.recommendLikelihood >= 4) {
      score += 10;
    } else if (businessValue.recommendLikelihood >= 3) {
      score += 5;
    }

    // 时间节省评分
    if (businessValue.timeSavingPercentage >= 50) {
      score += 5;
    }

    return score;
  }

  /**
   * Calculates score.
   * @returns The QualityScore.
   */
  public calculateScore(): QualityScore {
    return new QualityScore({ value: this.props.qualityScore });
  }

  /**
   * Performs the is bonus eligible operation.
   * @returns The boolean value.
   */
  public isBonusEligible(): boolean {
    return this.props.bonusEligible;
  }

  /**
   * Retrieves quality score.
   * @returns The number value.
   */
  public getQualityScore(): number {
    return this.props.qualityScore;
  }

  /**
   * Retrieves quality reasons.
   * @returns The an array of string value.
   */
  public getQualityReasons(): string[] {
    return this.props.qualityReasons;
  }

  /**
   * Retrieves metrics.
   * @returns The QualityMetrics.
   */
  public getMetrics(): QualityMetrics {
    return new QualityMetrics(this.props);
  }

  /**
   * Retrieves total text length.
   * @returns The number value.
   */
  public getTotalTextLength(): number {
    return this.props.totalTextLength;
  }

  /**
   * Performs the has detailed feedback operation.
   * @returns The boolean value.
   */
  public hasDetailedFeedback(): boolean {
    return this.props.detailedAnswers >= 3;
  }
}

// 辅助值对象
/**
 * Represents the user profile.
 */
export class UserProfile extends ValueObject<{
  role: QuestionnaireUserRole;
  industry: string;
  companySize: CompanySize;
  location: string;
}> {
  /**
   * Performs the role operation.
   * @returns The QuestionnaireUserRole.
   */
  public get role(): QuestionnaireUserRole {
    return this.props.role;
  }
  /**
   * Performs the industry operation.
   * @returns The string value.
   */
  public get industry(): string {
    return this.props.industry;
  }
  /**
   * Performs the company size operation.
   * @returns The CompanySize.
   */
  public get companySize(): CompanySize {
    return this.props.companySize;
  }
  /**
   * Performs the location operation.
   * @returns The string value.
   */
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
  /**
   * Performs the overall satisfaction operation.
   * @returns The Rating.
   */
  public get overallSatisfaction(): Rating {
    return this.props.overallSatisfaction;
  }
  /**
   * Performs the accuracy rating operation.
   * @returns The Rating.
   */
  public get accuracyRating(): Rating {
    return this.props.accuracyRating;
  }
  /**
   * Performs the speed rating operation.
   * @returns The Rating.
   */
  public get speedRating(): Rating {
    return this.props.speedRating;
  }
  /**
   * Performs the ui rating operation.
   * @returns The Rating.
   */
  public get uiRating(): Rating {
    return this.props.uiRating;
  }
  /**
   * Performs the most useful feature operation.
   * @returns The string value.
   */
  public get mostUsefulFeature(): string {
    return this.props.mostUsefulFeature;
  }
  /**
   * Performs the main pain point operation.
   * @returns The string | undefined.
   */
  public get mainPainPoint(): string | undefined {
    return this.props.mainPainPoint;
  }
  /**
   * Performs the improvement suggestion operation.
   * @returns The string | undefined.
   */
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
  /**
   * Performs the current screening method operation.
   * @returns The ScreeningMethod.
   */
  public get currentScreeningMethod(): ScreeningMethod {
    return this.props.currentScreeningMethod;
  }
  /**
   * Performs the time spent per resume operation.
   * @returns The number value.
   */
  public get timeSpentPerResume(): number {
    return this.props.timeSpentPerResume;
  }
  /**
   * Performs the resumes per week operation.
   * @returns The number value.
   */
  public get resumesPerWeek(): number {
    return this.props.resumesPerWeek;
  }
  /**
   * Performs the time saving percentage operation.
   * @returns The number value.
   */
  public get timeSavingPercentage(): number {
    return this.props.timeSavingPercentage;
  }
  /**
   * Performs the willingness to pay monthly operation.
   * @returns The number value.
   */
  public get willingnessToPayMonthly(): number {
    return this.props.willingnessToPayMonthly;
  }
  /**
   * Performs the recommend likelihood operation.
   * @returns The Rating.
   */
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
  /**
   * Performs the additional feedback operation.
   * @returns The string | undefined.
   */
  public get additionalFeedback(): string | undefined {
    return this.props.additionalFeedback;
  }
  /**
   * Performs the contact preference operation.
   * @returns The string | undefined.
   */
  public get contactPreference(): string | undefined {
    return this.props.contactPreference;
  }
}

/**
 * Represents the submission metadata.
 */
export class SubmissionMetadata extends ValueObject<{
  ip: string;
  userAgent: string;
  timestamp: Date;
}> {
  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The SubmissionMetadata.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static restore(data: any): SubmissionMetadata {
    return new SubmissionMetadata({
      ...data,
      timestamp: new Date(data.timestamp),
    });
  }

  /**
   * Performs the ip operation.
   * @returns The string value.
   */
  public get ip(): string {
    return this.props.ip;
  }
}

/**
 * Represents the quality score.
 */
export class QualityScore extends ValueObject<{ value: number }> {
  /**
   * Performs the value operation.
   * @returns The number value.
   */
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
  /**
   * Performs the role operation.
   * @returns The string value.
   */
  public get role(): string {
    return this.props.role;
  }
  /**
   * Performs the industry operation.
   * @returns The string value.
   */
  public get industry(): string {
    return this.props.industry;
  }
  /**
   * Performs the overall satisfaction operation.
   * @returns The number value.
   */
  public get overallSatisfaction(): number {
    return this.props.overallSatisfaction;
  }
  /**
   * Performs the willingness to pay monthly operation.
   * @returns The number value.
   */
  public get willingnessToPayMonthly(): number {
    return this.props.willingnessToPayMonthly;
  }
  /**
   * Performs the text length operation.
   * @returns The number value.
   */
  public get textLength(): number {
    return this.props.textLength;
  }
  /**
   * Performs the completion rate operation.
   * @returns The number value.
   */
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
  /**
   * Performs the total text length operation.
   * @returns The number value.
   */
  public get totalTextLength(): number {
    return this.props.totalTextLength;
  }
  /**
   * Performs the detailed answers operation.
   * @returns The number value.
   */
  public get detailedAnswers(): number {
    return this.props.detailedAnswers;
  }
  /**
   * Performs the completion rate operation.
   * @returns The number value.
   */
  public get completionRate(): number {
    return this.props.completionRate;
  }
  /**
   * Performs the quality score operation.
   * @returns The number value.
   */
  public get qualityScore(): number {
    return this.props.qualityScore;
  }
  /**
   * Performs the bonus eligible operation.
   * @returns The boolean value.
   */
  public get bonusEligible(): boolean {
    return this.props.bonusEligible;
  }
  /**
   * Performs the quality reasons operation.
   * @returns The an array of string value.
   */
  public get qualityReasons(): string[] {
    return this.props.qualityReasons;
  }
}

/**
 * Represents the questionnaire validation result.
 */
export class QuestionnaireValidationResult {
  /**
   * Initializes a new instance of the Questionnaire Validation Result.
   * @param isValid - The is valid.
   * @param errors - The errors.
   */
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[],
  ) {}
}

// ========================
// Enum Types
// ========================

export enum QuestionnaireStatus {
  SUBMITTED = 'submitted',
  PROCESSED = 'processed',
  REWARDED = 'rewarded',
  LOW_QUALITY = 'low_quality',
}
