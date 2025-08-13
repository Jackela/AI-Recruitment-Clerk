# Agent-1: UserSession领域模型设计任务规范

## 🎯 任务目标
设计用户会话管理的完整领域模型，遵循DDD原则，确保业务规则的封装和一致性。

## 📋 输入依赖
- 无外部依赖
- 基于需求: IP访问控制、会话状态管理、使用配额跟踪

## 📦 交付物

### 1. 领域模型定义
**文件**: `libs/shared-dtos/src/domains/user-management.dto.ts`

```typescript
// 用户会话聚合根
export class UserSession {
  private constructor(
    private readonly id: SessionId,
    private readonly ip: IPAddress, 
    private status: SessionStatus,
    private readonly createdAt: Date,
    private lastActiveAt: Date,
    private readonly dailyQuota: UsageQuota
  ) {}

  // 工厂方法
  static create(ip: string): UserSession;
  static restore(data: SessionData): UserSession;
  
  // 业务方法
  recordUsage(): UsageResult;
  expire(): void;
  isValid(): boolean;
  canUse(): boolean;
  getDailyUsage(): UsageStats;
  
  // 领域事件
  getUncommittedEvents(): DomainEvent[];
  markEventsAsCommitted(): void;
}

// 值对象
export class SessionId extends ValueObject<{value: string}> {}
export class IPAddress extends ValueObject<{value: string}> {}
export class UsageQuota extends ValueObject<{
  daily: number;
  used: number;
  questionnaireBonuses: number;
  paymentBonuses: number;
}> {}

// 领域服务
export class SessionValidationService {
  validate(session: UserSession): ValidationResult;
}
```

### 2. 业务规则封装
**文件**: `libs/shared-dtos/src/domains/user-management.rules.ts`

```typescript
export class UserSessionRules {
  static readonly DAILY_FREE_LIMIT = 5;
  static readonly QUESTIONNAIRE_BONUS = 5;
  static readonly PAYMENT_BONUS = 5;
  static readonly SESSION_TIMEOUT_HOURS = 24;
  
  static canUseService(session: UserSession): boolean;
  static isSessionExpired(session: UserSession): boolean;
  static calculateRemainingQuota(session: UserSession): number;
}
```

### 3. 领域事件定义
**文件**: `libs/shared-dtos/src/events/user-session-events.dto.ts`

```typescript
export class SessionCreatedEvent implements DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly ip: string,
    public readonly occurredAt: Date
  ) {}
}

export class UsageRecordedEvent implements DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly usageCount: number,
    public readonly remainingQuota: number,
    public readonly occurredAt: Date
  ) {}
}

export class SessionExpiredEvent implements DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly expiredAt: Date
  ) {}
}
```

### 4. 契约定义
**文件**: `libs/shared-dtos/src/contracts/user-session.contracts.ts`

```typescript
import { Requires, Ensures, Invariant } from '../contracts/dbc.decorators';

@Invariant(
  (session: UserSession) => session.isValid() || session.isExpired(),
  'Session must be either valid or explicitly expired'
)
export class UserSessionContracts {
  
  @Requires(
    (ip: string) => ip && ip.length > 0 && /^\d+\.\d+\.\d+\.\d+$/.test(ip),
    'IP address must be valid IPv4 format'
  )
  @Ensures(
    (result: UserSession) => result.isValid() && result.getDailyUsage().remaining >= 0,
    'New session must be valid with non-negative remaining quota'
  )
  static createSession(ip: string): UserSession {
    // Implementation will be added by the agent
  }

  @Requires(
    (session: UserSession) => session.isValid() && session.canUse(),
    'Can only record usage for valid sessions with available quota'
  )
  @Ensures(
    (result: UsageResult) => result.success || result.quotaExceeded,
    'Usage recording must return clear success or quota exceeded status'
  )
  recordUsage(session: UserSession): UsageResult {
    // Implementation will be added by the agent
  }
}
```

## 🧪 测试规范

### 测试文件位置
`libs/shared-dtos/src/domains/__tests__/user-session.test.ts`

### 必需测试用例 (15个)

#### 领域模型测试 (8个)
1. **会话创建测试**
   - 有效IP创建会话成功
   - 无效IP创建会话失败
   - 新会话初始状态正确

2. **使用记录测试**
   - 正常记录使用成功
   - 配额用完记录失败
   - 使用计数正确递增

3. **配额管理测试**
   - 日配额计算正确
   - 奖励配额累加正确
   - 剩余配额计算正确

4. **会话状态测试**
   - 会话过期状态转换
   - 会话有效性验证
   - 会话恢复状态正确

#### 业务规则测试 (4个)
5. **配额规则测试**
   - 日免费额度5次验证
   - 问卷奖励5次验证
   - 支付奖励5次验证

6. **时效规则测试**
   - 24小时过期规则验证

#### 契约测试 (3个)
7. **前置条件测试**
   - IP格式验证契约
   - 会话状态验证契约

8. **后置条件测试**
   - 创建结果验证契约
   - 使用结果验证契约

### 测试结构模板

```typescript
describe('UserSession Domain Model', () => {
  describe('Session Creation', () => {
    it('should create valid session with correct IP', () => {
      // Given: valid IP address
      const ip = '192.168.1.1';
      
      // When: creating session
      const session = UserSession.create(ip);
      
      // Then: session should be valid with initial quota
      expect(session.isValid()).toBe(true);
      expect(session.getDailyUsage().remaining).toBe(5);
      expect(session.canUse()).toBe(true);
    });

    it('should throw error for invalid IP format', () => {
      // Given: invalid IP address
      const invalidIP = 'not-an-ip';
      
      // When & Then: should throw contract violation
      expect(() => UserSession.create(invalidIP))
        .toThrow('IP address must be valid IPv4 format');
    });

    // ... 13 more test cases
  });

  describe('Contract Validation', () => {
    it('should validate preconditions for usage recording', () => {
      // Contract violation tests
    });

    it('should validate postconditions for session creation', () => {
      // Contract fulfillment tests  
    });
  });

  describe('Domain Events', () => {
    it('should emit SessionCreatedEvent on creation', () => {
      // Domain event emission tests
    });

    it('should emit UsageRecordedEvent on usage', () => {
      // Event content validation tests
    });
  });
});
```

## ✅ 验收标准

### 功能验收
- [ ] 所有领域模型类正确实现DDD模式
- [ ] 业务规则正确封装在领域对象内
- [ ] 所有值对象不可变性保证
- [ ] 聚合根正确管理内部状态

### 质量验收  
- [ ] 15个测试用例全部通过
- [ ] 代码覆盖率 ≥ 95%
- [ ] 无TypeScript类型错误
- [ ] 契约验证全部生效

### DDD原则验收
- [ ] 聚合根边界清晰
- [ ] 领域服务职责单一  
- [ ] 值对象不可变
- [ ] 领域事件正确发布

### 契约验证
- [ ] 所有公共方法都有前置/后置条件
- [ ] 不变量在对象整个生命周期内保持
- [ ] 契约违反时抛出明确异常

## 🔗 接口定义 (为其他Agent提供)

```typescript
// 其他Agent可以依赖的稳定接口
export interface IUserSessionRepository {
  save(session: UserSession): Promise<void>;
  findByIP(ip: string): Promise<UserSession | null>;
  findById(id: string): Promise<UserSession | null>;
}

export interface IUserSessionService {
  createOrRetrieveSession(ip: string): Promise<UserSession>;
  recordUsage(sessionId: string): Promise<UsageResult>;
  getUsageStats(sessionId: string): Promise<UsageStats>;
}
```

## 📝 实现提示

1. **严格遵循DDD**：领域逻辑封装在领域对象内，不要让业务规则泄露到应用服务
2. **不可变值对象**：IP地址、配额等作为值对象，确保不可变性
3. **契约优先**：先定义契约，再实现逻辑，确保API稳定性
4. **测试驱动**：先写测试用例，再实现功能，保证测试覆盖
5. **领域事件**：重要状态变化需要发布领域事件，供其他上下文订阅

## 🚀 完成信号
Agent完成后提交代码，所有测试通过，并输出:
```
Agent-1 UserSession Domain Completed ✅
- Domain models: 3 classes implemented
- Business rules: 4 rules implemented  
- Domain events: 3 events implemented
- Contracts: 2 methods with pre/post conditions
- Tests: 15/15 passing (98% coverage)
```