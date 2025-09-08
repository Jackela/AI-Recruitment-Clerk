export interface IGuestUsage {
  deviceId: string;
  usageCount: number;
  feedbackCode?: string;
  feedbackCodeStatus?: 'generated' | 'redeemed';
  lastUsed: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class GuestUsageEntity implements IGuestUsage {
  constructor(
    public deviceId: string,
    public usageCount = 0,
    public feedbackCode?: string,
    public feedbackCodeStatus?: 'generated' | 'redeemed',
    public lastUsed: Date = new Date(),
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

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

  canUseService(): boolean {
    const MAX_FREE_USAGE = 5;

    if (this.usageCount < MAX_FREE_USAGE) {
      return true;
    }

    return this.feedbackCodeStatus === 'redeemed';
  }

  needsFeedbackCode(): boolean {
    const MAX_FREE_USAGE = 5;
    return (
      this.usageCount >= MAX_FREE_USAGE &&
      this.feedbackCodeStatus !== 'redeemed'
    );
  }

  getRemainingCount(): number {
    const MAX_FREE_USAGE = 5;

    if (this.feedbackCodeStatus === 'redeemed') {
      // After redeeming feedback code, reset to new cycle
      return MAX_FREE_USAGE - (this.usageCount % MAX_FREE_USAGE);
    }

    return Math.max(0, MAX_FREE_USAGE - this.usageCount);
  }
}
