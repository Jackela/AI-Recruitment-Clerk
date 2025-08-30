import { DomainEvent } from './base/domain-event.js';
import { SubmissionSummary } from '../value-objects/submission-summary.value-object.js';

export class QuestionnaireSubmittedEvent implements DomainEvent {
  constructor(
    public readonly questionnaireId: string,
    public readonly submitterIP: string,
    public readonly qualityScore: number,
    public readonly bonusEligible: boolean,
    public readonly submissionData: SubmissionSummary,
    public readonly occurredAt: Date
  ) {}
}
