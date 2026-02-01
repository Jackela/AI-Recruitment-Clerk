import { ValueObject } from './base/value-object.js';

/**
 * Represents the quality metrics.
 */
export class QualityMetrics extends ValueObject<{
  totalTextLength: number;
  detailedAnswers: number;
  completionRate: number;
  qualityScore: number;
  bonusEligible: boolean;
  qualityReasons: string[];
}> {
  /**
   * Performs the total text length operation.
   * @returns The number value.
   */
  public get totalTextLength(): number {
    return this.props.totalTextLength;
  }
  /**
   * Performs the detailed answers operation.
   * @returns The number value.
   */
  public get detailedAnswers(): number {
    return this.props.detailedAnswers;
  }
  /**
   * Performs the completion rate operation.
   * @returns The number value.
   */
  public get completionRate(): number {
    return this.props.completionRate;
  }
  /**
   * Performs the quality score operation.
   * @returns The number value.
   */
  public get qualityScore(): number {
    return this.props.qualityScore;
  }
  /**
   * Performs the bonus eligible operation.
   * @returns The boolean value.
   */
  public get bonusEligible(): boolean {
    return this.props.bonusEligible;
  }
  /**
   * Performs the quality reasons operation.
   * @returns The an array of string value.
   */
  public get qualityReasons(): string[] {
    return this.props.qualityReasons;
  }
}
