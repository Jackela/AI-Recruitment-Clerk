import { ValueObject } from './base/value-object.js';

export class QualityMetrics extends ValueObject<{
  totalTextLength: number;
  detailedAnswers: number;
  completionRate: number;
  qualityScore: number;
  bonusEligible: boolean;
  qualityReasons: string[];
}> {
  get totalTextLength(): number { return this.props.totalTextLength; }
  get detailedAnswers(): number { return this.props.detailedAnswers; }
  get completionRate(): number { return this.props.completionRate; }
  get qualityScore(): number { return this.props.qualityScore; }
  get bonusEligible(): boolean { return this.props.bonusEligible; }
  get qualityReasons(): string[] { return this.props.qualityReasons; }
}
