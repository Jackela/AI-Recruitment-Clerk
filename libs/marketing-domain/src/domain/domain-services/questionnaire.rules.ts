import { QuestionnaireSubmission } from '../value-objects/questionnaire-submission.value-object.js';
import { QuestionnaireValidationResult } from '../value-objects/questionnaire-validation-result.value-object.js';

/**
 * Represents the questionnaire rules.
 */
export class QuestionnaireRules {
  // 质量评估规则
  static readonly MIN_TEXT_LENGTH_FOR_BONUS = 50;
  static readonly MIN_COMPLETION_RATE = 0.8;
  static readonly MIN_DETAILED_ANSWERS = 3;
  static readonly QUALITY_SCORE_THRESHOLD = 70;

  // 验证规则
  static readonly REQUIRED_FIELDS = [
    'userProfile.role',
    'userProfile.industry',
    'userExperience.overallSatisfaction',
    'businessValue.currentScreeningMethod',
    'businessValue.willingnessToPayMonthly',
  ];

  // 业务规则方法
  /**
   * Performs the is high quality submission operation.
   * @param submission - The submission.
   * @returns The boolean value.
   */
  static isHighQualitySubmission(submission: QuestionnaireSubmission): boolean {
    const summary = submission.getSummary();
    const textLength = summary.textLength;
    const detailedAnswers = this.countDetailedAnswers(submission);
    const completionRate = summary.completionRate;

    return (
      textLength >= this.MIN_TEXT_LENGTH_FOR_BONUS &&
      detailedAnswers >= this.MIN_DETAILED_ANSWERS &&
      completionRate >= this.MIN_COMPLETION_RATE
    );
  }

  /**
   * Calculates quality score.
   * @param submission - The submission.
   * @returns The number value.
   */
  static calculateQualityScore(submission: QuestionnaireSubmission): number {
    const summary = submission.getSummary();
    let score = 0;

    // 完成度评分 (40分)
    score += summary.completionRate * 40;

    // 文本质量评分 (30分)
    score += this.calculateTextQualityScore(submission);

    // 数据价值评分 (30分)
    score += this.calculateBusinessValueScore(submission);

    return Math.min(100, Math.round(score));
  }

  /**
   * Performs the is valid submission operation.
   * @param submission - The submission.
   * @returns The QuestionnaireValidationResult.
   */
  static isValidSubmission(
    submission: QuestionnaireSubmission,
  ): QuestionnaireValidationResult {
    const errors: string[] = [];

    const profile = submission.getUserProfile();
    const experience = submission.getUserExperience();
    const businessValue = submission.getBusinessValue();

    // 检查必填字段
    if (!profile || !profile.role) {
      errors.push('Required field missing: userProfile.role');
    }

    if (!profile || !profile.industry) {
      errors.push('Required field missing: userProfile.industry');
    }

    if (!experience || !experience.overallSatisfaction) {
      errors.push('Required field missing: userExperience.overallSatisfaction');
    }

    if (!businessValue || !businessValue.currentScreeningMethod) {
      errors.push(
        'Required field missing: businessValue.currentScreeningMethod',
      );
    }

    if (!businessValue || businessValue.willingnessToPayMonthly === undefined) {
      errors.push(
        'Required field missing: businessValue.willingnessToPayMonthly',
      );
    }

    // 检查数值范围
    if (experience && !this.isValidRating(experience.overallSatisfaction)) {
      errors.push('Overall satisfaction must be 1-5');
    }

    if (
      businessValue &&
      (businessValue.timeSavingPercentage < 0 ||
        businessValue.timeSavingPercentage > 100)
    ) {
      errors.push('Time saving percentage must be 0-100');
    }

    if (businessValue && businessValue.willingnessToPayMonthly < 0) {
      errors.push('Willingness to pay must be non-negative');
    }

    return new QuestionnaireValidationResult(errors.length === 0, errors);
  }

  /**
   * Performs the is valid rating operation.
   * @param rating - The rating.
   * @returns The boolean value.
   */
  static isValidRating(rating: number): boolean {
    return rating >= 1 && rating <= 5;
  }

  /**
   * Performs the is eligible for bonus operation.
   * @param qualityScore - The quality score.
   * @param textLength - The text length.
   * @param detailedAnswers - The detailed answers.
   * @returns The boolean value.
   */
  static isEligibleForBonus(
    qualityScore: number,
    textLength: number,
    detailedAnswers: number,
  ): boolean {
    return (
      qualityScore >= this.QUALITY_SCORE_THRESHOLD &&
      textLength >= this.MIN_TEXT_LENGTH_FOR_BONUS &&
      detailedAnswers >= this.MIN_DETAILED_ANSWERS
    );
  }

  private static countDetailedAnswers(
    submission: QuestionnaireSubmission,
  ): number {
    const experience = submission.getUserExperience();
    let count = 0;

    if ((experience.mainPainPoint || '').length > 20) count++;
    if ((experience.improvementSuggestion || '').length > 20) count++;

    // 获取optional信息需要通过submission属性
    const optional = submission.getOptionalInfo();
    if (optional && (optional.additionalFeedback || '').length > 30) {
      count++;
    }

    return count;
  }

  private static calculateTextQualityScore(
    submission: QuestionnaireSubmission,
  ): number {
    const summary = submission.getSummary();
    return Math.min(30, summary.textLength / 10); // 每10字符1分，最多30分
  }

  private static calculateBusinessValueScore(
    submission: QuestionnaireSubmission,
  ): number {
    const businessValue = submission.getBusinessValue();
    let score = 0;

    // 愿意付费金额评分
    if (businessValue.willingnessToPayMonthly > 0) {
      score += Math.min(15, businessValue.willingnessToPayMonthly / 10);
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
}
