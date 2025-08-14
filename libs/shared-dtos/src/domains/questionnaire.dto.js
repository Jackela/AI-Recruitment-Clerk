"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionnaireValidationFailedEvent = exports.HighQualitySubmissionEvent = exports.QuestionnaireSubmittedEvent = exports.QuestionnaireStatus = exports.QuestionnaireValidationResult = exports.QualityMetrics = exports.Answer = exports.SubmissionSummary = exports.QualityScore = exports.SubmissionMetadata = exports.OptionalInfo = exports.FeatureNeeds = exports.BusinessValue = exports.UserExperience = exports.UserProfile = exports.SubmissionQuality = exports.QuestionnaireSubmission = exports.QuestionnaireTemplate = exports.QuestionnaireId = exports.Questionnaire = void 0;
const value_object_1 = require("../base/value-object");
// 问卷聚合根
class Questionnaire {
    constructor(id, template, submission, quality, metadata, status) {
        this.id = id;
        this.template = template;
        this.submission = submission;
        this.quality = quality;
        this.metadata = metadata;
        this.status = status;
        this.uncommittedEvents = [];
    }
    // 工厂方法
    static create(templateId, submission, metadata) {
        const id = QuestionnaireId.generate();
        const template = QuestionnaireTemplate.createDefault(templateId);
        const questionnaireSubmission = QuestionnaireSubmission.fromRawData(submission);
        const quality = SubmissionQuality.calculate(questionnaireSubmission);
        const questionnaire = new Questionnaire(id, template, questionnaireSubmission, quality, metadata, QuestionnaireStatus.SUBMITTED);
        questionnaire.addEvent(new QuestionnaireSubmittedEvent(id.getValue(), metadata.ip, quality.getQualityScore(), quality.isBonusEligible(), questionnaireSubmission.getSummary(), new Date()));
        if (quality.isBonusEligible()) {
            questionnaire.addEvent(new HighQualitySubmissionEvent(id.getValue(), metadata.ip, quality.getQualityScore(), quality.getQualityReasons(), new Date()));
        }
        return questionnaire;
    }
    static restore(data) {
        return new Questionnaire(new QuestionnaireId({ value: data.id }), QuestionnaireTemplate.restore(data.template), QuestionnaireSubmission.restore(data.submission), SubmissionQuality.restore(data.quality), SubmissionMetadata.restore(data.metadata), data.status);
    }
    // 核心业务方法
    validateSubmission() {
        const errors = [];
        // 检查必填字段
        const profile = this.submission.getUserProfile();
        const experience = this.submission.getUserExperience();
        const business = this.submission.getBusinessValue();
        if (!profile) {
            errors.push('User profile is required');
            return new QuestionnaireValidationResult(false, errors);
        }
        if (!experience) {
            errors.push('User experience is required');
            return new QuestionnaireValidationResult(false, errors);
        }
        if (!business) {
            errors.push('Business value is required');
            return new QuestionnaireValidationResult(false, errors);
        }
        // 验证具体字段
        if (!profile.role || profile.role === 'other') {
            errors.push('Valid user role is required');
        }
        if (!profile.industry || profile.industry === '') {
            errors.push('Industry is required');
        }
        if (!experience.overallSatisfaction || experience.overallSatisfaction === 1) {
            errors.push('Overall satisfaction rating (above 1) is required');
        }
        if (!business.currentScreeningMethod || business.currentScreeningMethod === 'manual') {
            errors.push('Current screening method other than manual is required');
        }
        if (business.willingnessToPayMonthly === 0) {
            errors.push('Willingness to pay must be greater than 0');
        }
        return new QuestionnaireValidationResult(errors.length === 0, errors);
    }
    calculateQualityScore() {
        return this.quality.calculateScore();
    }
    isEligibleForBonus() {
        return this.quality.isBonusEligible();
    }
    getSubmissionSummary() {
        return this.submission.getSummary();
    }
    // 状态转换
    markAsProcessed() {
        this.status = QuestionnaireStatus.PROCESSED;
    }
    markAsRewarded() {
        this.status = QuestionnaireStatus.REWARDED;
    }
    flagAsLowQuality() {
        this.status = QuestionnaireStatus.LOW_QUALITY;
    }
    // 查询方法
    getAnswerByQuestionId(questionId) {
        return this.submission.getAnswer(questionId);
    }
    getQualityMetrics() {
        return this.quality.getMetrics();
    }
    getTotalTextLength() {
        return this.quality.getTotalTextLength();
    }
    hasDetailedFeedback() {
        return this.quality.hasDetailedFeedback();
    }
    // 领域事件管理
    getUncommittedEvents() {
        return [...this.uncommittedEvents];
    }
    markEventsAsCommitted() {
        this.uncommittedEvents = [];
    }
    addEvent(event) {
        this.uncommittedEvents.push(event);
    }
    // Getters
    getId() {
        return this.id;
    }
    getSubmitterIP() {
        return this.metadata.ip;
    }
    getStatus() {
        return this.status;
    }
}
exports.Questionnaire = Questionnaire;
// 值对象
class QuestionnaireId extends value_object_1.ValueObject {
    static generate() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return new QuestionnaireId({ value: `quest_${timestamp}_${random}` });
    }
    getValue() {
        return this.props.value;
    }
}
exports.QuestionnaireId = QuestionnaireId;
class QuestionnaireTemplate extends value_object_1.ValueObject {
    static createDefault(templateId) {
        return new QuestionnaireTemplate({
            id: templateId,
            version: '1.0',
            sections: [
                { id: 'profile', name: 'User Profile', required: true },
                { id: 'experience', name: 'User Experience', required: true },
                { id: 'business', name: 'Business Value', required: true },
                { id: 'features', name: 'Feature Needs', required: false },
                { id: 'optional', name: 'Optional Info', required: false }
            ],
            requiredQuestions: ['role', 'industry', 'overallSatisfaction', 'currentScreeningMethod', 'willingnessToPayMonthly'],
            qualityThresholds: [
                { metric: 'textLength', minValue: 50 },
                { metric: 'completionRate', minValue: 0.8 },
                { metric: 'detailedAnswers', minValue: 3 }
            ]
        });
    }
    static restore(data) {
        return new QuestionnaireTemplate(data);
    }
}
exports.QuestionnaireTemplate = QuestionnaireTemplate;
class QuestionnaireSubmission extends value_object_1.ValueObject {
    static fromRawData(data) {
        return new QuestionnaireSubmission({
            userProfile: new UserProfile({
                role: data.userProfile?.role || 'other',
                industry: data.userProfile?.industry || '',
                companySize: data.userProfile?.companySize || 'unknown',
                location: data.userProfile?.location || ''
            }),
            userExperience: new UserExperience({
                overallSatisfaction: data.userExperience?.overallSatisfaction || 1,
                accuracyRating: data.userExperience?.accuracyRating || 1,
                speedRating: data.userExperience?.speedRating || 1,
                uiRating: data.userExperience?.uiRating || 1,
                mostUsefulFeature: data.userExperience?.mostUsefulFeature || '',
                mainPainPoint: data.userExperience?.mainPainPoint,
                improvementSuggestion: data.userExperience?.improvementSuggestion
            }),
            businessValue: new BusinessValue({
                currentScreeningMethod: data.businessValue?.currentScreeningMethod || 'manual',
                timeSpentPerResume: data.businessValue?.timeSpentPerResume || 0,
                resumesPerWeek: data.businessValue?.resumesPerWeek || 0,
                timeSavingPercentage: data.businessValue?.timeSavingPercentage || 0,
                willingnessToPayMonthly: data.businessValue?.willingnessToPayMonthly || 0,
                recommendLikelihood: data.businessValue?.recommendLikelihood || 1
            }),
            featureNeeds: new FeatureNeeds({
                priorityFeatures: data.featureNeeds?.priorityFeatures || [],
                integrationNeeds: data.featureNeeds?.integrationNeeds || []
            }),
            optional: new OptionalInfo({
                additionalFeedback: data.optional?.additionalFeedback,
                contactPreference: data.optional?.contactPreference
            }),
            submittedAt: new Date()
        });
    }
    static restore(data) {
        return new QuestionnaireSubmission({
            ...data,
            submittedAt: new Date(data.submittedAt)
        });
    }
    getUserProfile() {
        return this.props.userProfile;
    }
    getUserExperience() {
        return this.props.userExperience;
    }
    getBusinessValue() {
        return this.props.businessValue;
    }
    getOptionalInfo() {
        return this.props.optional;
    }
    getSummary() {
        return new SubmissionSummary({
            role: this.props.userProfile.role,
            industry: this.props.userProfile.industry,
            overallSatisfaction: this.props.userExperience.overallSatisfaction,
            willingnessToPayMonthly: this.props.businessValue.willingnessToPayMonthly,
            textLength: this.calculateTotalTextLength(),
            completionRate: this.calculateCompletionRate()
        });
    }
    getAnswer(questionId) {
        // 简化实现，实际应该有更复杂的映射
        const answers = {
            role: this.props.userProfile.role,
            industry: this.props.userProfile.industry,
            overallSatisfaction: this.props.userExperience.overallSatisfaction.toString(),
            mostUsefulFeature: this.props.userExperience.mostUsefulFeature
        };
        const value = answers[questionId];
        return value ? new Answer({ questionId, value: value.toString() }) : null;
    }
    calculateTotalTextLength() {
        const textFields = [
            this.props.userProfile.industry,
            this.props.userProfile.location,
            this.props.userExperience.mostUsefulFeature,
            this.props.userExperience.mainPainPoint || '',
            this.props.userExperience.improvementSuggestion || '',
            this.props.optional.additionalFeedback || ''
        ];
        return textFields.join(' ').length;
    }
    calculateCompletionRate() {
        const requiredFields = 5; // role, industry, satisfaction, screening method, willingness to pay
        const completedFields = [
            this.props.userProfile.role,
            this.props.userProfile.industry,
            this.props.userExperience.overallSatisfaction,
            this.props.businessValue.currentScreeningMethod,
            this.props.businessValue.willingnessToPayMonthly
        ].filter(field => field && field !== 0).length;
        return completedFields / requiredFields;
    }
}
exports.QuestionnaireSubmission = QuestionnaireSubmission;
class SubmissionQuality extends value_object_1.ValueObject {
    static calculate(submission) {
        const totalTextLength = submission.getSummary().textLength;
        const completionRate = submission.getSummary().completionRate;
        const detailedAnswers = SubmissionQuality.countDetailedAnswers(submission);
        let qualityScore = 0;
        const qualityReasons = [];
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
        const businessValueScore = SubmissionQuality.calculateBusinessValueScore(submission);
        qualityScore += businessValueScore;
        if (businessValueScore >= 20) {
            qualityReasons.push('High business value responses');
        }
        const finalScore = Math.min(100, Math.round(qualityScore));
        const bonusEligible = finalScore >= 70 && totalTextLength >= 50 && detailedAnswers >= 3;
        return new SubmissionQuality({
            totalTextLength,
            detailedAnswers,
            completionRate,
            qualityScore: finalScore,
            bonusEligible,
            qualityReasons
        });
    }
    static restore(data) {
        return new SubmissionQuality(data);
    }
    static countDetailedAnswers(submission) {
        const userExp = submission.getUserExperience();
        const optional = submission.getOptionalInfo();
        let count = 0;
        if ((userExp.mainPainPoint || '').length > 20)
            count++;
        if ((userExp.improvementSuggestion || '').length > 20)
            count++;
        if ((optional.additionalFeedback || '').length > 30)
            count++;
        return count;
    }
    static calculateBusinessValueScore(submission) {
        const businessValue = submission.getBusinessValue();
        let score = 0;
        // 愿意付费金额评分
        if (businessValue.willingnessToPayMonthly > 0) {
            score += Math.min(15, businessValue.willingnessToPayMonthly / 10); // 每10元1分，最多15分
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
    calculateScore() {
        return new QualityScore({ value: this.props.qualityScore });
    }
    isBonusEligible() {
        return this.props.bonusEligible;
    }
    getQualityScore() {
        return this.props.qualityScore;
    }
    getQualityReasons() {
        return this.props.qualityReasons;
    }
    getMetrics() {
        return new QualityMetrics(this.props);
    }
    getTotalTextLength() {
        return this.props.totalTextLength;
    }
    hasDetailedFeedback() {
        return this.props.detailedAnswers >= 3;
    }
}
exports.SubmissionQuality = SubmissionQuality;
// 辅助值对象
class UserProfile extends value_object_1.ValueObject {
    get role() { return this.props.role; }
    get industry() { return this.props.industry; }
    get companySize() { return this.props.companySize; }
    get location() { return this.props.location; }
}
exports.UserProfile = UserProfile;
class UserExperience extends value_object_1.ValueObject {
    get overallSatisfaction() { return this.props.overallSatisfaction; }
    get accuracyRating() { return this.props.accuracyRating; }
    get speedRating() { return this.props.speedRating; }
    get uiRating() { return this.props.uiRating; }
    get mostUsefulFeature() { return this.props.mostUsefulFeature; }
    get mainPainPoint() { return this.props.mainPainPoint; }
    get improvementSuggestion() { return this.props.improvementSuggestion; }
}
exports.UserExperience = UserExperience;
class BusinessValue extends value_object_1.ValueObject {
    get currentScreeningMethod() { return this.props.currentScreeningMethod; }
    get timeSpentPerResume() { return this.props.timeSpentPerResume; }
    get resumesPerWeek() { return this.props.resumesPerWeek; }
    get timeSavingPercentage() { return this.props.timeSavingPercentage; }
    get willingnessToPayMonthly() { return this.props.willingnessToPayMonthly; }
    get recommendLikelihood() { return this.props.recommendLikelihood; }
}
exports.BusinessValue = BusinessValue;
class FeatureNeeds extends value_object_1.ValueObject {
}
exports.FeatureNeeds = FeatureNeeds;
class OptionalInfo extends value_object_1.ValueObject {
    get additionalFeedback() { return this.props.additionalFeedback; }
    get contactPreference() { return this.props.contactPreference; }
}
exports.OptionalInfo = OptionalInfo;
class SubmissionMetadata extends value_object_1.ValueObject {
    static restore(data) {
        return new SubmissionMetadata({
            ...data,
            timestamp: new Date(data.timestamp)
        });
    }
    get ip() {
        return this.props.ip;
    }
}
exports.SubmissionMetadata = SubmissionMetadata;
class QualityScore extends value_object_1.ValueObject {
    get value() {
        return this.props.value;
    }
}
exports.QualityScore = QualityScore;
class SubmissionSummary extends value_object_1.ValueObject {
    get role() { return this.props.role; }
    get industry() { return this.props.industry; }
    get overallSatisfaction() { return this.props.overallSatisfaction; }
    get willingnessToPayMonthly() { return this.props.willingnessToPayMonthly; }
    get textLength() { return this.props.textLength; }
    get completionRate() { return this.props.completionRate; }
}
exports.SubmissionSummary = SubmissionSummary;
class Answer extends value_object_1.ValueObject {
}
exports.Answer = Answer;
class QualityMetrics extends value_object_1.ValueObject {
    get totalTextLength() { return this.props.totalTextLength; }
    get detailedAnswers() { return this.props.detailedAnswers; }
    get completionRate() { return this.props.completionRate; }
    get qualityScore() { return this.props.qualityScore; }
    get bonusEligible() { return this.props.bonusEligible; }
    get qualityReasons() { return this.props.qualityReasons; }
}
exports.QualityMetrics = QualityMetrics;
class QuestionnaireValidationResult {
    constructor(isValid, errors) {
        this.isValid = isValid;
        this.errors = errors;
    }
}
exports.QuestionnaireValidationResult = QuestionnaireValidationResult;
// 枚举类型
var QuestionnaireStatus;
(function (QuestionnaireStatus) {
    QuestionnaireStatus["SUBMITTED"] = "submitted";
    QuestionnaireStatus["PROCESSED"] = "processed";
    QuestionnaireStatus["REWARDED"] = "rewarded";
    QuestionnaireStatus["LOW_QUALITY"] = "low_quality";
})(QuestionnaireStatus || (exports.QuestionnaireStatus = QuestionnaireStatus = {}));
// 领域事件
class QuestionnaireSubmittedEvent {
    constructor(questionnaireId, submitterIP, qualityScore, bonusEligible, submissionData, occurredAt) {
        this.questionnaireId = questionnaireId;
        this.submitterIP = submitterIP;
        this.qualityScore = qualityScore;
        this.bonusEligible = bonusEligible;
        this.submissionData = submissionData;
        this.occurredAt = occurredAt;
    }
}
exports.QuestionnaireSubmittedEvent = QuestionnaireSubmittedEvent;
class HighQualitySubmissionEvent {
    constructor(questionnaireId, submitterIP, qualityScore, qualityReasons, occurredAt) {
        this.questionnaireId = questionnaireId;
        this.submitterIP = submitterIP;
        this.qualityScore = qualityScore;
        this.qualityReasons = qualityReasons;
        this.occurredAt = occurredAt;
    }
}
exports.HighQualitySubmissionEvent = HighQualitySubmissionEvent;
class QuestionnaireValidationFailedEvent {
    constructor(submitterIP, validationErrors, submissionData, occurredAt) {
        this.submitterIP = submitterIP;
        this.validationErrors = validationErrors;
        this.submissionData = submissionData;
        this.occurredAt = occurredAt;
    }
}
exports.QuestionnaireValidationFailedEvent = QuestionnaireValidationFailedEvent;
