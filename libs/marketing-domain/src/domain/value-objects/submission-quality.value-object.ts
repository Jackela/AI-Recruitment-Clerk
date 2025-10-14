import { ValueObject } from './base/value-object.js';
import { QuestionnaireSubmission } from './questionnaire-submission.value-object.js';
import { QualityScore } from './quality-score.value-object.js';
import { QualityMetrics } from './quality-metrics.value-object.js';

/**
 * Represents the submission quality.
 */
export class SubmissionQuality extends ValueObject<{
  totalTextLength: number;
  detailedAnswers: number;
  completionRate: number;
  qualityScore: number;
  bonusEligible: boolean;
  qualityReasons: string[];
}> {
  /**
   * Calculates the result.
   * @param submission - The submission.
   * @returns The SubmissionQuality.
   */
  static calculate(submission: QuestionnaireSubmission): SubmissionQuality {
    const totalTextLength = submission.getSummary().textLength;
    const completionRate = submission.getSummary().completionRate;
    const detailedAnswers = SubmissionQuality.countDetailedAnswers(submission);

    let qualityScore = 0;
    const qualityReasons: string[] = [];

    // 完成度评分 (40分)
    const completionScore = completionRate * 40;
    qualityScore += completionScore;
    if (completionRate >= 0.8) {
      qualityReasons.push('High completion rate');
    }

    // 文本质量评分 (30分)
    const textQualityScore = Math.min(30, totalTextLength / 10); // 每10字符1分，最多30分
    qualityScore += textQualityScore;
    if (totalTextLength >= 50) {
      qualityReasons.push('Detailed text responses');
    }

    // 商业价值评分 (30分)
    const businessValueScore =
      SubmissionQuality.calculateBusinessValueScore(submission);
    qualityScore += businessValueScore;
    if (businessValueScore >= 20) {
      qualityReasons.push('High business value responses');
    }

    const finalScore = Math.min(100, Math.round(qualityScore));
    const bonusEligible =
      finalScore >= 70 && totalTextLength >= 50 && detailedAnswers >= 3;

    return new SubmissionQuality({
      totalTextLength,
      detailedAnswers,
      completionRate,
      qualityScore: finalScore,
      bonusEligible,
      qualityReasons,
    });
  }

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The SubmissionQuality.
   */
  static restore(data: any): SubmissionQuality {
    return new SubmissionQuality(data);
  }

  private static countDetailedAnswers(
    submission: QuestionnaireSubmission,
  ): number {
    const userExp = submission.getUserExperience();
    const optional = submission.getOptionalInfo();
    let count = 0;

    if ((userExp.mainPainPoint || '').length > 20) count++;
    if ((userExp.improvementSuggestion || '').length > 20) count++;
    if ((optional.additionalFeedback || '').length > 30) count++;

    return count;
  }

  private static calculateBusinessValueScore(
    submission: QuestionnaireSubmission,
  ): number {
    const businessValue = submission.getBusinessValue();
    let score = 0;

    // 愿意付费金额评分
    if (businessValue.willingnessToPayMonthly > 0) {
      score += Math.min(15, businessValue.willingnessToPayMonthly / 10); // 每10元1分，最多15分
    }

    // 推荐可能性评分
    if (businessValue.recommendLikelihood >= 4) {
      score += 10;
    } else if (businessValue.recommendLikelihood >= 3) {
      score += 5;
    }

    // 时间节省评分
    if (businessValue.timeSavingPercentage >= 50) {
      score += 5;
    }

    return score;
  }

  /**
   * Calculates score.
   * @returns The QualityScore.
   */
  calculateScore(): QualityScore {
    return new QualityScore({ value: this.props.qualityScore });
  }

  /**
   * Performs the is bonus eligible operation.
   * @returns The boolean value.
   */
  isBonusEligible(): boolean {
    return this.props.bonusEligible;
  }

  /**
   * Retrieves quality score.
   * @returns The number value.
   */
  getQualityScore(): number {
    return this.props.qualityScore;
  }

  /**
   * Retrieves quality reasons.
   * @returns The an array of string value.
   */
  getQualityReasons(): string[] {
    return this.props.qualityReasons;
  }

  /**
   * Retrieves metrics.
   * @returns The QualityMetrics.
   */
  getMetrics(): QualityMetrics {
    return new QualityMetrics(this.props);
  }

  /**
   * Retrieves total text length.
   * @returns The number value.
   */
  getTotalTextLength(): number {
    return this.props.totalTextLength;
  }

  /**
   * Performs the has detailed feedback operation.
   * @returns The boolean value.
   */
  hasDetailedFeedback(): boolean {
    return this.props.detailedAnswers >= 3;
  }
}
