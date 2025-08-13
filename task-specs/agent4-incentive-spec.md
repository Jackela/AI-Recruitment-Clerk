# Agent-4: Incentive领域服务任务规范

## 🎯 任务目标
实现红包激励系统的完整业务逻辑，包括奖励计算、发放状态管理、成本控制、支付集成的领域服务。

## 📋 输入依赖
- Agent-1的UserSession领域模型
- Agent-3的Questionnaire领域实体
- 支付平台API接口定义(微信/支付宝)

## 📦 交付物

### 1. 激励系统领域模型
**文件**: `libs/shared-dtos/src/domains/incentive-system.dto.ts`

```typescript
// 激励聚合根
export class IncentiveReward {
  constructor(
    private readonly id: IncentiveRewardId,
    private readonly recipient: RewardRecipient,
    private readonly rewardType: RewardType,
    private readonly amount: MonetaryAmount,
    private status: RewardStatus,
    private readonly eligibilityReason: EligibilityReason,
    private readonly paymentDetails: PaymentDetails,
    private readonly createdAt: Date,
    private processedAt?: Date,
    private failureReason?: string
  ) {}

  // 工厂方法
  static createQuestionnaireReward(
    recipient: RewardRecipient,
    questionnaireId: string,
    qualityScore: number
  ): IncentiveReward;
  
  static createReferralReward(
    recipient: RewardRecipient,
    referralData: ReferralData
  ): IncentiveReward;
  
  static restore(data: IncentiveRewardData): IncentiveReward;

  // 核心业务方法
  calculateRewardAmount(): MonetaryAmount;
  canBePaid(): boolean;
  markAsPending(): void;
  markAsProcessing(): void;
  markAsPaid(transactionId: string): void;
  markAsFailed(reason: string): void;
  
  // 查询方法
  isEligibleForPayment(): boolean;
  getPaymentReference(): string;
  getRewardSummary(): RewardSummary;
  getDaysSincePending(): number;
  
  // 领域事件
  getUncommittedEvents(): DomainEvent[];
}

// 奖励类型值对象
export class RewardType extends ValueObject<{
  type: 'questionnaire_basic' | 'questionnaire_quality' | 'referral' | 'payment_bonus';
  baseAmount: number;
  bonusAmount?: number;
  description: string;
}> {}

// 收款人信息值对象
export class RewardRecipient extends ValueObject<{
  ip: string;
  contactMethod: 'wechat' | 'alipay';
  contactAccount: string;
  displayName?: string;
}> {}

// 金额值对象
export class MonetaryAmount extends ValueObject<{
  amount: number; // 分为单位
  currency: 'CNY';
}> {
  static fromYuan(yuan: number): MonetaryAmount {
    return new MonetaryAmount({ amount: Math.round(yuan * 100), currency: 'CNY' });
  }
  
  toYuan(): number {
    return this.props.amount / 100;
  }
  
  add(other: MonetaryAmount): MonetaryAmount {
    return new MonetaryAmount({
      amount: this.props.amount + other.props.amount,
      currency: this.props.currency
    });
  }
}

// 支付详情值对象
export class PaymentDetails extends ValueObject<{
  paymentMethod: 'wechat' | 'alipay';
  recipientAccount: string;
  transactionId?: string;
  paymentReference: string;
  attemptCount: number;
  lastAttemptAt?: Date;
}> {}

// 资格原因值对象
export class EligibilityReason extends ValueObject<{
  primaryReason: string;
  qualityScore?: number;
  questionnaireId?: string;
  referralId?: string;
  evidenceData: Record<string, any>;
}> {}
```

### 2. 激励业务规则引擎
**文件**: `libs/shared-dtos/src/domains/incentive-system.rules.ts`

```typescript
export class IncentiveRules {
  // 奖励金额规则
  static readonly BASE_QUESTIONNAIRE_REWARD = 500; // 5元 (分)
  static readonly QUALITY_BONUS_REWARD = 300;      // 3元质量奖励 (分)
  static readonly REFERRAL_REWARD = 200;           // 2元推荐奖励 (分)
  
  // 限制规则
  static readonly DAILY_BUDGET_LIMIT = 20000;      // 200元日预算 (分)
  static readonly MAX_REWARDS_PER_IP = 1;          // 每IP每日最多1次奖励
  static readonly REWARD_VALIDITY_DAYS = 30;       // 奖励有效期30天
  static readonly MAX_RETRY_ATTEMPTS = 3;          // 最多重试3次
  
  // 质量门槛
  static readonly MIN_QUALITY_SCORE_FOR_BONUS = 70;
  static readonly MIN_TEXT_LENGTH_FOR_QUALITY = 50;

  // 业务规则方法
  static calculateQuestionnaireReward(
    qualityScore: number,
    hasDetailedFeedback: boolean
  ): MonetaryAmount {
    let totalAmount = this.BASE_QUESTIONNAIRE_REWARD;
    
    // 质量奖励
    if (qualityScore >= this.MIN_QUALITY_SCORE_FOR_BONUS && hasDetailedFeedback) {
      totalAmount += this.QUALITY_BONUS_REWARD;
    }
    
    return new MonetaryAmount({ amount: totalAmount, currency: 'CNY' });
  }

  static isEligibleForQualityBonus(
    qualityScore: number,
    textLength: number
  ): boolean {
    return qualityScore >= this.MIN_QUALITY_SCORE_FOR_BONUS &&
           textLength >= this.MIN_TEXT_LENGTH_FOR_QUALITY;
  }

  static canReceiveRewardToday(
    ip: string,
    existingRewardsToday: IncentiveReward[]
  ): boolean {
    const ipRewardsToday = existingRewardsToday.filter(r => 
      r.getRecipient().props.ip === ip &&
      r.getStatus() !== RewardStatus.FAILED
    );
    
    return ipRewardsToday.length < this.MAX_REWARDS_PER_IP;
  }

  static isWithinDailyBudget(
    pendingAmount: MonetaryAmount,
    todaySpent: MonetaryAmount
  ): boolean {
    const totalAmount = todaySpent.add(pendingAmount);
    return totalAmount.props.amount <= this.DAILY_BUDGET_LIMIT;
  }

  static shouldRetryPayment(reward: IncentiveReward): boolean {
    return reward.getPaymentDetails().props.attemptCount < this.MAX_RETRY_ATTEMPTS &&
           reward.getDaysSincePending() <= this.REWARD_VALIDITY_DAYS;
  }
}
```

### 3. 激励领域服务
**文件**: `libs/shared-dtos/src/domains/incentive-system.service.ts`

```typescript
export class IncentiveDomainService {
  constructor(
    private readonly repository: IIncentiveRewardRepository,
    private readonly budgetService: IBudgetControlService,
    private readonly paymentGateway: IPaymentGatewayService,
    private readonly eventBus: IDomainEventBus
  ) {}

  async processQuestionnaireReward(
    ip: string,
    questionnaireId: string,
    qualityScore: number,
    contactInfo: RewardContactInfo
  ): Promise<IncentiveProcessingResult> {
    try {
      // 检查每日奖励限制
      const todayRewards = await this.repository.findTodayRewardsByIP(ip);
      if (!IncentiveRules.canReceiveRewardToday(ip, todayRewards)) {
        return IncentiveProcessingResult.blocked(
          'Daily reward limit exceeded for this IP'
        );
      }
      
      // 计算奖励金额
      const rewardAmount = IncentiveRules.calculateQuestionnaireReward(
        qualityScore,
        qualityScore >= IncentiveRules.MIN_QUALITY_SCORE_FOR_BONUS
      );
      
      // 检查日预算
      const todaySpent = await this.budgetService.getTodaySpent();
      if (!IncentiveRules.isWithinDailyBudget(rewardAmount, todaySpent)) {
        return IncentiveProcessingResult.budgetExceeded(
          'Daily budget limit reached'
        );
      }
      
      // 创建奖励记录
      const recipient = new RewardRecipient({
        ip,
        contactMethod: contactInfo.method,
        contactAccount: contactInfo.account,
        displayName: contactInfo.displayName
      });
      
      const reward = IncentiveReward.createQuestionnaireReward(
        recipient,
        questionnaireId,
        qualityScore
      );
      
      // 保存奖励记录
      await this.repository.save(reward);
      
      // 异步处理支付
      await this.initiatePaymentProcess(reward);
      
      // 发布领域事件
      await this.publishRewardCreatedEvent(reward);
      
      return IncentiveProcessingResult.success({
        rewardId: reward.getId().value,
        amount: rewardAmount.toYuan(),
        expectedProcessingTime: '1-3分钟',
        qualityBonus: qualityScore >= IncentiveRules.MIN_QUALITY_SCORE_FOR_BONUS
      });
      
    } catch (error) {
      await this.handleProcessingError(error, { ip, questionnaireId });
      return IncentiveProcessingResult.error(error.message);
    }
  }

  async processPaymentResult(
    rewardId: string,
    paymentResult: PaymentResult
  ): Promise<void> {
    const reward = await this.repository.findById(rewardId);
    if (!reward) {
      throw new Error(`Reward not found: ${rewardId}`);
    }

    if (paymentResult.success) {
      reward.markAsPaid(paymentResult.transactionId);
      await this.publishRewardPaidEvent(reward, paymentResult);
    } else {
      reward.markAsFailed(paymentResult.errorMessage);
      
      // 检查是否需要重试
      if (IncentiveRules.shouldRetryPayment(reward)) {
        await this.schedulePaymentRetry(reward);
      } else {
        await this.publishRewardFailedEvent(reward, paymentResult);
      }
    }
    
    await this.repository.save(reward);
  }

  async getIncentiveStats(dateRange?: DateRange): Promise<IncentiveStats> {
    const rewards = await this.repository.findByDateRange(
      dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      dateRange?.end || new Date()
    );

    return IncentiveStats.create({
      totalRewards: rewards.length,
      totalAmount: this.calculateTotalAmount(rewards),
      successRate: this.calculateSuccessRate(rewards),
      averageProcessingTime: this.calculateAverageProcessingTime(rewards),
      rewardBreakdown: this.groupRewardsByType(rewards),
      dailyTrends: this.calculateDailyTrends(rewards)
    });
  }

  private async initiatePaymentProcess(reward: IncentiveReward): Promise<void> {
    reward.markAsProcessing();
    
    const paymentRequest = new PaymentRequest({
      rewardId: reward.getId().value,
      amount: reward.getAmount(),
      recipient: reward.getRecipient(),
      paymentMethod: reward.getPaymentDetails().props.paymentMethod,
      reference: reward.getPaymentReference()
    });
    
    // 异步发起支付
    await this.paymentGateway.initiatePayment(paymentRequest);
  }

  private async schedulePaymentRetry(reward: IncentiveReward): Promise<void> {
    const retryDelay = this.calculateRetryDelay(
      reward.getPaymentDetails().props.attemptCount
    );
    
    // 这里应该集成任务调度系统
    setTimeout(async () => {
      await this.initiatePaymentProcess(reward);
    }, retryDelay);
  }

  private calculateRetryDelay(attemptCount: number): number {
    // 指数退避: 1分钟, 5分钟, 15分钟
    const delays = [60000, 300000, 900000];
    return delays[Math.min(attemptCount, delays.length - 1)];
  }
}
```

### 4. 契约定义
**文件**: `libs/shared-dtos/src/contracts/incentive-system.contracts.ts`

```typescript
import { Requires, Ensures, Invariant } from '../contracts/dbc.decorators';

export class IncentiveSystemContracts {
  
  @Requires(
    (ip: string, questionnaireId: string, qualityScore: number, contactInfo: RewardContactInfo) =>
      ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip) &&
      questionnaireId && questionnaireId.length > 0 &&
      qualityScore >= 0 && qualityScore <= 100 &&
      contactInfo && contactInfo.method && contactInfo.account,
    'IP must be valid, questionnaireId non-empty, quality score 0-100, contact info complete'
  )
  @Ensures(
    (result: IncentiveProcessingResult) =>
      result.success ? 
        result.data.amount > 0 && result.data.rewardId.length > 0 :
        result.errorMessage.length > 0,
    'Successful processing must have positive amount and reward ID, failed processing must have error message'
  )
  async processQuestionnaireReward(
    ip: string,
    questionnaireId: string,
    qualityScore: number,
    contactInfo: RewardContactInfo
  ): Promise<IncentiveProcessingResult> {
    // Contract-protected implementation
  }

  @Requires(
    (rewardId: string, paymentResult: PaymentResult) =>
      rewardId && rewardId.length > 0 &&
      paymentResult && typeof paymentResult.success === 'boolean',
    'Reward ID must be non-empty and payment result must have success boolean'
  )
  @Ensures(
    () => true, // 状态更新无特定后置条件，主要依赖副作用
    'Payment result processing completes without throwing'
  )
  async processPaymentResult(
    rewardId: string,
    paymentResult: PaymentResult
  ): Promise<void> {
    // Contract-protected implementation
  }
}
```

### 5. 领域事件
**文件**: `libs/shared-dtos/src/events/incentive-events.dto.ts`

```typescript
export class RewardCreatedEvent implements DomainEvent {
  constructor(
    public readonly rewardId: string,
    public readonly recipientIP: string,
    public readonly rewardType: string,
    public readonly amount: number, // 元为单位
    public readonly questionnaireId?: string,
    public readonly qualityScore?: number,
    public readonly occurredAt: Date = new Date()
  ) {}
}

export class RewardPaidEvent implements DomainEvent {
  constructor(
    public readonly rewardId: string,
    public readonly recipientIP: string,
    public readonly amount: number,
    public readonly transactionId: string,
    public readonly paymentMethod: string,
    public readonly processingTimeMs: number,
    public readonly occurredAt: Date = new Date()
  ) {}
}

export class RewardFailedEvent implements DomainEvent {
  constructor(
    public readonly rewardId: string,
    public readonly recipientIP: string,
    public readonly amount: number,
    public readonly failureReason: string,
    public readonly attemptCount: number,
    public readonly willRetry: boolean,
    public readonly occurredAt: Date = new Date()
  ) {}
}

export class DailyBudgetExceededEvent implements DomainEvent {
  constructor(
    public readonly requestedAmount: number,
    public readonly availableBudget: number,
    public readonly totalSpentToday: number,
    public readonly occurredAt: Date = new Date()
  ) {}
}
```

## 🧪 测试规范

### 测试文件位置
`libs/shared-dtos/src/domains/__tests__/incentive-system.test.ts`

### 必需测试用例 (25个)

#### 奖励计算测试 (8个)
1. **基础奖励计算**
   - 基础问卷奖励5元计算正确
   - 高质量奖励额外3元计算正确
   - 推荐奖励2元计算正确

2. **资格验证测试**
   - 质量分数达标获得奖励
   - 质量分数不达标仅获得基础奖励
   - 每IP每日限制1次生效

#### 业务规则测试 (8个)
3. **限制规则测试**
   - 日预算200元限制生效
   - 每IP每日1次限制生效
   - 奖励有效期30天限制

4. **支付规则测试**
   - 支付重试机制正确
   - 指数退避延迟计算正确
   - 最大重试3次限制

#### 领域服务测试 (6个)
5. **奖励处理测试**
   - 有效问卷奖励处理成功
   - 超出预算奖励处理失败
   - 重复IP奖励处理失败

6. **支付处理测试**
   - 支付成功状态更新正确
   - 支付失败重试调度正确
   - 支付统计计算准确

#### 契约测试 (3个)
7. **前置条件测试**
   - IP格式验证契约
   - 参数有效性验证契约
   - 质量分数范围验证契约

### 测试结构模板

```typescript
describe('IncentiveSystem Domain', () => {
  describe('Reward Creation', () => {
    it('should create questionnaire reward with correct amount', () => {
      // Given: questionnaire with high quality score
      const recipient = createRewardRecipient();
      const questionnaireId = 'quest-123';
      const qualityScore = 85;
      
      // When: creating questionnaire reward
      const reward = IncentiveReward.createQuestionnaireReward(
        recipient,
        questionnaireId,
        qualityScore
      );
      
      // Then: should include base reward + quality bonus
      const expectedAmount = MonetaryAmount.fromYuan(5 + 3); // 5元基础 + 3元质量奖励
      expect(reward.getAmount()).toEqual(expectedAmount);
      expect(reward.isEligibleForPayment()).toBe(true);
    });

    it('should create basic reward only for low quality score', () => {
      const recipient = createRewardRecipient();
      const questionnaireId = 'quest-123';  
      const qualityScore = 60; // 低于70分质量门槛
      
      const reward = IncentiveReward.createQuestionnaireReward(
        recipient,
        questionnaireId,
        qualityScore
      );
      
      const expectedAmount = MonetaryAmount.fromYuan(5); // 仅基础5元
      expect(reward.getAmount()).toEqual(expectedAmount);
    });

    // ... 23 more test cases
  });

  describe('Business Rules', () => {
    it('should respect daily IP reward limit', () => {
      const ip = '192.168.1.1';
      const existingReward = createExistingReward(ip);
      
      const canReceive = IncentiveRules.canReceiveRewardToday(ip, [existingReward]);
      
      expect(canReceive).toBe(false);
    });

    it('should respect daily budget limit', () => {
      const pendingAmount = MonetaryAmount.fromYuan(50);
      const todaySpent = MonetaryAmount.fromYuan(160); // 已花费160元
      
      const withinBudget = IncentiveRules.isWithinDailyBudget(pendingAmount, todaySpent);
      
      expect(withinBudget).toBe(false); // 160 + 50 = 210 > 200预算
    });
  });

  describe('Domain Service', () => {
    it('should process questionnaire reward successfully', async () => {
      const service = new IncentiveDomainService(mockRepo, mockBudget, mockPayment, mockBus);
      const ip = '192.168.1.1';
      const questionnaireId = 'quest-123';
      const qualityScore = 85;
      const contactInfo = createContactInfo();
      
      // Mock dependencies
      mockRepo.findTodayRewardsByIP.mockResolvedValue([]);
      mockBudget.getTodaySpent.mockResolvedValue(MonetaryAmount.fromYuan(50));
      
      const result = await service.processQuestionnaireReward(
        ip, questionnaireId, qualityScore, contactInfo
      );
      
      expect(result.success).toBe(true);
      expect(result.data.amount).toBe(8); // 5 + 3元质量奖励
      expect(result.data.qualityBonus).toBe(true);
    });

    it('should handle payment result correctly', async () => {
      const service = new IncentiveDomainService(mockRepo, mockBudget, mockPayment, mockBus);
      const rewardId = 'reward-123';
      const paymentResult = PaymentResult.success('tx-456');
      
      const mockReward = createMockReward();
      mockRepo.findById.mockResolvedValue(mockReward);
      
      await service.processPaymentResult(rewardId, paymentResult);
      
      expect(mockReward.getStatus()).toBe(RewardStatus.PAID);
      expect(mockRepo.save).toHaveBeenCalledWith(mockReward);
    });
  });

  describe('Contract Validation', () => {
    it('should validate IP format in reward processing', async () => {
      const contracts = new IncentiveSystemContracts();
      
      await expect(contracts.processQuestionnaireReward(
        'invalid-ip', 'quest-123', 85, createContactInfo()
      )).rejects.toThrow('IP must be valid');
    });

    it('should validate quality score range', async () => {
      const contracts = new IncentiveSystemContracts();
      
      await expect(contracts.processQuestionnaireReward(
        '192.168.1.1', 'quest-123', 150, createContactInfo()
      )).rejects.toThrow('quality score 0-100');
    });
  });
});
```

## ✅ 验收标准

### 功能验收
- [ ] 三种奖励类型(基础/质量/推荐)正确实现
- [ ] 日预算和IP限制控制生效
- [ ] 支付重试和错误处理机制完善
- [ ] 奖励统计和分析功能准确

### 质量验收
- [ ] 25个测试用例全部通过
- [ ] 代码覆盖率 ≥ 95%
- [ ] 金额计算精确(分为单位)
- [ ] 契约验证全部生效

### DDD原则验收
- [ ] 聚合根正确封装奖励状态
- [ ] 值对象不可变性保证
- [ ] 领域服务处理复杂业务逻辑
- [ ] 领域事件支持异步处理

## 🔗 接口定义 (为其他Agent提供)

```typescript
export interface IIncentiveDomainService {
  processQuestionnaireReward(
    ip: string,
    questionnaireId: string,
    qualityScore: number,
    contactInfo: RewardContactInfo
  ): Promise<IncentiveProcessingResult>;
  
  processPaymentResult(rewardId: string, paymentResult: PaymentResult): Promise<void>;
  getIncentiveStats(dateRange?: DateRange): Promise<IncentiveStats>;
}

export interface IPaymentGatewayService {
  initiatePayment(request: PaymentRequest): Promise<void>;
  queryPaymentStatus(paymentReference: string): Promise<PaymentStatus>;
}
```

## 🚀 完成信号
```
Agent-4 Incentive Domain Service Completed ✅
- Domain aggregates: 1 implemented
- Value objects: 5 implemented
- Business rules: 12 rules implemented  
- Domain events: 4 events implemented
- Contracts: 2 methods with validation
- Tests: 25/25 passing (96% coverage)
```