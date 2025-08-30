export class UsageRecordResult {
  private constructor(
    private readonly success: boolean,
    private readonly currentUsage?: number,
    private readonly remainingQuota?: number,
    private readonly error?: string
  ) {}

  static success(currentUsage: number, remainingQuota: number): UsageRecordResult {
    return new UsageRecordResult(true, currentUsage, remainingQuota);
  }

  static failed(error: string): UsageRecordResult {
    return new UsageRecordResult(false, undefined, undefined, error);
  }

  isSuccess(): boolean {
    return this.success;
  }

  getCurrentUsage(): number | undefined {
    return this.currentUsage;
  }

  getRemainingQuota(): number | undefined {
    return this.remainingQuota;
  }

  getError(): string | undefined {
    return this.error;
  }
}
