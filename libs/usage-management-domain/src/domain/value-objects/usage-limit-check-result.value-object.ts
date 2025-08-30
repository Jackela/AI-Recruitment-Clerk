// 结果类
export class UsageLimitCheckResult {
  private constructor(
    private readonly allowed: boolean,
    private readonly remainingQuota?: number,
    private readonly blockReason?: string
  ) {}

  static allowed(remainingQuota: number): UsageLimitCheckResult {
    return new UsageLimitCheckResult(true, remainingQuota);
  }

  static blocked(reason: string): UsageLimitCheckResult {
    return new UsageLimitCheckResult(false, undefined, reason);
  }

  isAllowed(): boolean {
    return this.allowed;
  }

  getRemainingQuota(): number | undefined {
    return this.remainingQuota;
  }

  getBlockReason(): string | undefined {
    return this.blockReason;
  }
}
