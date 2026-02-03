import type { DomainEvent } from '../domain-events/base/domain-event.js';
import { QuestionnaireId } from '../value-objects/questionnaire-id.value-object.js';
import { QuestionnaireTemplate } from '../value-objects/questionnaire-template.value-object.js';
import { QuestionnaireSubmission } from '../value-objects/questionnaire-submission.value-object.js';
import { SubmissionQuality } from '../value-objects/submission-quality.value-object.js';
import { SubmissionMetadata } from '../value-objects/submission-metadata.value-object.js';
import { QuestionnaireValidationResult } from '../value-objects/questionnaire-validation-result.value-object.js';
import type { QualityScore } from '../value-objects/quality-score.value-object.js';
import type { SubmissionSummary } from '../value-objects/submission-summary.value-object.js';
import type { Answer } from '../value-objects/answer.value-object.js';
import type { QualityMetrics } from '../value-objects/quality-metrics.value-object.js';
import { QuestionnaireSubmittedEvent } from '../domain-events/questionnaire-submitted.event.js';
import { HighQualitySubmissionEvent } from '../domain-events/high-quality-submission.event.js';
import type {
  RawSubmissionData} from '../../application/dtos/questionnaire.dto.js';
import {
  QuestionnaireStatus,
} from '../../application/dtos/questionnaire.dto.js';

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
  ) {
    void this._template;
  }

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
