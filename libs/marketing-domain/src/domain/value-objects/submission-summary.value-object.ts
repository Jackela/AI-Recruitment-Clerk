import { ValueObject } from './base/value-object.js';

/**
 * Represents the submission summary.
 */
export class SubmissionSummary extends ValueObject<{
  role: string;
  industry: string;
  overallSatisfaction: number;
  willingnessToPayMonthly: number;
  textLength: number;
  completionRate: number;
}> {
  /**
   * Performs the role operation.
   * @returns The string value.
   */
  get role(): string { return this.props.role; }
  /**
   * Performs the industry operation.
   * @returns The string value.
   */
  get industry(): string { return this.props.industry; }
  /**
   * Performs the overall satisfaction operation.
   * @returns The number value.
   */
  get overallSatisfaction(): number { return this.props.overallSatisfaction; }
  /**
   * Performs the willingness to pay monthly operation.
   * @returns The number value.
   */
  get willingnessToPayMonthly(): number { return this.props.willingnessToPayMonthly; }
  /**
   * Performs the text length operation.
   * @returns The number value.
   */
  get textLength(): number { return this.props.textLength; }
  /**
   * Performs the completion rate operation.
   * @returns The number value.
   */
  get completionRate(): number { return this.props.completionRate; }
}
