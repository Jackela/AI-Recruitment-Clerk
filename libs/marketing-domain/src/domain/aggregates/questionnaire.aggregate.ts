import { ValueObject } from '../value-objects/base/value-object.js';
import { DomainEvent } from '../domain-events/base/domain-event.js';
import { QuestionnaireId } from '../value-objects/questionnaire-id.value-object.js';
import { QuestionnaireTemplate } from '../value-objects/questionnaire-template.value-object.js';
import { QuestionnaireSubmission } from '../value-objects/questionnaire-submission.value-object.js';
import { SubmissionQuality } from '../value-objects/submission-quality.value-object.js';
import { SubmissionMetadata } from '../value-objects/submission-metadata.value-object.js';
import { QuestionnaireValidationResult } from '../value-objects/questionnaire-validation-result.value-object.js';
import { QualityScore } from '../value-objects/quality-score.value-object.js';
import { SubmissionSummary } from '../value-objects/submission-summary.value-object.js';
import { Answer } from '../value-objects/answer.value-object.js';
import { QualityMetrics } from '../value-objects/quality-metrics.value-object.js';
import { QuestionnaireSubmittedEvent } from '../domain-events/questionnaire-submitted.event.js';
import { HighQualitySubmissionEvent } from '../domain-events/high-quality-submission.event.js';
import { RawSubmissionData, QuestionnaireStatus } from '../../application/dtos/questionnaire.dto.js';

// 问卷聚合根
export class Questionnaire {
  private uncommittedEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: QuestionnaireId,
    private readonly template: QuestionnaireTemplate,
    private readonly submission: QuestionnaireSubmission,
    private readonly quality: SubmissionQuality,
    private readonly metadata: SubmissionMetadata,
    private status: QuestionnaireStatus
  ) {}

  // 工厂方法
  static create(
    templateId: string,
    submission: RawSubmissionData,
    metadata: SubmissionMetadata
  ): Questionnaire {
    const id = QuestionnaireId.generate();
    const template = QuestionnaireTemplate.createDefault(templateId);
    const questionnaireSubmission = QuestionnaireSubmission.fromRawData(submission);
    const quality = SubmissionQuality.calculate(questionnaireSubmission);
    
    const questionnaire = new Questionnaire(
      id,
      template,
      questionnaireSubmission,
      quality,
      metadata,
      QuestionnaireStatus.SUBMITTED
    );
    
    questionnaire.addEvent(new QuestionnaireSubmittedEvent(
      id.getValue(),
      metadata.ip,
      quality.getQualityScore(),
      quality.isBonusEligible(),
      questionnaireSubmission.getSummary(),
      new Date()
    ));
    
    if (quality.isBonusEligible()) {
      questionnaire.addEvent(new HighQualitySubmissionEvent(
        id.getValue(),
        metadata.ip,
        quality.getQualityScore(),
        quality.getQualityReasons(),
        new Date()
      ));
    }
    
    return questionnaire;
  }
  
  static restore(data: QuestionnaireData): Questionnaire {
    return new Questionnaire(
      new QuestionnaireId({ value: data.id }),
      QuestionnaireTemplate.restore(data.template),
      QuestionnaireSubmission.restore(data.submission),
      SubmissionQuality.restore(data.quality),
      SubmissionMetadata.restore(data.metadata),
      data.status
    );
  }

  // 核心业务方法
  validateSubmission(): QuestionnaireValidationResult {
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
    
    if (!experience.overallSatisfaction || experience.overallSatisfaction === 1) {
      errors.push('Overall satisfaction rating (above 1) is required');
    }
    
    if (!business.currentScreeningMethod || business.currentScreeningMethod === 'manual') {
      errors.push('Current screening method other than manual is required');
    }
    
    if (business.willingnessToPayMonthly === 0) {
      errors.push('Willingness to pay must be greater than 0');
    }
    
    return new QuestionnaireValidationResult(errors.length === 0, errors);
  }
  
  calculateQualityScore(): QualityScore {
    return this.quality.calculateScore();
  }
  
  isEligibleForBonus(): boolean {
    return this.quality.isBonusEligible();
  }
  
  getSubmissionSummary(): SubmissionSummary {
    return this.submission.getSummary();
  }
  
  // 状态转换
  markAsProcessed(): void {
    this.status = QuestionnaireStatus.PROCESSED;
  }
  
  markAsRewarded(): void {
    this.status = QuestionnaireStatus.REWARDED;
  }
  
  flagAsLowQuality(): void {
    this.status = QuestionnaireStatus.LOW_QUALITY;
  }
  
  // 查询方法
  getAnswerByQuestionId(questionId: string): Answer | null {
    return this.submission.getAnswer(questionId);
  }
  
  getQualityMetrics(): QualityMetrics {
    return this.quality.getMetrics();
  }
  
  getTotalTextLength(): number {
    return this.quality.getTotalTextLength();
  }
  
  hasDetailedFeedback(): boolean {
    return this.quality.hasDetailedFeedback();
  }
  
  // 领域事件管理
  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }
  
  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }
  
  private addEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
  }
  
  // Getters
  getId(): QuestionnaireId {
    return this.id;
  }
  
  getSubmitterIP(): string {
    return this.metadata.ip;
  }
  
  getStatus(): QuestionnaireStatus {
    return this.status;
  }
}

export interface QuestionnaireData {
  id: string;
  template: any;
  submission: any;
  quality: any;
  metadata: any;
  status: QuestionnaireStatus;
}
