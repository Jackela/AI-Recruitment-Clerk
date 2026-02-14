import { ValueObject } from '../base/value-object';
import type { DomainEvent } from '../base/domain-event';
import {
  QuestionnaireSubmittedEvent,
  HighQualitySubmissionEvent,
} from './questionnaire-events.dto';
import {
  QuestionnaireValidationResult,
  isValidRating,
} from './questionnaire-validation.dto';
import type {
  QualityScore,
  SubmissionSummary,
  Answer,
  QualityMetrics} from './questionnaire-value-objects.dto';
import {
  SubmissionMetadata
} from './questionnaire-value-objects.dto';
import {
  QuestionnaireTemplate,
  QuestionnaireSubmission,
  SubmissionQuality,
} from './questionnaire-submission.dto';
import type {
  RawSubmissionData,
  QuestionnaireData,
} from './questionnaire-types.dto';

// Re-export types for backward compatibility
export type {
  RawSubmissionData,
  QuestionnaireData,
} from './questionnaire-types.dto';

// Re-export question types
export type {
  QuestionSection,
  QualityThreshold,
} from './questionnaire-questions.dto';

// Re-export events
export type {
  QuestionnaireSubmittedEvent,
  HighQualitySubmissionEvent,
} from './questionnaire-events.dto';

// Re-export controller DTOs
export type {
  CreateQuestionnaireDto,
  UpdateQuestionnaireDto,
} from './questionnaire-interfaces.dto';

// Re-export response DTOs
export type {
  QuestionnaireResponseDto,
  QuestionnaireAnalyticsDto,
} from './questionnaire-responses.dto';

// Re-export validation types
export {
  QuestionnaireValidationResult,
  QuestionnaireValidationConstants,
  isValidRating,
  isValidPercentage,
  isNonNegative,
  meetsMinLength,
  isValidSelection,
  createValidationError,
} from './questionnaire-validation.dto';
export type {
  ValidationRule,
  FieldValidationConfig,
} from './questionnaire-validation.dto';

// Re-export value objects
export {
  UserProfile,
  UserExperience,
  BusinessValue,
  FeatureNeeds,
  OptionalInfo,
  SubmissionMetadata,
  QualityScore,
  SubmissionSummary,
  Answer,
  QualityMetrics,
} from './questionnaire-value-objects.dto';

// Re-export submission-related classes
export {
  QuestionnaireTemplate,
  QuestionnaireSubmission,
  SubmissionQuality,
} from './questionnaire-submission.dto';

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

    // Use imported validation function
    if (!isValidRating(experience.overallSatisfaction) || experience.overallSatisfaction === 1) {
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
  public static generate(): QuestionnaireId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return new QuestionnaireId({ value: `quest_${timestamp}_${random}` });
  }

  public getValue(): string {
    return this.props.value;
  }
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
