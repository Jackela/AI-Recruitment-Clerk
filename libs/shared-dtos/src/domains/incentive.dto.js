"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentFailedEvent = exports.IncentivePaidEvent = exports.IncentiveRejectedEvent = exports.IncentiveApprovedEvent = exports.IncentiveValidationFailedEvent = exports.IncentiveValidatedEvent = exports.IncentiveCreatedEvent = exports.PaymentMethod = exports.TriggerType = exports.RewardType = exports.Currency = exports.VerificationStatus = exports.IncentiveStatus = exports.IncentiveSummary = exports.PaymentResult = exports.IncentiveValidationResult = exports.IncentiveTrigger = exports.IncentiveReward = exports.ContactInfo = exports.IncentiveRecipient = exports.IncentiveId = exports.Incentive = void 0;
const value_object_1 = require("../base/value-object");
// Incentive聚合根 - 管理红包激励系统的核心业务逻辑
class Incentive {
    constructor(id, recipient, reward, trigger, status, createdAt, processedAt, paidAt) {
        this.id = id;
        this.recipient = recipient;
        this.reward = reward;
        this.trigger = trigger;
        this.status = status;
        this.createdAt = createdAt;
        this.processedAt = processedAt;
        this.paidAt = paidAt;
        this.uncommittedEvents = [];
    }
    // 工厂方法 - 创建问卷完成激励
    static createQuestionnaireIncentive(ip, questionnaireId, qualityScore, contactInfo) {
        const incentiveId = IncentiveId.generate();
        const recipient = IncentiveRecipient.create(ip, contactInfo);
        const trigger = IncentiveTrigger.fromQuestionnaire(questionnaireId, qualityScore);
        const reward = IncentiveReward.calculateForQuestionnaire(qualityScore);
        const incentive = new Incentive(incentiveId, recipient, reward, trigger, IncentiveStatus.PENDING_VALIDATION, new Date());
        incentive.addEvent(new IncentiveCreatedEvent(incentiveId.getValue(), ip, reward.getAmount(), reward.getCurrency(), trigger.getTriggerType(), new Date()));
        // 如果质量足够高，自动进入处理状态
        if (qualityScore >= 70) {
            incentive.approveForProcessing('High quality questionnaire completion');
        }
        return incentive;
    }
    // 工厂方法 - 创建推荐激励
    static createReferralIncentive(referrerIP, referredIP, contactInfo) {
        const incentiveId = IncentiveId.generate();
        const recipient = IncentiveRecipient.create(referrerIP, contactInfo);
        const trigger = IncentiveTrigger.fromReferral(referredIP);
        const reward = IncentiveReward.createReferralReward();
        const incentive = new Incentive(incentiveId, recipient, reward, trigger, IncentiveStatus.PENDING_VALIDATION, new Date());
        incentive.addEvent(new IncentiveCreatedEvent(incentiveId.getValue(), referrerIP, reward.getAmount(), reward.getCurrency(), trigger.getTriggerType(), new Date()));
        return incentive;
    }
    // 工厂方法 - 从持久化数据恢复
    static restore(data) {
        return new Incentive(new IncentiveId({ value: data.id }), IncentiveRecipient.restore(data.recipient), IncentiveReward.restore(data.reward), IncentiveTrigger.restore(data.trigger), data.status, new Date(data.createdAt), data.processedAt ? new Date(data.processedAt) : undefined, data.paidAt ? new Date(data.paidAt) : undefined);
    }
    // 核心业务方法 - 验证激励资格
    validateEligibility() {
        const validationErrors = [];
        // 验证触发条件
        if (!this.trigger.isValid()) {
            validationErrors.push(...this.trigger.getValidationErrors());
        }
        // 验证接收者
        if (!this.recipient.isValid()) {
            validationErrors.push(...this.recipient.getValidationErrors());
        }
        // 验证奖励配置
        if (!this.reward.isValid()) {
            validationErrors.push(...this.reward.getValidationErrors());
        }
        // 验证状态一致性
        if (this.status === IncentiveStatus.PAID && !this.paidAt) {
            validationErrors.push('Paid incentive must have payment timestamp');
        }
        const isValid = validationErrors.length === 0;
        const result = new IncentiveValidationResult(isValid, validationErrors);
        if (isValid) {
            this.addEvent(new IncentiveValidatedEvent(this.id.getValue(), this.recipient.getIP(), this.reward.getAmount(), new Date()));
        }
        else {
            this.addEvent(new IncentiveValidationFailedEvent(this.id.getValue(), this.recipient.getIP(), validationErrors, new Date()));
        }
        return result;
    }
    // 批准处理
    approveForProcessing(reason) {
        if (this.status !== IncentiveStatus.PENDING_VALIDATION) {
            throw new Error(`Cannot approve incentive in ${this.status} status`);
        }
        this.status = IncentiveStatus.APPROVED;
        this.processedAt = new Date();
        this.addEvent(new IncentiveApprovedEvent(this.id.getValue(), this.recipient.getIP(), this.reward.getAmount(), reason, new Date()));
    }
    // 拒绝激励
    reject(reason) {
        if (this.status === IncentiveStatus.PAID) {
            throw new Error('Cannot reject already paid incentive');
        }
        this.status = IncentiveStatus.REJECTED;
        this.processedAt = new Date();
        this.addEvent(new IncentiveRejectedEvent(this.id.getValue(), this.recipient.getIP(), reason, new Date()));
    }
    // 执行支付
    executePayment(paymentMethod, transactionId) {
        if (this.status !== IncentiveStatus.APPROVED) {
            return PaymentResult.failed(`Cannot pay incentive in ${this.status} status`);
        }
        try {
            // 业务逻辑验证
            this.validatePaymentConditions();
            this.status = IncentiveStatus.PAID;
            this.paidAt = new Date();
            this.addEvent(new IncentivePaidEvent(this.id.getValue(), this.recipient.getIP(), this.reward.getAmount(), this.reward.getCurrency(), paymentMethod, transactionId, new Date()));
            return PaymentResult.success(transactionId, this.reward.getAmount(), this.reward.getCurrency());
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Payment failed';
            this.addEvent(new PaymentFailedEvent(this.id.getValue(), this.recipient.getIP(), errorMessage, new Date()));
            return PaymentResult.failed(errorMessage);
        }
    }
    validatePaymentConditions() {
        if (this.reward.getAmount() <= 0) {
            throw new Error('Invalid reward amount for payment');
        }
        if (!this.recipient.hasValidContactInfo()) {
            throw new Error('Valid contact information required for payment');
        }
        // 检查是否在合理时间范围内
        const daysSinceCreation = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation > 30) {
            throw new Error('Incentive has expired (>30 days old)');
        }
    }
    // 查询方法
    getIncentiveSummary() {
        return new IncentiveSummary({
            id: this.id.getValue(),
            recipientIP: this.recipient.getIP(),
            rewardAmount: this.reward.getAmount(),
            rewardCurrency: this.reward.getCurrency(),
            triggerType: this.trigger.getTriggerType(),
            status: this.status,
            createdAt: this.createdAt,
            processedAt: this.processedAt,
            paidAt: this.paidAt,
            canBePaid: this.canBePaid(),
            daysSinceCreation: Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        });
    }
    canBePaid() {
        return this.status === IncentiveStatus.APPROVED &&
            this.recipient.hasValidContactInfo() &&
            this.reward.getAmount() > 0;
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
    getStatus() {
        return this.status;
    }
    getRecipientIP() {
        return this.recipient.getIP();
    }
    getRewardAmount() {
        return this.reward.getAmount();
    }
    getCreatedAt() {
        return this.createdAt;
    }
}
exports.Incentive = Incentive;
// 值对象定义
class IncentiveId extends value_object_1.ValueObject {
    static generate() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return new IncentiveId({ value: `incentive_${timestamp}_${random}` });
    }
    getValue() {
        return this.props.value;
    }
}
exports.IncentiveId = IncentiveId;
class IncentiveRecipient extends value_object_1.ValueObject {
    static create(ip, contactInfo) {
        return new IncentiveRecipient({
            ip,
            contactInfo,
            verificationStatus: VerificationStatus.PENDING
        });
    }
    static restore(data) {
        return new IncentiveRecipient({
            ip: data.ip,
            contactInfo: ContactInfo.restore(data.contactInfo),
            verificationStatus: data.verificationStatus
        });
    }
    getIP() {
        return this.props.ip;
    }
    hasValidContactInfo() {
        return this.props.contactInfo.isValid();
    }
    isValid() {
        const errors = this.getValidationErrors();
        return errors.length === 0;
    }
    getValidationErrors() {
        const errors = [];
        if (!this.props.ip || !/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(this.props.ip)) {
            errors.push('Valid IP address is required');
        }
        if (!this.props.contactInfo.isValid()) {
            errors.push(...this.props.contactInfo.getValidationErrors());
        }
        return errors;
    }
}
exports.IncentiveRecipient = IncentiveRecipient;
class ContactInfo extends value_object_1.ValueObject {
    static restore(data) {
        return new ContactInfo(data);
    }
    isValid() {
        const errors = this.getValidationErrors();
        return errors.length === 0;
    }
    getValidationErrors() {
        const errors = [];
        const { email, phone, wechat, alipay } = this.props;
        // 至少需要一种联系方式
        if (!email && !phone && !wechat && !alipay) {
            errors.push('At least one contact method is required');
            return errors;
        }
        // 验证邮箱格式
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('Invalid email format');
        }
        // 验证手机号格式（中国大陆）
        if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
            errors.push('Invalid phone number format');
        }
        // 验证微信号格式
        if (wechat && (wechat.length < 6 || wechat.length > 20)) {
            errors.push('WeChat ID must be 6-20 characters');
        }
        return errors;
    }
    getPrimaryContact() {
        if (this.props.wechat)
            return `WeChat: ${this.props.wechat}`;
        if (this.props.alipay)
            return `Alipay: ${this.props.alipay}`;
        if (this.props.phone)
            return `Phone: ${this.props.phone}`;
        if (this.props.email)
            return `Email: ${this.props.email}`;
        return 'No contact info';
    }
    get email() { return this.props.email; }
    get phone() { return this.props.phone; }
    get wechat() { return this.props.wechat; }
    get alipay() { return this.props.alipay; }
}
exports.ContactInfo = ContactInfo;
class IncentiveReward extends value_object_1.ValueObject {
    static calculateForQuestionnaire(qualityScore) {
        let amount = 0;
        let calculationMethod = '';
        if (qualityScore >= 90) {
            amount = 8; // 高质量奖励
            calculationMethod = 'High quality bonus (≥90 score)';
        }
        else if (qualityScore >= 70) {
            amount = 5; // 标准奖励
            calculationMethod = 'Standard quality bonus (≥70 score)';
        }
        else if (qualityScore >= 50) {
            amount = 3; // 基础奖励
            calculationMethod = 'Basic completion bonus (≥50 score)';
        }
        else {
            amount = 0;
            calculationMethod = 'No reward (score <50)';
        }
        return new IncentiveReward({
            amount,
            currency: Currency.CNY,
            rewardType: RewardType.QUESTIONNAIRE_COMPLETION,
            calculationMethod
        });
    }
    static createReferralReward() {
        return new IncentiveReward({
            amount: 3,
            currency: Currency.CNY,
            rewardType: RewardType.REFERRAL,
            calculationMethod: 'Fixed referral reward'
        });
    }
    static restore(data) {
        return new IncentiveReward(data);
    }
    getAmount() {
        return this.props.amount;
    }
    getCurrency() {
        return this.props.currency;
    }
    isValid() {
        const errors = this.getValidationErrors();
        return errors.length === 0;
    }
    getValidationErrors() {
        const errors = [];
        if (this.props.amount < 0) {
            errors.push('Reward amount cannot be negative');
        }
        if (this.props.amount > 100) {
            errors.push('Reward amount cannot exceed 100 CNY');
        }
        if (!Object.values(Currency).includes(this.props.currency)) {
            errors.push('Invalid currency');
        }
        return errors;
    }
}
exports.IncentiveReward = IncentiveReward;
class IncentiveTrigger extends value_object_1.ValueObject {
    static fromQuestionnaire(questionnaireId, qualityScore) {
        return new IncentiveTrigger({
            triggerType: TriggerType.QUESTIONNAIRE_COMPLETION,
            triggerData: { questionnaireId, qualityScore },
            qualifiedAt: new Date()
        });
    }
    static fromReferral(referredIP) {
        return new IncentiveTrigger({
            triggerType: TriggerType.REFERRAL,
            triggerData: { referredIP },
            qualifiedAt: new Date()
        });
    }
    static restore(data) {
        return new IncentiveTrigger({
            ...data,
            qualifiedAt: new Date(data.qualifiedAt)
        });
    }
    getTriggerType() {
        return this.props.triggerType;
    }
    isValid() {
        const errors = this.getValidationErrors();
        return errors.length === 0;
    }
    getValidationErrors() {
        const errors = [];
        if (!Object.values(TriggerType).includes(this.props.triggerType)) {
            errors.push('Invalid trigger type');
        }
        if (!this.props.triggerData) {
            errors.push('Trigger data is required');
        }
        // 特定触发类型的验证
        switch (this.props.triggerType) {
            case TriggerType.QUESTIONNAIRE_COMPLETION:
                if (!this.props.triggerData.questionnaireId) {
                    errors.push('Questionnaire ID is required');
                }
                if (typeof this.props.triggerData.qualityScore !== 'number' ||
                    this.props.triggerData.qualityScore < 0 ||
                    this.props.triggerData.qualityScore > 100) {
                    errors.push('Valid quality score (0-100) is required');
                }
                break;
            case TriggerType.REFERRAL:
                if (!this.props.triggerData.referredIP) {
                    errors.push('Referred IP is required');
                }
                break;
        }
        return errors;
    }
}
exports.IncentiveTrigger = IncentiveTrigger;
// 结果类
class IncentiveValidationResult {
    constructor(isValid, errors) {
        this.isValid = isValid;
        this.errors = errors;
    }
}
exports.IncentiveValidationResult = IncentiveValidationResult;
class PaymentResult {
    constructor(success, transactionId, amount, currency, error) {
        this.success = success;
        this.transactionId = transactionId;
        this.amount = amount;
        this.currency = currency;
        this.error = error;
    }
    static success(transactionId, amount, currency) {
        return new PaymentResult(true, transactionId, amount, currency);
    }
    static failed(error) {
        return new PaymentResult(false, undefined, undefined, undefined, error);
    }
}
exports.PaymentResult = PaymentResult;
class IncentiveSummary extends value_object_1.ValueObject {
    get id() { return this.props.id; }
    get recipientIP() { return this.props.recipientIP; }
    get rewardAmount() { return this.props.rewardAmount; }
    get status() { return this.props.status; }
    get canBePaid() { return this.props.canBePaid; }
    get daysSinceCreation() { return this.props.daysSinceCreation; }
}
exports.IncentiveSummary = IncentiveSummary;
// 枚举定义
var IncentiveStatus;
(function (IncentiveStatus) {
    IncentiveStatus["PENDING_VALIDATION"] = "pending_validation";
    IncentiveStatus["APPROVED"] = "approved";
    IncentiveStatus["REJECTED"] = "rejected";
    IncentiveStatus["PAID"] = "paid";
    IncentiveStatus["EXPIRED"] = "expired";
})(IncentiveStatus || (exports.IncentiveStatus = IncentiveStatus = {}));
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["PENDING"] = "pending";
    VerificationStatus["VERIFIED"] = "verified";
    VerificationStatus["FAILED"] = "failed";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
var Currency;
(function (Currency) {
    Currency["CNY"] = "CNY";
    Currency["USD"] = "USD";
})(Currency || (exports.Currency = Currency = {}));
var RewardType;
(function (RewardType) {
    RewardType["QUESTIONNAIRE_COMPLETION"] = "questionnaire_completion";
    RewardType["REFERRAL"] = "referral";
    RewardType["PROMOTION"] = "promotion";
})(RewardType || (exports.RewardType = RewardType = {}));
var TriggerType;
(function (TriggerType) {
    TriggerType["QUESTIONNAIRE_COMPLETION"] = "questionnaire_completion";
    TriggerType["REFERRAL"] = "referral";
    TriggerType["SYSTEM_PROMOTION"] = "system_promotion";
})(TriggerType || (exports.TriggerType = TriggerType = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["WECHAT_PAY"] = "wechat_pay";
    PaymentMethod["ALIPAY"] = "alipay";
    PaymentMethod["BANK_TRANSFER"] = "bank_transfer";
    PaymentMethod["MANUAL"] = "manual";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
// 领域事件
class IncentiveCreatedEvent {
    constructor(incentiveId, recipientIP, rewardAmount, currency, triggerType, occurredAt) {
        this.incentiveId = incentiveId;
        this.recipientIP = recipientIP;
        this.rewardAmount = rewardAmount;
        this.currency = currency;
        this.triggerType = triggerType;
        this.occurredAt = occurredAt;
    }
}
exports.IncentiveCreatedEvent = IncentiveCreatedEvent;
class IncentiveValidatedEvent {
    constructor(incentiveId, recipientIP, rewardAmount, occurredAt) {
        this.incentiveId = incentiveId;
        this.recipientIP = recipientIP;
        this.rewardAmount = rewardAmount;
        this.occurredAt = occurredAt;
    }
}
exports.IncentiveValidatedEvent = IncentiveValidatedEvent;
class IncentiveValidationFailedEvent {
    constructor(incentiveId, recipientIP, errors, occurredAt) {
        this.incentiveId = incentiveId;
        this.recipientIP = recipientIP;
        this.errors = errors;
        this.occurredAt = occurredAt;
    }
}
exports.IncentiveValidationFailedEvent = IncentiveValidationFailedEvent;
class IncentiveApprovedEvent {
    constructor(incentiveId, recipientIP, rewardAmount, reason, occurredAt) {
        this.incentiveId = incentiveId;
        this.recipientIP = recipientIP;
        this.rewardAmount = rewardAmount;
        this.reason = reason;
        this.occurredAt = occurredAt;
    }
}
exports.IncentiveApprovedEvent = IncentiveApprovedEvent;
class IncentiveRejectedEvent {
    constructor(incentiveId, recipientIP, reason, occurredAt) {
        this.incentiveId = incentiveId;
        this.recipientIP = recipientIP;
        this.reason = reason;
        this.occurredAt = occurredAt;
    }
}
exports.IncentiveRejectedEvent = IncentiveRejectedEvent;
class IncentivePaidEvent {
    constructor(incentiveId, recipientIP, amount, currency, paymentMethod, transactionId, occurredAt) {
        this.incentiveId = incentiveId;
        this.recipientIP = recipientIP;
        this.amount = amount;
        this.currency = currency;
        this.paymentMethod = paymentMethod;
        this.transactionId = transactionId;
        this.occurredAt = occurredAt;
    }
}
exports.IncentivePaidEvent = IncentivePaidEvent;
class PaymentFailedEvent {
    constructor(incentiveId, recipientIP, error, occurredAt) {
        this.incentiveId = incentiveId;
        this.recipientIP = recipientIP;
        this.error = error;
        this.occurredAt = occurredAt;
    }
}
exports.PaymentFailedEvent = PaymentFailedEvent;
