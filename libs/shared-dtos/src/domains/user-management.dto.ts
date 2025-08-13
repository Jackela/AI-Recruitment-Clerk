import { ValueObject } from '../base/value-object';
import { DomainEvent } from '../base/domain-event';

// 用户会话聚合根
export class UserSession {
  private uncommittedEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: SessionId,
    private readonly ip: IPAddress,
    private status: SessionStatus,
    private readonly createdAt: Date,
    private lastActiveAt: Date,
    private readonly dailyQuota: UsageQuota
  ) {}

  // 工厂方法
  static create(ip: string): UserSession {
    const sessionId = SessionId.generate();
    const ipAddress = new IPAddress({ value: ip });
    const quota = UsageQuota.createDefault();
    
    const session = new UserSession(
      sessionId,
      ipAddress,
      SessionStatus.ACTIVE,
      new Date(),
      new Date(),
      quota
    );
    
    session.addEvent(new SessionCreatedEvent(
      sessionId.getValue(),
      ip,
      new Date()
    ));
    
    return session;
  }
  
  static restore(data: SessionData): UserSession {
    return new UserSession(
      new SessionId({ value: data.id }),
      new IPAddress({ value: data.ip }),
      data.status,
      data.createdAt,
      data.lastActiveAt,
      UsageQuota.restore(data.quota)
    );
  }
  
  // 核心业务方法
  recordUsage(): UsageResult {
    if (!this.canUse()) {
      return UsageResult.failed('Usage quota exceeded');
    }
    
    if (this.isExpired()) {
      return UsageResult.failed('Session expired');
    }
    
    const newQuota = this.dailyQuota.incrementUsage();
    // Replace the quota object immutably
    (this as any).dailyQuota = newQuota;
    this.lastActiveAt = new Date();
    
    const remaining = this.getRemainingQuota();
    
    this.addEvent(new UsageRecordedEvent(
      this.id.getValue(),
      newQuota.getUsed(),
      remaining,
      new Date()
    ));
    
    return UsageResult.success({
      used: newQuota.getUsed(),
      remaining: remaining
    });
  }
  
  expire(): void {
    this.status = SessionStatus.EXPIRED;
    this.addEvent(new SessionExpiredEvent(
      this.id.getValue(),
      new Date()
    ));
  }
  
  isValid(): boolean {
    return this.status === SessionStatus.ACTIVE && !this.isExpired();
  }
  
  canUse(): boolean {
    return this.isValid() && this.getRemainingQuota() > 0;
  }
  
  getDailyUsage(): UsageStats {
    return new UsageStats({
      used: this.dailyQuota.getUsed(),
      remaining: this.getRemainingQuota(),
      total: this.dailyQuota.getTotalLimit(),
      resetTime: this.calculateResetTime()
    });
  }
  
  private getRemainingQuota(): number {
    return Math.max(0, this.dailyQuota.getTotalLimit() - this.dailyQuota.getUsed());
  }
  
  private isExpired(): boolean {
    const hoursElapsed = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
    return hoursElapsed >= 24;
  }
  
  private calculateResetTime(): Date {
    const resetTime = new Date(this.createdAt);
    resetTime.setHours(resetTime.getHours() + 24);
    return resetTime;
  }
  
  // 领域事件管理
  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }
  
  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }
  
  private addEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
  }
  
  // Getters for other agents
  getId(): SessionId {
    return this.id;
  }
  
  getIP(): IPAddress {
    return this.ip;
  }
  
  getStatus(): SessionStatus {
    return this.status;
  }
}

// 值对象
export class SessionId extends ValueObject<{ value: string }> {
  static generate(): SessionId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return new SessionId({ value: `session_${timestamp}_${random}` });
  }
  
  getValue(): string {
    return this.props.value;
  }
}

export class IPAddress extends ValueObject<{ value: string }> {
  constructor(props: { value: string }) {
    if (!props.value || !/^\d+\.\d+\.\d+\.\d+$/.test(props.value)) {
      throw new Error('IP address must be valid IPv4 format');
    }
    super(props);
  }
  
  getValue(): string {
    return this.props.value;
  }
}

export class UsageQuota extends ValueObject<{
  daily: number;
  used: number;
  questionnaireBonuses: number;
  paymentBonuses: number;
}> {
  static createDefault(): UsageQuota {
    return new UsageQuota({
      daily: 5,
      used: 0,
      questionnaireBonuses: 0,
      paymentBonuses: 0
    });
  }
  
  static restore(data: any): UsageQuota {
    return new UsageQuota(data);
  }
  
  incrementUsage(): UsageQuota {
    return new UsageQuota({
      ...this.props,
      used: this.props.used + 1
    });
  }
  
  addQuestionnaireBonus(): UsageQuota {
    return new UsageQuota({
      ...this.props,
      questionnaireBonuses: this.props.questionnaireBonuses + 5
    });
  }
  
  addPaymentBonus(): UsageQuota {
    return new UsageQuota({
      ...this.props,
      paymentBonuses: this.props.paymentBonuses + 5
    });
  }
  
  getTotalLimit(): number {
    return this.props.daily + this.props.questionnaireBonuses + this.props.paymentBonuses;
  }
  
  getUsed(): number {
    return this.props.used;
  }
}

// 辅助类型
export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired'
}

export class UsageStats extends ValueObject<{
  used: number;
  remaining: number;
  total: number;
  resetTime: Date;
}> {
  get used(): number {
    return this.props.used;
  }
  
  get remaining(): number {
    return this.props.remaining;
  }
  
  get total(): number {
    return this.props.total;
  }
  
  get resetTime(): Date {
    return this.props.resetTime;
  }
}

export class UsageResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: { used: number; remaining: number },
    public readonly error?: string
  ) {}
  
  static success(data: { used: number; remaining: number }): UsageResult {
    return new UsageResult(true, data);
  }
  
  static failed(error: string): UsageResult {
    return new UsageResult(false, undefined, error);
  }
  
  get quotaExceeded(): boolean {
    return !this.success && this.error === 'Usage quota exceeded';
  }
}

export interface SessionData {
  id: string;
  ip: string;
  status: SessionStatus;
  createdAt: Date;
  lastActiveAt: Date;
  quota: any;
}

// 领域服务
export class SessionValidationService {
  validate(session: UserSession): UserManagementValidationResult {
    const errors: string[] = [];
    
    if (!session.isValid()) {
      errors.push('Session is not valid');
    }
    
    if (session.getStatus() === SessionStatus.EXPIRED) {
      errors.push('Session has expired');
    }
    
    return new UserManagementValidationResult(errors.length === 0, errors);
  }
}

export class UserManagementValidationResult {
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[]
  ) {}
}

// 领域事件
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
    public readonly expiredAt: Date,
    public readonly occurredAt: Date = new Date()
  ) {}
}
