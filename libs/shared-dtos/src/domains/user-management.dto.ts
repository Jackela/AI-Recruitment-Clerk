import { ValueObject } from '../base/value-object';
import { DomainEvent } from '../base/domain-event';

// 用户会话聚合根
/**
 * Represents the user session.
 */
export class UserSession {
  private uncommittedEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: SessionId,
    private readonly ip: IPAddress,
    private status: SessionStatus,
    private readonly createdAt: Date,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private _lastActiveAt: Date,
    private readonly dailyQuota: UsageQuota,
  ) {}

  // 工厂方法
  /**
   * Creates the entity.
   * @param ip - The ip.
   * @returns The UserSession.
   */
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
      quota,
    );

    session.addEvent(
      new SessionCreatedEvent(sessionId.getValue(), ip, new Date()),
    );

    return session;
  }

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The UserSession.
   */
  static restore(data: SessionData): UserSession {
    return new UserSession(
      new SessionId({ value: data.id }),
      new IPAddress({ value: data.ip }),
      data.status,
      data.createdAt,
      data.lastActiveAt,
      UsageQuota.restore(data.quota),
    );
  }

  // 核心业务方法
  /**
   * Performs the record usage operation.
   * @returns The UsageResult.
   */
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
    this._lastActiveAt = new Date();
    // No-op read to satisfy TS6138 for private field
    void this._lastActiveAt;

    const remaining = this.getRemainingQuota();

    this.addEvent(
      new UsageRecordedEvent(
        this.id.getValue(),
        newQuota.getUsed(),
        remaining,
        new Date(),
      ),
    );

    return UsageResult.success({
      used: newQuota.getUsed(),
      remaining: remaining,
    });
  }

  /**
   * Performs the expire operation.
   */
  expire(): void {
    this.status = SessionStatus.EXPIRED;
    this.addEvent(new SessionExpiredEvent(this.id.getValue(), new Date()));
  }

  /**
   * Performs the is valid operation.
   * @returns The boolean value.
   */
  isValid(): boolean {
    return this.status === SessionStatus.ACTIVE && !this.isExpired();
  }

  /**
   * Performs the can use operation.
   * @returns The boolean value.
   */
  canUse(): boolean {
    return this.isValid() && this.getRemainingQuota() > 0;
  }

  /**
   * Retrieves daily usage.
   * @returns The UsageStats.
   */
  getDailyUsage(): UsageStats {
    return new UsageStats({
      used: this.dailyQuota.getUsed(),
      remaining: this.getRemainingQuota(),
      total: this.dailyQuota.getTotalLimit(),
      resetTime: this.calculateResetTime(),
    });
  }

  private getRemainingQuota(): number {
    return Math.max(
      0,
      this.dailyQuota.getTotalLimit() - this.dailyQuota.getUsed(),
    );
  }

  private isExpired(): boolean {
    const hoursElapsed =
      (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
    return hoursElapsed >= 24;
  }

  private calculateResetTime(): Date {
    const resetTime = new Date(this.createdAt);
    resetTime.setHours(resetTime.getHours() + 24);
    return resetTime;
  }

  // 领域事件管理
  /**
   * Retrieves uncommitted events.
   * @returns The an array of DomainEvent.
   */
  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  /**
   * Performs the mark events as committed operation.
   */
  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  private addEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
  }

  // Getters for other agents
  /**
   * Retrieves id.
   * @returns The SessionId.
   */
  getId(): SessionId {
    return this.id;
  }

  /**
   * Retrieves ip.
   * @returns The IPAddress.
   */
  getIP(): IPAddress {
    return this.ip;
  }

  /**
   * Retrieves status.
   * @returns The SessionStatus.
   */
  getStatus(): SessionStatus {
    return this.status;
  }
}

// 值对象
/**
 * Represents the session id.
 */
export class SessionId extends ValueObject<{ value: string }> {
  /**
   * Generates the result.
   * @returns The SessionId.
   */
  static generate(): SessionId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return new SessionId({ value: `session_${timestamp}_${random}` });
  }

  /**
   * Retrieves value.
   * @returns The string value.
   */
  getValue(): string {
    return this.props.value;
  }
}

/**
 * Represents the ip address.
 */
export class IPAddress extends ValueObject<{ value: string }> {
  /**
   * Initializes a new instance of the IP Address.
   * @param props - The props.
   */
  constructor(props: { value: string }) {
    if (!props.value || !/^\d+\.\d+\.\d+\.\d+$/.test(props.value)) {
      throw new Error('IP address must be valid IPv4 format');
    }
    super(props);
  }

  /**
   * Retrieves value.
   * @returns The string value.
   */
  getValue(): string {
    return this.props.value;
  }
}

/**
 * Represents the usage quota.
 */
export class UsageQuota extends ValueObject<{
  daily: number;
  used: number;
  questionnaireBonuses: number;
  paymentBonuses: number;
}> {
  /**
   * Creates default.
   * @returns The UsageQuota.
   */
  static createDefault(): UsageQuota {
    return new UsageQuota({
      daily: 5,
      used: 0,
      questionnaireBonuses: 0,
      paymentBonuses: 0,
    });
  }

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The UsageQuota.
   */
  static restore(data: any): UsageQuota {
    return new UsageQuota(data);
  }

  /**
   * Performs the increment usage operation.
   * @returns The UsageQuota.
   */
  incrementUsage(): UsageQuota {
    return new UsageQuota({
      ...this.props,
      used: this.props.used + 1,
    });
  }

  /**
   * Performs the add questionnaire bonus operation.
   * @returns The UsageQuota.
   */
  addQuestionnaireBonus(): UsageQuota {
    return new UsageQuota({
      ...this.props,
      questionnaireBonuses: this.props.questionnaireBonuses + 5,
    });
  }

  /**
   * Performs the add payment bonus operation.
   * @returns The UsageQuota.
   */
  addPaymentBonus(): UsageQuota {
    return new UsageQuota({
      ...this.props,
      paymentBonuses: this.props.paymentBonuses + 5,
    });
  }

  /**
   * Retrieves total limit.
   * @returns The number value.
   */
  getTotalLimit(): number {
    return (
      this.props.daily +
      this.props.questionnaireBonuses +
      this.props.paymentBonuses
    );
  }

  /**
   * Retrieves used.
   * @returns The number value.
   */
  getUsed(): number {
    return this.props.used;
  }
}

// 辅助类型
export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
}

/**
 * Represents the usage stats.
 */
export class UsageStats extends ValueObject<{
  used: number;
  remaining: number;
  total: number;
  resetTime: Date;
}> {
  /**
   * Performs the used operation.
   * @returns The number value.
   */
  get used(): number {
    return this.props.used;
  }

  /**
   * Performs the remaining operation.
   * @returns The number value.
   */
  get remaining(): number {
    return this.props.remaining;
  }

  /**
   * Performs the total operation.
   * @returns The number value.
   */
  get total(): number {
    return this.props.total;
  }

  /**
   * Performs the reset time operation.
   * @returns The Date.
   */
  get resetTime(): Date {
    return this.props.resetTime;
  }
}

/**
 * Represents the usage result.
 */
export class UsageResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: { used: number; remaining: number },
    public readonly error?: string,
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The UsageResult.
   */
  static success(data: { used: number; remaining: number }): UsageResult {
    return new UsageResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param error - The error.
   * @returns The UsageResult.
   */
  static failed(error: string): UsageResult {
    return new UsageResult(false, undefined, error);
  }

  /**
   * Performs the quota exceeded operation.
   * @returns The boolean value.
   */
  get quotaExceeded(): boolean {
    return !this.success && this.error === 'Usage quota exceeded';
  }
}

/**
 * Defines the shape of the session data.
 */
export interface SessionData {
  id: string;
  ip: string;
  status: SessionStatus;
  createdAt: Date;
  lastActiveAt: Date;
  quota: any;
}

// 领域服务
/**
 * Provides session validation functionality.
 */
export class SessionValidationService {
  /**
   * Validates the data.
   * @param session - The session.
   * @returns The UserManagementValidationResult.
   */
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

/**
 * Represents the user management validation result.
 */
export class UserManagementValidationResult {
  /**
   * Initializes a new instance of the User Management Validation Result.
   * @param isValid - The is valid.
   * @param errors - The errors.
   */
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[],
  ) {}
}

// 领域事件
/**
 * Represents the session created event event.
 */
export class SessionCreatedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Session Created Event.
   * @param sessionId - The session id.
   * @param ip - The ip.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly sessionId: string,
    public readonly ip: string,
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the usage recorded event event.
 */
export class UsageRecordedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Usage Recorded Event.
   * @param sessionId - The session id.
   * @param usageCount - The usage count.
   * @param remainingQuota - The remaining quota.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly sessionId: string,
    public readonly usageCount: number,
    public readonly remainingQuota: number,
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the session expired event event.
 */
export class SessionExpiredEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Session Expired Event.
   * @param sessionId - The session id.
   * @param expiredAt - The expired at.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly sessionId: string,
    public readonly expiredAt: Date,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
