/**
 * Defines the shape of the i guest usage.
 */
export interface IGuestUsage {
  deviceId: string;
  usageCount: number;
  feedbackCode?: string;
  feedbackCodeStatus?: 'generated' | 'redeemed';
  lastUsed: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents the guest usage entity.
 */
export class GuestUsageEntity implements IGuestUsage {
  /**
   * Initializes a new instance of the Guest Usage Entity.
   * @param deviceId - The device id.
   * @param usageCount - The usage count.
   * @param feedbackCode - The feedback code.
   * @param feedbackCodeStatus - The feedback code status.
   * @param lastUsed - The last used.
   * @param createdAt - The created at.
   * @param updatedAt - The updated at.
   */
  constructor(
    public deviceId: string,
    public usageCount = 0,
    public feedbackCode?: string,
    public feedbackCodeStatus?: 'generated' | 'redeemed',
    public lastUsed: Date = new Date(),
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  /**
   * Performs the from document operation.
   * @param doc - The doc.
   * @returns The GuestUsageEntity.
   */
  static fromDocument(doc: any): GuestUsageEntity {
    return new GuestUsageEntity(
      doc.deviceId,
      doc.usageCount,
      doc.feedbackCode,
      doc.feedbackCodeStatus,
      doc.lastUsed,
      doc.createdAt,
      doc.updatedAt,
    );
  }

  /**
   * Performs the can use service operation.
   * @returns The boolean value.
   */
  canUseService(): boolean {
    const MAX_FREE_USAGE = 5;

    if (this.usageCount < MAX_FREE_USAGE) {
      return true;
    }

    return this.feedbackCodeStatus === 'redeemed';
  }

  /**
   * Performs the needs feedback code operation.
   * @returns The boolean value.
   */
  needsFeedbackCode(): boolean {
    const MAX_FREE_USAGE = 5;
    return (
      this.usageCount >= MAX_FREE_USAGE &&
      this.feedbackCodeStatus !== 'redeemed'
    );
  }

  /**
   * Retrieves remaining count.
   * @returns The number value.
   */
  getRemainingCount(): number {
    const MAX_FREE_USAGE = 5;

    if (this.feedbackCodeStatus === 'redeemed') {
      // After redeeming feedback code, reset to new cycle
      return MAX_FREE_USAGE - (this.usageCount % MAX_FREE_USAGE);
    }

    return Math.max(0, MAX_FREE_USAGE - this.usageCount);
  }
}
