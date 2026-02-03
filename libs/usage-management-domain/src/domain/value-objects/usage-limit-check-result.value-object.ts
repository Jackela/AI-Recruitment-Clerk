// 结果类
/**
 * Represents the usage limit check result.
 */
export class UsageLimitCheckResult {
  private constructor(
    private readonly allowed: boolean,
    private readonly remainingQuota?: number,
    private readonly blockReason?: string,
  ) {}

  /**
   * Performs the allowed operation.
   * @param remainingQuota - The remaining quota.
   * @returns The UsageLimitCheckResult.
   */
  public static allowed(remainingQuota: number): UsageLimitCheckResult {
    return new UsageLimitCheckResult(true, remainingQuota);
  }

  /**
   * Performs the blocked operation.
   * @param reason - The reason.
   * @returns The UsageLimitCheckResult.
   */
  public static blocked(reason: string): UsageLimitCheckResult {
    return new UsageLimitCheckResult(false, undefined, reason);
  }

  /**
   * Performs the is allowed operation.
   * @returns The boolean value.
   */
  public isAllowed(): boolean {
    return this.allowed;
  }

  /**
   * Retrieves remaining quota.
   * @returns The number | undefined.
   */
  public getRemainingQuota(): number | undefined {
    return this.remainingQuota;
  }

  /**
   * Retrieves block reason.
   * @returns The string | undefined.
   */
  public getBlockReason(): string | undefined {
    return this.blockReason;
  }
}
