import { DomainEvent } from './base/domain-event.js';

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
    public readonly occurredAt: Date
  ) {}
}
