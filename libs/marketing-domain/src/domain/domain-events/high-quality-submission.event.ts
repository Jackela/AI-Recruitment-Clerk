import { DomainEvent } from './base/domain-event.js';

export class HighQualitySubmissionEvent implements DomainEvent {
  constructor(
    public readonly questionnaireId: string,
    public readonly submitterIP: string,
    public readonly qualityScore: number,
    public readonly qualityReasons: string[],
    public readonly occurredAt: Date
  ) {}
}
