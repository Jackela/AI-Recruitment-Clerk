/**
 * Represents the usage record result.
 */
export class UsageRecordResult {
  private constructor(
    private readonly success: boolean,
    private readonly currentUsage?: number,
    private readonly remainingQuota?: number,
    private readonly error?: string,
  ) {}

  /**
   * Performs the success operation.
   * @param currentUsage - The current usage.
   * @param remainingQuota - The remaining quota.
   * @returns The UsageRecordResult.
   */
  public static success(
    currentUsage: number,
    remainingQuota: number,
  ): UsageRecordResult {
    return new UsageRecordResult(true, currentUsage, remainingQuota);
  }

  /**
   * Performs the failed operation.
   * @param error - The error.
   * @returns The UsageRecordResult.
   */
  public static failed(error: string): UsageRecordResult {
    return new UsageRecordResult(false, undefined, undefined, error);
  }

  /**
   * Performs the is success operation.
   * @returns The boolean value.
   */
  public isSuccess(): boolean {
    return this.success;
  }

  /**
   * Retrieves current usage.
   * @returns The number | undefined.
   */
  public getCurrentUsage(): number | undefined {
    return this.currentUsage;
  }

  /**
   * Retrieves remaining quota.
   * @returns The number | undefined.
   */
  public getRemainingQuota(): number | undefined {
    return this.remainingQuota;
  }

  /**
   * Retrieves error.
   * @returns The string | undefined.
   */
  public getError(): string | undefined {
    return this.error;
  }
}
