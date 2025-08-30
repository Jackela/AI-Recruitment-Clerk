import { ValueObject } from './base/value-object.js';

export class SubmissionSummary extends ValueObject<{
  role: string;
  industry: string;
  overallSatisfaction: number;
  willingnessToPayMonthly: number;
  textLength: number;
  completionRate: number;
}> {
  get role(): string { return this.props.role; }
  get industry(): string { return this.props.industry; }
  get overallSatisfaction(): number { return this.props.overallSatisfaction; }
  get willingnessToPayMonthly(): number { return this.props.willingnessToPayMonthly; }
  get textLength(): number { return this.props.textLength; }
  get completionRate(): number { return this.props.completionRate; }
}
