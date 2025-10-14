import { DomainEvent } from './base/domain-event.js';
import { SubmissionSummary } from '../value-objects/submission-summary.value-object.js';

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
