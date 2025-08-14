"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSegmentation = exports.IPSubmissionCheckResult = exports.SubmissionTrendsAnalysis = exports.QuestionnaireSubmissionResult = exports.QuestionnaireDomainService = void 0;
const questionnaire_dto_1 = require("./questionnaire.dto");
class QuestionnaireDomainService {
    constructor(repository, templateService, eventBus) {
        this.repository = repository;
        this.templateService = templateService;
        this.eventBus = eventBus;
    }
    async submitQuestionnaire(rawData, metadata) {
        try {
            // 获取当前问卷模板
            const template = await this.templateService.getCurrentTemplate();
            // 创建问卷聚合
            const questionnaire = questionnaire_dto_1.Questionnaire.create(template.id, rawData, metadata);
            // 验证提交数据
            const validationResult = questionnaire.validateSubmission();
            if (!validationResult.isValid) {
                await this.publishValidationFailedEvent(questionnaire, validationResult, rawData, metadata);
                return QuestionnaireSubmissionResult.failed(validationResult.errors);
            }
            // 计算质量分数
            const qualityScore = questionnaire.calculateQualityScore();
            // 检查奖励资格
            const bonusEligible = questionnaire.isEligibleForBonus();
            // 保存问卷
            await this.repository.save(questionnaire);
            // 发布领域事件（事件已在聚合根中创建）
            const events = questionnaire.getUncommittedEvents();
            for (const event of events) {
                await this.eventBus.publish(event);
            }
            questionnaire.markEventsAsCommitted();
            return QuestionnaireSubmissionResult.success({
                questionnaireId: questionnaire.getId().getValue(),
                qualityScore: qualityScore.value,
                bonusEligible,
                summary: questionnaire.getSubmissionSummary()
            });
        }
        catch (error) {
            console.error('Error submitting questionnaire:', error);
            return QuestionnaireSubmissionResult.failed(['Internal error occurred']);
        }
    }
    async analyzeSubmissionTrends() {
        const recentSubmissions = await this.repository.findRecent(30); // 最近30天
        if (recentSubmissions.length === 0) {
            return SubmissionTrendsAnalysis.empty();
        }
        return SubmissionTrendsAnalysis.create({
            totalSubmissions: recentSubmissions.length,
            averageQualityScore: this.calculateAverageQuality(recentSubmissions),
            bonusEligibilityRate: this.calculateBonusEligibilityRate(recentSubmissions),
            topPainPoints: this.extractTopPainPoints(recentSubmissions),
            averageWillingnessToPay: this.calculateAverageWTP(recentSubmissions),
            userSegmentation: this.segmentUsers(recentSubmissions)
        });
    }
    async validateIPSubmissionLimit(ip) {
        const today = new Date();
        const todaySubmissions = await this.repository.findByIPAndDate(ip, today);
        const maxSubmissionsPerDay = 1; // 每IP每天最多1份问卷
        if (todaySubmissions.length >= maxSubmissionsPerDay) {
            return IPSubmissionCheckResult.blocked(`IP ${ip} has already submitted ${todaySubmissions.length} questionnaire(s) today`);
        }
        return IPSubmissionCheckResult.allowed();
    }
    async publishValidationFailedEvent(questionnaire, validationResult, rawData, metadata) {
        const event = new questionnaire_dto_1.QuestionnaireValidationFailedEvent(metadata.ip, validationResult.errors, rawData, new Date());
        await this.eventBus.publish(event);
    }
    calculateAverageQuality(submissions) {
        if (submissions.length === 0)
            return 0;
        const totalQuality = submissions.reduce((sum, q) => {
            return sum + q.calculateQualityScore().value;
        }, 0);
        return Math.round((totalQuality / submissions.length) * 100) / 100;
    }
    calculateBonusEligibilityRate(submissions) {
        if (submissions.length === 0)
            return 0;
        const eligibleCount = submissions.filter(q => q.isEligibleForBonus()).length;
        return Math.round((eligibleCount / submissions.length) * 10000) / 100; // 百分比，保疙2位小数
    }
    extractTopPainPoints(submissions) {
        const painPoints = {};
        submissions.forEach(q => {
            const experience = q.getSubmissionSummary();
            // 简化实现，实际应该从提交数据中提取痛点
            // 这里返回模拟数据
        });
        // 返回模拟的高频痛点
        return ['Manual screening is time-consuming', 'Difficulty finding qualified candidates', 'High interview dropout rate'];
    }
    calculateAverageWTP(submissions) {
        if (submissions.length === 0)
            return 0;
        const totalWTP = submissions.reduce((sum, q) => {
            return sum + q.getSubmissionSummary().willingnessToPayMonthly;
        }, 0);
        return Math.round((totalWTP / submissions.length) * 100) / 100;
    }
    segmentUsers(submissions) {
        const segments = {
            byRole: {},
            byIndustry: {},
            bySatisfaction: { high: 0, medium: 0, low: 0 }
        };
        submissions.forEach(q => {
            const summary = q.getSubmissionSummary();
            // 角色分段
            segments.byRole[summary.role] = (segments.byRole[summary.role] || 0) + 1;
            // 行业分段
            segments.byIndustry[summary.industry] = (segments.byIndustry[summary.industry] || 0) + 1;
            // 满意度分段
            if (summary.overallSatisfaction >= 4) {
                segments.bySatisfaction.high++;
            }
            else if (summary.overallSatisfaction >= 3) {
                segments.bySatisfaction.medium++;
            }
            else {
                segments.bySatisfaction.low++;
            }
        });
        return new UserSegmentation(segments);
    }
}
exports.QuestionnaireDomainService = QuestionnaireDomainService;
// 结果类
class QuestionnaireSubmissionResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new QuestionnaireSubmissionResult(true, data);
    }
    static failed(errors) {
        return new QuestionnaireSubmissionResult(false, undefined, errors);
    }
}
exports.QuestionnaireSubmissionResult = QuestionnaireSubmissionResult;
class SubmissionTrendsAnalysis {
    constructor(totalSubmissions, averageQualityScore, bonusEligibilityRate, topPainPoints, averageWillingnessToPay, userSegmentation) {
        this.totalSubmissions = totalSubmissions;
        this.averageQualityScore = averageQualityScore;
        this.bonusEligibilityRate = bonusEligibilityRate;
        this.topPainPoints = topPainPoints;
        this.averageWillingnessToPay = averageWillingnessToPay;
        this.userSegmentation = userSegmentation;
    }
    static create(data) {
        return new SubmissionTrendsAnalysis(data.totalSubmissions, data.averageQualityScore, data.bonusEligibilityRate, data.topPainPoints, data.averageWillingnessToPay, data.userSegmentation);
    }
    static empty() {
        return new SubmissionTrendsAnalysis(0, 0, 0, [], 0, new UserSegmentation({ byRole: {}, byIndustry: {}, bySatisfaction: { high: 0, medium: 0, low: 0 } }));
    }
}
exports.SubmissionTrendsAnalysis = SubmissionTrendsAnalysis;
class IPSubmissionCheckResult {
    constructor(allowed, blocked, reason) {
        this.allowed = allowed;
        this.blocked = blocked;
        this.reason = reason;
    }
    static allowed() {
        return new IPSubmissionCheckResult(true, false);
    }
    static blocked(reason) {
        return new IPSubmissionCheckResult(false, true, reason);
    }
}
exports.IPSubmissionCheckResult = IPSubmissionCheckResult;
class UserSegmentation {
    constructor(data) {
        this.data = data;
    }
}
exports.UserSegmentation = UserSegmentation;
