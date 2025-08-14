"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionnaireRules = void 0;
const questionnaire_dto_1 = require("./questionnaire.dto");
class QuestionnaireRules {
    // 业务规则方法
    static isHighQualitySubmission(submission) {
        const summary = submission.getSummary();
        const textLength = summary.textLength;
        const detailedAnswers = this.countDetailedAnswers(submission);
        const completionRate = summary.completionRate;
        return textLength >= this.MIN_TEXT_LENGTH_FOR_BONUS &&
            detailedAnswers >= this.MIN_DETAILED_ANSWERS &&
            completionRate >= this.MIN_COMPLETION_RATE;
    }
    static calculateQualityScore(submission) {
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
    static isValidSubmission(submission) {
        const errors = [];
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
            errors.push('Required field missing: businessValue.currentScreeningMethod');
        }
        if (!businessValue || businessValue.willingnessToPayMonthly === undefined) {
            errors.push('Required field missing: businessValue.willingnessToPayMonthly');
        }
        // 检查数值范围
        if (experience && !this.isValidRating(experience.overallSatisfaction)) {
            errors.push('Overall satisfaction must be 1-5');
        }
        if (businessValue &&
            (businessValue.timeSavingPercentage < 0 ||
                businessValue.timeSavingPercentage > 100)) {
            errors.push('Time saving percentage must be 0-100');
        }
        if (businessValue && businessValue.willingnessToPayMonthly < 0) {
            errors.push('Willingness to pay must be non-negative');
        }
        return new questionnaire_dto_1.QuestionnaireValidationResult(errors.length === 0, errors);
    }
    static isValidRating(rating) {
        return rating >= 1 && rating <= 5;
    }
    static isEligibleForBonus(qualityScore, textLength, detailedAnswers) {
        return qualityScore >= this.QUALITY_SCORE_THRESHOLD &&
            textLength >= this.MIN_TEXT_LENGTH_FOR_BONUS &&
            detailedAnswers >= this.MIN_DETAILED_ANSWERS;
    }
    static countDetailedAnswers(submission) {
        const experience = submission.getUserExperience();
        let count = 0;
        if ((experience.mainPainPoint || '').length > 20)
            count++;
        if ((experience.improvementSuggestion || '').length > 20)
            count++;
        // 获取optional信息需要通过submission属性
        const optional = submission.getOptionalInfo();
        if (optional && (optional.additionalFeedback || '').length > 30) {
            count++;
        }
        return count;
    }
    static calculateTextQualityScore(submission) {
        const summary = submission.getSummary();
        return Math.min(30, summary.textLength / 10); // 每10字符1分，最多30分
    }
    static calculateBusinessValueScore(submission) {
        const businessValue = submission.getBusinessValue();
        let score = 0;
        // 愿意付费金额评分
        if (businessValue.willingnessToPayMonthly > 0) {
            score += Math.min(15, businessValue.willingnessToPayMonthly / 10);
        }
        // 推荐可能性评分
        if (businessValue.recommendLikelihood >= 4) {
            score += 10;
        }
        else if (businessValue.recommendLikelihood >= 3) {
            score += 5;
        }
        // 时间节省评分
        if (businessValue.timeSavingPercentage >= 50) {
            score += 5;
        }
        return score;
    }
    static hasValue(obj, path) {
        const keys = path.split('.');
        let current = obj;
        for (const key of keys) {
            if (!current || typeof current !== 'object' || !(key in current)) {
                return false;
            }
            current = current[key];
        }
        return current !== undefined && current !== null && current !== '';
    }
}
exports.QuestionnaireRules = QuestionnaireRules;
// 质量评估规则
QuestionnaireRules.MIN_TEXT_LENGTH_FOR_BONUS = 50;
QuestionnaireRules.MIN_COMPLETION_RATE = 0.8;
QuestionnaireRules.MIN_DETAILED_ANSWERS = 3;
QuestionnaireRules.QUALITY_SCORE_THRESHOLD = 70;
// 验证规则
QuestionnaireRules.REQUIRED_FIELDS = [
    'userProfile.role',
    'userProfile.industry',
    'userExperience.overallSatisfaction',
    'businessValue.currentScreeningMethod',
    'businessValue.willingnessToPayMonthly'
];
