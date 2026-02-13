import type { DomainEvent } from '../base/domain-event';
import type { SubmissionSummary, RawSubmissionData } from './questionnaire.dto';

/**
 * Represents the questionnaire submitted event event.
 */
export class QuestionnaireSubmittedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Questionnaire Submitted Event.
   * @param questionnaireId - The questionnaire id.
   * @param submitterIP - The submitter ip.
   * @param qualityScore - The quality score.
   * @param bonusEligible - The bonus eligible.
   * @param submissionData - The submission data.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly questionnaireId: string,
    public readonly submitterIP: string,
    public readonly qualityScore: number,
    public readonly bonusEligible: boolean,
    public readonly submissionData: SubmissionSummary,
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the high quality submission event event.
 */
export class HighQualitySubmissionEvent implements DomainEvent {
  /**
   * Initializes a new instance of the High Quality Submission Event.
   * @param questionnaireId - The questionnaire id.
   * @param submitterIP - The submitter ip.
   * @param qualityScore - The quality score.
   * @param qualityReasons - The quality reasons.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly questionnaireId: string,
    public readonly submitterIP: string,
    public readonly qualityScore: number,
    public readonly qualityReasons: string[],
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the questionnaire validation failed event event.
 */
export class QuestionnaireValidationFailedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Questionnaire Validation Failed Event.
   * @param submitterIP - The submitter ip.
   * @param validationErrors - The validation errors.
   * @param submissionData - The submission data.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly submitterIP: string,
    public readonly validationErrors: string[],
    public readonly submissionData: Partial<RawSubmissionData>,
    public readonly occurredAt: Date,
  ) {}
}
