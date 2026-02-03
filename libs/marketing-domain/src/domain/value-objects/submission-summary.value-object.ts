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
  public get role(): string {
    return this.props.role;
  }
  /**
   * Performs the industry operation.
   * @returns The string value.
   */
  public get industry(): string {
    return this.props.industry;
  }
  /**
   * Performs the overall satisfaction operation.
   * @returns The number value.
   */
  public get overallSatisfaction(): number {
    return this.props.overallSatisfaction;
  }
  /**
   * Performs the willingness to pay monthly operation.
   * @returns The number value.
   */
  public get willingnessToPayMonthly(): number {
    return this.props.willingnessToPayMonthly;
  }
  /**
   * Performs the text length operation.
   * @returns The number value.
   */
  public get textLength(): number {
    return this.props.textLength;
  }
  /**
   * Performs the completion rate operation.
   * @returns The number value.
   */
  public get completionRate(): number {
    return this.props.completionRate;
  }
}
