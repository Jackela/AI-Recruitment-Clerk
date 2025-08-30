import { DomainEvent } from './base/domain-event.js';
import { RawSubmissionData } from '../../application/dtos/questionnaire.dto.js';

export class QuestionnaireValidationFailedEvent implements DomainEvent {
  constructor(
    public readonly submitterIP: string,
    public readonly validationErrors: string[],
    public readonly submissionData: Partial<RawSubmissionData>,
    public readonly occurredAt: Date
  ) {}
}
