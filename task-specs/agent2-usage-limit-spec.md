# Agent-2: UsageLimit领域服务任务规范

## 🎯 任务目标
实现使用限制的核心业务逻辑和规则引擎，包括IP限制、配额管理、奖励计算的完整领域服务。

## 📋 输入依赖
- Agent-1的UserSession领域模型
- Redis基础设施接口定义

## 📦 交付物

### 1. 使用控制领域模型
**文件**: `libs/shared-dtos/src/domains/usage-control.dto.ts`

```typescript
// 使用控制聚合
export class UsageControl {
  constructor(
    private readonly id: UsageControlId,
    private readonly ip: IPAddress,
    private readonly date: Date,
    private usage: UsageRecord,
    private bonuses: BonusRecord
  ) {}

  // 工厂方法
  static createForIP(ip: string, date?: Date): UsageControl;
  static restore(data: UsageControlData): UsageControl;

  // 核心业务方法
  checkCanUse(): UsageCheckResult;
  recordUsage(activityType: ActivityType): UsageResult;
  applyQuestionnaireBonu(): BonusResult;
  applyPaymentBonus(paymentId: string): BonusResult;
  
  // 查询方法
  getRemainingQuota(): number;
  getTotalLimit(): number;
  getUsageBreakdown(): UsageBreakdown;
  isExpired(): boolean;
  
  // 领域事件
  getUncommittedEvents(): DomainEvent[];
}

// 值对象
export class UsageRecord extends ValueObject<{
  count: number;
  activities: ActivityRecord[];
  lastActivity: Date;
}> {}

export class BonusRecord extends ValueObject<{
  questionnaires: number;
  payments: number;
  referrals: number;
}> {}

export class UsageCheckResult extends ValueObject<{
  canUse: boolean;
  reason?: string;
  remaining: number;
  resetTime: Date;
}> {}

// 领域服务
export class UsageLimitCalculationService {
  calculateTotalLimit(base: number, bonuses: BonusRecord): number;
  calculateRemainingQuota(totalLimit: number, used: number): number;
  isWithinDailyLimit(usage: UsageRecord, limit: number): boolean;
}
```

### 2. 使用限制规则引擎
**文件**: `libs/shared-dtos/src/domains/usage-control.rules.ts`

```typescript
export class UsageControlRules {
  static readonly BASE_DAILY_LIMIT = 5;
  static readonly QUESTIONNAIRE_BONUS = 5;
  static readonly PAYMENT_BONUS = 5;
  static readonly REFERRAL_BONUS = 2;
  static readonly MAX_BONUSES_PER_DAY = 3;
  
  // 规则验证方法
  static canRecordUsage(control: UsageControl): boolean;
  static canApplyQuestionnaireBonus(control: UsageControl): boolean;
  static canApplyPaymentBonus(control: UsageControl, paymentId: string): boolean;
  static calculateNextResetTime(date: Date): Date;
  static isValidActivityType(type: string): boolean;
}

// 规则验证器
export class UsageRuleValidator {
  validateUsageAttempt(control: UsageControl): ValidationResult;
  validateBonusApplication(control: UsageControl, bonusType: BonusType): ValidationResult;
  validateDailyLimit(usage: number, limit: number): ValidationResult;
}
```

### 3. 领域服务实现
**文件**: `libs/shared-dtos/src/domains/usage-control.service.ts`

```typescript
export class UsageControlDomainService {
  constructor(
    private readonly repository: IUsageControlRepository,
    private readonly eventBus: IDomainEventBus
  ) {}

  async enforceUsageLimit(ip: string): Promise<UsageEnforcementResult> {
    const control = await this.getOrCreateUsageControl(ip);
    
    const checkResult = control.checkCanUse();
    if (!checkResult.canUse) {
      await this.publishLimitExceededEvent(control, checkResult);
      return UsageEnforcementResult.blocked(checkResult.reason);
    }
    
    const usageResult = control.recordUsage(ActivityType.AI_PROCESSING);
    await this.repository.save(control);
    await this.publishUsageRecordedEvent(control, usageResult);
    
    return UsageEnforcementResult.allowed(usageResult);
  }

  async applyIncentiveBonus(
    ip: string, 
    bonusType: BonusType, 
    metadata?: BonusMetadata
  ): Promise<BonusApplicationResult> {
    const control = await this.getOrCreateUsageControl(ip);
    
    let bonusResult: BonusResult;
    switch (bonusType) {
      case BonusType.QUESTIONNAIRE:
        bonusResult = control.applyQuestionnaireBonus();
        break;
      case BonusType.PAYMENT:
        bonusResult = control.applyPaymentBonus(metadata.paymentId);
        break;
      default:
        throw new Error(`Unsupported bonus type: ${bonusType}`);
    }
    
    if (bonusResult.applied) {
      await this.repository.save(control);
      await this.publishBonusAppliedEvent(control, bonusResult);
    }
    
    return BonusApplicationResult.create(bonusResult);
  }

  private async getOrCreateUsageControl(ip: string): Promise<UsageControl> {
    const today = new Date();
    const existing = await this.repository.findByIPAndDate(ip, today);
    
    return existing || UsageControl.createForIP(ip, today);
  }
}
```

### 4. 契约定义
**文件**: `libs/shared-dtos/src/contracts/usage-control.contracts.ts`

```typescript
import { Requires, Ensures, Invariant } from '../contracts/dbc.decorators';

export class UsageControlContracts {
  
  @Requires(
    (ip: string) => ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip),
    'IP address must be valid IPv4 format'
  )
  @Ensures(
    (result: UsageEnforcementResult) => 
      result.allowed ? result.remainingQuota >= 0 : result.blockReason.length > 0,
    'Allowed usage must have non-negative remaining quota, blocked usage must have reason'
  )
  async enforceUsageLimit(ip: string): Promise<UsageEnforcementResult> {
    // Contract-protected implementation
  }

  @Requires(
    (ip: string, bonusType: BonusType) => 
      ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip) && Object.values(BonusType).includes(bonusType),
    'IP must be valid and bonus type must be supported'
  )
  @Ensures(
    (result: BonusApplicationResult) => 
      result.applied ? result.newLimit > result.oldLimit : result.reason.length > 0,
    'Applied bonus must increase limit, failed bonus must have reason'
  )
  async applyIncentiveBonus(ip: string, bonusType: BonusType): Promise<BonusApplicationResult> {
    // Contract-protected implementation
  }
}
```

### 5. 领域事件
**文件**: `libs/shared-dtos/src/events/usage-control-events.dto.ts`

```typescript
export class UsageLimitExceededEvent implements DomainEvent {
  constructor(
    public readonly ip: string,
    public readonly currentUsage: number,
    public readonly limit: number,
    public readonly resetTime: Date,
    public readonly occurredAt: Date
  ) {}
}

export class UsageRecordedEvent implements DomainEvent {
  constructor(
    public readonly ip: string,
    public readonly activityType: ActivityType,
    public readonly newUsageCount: number,
    public readonly remainingQuota: number,
    public readonly occurredAt: Date
  ) {}
}

export class BonusAppliedEvent implements DomainEvent {
  constructor(
    public readonly ip: string,
    public readonly bonusType: BonusType,
    public readonly bonusAmount: number,
    public readonly newLimit: number,
    public readonly occurredAt: Date
  ) {}
}
```

## 🧪 测试规范

### 测试文件位置
`libs/shared-dtos/src/domains/__tests__/usage-control.test.ts`

### 必需测试用例 (20个)

#### 使用控制核心逻辑 (10个)
1. **基础使用限制**
   - 日限制5次正常工作
   - 超过5次后拒绝使用
   - 跨天重置使用计数

2. **奖励机制**
   - 问卷奖励正确增加5次配额
   - 支付奖励正确增加5次配额
   - 推荐奖励正确增加2次配额

3. **规则验证**
   - 每日最多3次奖励限制
   - 重复支付ID不能重复使用
   - 同一问卷不能重复奖励

#### 领域服务测试 (6个)
4. **使用执行测试**
   - 正常使用执行成功
   - 超限使用执行失败
   - 使用统计正确更新

5. **奖励应用测试**
   - 有效奖励应用成功
   - 无效奖励应用失败
   - 奖励后配额正确计算

#### 契约测试 (4个)
6. **前置条件验证**
   - IP格式验证
   - 奖励类型验证

7. **后置条件验证**
   - 使用结果一致性
   - 奖励结果一致性

### 测试结构模板

```typescript
describe('UsageControl Domain Service', () => {
  describe('Usage Enforcement', () => {
    it('should allow usage within daily limit', async () => {
      // Given: IP with 2 uses today
      const ip = '192.168.1.1';
      const control = UsageControl.createForIP(ip);
      control.recordUsage(ActivityType.AI_PROCESSING);
      control.recordUsage(ActivityType.AI_PROCESSING);
      
      // When: attempting 3rd usage
      const result = control.checkCanUse();
      
      // Then: should be allowed
      expect(result.canUse).toBe(true);
      expect(result.remaining).toBe(3);
    });

    it('should block usage when daily limit exceeded', async () => {
      // Given: IP with 5 uses today (at limit)
      const control = UsageControl.createForIP('192.168.1.1');
      for (let i = 0; i < 5; i++) {
        control.recordUsage(ActivityType.AI_PROCESSING);
      }
      
      // When: attempting 6th usage
      const result = control.checkCanUse();
      
      // Then: should be blocked
      expect(result.canUse).toBe(false);
      expect(result.reason).toBe('Daily limit exceeded');
      expect(result.remaining).toBe(0);
    });

    // ... 18 more test cases
  });

  describe('Bonus Application', () => {
    it('should apply questionnaire bonus correctly', async () => {
      // Given: control at daily limit
      const control = UsageControl.createForIP('192.168.1.1');
      for (let i = 0; i < 5; i++) {
        control.recordUsage(ActivityType.AI_PROCESSING);
      }
      
      // When: applying questionnaire bonus
      const result = control.applyQuestionnaireBonus();
      
      // Then: should increase quota by 5
      expect(result.applied).toBe(true);
      expect(control.getTotalLimit()).toBe(10);
      expect(control.getRemainingQuota()).toBe(5);
    });
  });

  describe('Contract Validation', () => {
    it('should validate IP format in usage enforcement', async () => {
      const service = new UsageControlDomainService(mockRepo, mockBus);
      
      // Should throw contract violation for invalid IP
      await expect(service.enforceUsageLimit('invalid-ip'))
        .rejects.toThrow('IP address must be valid IPv4 format');
    });
  });
});
```

## ✅ 验收标准

### 功能验收
- [ ] 基础5次日限制正确实现
- [ ] 三种奖励机制(问卷/支付/推荐)正确实现
- [ ] 跨天重置逻辑正确工作
- [ ] 重复奖励防护机制生效

### 质量验收
- [ ] 20个测试用例全部通过
- [ ] 代码覆盖率 ≥ 95%
- [ ] 领域服务正确实现业务逻辑
- [ ] 契约验证全部生效

### DDD原则验收
- [ ] 领域服务职责清晰
- [ ] 业务规则正确封装
- [ ] 聚合边界合理
- [ ] 领域事件正确发布

## 🔗 接口定义 (为其他Agent提供)

```typescript
export interface IUsageControlService {
  enforceUsageLimit(ip: string): Promise<UsageEnforcementResult>;
  applyIncentiveBonus(ip: string, bonusType: BonusType, metadata?: any): Promise<BonusApplicationResult>;
  getUsageStats(ip: string): Promise<UsageStats>;
  resetDailyUsage(ip: string): Promise<void>;
}

export interface IUsageControlRepository {
  save(control: UsageControl): Promise<void>;
  findByIPAndDate(ip: string, date: Date): Promise<UsageControl | null>;
  findExpiredControls(): Promise<UsageControl[]>;
}
```

## 🚀 完成信号
```
Agent-2 UsageControl Domain Service Completed ✅
- Domain aggregates: 1 implemented  
- Domain services: 2 implemented
- Business rules: 6 rules implemented
- Domain events: 3 events implemented
- Contracts: 2 methods with validation
- Tests: 20/20 passing (96% coverage)
```