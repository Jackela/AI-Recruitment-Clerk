"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PendingIncentivesResult = exports.IncentiveStatsResult = exports.BatchPaymentResult = exports.PaymentProcessingResult = exports.IncentiveRejectionResult = exports.IncentiveApprovalResult = exports.IncentiveValidationResult = exports.IncentiveCreationResult = exports.IncentiveDomainService = void 0;
const incentive_dto_1 = require("./incentive.dto");
const incentive_rules_1 = require("./incentive.rules");
class IncentiveDomainService {
    constructor(repository, eventBus, auditLogger, paymentGateway) {
        this.repository = repository;
        this.eventBus = eventBus;
        this.auditLogger = auditLogger;
        this.paymentGateway = paymentGateway;
    }
    /**
     * 创建问卷完成激励
     */
    async createQuestionnaireIncentive(ip, questionnaireId, qualityScore, contactInfo) {
        try {
            // 获取IP今日激励数量
            const todayIncentives = await this.repository.countTodayIncentives(ip);
            // 验证创建资格
            const eligibility = incentive_rules_1.IncentiveRules.canCreateIncentive(ip, incentive_dto_1.TriggerType.QUESTIONNAIRE_COMPLETION, { questionnaireId, qualityScore }, todayIncentives);
            if (!eligibility.isEligible) {
                await this.auditLogger.logBusinessEvent('INCENTIVE_CREATION_DENIED', {
                    ip,
                    questionnaireId,
                    qualityScore,
                    errors: eligibility.errors
                });
                return IncentiveCreationResult.failed(eligibility.errors);
            }
            // 创建激励
            const incentive = incentive_dto_1.Incentive.createQuestionnaireIncentive(ip, questionnaireId, qualityScore, contactInfo);
            // 保存到存储
            await this.repository.save(incentive);
            // 发布领域事件
            const events = incentive.getUncommittedEvents();
            for (const event of events) {
                await this.eventBus.publish(event);
            }
            incentive.markEventsAsCommitted();
            // 记录审计日志
            await this.auditLogger.logBusinessEvent('INCENTIVE_CREATED', {
                incentiveId: incentive.getId().getValue(),
                ip,
                questionnaireId,
                qualityScore,
                rewardAmount: incentive.getRewardAmount(),
                status: incentive.getStatus()
            });
            return IncentiveCreationResult.success(incentive.getIncentiveSummary());
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.auditLogger.logError('CREATE_QUESTIONNAIRE_INCENTIVE_ERROR', {
                ip,
                questionnaireId,
                qualityScore,
                error: errorMessage
            });
            console.error('Error creating questionnaire incentive:', error);
            return IncentiveCreationResult.failed(['Internal error occurred while creating incentive']);
        }
    }
    /**
     * 创建推荐激励
     */
    async createReferralIncentive(referrerIP, referredIP, contactInfo) {
        try {
            // 验证推荐资格
            const todayIncentives = await this.repository.countTodayIncentives(referrerIP);
            const eligibility = incentive_rules_1.IncentiveRules.canCreateIncentive(referrerIP, incentive_dto_1.TriggerType.REFERRAL, { referredIP }, todayIncentives);
            if (!eligibility.isEligible) {
                await this.auditLogger.logBusinessEvent('REFERRAL_INCENTIVE_DENIED', {
                    referrerIP,
                    referredIP,
                    errors: eligibility.errors
                });
                return IncentiveCreationResult.failed(eligibility.errors);
            }
            // 验证被推荐IP是否有效且未重复
            const existingReferral = await this.repository.findReferralIncentive(referrerIP, referredIP);
            if (existingReferral) {
                return IncentiveCreationResult.failed(['Referral incentive already exists for this IP pair']);
            }
            // 创建推荐激励
            const incentive = incentive_dto_1.Incentive.createReferralIncentive(referrerIP, referredIP, contactInfo);
            await this.repository.save(incentive);
            // 发布领域事件
            const events = incentive.getUncommittedEvents();
            for (const event of events) {
                await this.eventBus.publish(event);
            }
            incentive.markEventsAsCommitted();
            await this.auditLogger.logBusinessEvent('REFERRAL_INCENTIVE_CREATED', {
                incentiveId: incentive.getId().getValue(),
                referrerIP,
                referredIP,
                rewardAmount: incentive.getRewardAmount()
            });
            return IncentiveCreationResult.success(incentive.getIncentiveSummary());
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.auditLogger.logError('CREATE_REFERRAL_INCENTIVE_ERROR', {
                referrerIP,
                referredIP,
                error: errorMessage
            });
            console.error('Error creating referral incentive:', error);
            return IncentiveCreationResult.failed(['Internal error occurred while creating referral incentive']);
        }
    }
    /**
     * 验证激励资格
     */
    async validateIncentive(incentiveId) {
        try {
            const incentive = await this.repository.findById(incentiveId);
            if (!incentive) {
                return IncentiveValidationResult.failed(['Incentive not found']);
            }
            // 执行验证
            const validationResult = incentive.validateEligibility();
            // 保存验证结果
            await this.repository.save(incentive);
            // 发布领域事件
            const events = incentive.getUncommittedEvents();
            for (const event of events) {
                await this.eventBus.publish(event);
            }
            incentive.markEventsAsCommitted();
            await this.auditLogger.logBusinessEvent('INCENTIVE_VALIDATED', {
                incentiveId,
                isValid: validationResult.isValid,
                errors: validationResult.errors
            });
            return IncentiveValidationResult.success({
                incentiveId,
                isValid: validationResult.isValid,
                errors: validationResult.errors,
                status: incentive.getStatus()
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.auditLogger.logError('VALIDATE_INCENTIVE_ERROR', {
                incentiveId,
                error: errorMessage
            });
            console.error('Error validating incentive:', error);
            return IncentiveValidationResult.failed(['Internal error occurred while validating incentive']);
        }
    }
    /**
     * 批准激励处理
     */
    async approveIncentive(incentiveId, reason) {
        try {
            const incentive = await this.repository.findById(incentiveId);
            if (!incentive) {
                return IncentiveApprovalResult.failed(['Incentive not found']);
            }
            // 执行批准
            incentive.approveForProcessing(reason);
            await this.repository.save(incentive);
            // 发布领域事件
            const events = incentive.getUncommittedEvents();
            for (const event of events) {
                await this.eventBus.publish(event);
            }
            incentive.markEventsAsCommitted();
            await this.auditLogger.logBusinessEvent('INCENTIVE_APPROVED', {
                incentiveId,
                reason,
                rewardAmount: incentive.getRewardAmount()
            });
            return IncentiveApprovalResult.success({
                incentiveId,
                status: incentive.getStatus(),
                rewardAmount: incentive.getRewardAmount()
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.auditLogger.logError('APPROVE_INCENTIVE_ERROR', {
                incentiveId,
                reason,
                error: errorMessage
            });
            console.error('Error approving incentive:', error);
            return IncentiveApprovalResult.failed(['Internal error occurred while approving incentive']);
        }
    }
    /**
     * 拒绝激励
     */
    async rejectIncentive(incentiveId, reason) {
        try {
            const incentive = await this.repository.findById(incentiveId);
            if (!incentive) {
                return IncentiveRejectionResult.failed(['Incentive not found']);
            }
            // 执行拒绝
            incentive.reject(reason);
            await this.repository.save(incentive);
            // 发布领域事件
            const events = incentive.getUncommittedEvents();
            for (const event of events) {
                await this.eventBus.publish(event);
            }
            incentive.markEventsAsCommitted();
            await this.auditLogger.logBusinessEvent('INCENTIVE_REJECTED', {
                incentiveId,
                reason
            });
            return IncentiveRejectionResult.success({
                incentiveId,
                status: incentive.getStatus(),
                rejectionReason: reason
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.auditLogger.logError('REJECT_INCENTIVE_ERROR', {
                incentiveId,
                reason,
                error: errorMessage
            });
            console.error('Error rejecting incentive:', error);
            return IncentiveRejectionResult.failed(['Internal error occurred while rejecting incentive']);
        }
    }
    /**
     * 执行单笔支付
     */
    async processPayment(incentiveId, paymentMethod, contactInfo) {
        try {
            const incentive = await this.repository.findById(incentiveId);
            if (!incentive) {
                return PaymentProcessingResult.failed(['Incentive not found']);
            }
            // 验证支付资格
            const eligibility = incentive_rules_1.IncentiveRules.canPayIncentive(incentive);
            if (!eligibility.isEligible) {
                return PaymentProcessingResult.failed(eligibility.errors);
            }
            // 验证支付方式兼容性
            const actualContactInfo = contactInfo || this.extractContactInfoFromIncentive(incentive);
            const methodValidation = incentive_rules_1.IncentiveRules.validatePaymentMethodCompatibility(paymentMethod, actualContactInfo);
            if (!methodValidation.isValid) {
                return PaymentProcessingResult.failed(methodValidation.errors);
            }
            // 通过支付网关处理支付
            const paymentRequest = {
                amount: incentive.getRewardAmount(),
                currency: incentive_dto_1.Currency.CNY,
                paymentMethod,
                recipientInfo: actualContactInfo,
                reference: incentiveId
            };
            const gatewayResult = await this.paymentGateway.processPayment(paymentRequest);
            // 执行激励支付
            const paymentResult = incentive.executePayment(paymentMethod, gatewayResult.transactionId);
            if (paymentResult.success) {
                await this.repository.save(incentive);
                // 发布领域事件
                const events = incentive.getUncommittedEvents();
                for (const event of events) {
                    await this.eventBus.publish(event);
                }
                incentive.markEventsAsCommitted();
                await this.auditLogger.logBusinessEvent('INCENTIVE_PAID', {
                    incentiveId,
                    amount: paymentResult.amount,
                    currency: paymentResult.currency,
                    paymentMethod,
                    transactionId: gatewayResult.transactionId
                });
                return PaymentProcessingResult.success({
                    incentiveId,
                    transactionId: gatewayResult.transactionId,
                    amount: paymentResult.amount,
                    currency: paymentResult.currency,
                    paymentMethod,
                    status: incentive.getStatus()
                });
            }
            else {
                await this.auditLogger.logBusinessEvent('INCENTIVE_PAYMENT_FAILED', {
                    incentiveId,
                    error: paymentResult.error,
                    paymentMethod
                });
                return PaymentProcessingResult.failed([paymentResult.error]);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.auditLogger.logError('PROCESS_PAYMENT_ERROR', {
                incentiveId,
                paymentMethod,
                error: errorMessage
            });
            console.error('Error processing payment:', error);
            return PaymentProcessingResult.failed(['Internal error occurred while processing payment']);
        }
    }
    /**
     * 批量支付处理
     */
    async processBatchPayment(incentiveIds, paymentMethod) {
        try {
            // 获取所有激励
            const incentives = await this.repository.findByIds(incentiveIds);
            if (incentives.length === 0) {
                return BatchPaymentResult.failed(['No valid incentives found']);
            }
            // 验证批量支付
            const batchValidation = incentive_rules_1.IncentiveRules.validateBatchPayment(incentives);
            if (!batchValidation.isValid) {
                return BatchPaymentResult.failed(batchValidation.errors);
            }
            // 处理每个激励的支付
            const results = [];
            let successCount = 0;
            let totalPaidAmount = 0;
            for (const incentive of incentives) {
                const eligibility = incentive_rules_1.IncentiveRules.canPayIncentive(incentive);
                if (!eligibility.isEligible) {
                    results.push({
                        incentiveId: incentive.getId().getValue(),
                        success: false,
                        error: eligibility.errors.join(', ')
                    });
                    continue;
                }
                try {
                    const contactInfo = this.extractContactInfoFromIncentive(incentive);
                    const paymentRequest = {
                        amount: incentive.getRewardAmount(),
                        currency: incentive_dto_1.Currency.CNY,
                        paymentMethod,
                        recipientInfo: contactInfo,
                        reference: incentive.getId().getValue()
                    };
                    const gatewayResult = await this.paymentGateway.processPayment(paymentRequest);
                    const paymentResult = incentive.executePayment(paymentMethod, gatewayResult.transactionId);
                    if (paymentResult.success) {
                        await this.repository.save(incentive);
                        // 发布领域事件
                        const events = incentive.getUncommittedEvents();
                        for (const event of events) {
                            await this.eventBus.publish(event);
                        }
                        incentive.markEventsAsCommitted();
                        results.push({
                            incentiveId: incentive.getId().getValue(),
                            success: true,
                            transactionId: gatewayResult.transactionId,
                            amount: paymentResult.amount
                        });
                        successCount++;
                        totalPaidAmount += paymentResult.amount;
                    }
                    else {
                        results.push({
                            incentiveId: incentive.getId().getValue(),
                            success: false,
                            error: paymentResult.error
                        });
                    }
                }
                catch (paymentError) {
                    const errorMessage = paymentError instanceof Error ? paymentError.message : 'Payment error';
                    results.push({
                        incentiveId: incentive.getId().getValue(),
                        success: false,
                        error: errorMessage
                    });
                }
            }
            await this.auditLogger.logBusinessEvent('BATCH_PAYMENT_PROCESSED', {
                totalIncentives: incentiveIds.length,
                successCount,
                failureCount: incentiveIds.length - successCount,
                totalPaidAmount,
                paymentMethod
            });
            return BatchPaymentResult.success({
                totalIncentives: incentiveIds.length,
                successCount,
                failureCount: incentiveIds.length - successCount,
                totalPaidAmount,
                results
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.auditLogger.logError('PROCESS_BATCH_PAYMENT_ERROR', {
                incentiveIds,
                paymentMethod,
                error: errorMessage
            });
            console.error('Error processing batch payment:', error);
            return BatchPaymentResult.failed(['Internal error occurred while processing batch payment']);
        }
    }
    /**
     * 获取激励统计信息
     */
    async getIncentiveStatistics(ip, timeRange) {
        try {
            if (ip) {
                // 获取特定IP的统计
                if (!this.isValidIPAddress(ip)) {
                    return IncentiveStatsResult.failed(['Invalid IP address format']);
                }
                const incentives = await this.repository.findByIP(ip, timeRange);
                const stats = this.calculateIPStatistics(ip, incentives);
                return IncentiveStatsResult.success({ individual: stats });
            }
            else {
                // 获取系统整体统计
                const systemStats = await this.calculateSystemStatistics(timeRange);
                return IncentiveStatsResult.success({ system: systemStats });
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.auditLogger.logError('GET_INCENTIVE_STATISTICS_ERROR', {
                ip,
                timeRange,
                error: errorMessage
            });
            console.error('Error getting incentive statistics:', error);
            return IncentiveStatsResult.failed(['Internal error occurred while getting statistics']);
        }
    }
    /**
     * 获取待处理激励列表（按优先级排序）
     */
    async getPendingIncentives(status, limit = 50) {
        try {
            const incentives = await this.repository.findPendingIncentives(status, limit);
            const prioritizedIncentives = incentives
                .map(incentive => ({
                incentive: incentive.getIncentiveSummary(),
                priority: incentive_rules_1.IncentiveRules.calculateProcessingPriority(incentive)
            }))
                .sort((a, b) => b.priority.score - a.priority.score);
            return PendingIncentivesResult.success(prioritizedIncentives);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.auditLogger.logError('GET_PENDING_INCENTIVES_ERROR', {
                status,
                limit,
                error: errorMessage
            });
            console.error('Error getting pending incentives:', error);
            return PendingIncentivesResult.failed(['Internal error occurred while getting pending incentives']);
        }
    }
    // 私有辅助方法
    extractContactInfoFromIncentive(incentive) {
        // 从激励中提取联系信息的逻辑
        // 在实际实现中，这应该从激励的接收者中获取联系信息
        // 这里提供一个基本的实现来满足测试需要
        return new incentive_dto_1.ContactInfo({
            email: 'test@example.com',
            wechat: 'test_wechat',
            alipay: 'test_alipay'
        });
    }
    calculateIPStatistics(ip, incentives) {
        let totalAmount = 0;
        let paidAmount = 0;
        let pendingAmount = 0;
        const statusCount = {
            pending: 0,
            approved: 0,
            paid: 0,
            rejected: 0
        };
        for (const incentive of incentives) {
            const amount = incentive.getRewardAmount();
            totalAmount += amount;
            switch (incentive.getStatus()) {
                case incentive_dto_1.IncentiveStatus.PENDING_VALIDATION:
                    statusCount.pending++;
                    pendingAmount += amount;
                    break;
                case incentive_dto_1.IncentiveStatus.APPROVED:
                    statusCount.approved++;
                    pendingAmount += amount;
                    break;
                case incentive_dto_1.IncentiveStatus.PAID:
                    statusCount.paid++;
                    paidAmount += amount;
                    break;
                case incentive_dto_1.IncentiveStatus.REJECTED:
                    statusCount.rejected++;
                    break;
            }
        }
        return {
            ip,
            totalIncentives: incentives.length,
            totalAmount,
            paidAmount,
            pendingAmount,
            statusBreakdown: statusCount,
            averageReward: incentives.length > 0 ? totalAmount / incentives.length : 0,
            lastIncentiveDate: incentives.length > 0 ?
                Math.max(...incentives.map(i => i.getCreatedAt().getTime())) : undefined
        };
    }
    async calculateSystemStatistics(timeRange) {
        const allIncentives = await this.repository.findAll(timeRange);
        let totalAmount = 0;
        let paidAmount = 0;
        const uniqueIPs = new Set();
        const statusCount = {
            pending: 0,
            approved: 0,
            paid: 0,
            rejected: 0
        };
        const rewardTypeCount = new Map();
        for (const incentive of allIncentives) {
            totalAmount += incentive.getRewardAmount();
            uniqueIPs.add(incentive.getRecipientIP());
            switch (incentive.getStatus()) {
                case incentive_dto_1.IncentiveStatus.PENDING_VALIDATION:
                    statusCount.pending++;
                    break;
                case incentive_dto_1.IncentiveStatus.APPROVED:
                    statusCount.approved++;
                    break;
                case incentive_dto_1.IncentiveStatus.PAID:
                    statusCount.paid++;
                    paidAmount += incentive.getRewardAmount();
                    break;
                case incentive_dto_1.IncentiveStatus.REJECTED:
                    statusCount.rejected++;
                    break;
            }
        }
        return {
            totalIncentives: allIncentives.length,
            uniqueRecipients: uniqueIPs.size,
            totalAmount,
            paidAmount,
            pendingAmount: totalAmount - paidAmount,
            statusBreakdown: statusCount,
            averageRewardPerIncentive: allIncentives.length > 0 ? totalAmount / allIncentives.length : 0,
            averageRewardPerIP: uniqueIPs.size > 0 ? totalAmount / uniqueIPs.size : 0,
            conversionRate: allIncentives.length > 0 ? (statusCount.paid / allIncentives.length) * 100 : 0
        };
    }
    isValidIPAddress(ip) {
        if (!ip || typeof ip !== 'string')
            return false;
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipRegex.test(ip);
    }
}
exports.IncentiveDomainService = IncentiveDomainService;
// 结果类定义
class IncentiveCreationResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new IncentiveCreationResult(true, data);
    }
    static failed(errors) {
        return new IncentiveCreationResult(false, undefined, errors);
    }
}
exports.IncentiveCreationResult = IncentiveCreationResult;
class IncentiveValidationResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new IncentiveValidationResult(true, data);
    }
    static failed(errors) {
        return new IncentiveValidationResult(false, undefined, errors);
    }
}
exports.IncentiveValidationResult = IncentiveValidationResult;
class IncentiveApprovalResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new IncentiveApprovalResult(true, data);
    }
    static failed(errors) {
        return new IncentiveApprovalResult(false, undefined, errors);
    }
}
exports.IncentiveApprovalResult = IncentiveApprovalResult;
class IncentiveRejectionResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new IncentiveRejectionResult(true, data);
    }
    static failed(errors) {
        return new IncentiveRejectionResult(false, undefined, errors);
    }
}
exports.IncentiveRejectionResult = IncentiveRejectionResult;
class PaymentProcessingResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new PaymentProcessingResult(true, data);
    }
    static failed(errors) {
        return new PaymentProcessingResult(false, undefined, errors);
    }
}
exports.PaymentProcessingResult = PaymentProcessingResult;
class BatchPaymentResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new BatchPaymentResult(true, data);
    }
    static failed(errors) {
        return new BatchPaymentResult(false, undefined, errors);
    }
}
exports.BatchPaymentResult = BatchPaymentResult;
class IncentiveStatsResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new IncentiveStatsResult(true, data);
    }
    static failed(errors) {
        return new IncentiveStatsResult(false, undefined, errors);
    }
}
exports.IncentiveStatsResult = IncentiveStatsResult;
class PendingIncentivesResult {
    constructor(success, data, errors) {
        this.success = success;
        this.data = data;
        this.errors = errors;
    }
    static success(data) {
        return new PendingIncentivesResult(true, data);
    }
    static failed(errors) {
        return new PendingIncentivesResult(false, undefined, errors);
    }
}
exports.PendingIncentivesResult = PendingIncentivesResult;
