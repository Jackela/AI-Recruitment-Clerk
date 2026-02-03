import { ValueObject } from './base/value-object.js';
import type { BonusType } from '../../application/dtos/usage-limit.dto.js';

/**
 * Represents the quota allocation.
 */
export class QuotaAllocation extends ValueObject<{
  baseQuota: number;
  bonusQuota: number;
  bonusBreakdown: Map<BonusType, number>;
}> {
  /**
   * Creates default.
   * @param baseQuota - The base quota.
   * @returns The QuotaAllocation.
   */
  public static createDefault(baseQuota: number): QuotaAllocation {
    return new QuotaAllocation({
      baseQuota,
      bonusQuota: 0,
      bonusBreakdown: new Map(),
    });
  }

  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The QuotaAllocation.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static restore(data: any): QuotaAllocation {
    return new QuotaAllocation({
      baseQuota: data.baseQuota,
      bonusQuota: data.bonusQuota,
      bonusBreakdown: new Map(data.bonusBreakdown || []),
    });
  }

  /**
   * Performs the add bonus operation.
   * @param bonusType - The bonus type.
   * @param amount - The amount.
   * @returns The QuotaAllocation.
   */
  public addBonus(bonusType: BonusType, amount: number): QuotaAllocation {
    const currentBonus = this.props.bonusBreakdown.get(bonusType) || 0;
    const newBreakdown = new Map(this.props.bonusBreakdown);
    newBreakdown.set(bonusType, currentBonus + amount);

    return new QuotaAllocation({
      baseQuota: this.props.baseQuota,
      bonusQuota: this.props.bonusQuota + amount,
      bonusBreakdown: newBreakdown,
    });
  }

  /**
   * Retrieves available quota.
   * @returns The number value.
   */
  public getAvailableQuota(): number {
    return this.props.baseQuota + this.props.bonusQuota;
  }

  /**
   * Retrieves bonus quota.
   * @returns The number value.
   */
  public getBonusQuota(): number {
    return this.props.bonusQuota;
  }

  /**
   * Retrieves bonus breakdown.
   * @returns The Map<BonusType, number>.
   */
  public getBonusBreakdown(): Map<BonusType, number> {
    return new Map(this.props.bonusBreakdown);
  }
}
