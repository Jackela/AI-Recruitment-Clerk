import { DomainEvent } from './base/domain-event.js';
import { RawSubmissionData } from '../../application/dtos/questionnaire.dto.js';

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
    public readonly occurredAt: Date
  ) {}
}
