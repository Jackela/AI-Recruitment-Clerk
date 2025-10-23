import {
  UsageLimit,
  BonusType,
  UsageLimitCheckResult,
  UsageRecordResult,
  UsageLimitPolicy,
} from '../domains/usage-limit.dto';
import { UsageLimitRules } from '../domains/usage-limit.rules';

/**
 * Represents the usage limit contracts.
 */
export class UsageLimitContracts {
  /**
   * 合约方法 - 检查IP使用限制
   * 前置条件: IP地址格式有效
   * 后置条件: 返回结果包含正确的配额信息和状态
   */
  static checkUsageLimit(
    ip: string,
    usageLimit: UsageLimit,
  ): UsageLimitCheckResult {
    // 前置条件验证
    if (!ip || typeof ip !== 'string') {
      throw new Error('IP address is required and must be a string');
    }

    if (!UsageLimitRules.isValidIPAddress(ip)) {
      throw new Error('IP address must be valid IPv4 format');
    }

    if (!usageLimit) {
      throw new Error('UsageLimit instance is required');
    }

    if (usageLimit.getIP() !== ip) {
      throw new Error('IP address must match the UsageLimit instance IP');
    }

    // 执行业务逻辑
    const result = usageLimit.canUse();

    // 后置条件验证
    if (result.isAllowed()) {
      const remainingQuota = result.getRemainingQuota();
      if (remainingQuota === undefined || remainingQuota < 0) {
        throw new Error('Allowed result must have valid remaining quota >= 0');
      }

      if (remainingQuota > usageLimit.getAvailableQuota()) {
        throw new Error('Remaining quota cannot exceed available quota');
      }
    } else {
      const blockReason = result.getBlockReason();
      if (!blockReason || blockReason.length === 0) {
        throw new Error('Blocked result must have a valid block reason');
      }
    }

    return result;
  }

  /**
   * 合约方法 - 记录使用
   * 前置条件: IP有效且有可用配额
   * 后置条件: 使用计数正确递增，剩余配额正确递减
   */
  static recordUsage(ip: string, usageLimit: UsageLimit): UsageRecordResult {
    // 前置条件验证
    if (!UsageLimitRules.isValidIPAddress(ip)) {
      throw new Error('IP address must be valid IPv4 format');
    }

    if (!usageLimit) {
      throw new Error('UsageLimit instance is required');
    }

    if (usageLimit.getIP() !== ip) {
      throw new Error('IP address must match the UsageLimit instance IP');
    }

    // 捕获执行前状态
    const beforeUsage = usageLimit.getCurrentUsage();
    const beforeAvailable = usageLimit.getAvailableQuota();

    // 执行业务逻辑
    const result = usageLimit.recordUsage();

    // 后置条件验证
    if (result.isSuccess()) {
      const currentUsage = result.getCurrentUsage();
      const remainingQuota = result.getRemainingQuota();

      if (currentUsage === undefined || remainingQuota === undefined) {
        throw new Error(
          'Successful result must have current usage and remaining quota',
        );
      }

      // 验证使用计数递增
      if (currentUsage !== beforeUsage + 1) {
        throw new Error(
          `Usage count should increment by 1: expected ${beforeUsage + 1}, got ${currentUsage}`,
        );
      }

      // 验证剩余配额递减
      if (remainingQuota !== beforeAvailable - 1) {
        throw new Error(
          `Remaining quota should decrement by 1: expected ${beforeAvailable - 1}, got ${remainingQuota}`,
        );
      }

      // 验证配额一致性
      if (
        currentUsage + remainingQuota !==
        usageLimit.getUsageStatistics().availableQuota
      ) {
        throw new Error(
          'Current usage + remaining quota must equal total available quota',
        );
      }
    } else {
      const error = result.getError();
      if (!error || error.length === 0) {
        throw new Error('Failed result must have a valid error message');
      }
    }

    return result;
  }

  /**
   * 合约方法 - 添加奖励配额
   * 前置条件: 奖励类型有效，数量为正数
   * 后置条件: 配额正确增加，事件正确发布
   */
  static addBonusQuota(
    ip: string,
    usageLimit: UsageLimit,
    bonusType: BonusType,
    amount: number,
  ): void {
    // 前置条件验证
    if (!UsageLimitRules.isValidIPAddress(ip)) {
      throw new Error('IP address must be valid IPv4 format');
    }

    if (!usageLimit) {
      throw new Error('UsageLimit instance is required');
    }

    if (usageLimit.getIP() !== ip) {
      throw new Error('IP address must match the UsageLimit instance IP');
    }

    if (!Object.values(BonusType).includes(bonusType)) {
      throw new Error('Bonus type must be a valid BonusType enum value');
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error('Bonus amount must be a positive integer');
    }

    if (amount > UsageLimitRules.MAX_BONUS_QUOTA) {
      throw new Error(
        `Bonus amount cannot exceed maximum limit: ${UsageLimitRules.MAX_BONUS_QUOTA}`,
      );
    }

    // 捕获执行前状态
    const beforeStats = usageLimit.getUsageStatistics();
    const beforeAvailable = beforeStats.availableQuota;
    const beforeBonus = beforeStats.bonusQuota;
    const beforeEvents = usageLimit.getUncommittedEvents().length;

    // 执行业务逻辑
    usageLimit.addBonusQuota(bonusType, amount);

    // 后置条件验证
    const afterStats = usageLimit.getUsageStatistics();
    const afterAvailable = afterStats.availableQuota;
    const afterBonus = afterStats.bonusQuota;
    const afterEvents = usageLimit.getUncommittedEvents().length;

    // 验证配额增加
    if (afterAvailable !== beforeAvailable + amount) {
      throw new Error(
        `Available quota should increase by ${amount}: expected ${beforeAvailable + amount}, got ${afterAvailable}`,
      );
    }

    // 验证奖励配额增加
    if (afterBonus !== beforeBonus + amount) {
      throw new Error(
        `Bonus quota should increase by ${amount}: expected ${beforeBonus + amount}, got ${afterBonus}`,
      );
    }

    // 验证事件发布
    if (afterEvents !== beforeEvents + 1) {
      throw new Error(
        'Adding bonus quota should generate exactly one domain event',
      );
    }
  }

  /**
   * 合约方法 - 创建使用限制
   * 前置条件: IP有效，策略有效
   * 后置条件: 创建的对象具有正确的初始状态
   */
  static createUsageLimit(ip: string, policy: UsageLimitPolicy): UsageLimit {
    // 前置条件验证
    if (!UsageLimitRules.isValidIPAddress(ip)) {
      throw new Error('IP address must be valid IPv4 format');
    }

    if (!policy) {
      throw new Error('Usage limit policy is required');
    }

    if (!UsageLimitRules.isValidUsagePolicy(policy)) {
      throw new Error(
        'Usage limit policy must be valid according to business rules',
      );
    }

    // 执行创建逻辑
    const usageLimit = UsageLimit.create(ip, policy);

    // 后置条件验证
    if (!usageLimit) {
      throw new Error('UsageLimit creation should return a valid instance');
    }

    if (usageLimit.getIP() !== ip) {
      throw new Error('Created UsageLimit should have the correct IP address');
    }

    if (usageLimit.getCurrentUsage() !== 0) {
      throw new Error('New UsageLimit should have zero initial usage');
    }

    if (usageLimit.getAvailableQuota() !== policy.dailyLimit) {
      throw new Error(
        `New UsageLimit should have available quota equal to daily limit: expected ${policy.dailyLimit}, got ${usageLimit.getAvailableQuota()}`,
      );
    }

    const events = usageLimit.getUncommittedEvents();
    if (events.length !== 1) {
      throw new Error(
        'Creating UsageLimit should generate exactly one creation event',
      );
    }

    const creationEvent = events[0];
    if (creationEvent.constructor.name !== 'UsageLimitCreatedEvent') {
      throw new Error('First event should be UsageLimitCreatedEvent');
    }

    return usageLimit;
  }

  /**
   * 合约方法 - 验证每日重置逻辑
   * 前置条件: 使用限制实例有效
   * 后置条件: 重置后状态正确
   */
  static validateDailyReset(usageLimit: UsageLimit): boolean {
    // 前置条件验证
    if (!usageLimit) {
      throw new Error('UsageLimit instance is required');
    }

    // 模拟第二天的场景
    const beforeUsage = usageLimit.getCurrentUsage();
    const policy = UsageLimitPolicy.createDefault();

    // 检查是否需要重置（通过调用canUse触发重置检查）
    usageLimit.canUse();

    // 后置条件验证（如果发生了重置）
    const afterUsage = usageLimit.getCurrentUsage();
    const afterAvailable = usageLimit.getAvailableQuota();

    // 如果发生重置，验证状态
    const resetOccurred = afterUsage < beforeUsage;
    if (resetOccurred) {
      if (afterUsage !== 0) {
        throw new Error('After daily reset, usage count should be zero');
      }

      if (afterAvailable !== policy.dailyLimit) {
        throw new Error(
          `After daily reset, available quota should be daily limit: expected ${policy.dailyLimit}, got ${afterAvailable}`,
        );
      }

      // 验证重置事件
      const events = usageLimit.getUncommittedEvents();
      const resetEvent = events.find(
        (e) => e.constructor.name === 'DailyUsageResetEvent',
      );
      if (!resetEvent) {
        throw new Error('Daily reset should generate a DailyUsageResetEvent');
      }
    }

    return resetOccurred;
  }

  /**
   * 不变性验证 - 使用限制核心不变性
   */
  static validateInvariants(usageLimit: UsageLimit): void {
    if (!usageLimit) {
      throw new Error(
        'UsageLimit instance is required for invariant validation',
      );
    }

    const stats = usageLimit.getUsageStatistics();

    // 不变性1: 当前使用量不能超过可用配额
    if (stats.currentUsage > stats.availableQuota) {
      throw new Error(
        `Invariant violation: Current usage (${stats.currentUsage}) cannot exceed available quota (${stats.availableQuota})`,
      );
    }

    // 不变性2: 当前使用量不能为负数
    if (stats.currentUsage < 0) {
      throw new Error(
        `Invariant violation: Current usage cannot be negative: ${stats.currentUsage}`,
      );
    }

    // 不变性3: 可用配额必须包含基础配额
    if (stats.availableQuota < stats.dailyLimit) {
      throw new Error(
        `Invariant violation: Available quota (${stats.availableQuota}) cannot be less than daily limit (${stats.dailyLimit})`,
      );
    }

    // 不变性4: 奖励配额不能为负数
    if (stats.bonusQuota < 0) {
      throw new Error(
        `Invariant violation: Bonus quota cannot be negative: ${stats.bonusQuota}`,
      );
    }

    // 不变性5: IP地址格式必须有效
    if (!UsageLimitRules.isValidIPAddress(stats.ip)) {
      throw new Error(
        `Invariant violation: IP address must be valid: ${stats.ip}`,
      );
    }

    // 不变性6: 重置时间必须是未来时间
    const now = new Date();
    if (stats.resetAt <= now) {
      // 允许1分钟的时钟偏差
      const allowedSkew = 60 * 1000; // 1 minute in milliseconds
      if (stats.resetAt.getTime() + allowedSkew <= now.getTime()) {
        throw new Error(
          `Invariant violation: Reset time must be in the future (with 1-minute tolerance): ${stats.resetAt}`,
        );
      }
    }
  }

  /**
   * 性能合约 - 验证操作在可接受时间内完成
   */
  static performanceContract<T>(
    operation: () => T,
    maxExecutionTimeMs = 100,
    operationName = 'Operation',
  ): T {
    const startTime = Date.now();

    try {
      const result = operation();

      const executionTime = Date.now() - startTime;
      if (executionTime > maxExecutionTimeMs) {
        throw new Error(
          `Performance contract violation: ${operationName} took ${executionTime}ms, maximum allowed: ${maxExecutionTimeMs}ms`,
        );
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (executionTime > maxExecutionTimeMs) {
        throw new Error(
          `Performance contract violation: ${operationName} took ${executionTime}ms (with error), maximum allowed: ${maxExecutionTimeMs}ms`,
        );
      }
      throw error;
    }
  }
}

// 辅助类型
/**
 * Defines the shape of the contract validation result.
 */
export interface ContractValidationResult {
  isValid: boolean;
  violations: string[];
  executionTimeMs?: number;
}
