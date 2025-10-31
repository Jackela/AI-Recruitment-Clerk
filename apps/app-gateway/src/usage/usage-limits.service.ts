import { Injectable } from '@nestjs/common';

interface UsageStatus {
  currentUsage: number;
  availableQuota: number;
  canUse: boolean;
}

interface UsageRecordResult {
  currentUsage: number;
  remainingQuota: number;
}

interface UsageBonusResult {
  newTotalQuota: number;
}

@Injectable()
export class UsageLimitsService {
  private currentUsage = 0;
  private quota = 100;

  getUsageStatus(): UsageStatus {
    return {
      currentUsage: this.currentUsage,
      availableQuota: Math.max(0, this.quota - this.currentUsage),
      canUse: this.currentUsage < this.quota,
    };
  }

  recordUsage(): UsageRecordResult {
    this.currentUsage += 1;
    return {
      currentUsage: this.currentUsage,
      remainingQuota: Math.max(0, this.quota - this.currentUsage),
    };
  }

  addBonusQuota(amount: number): UsageBonusResult {
    if (Number.isFinite(amount) && amount > 0) {
      this.quota += amount;
    }
    return { newTotalQuota: this.quota };
  }
}
