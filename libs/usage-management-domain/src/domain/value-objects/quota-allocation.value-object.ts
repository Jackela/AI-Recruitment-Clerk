import { ValueObject } from './base/value-object.js';
import { BonusType } from '../../application/dtos/usage-limit.dto.js';

export class QuotaAllocation extends ValueObject<{
  baseQuota: number;
  bonusQuota: number;
  bonusBreakdown: Map<BonusType, number>;
}> {
  static createDefault(baseQuota: number): QuotaAllocation {
    return new QuotaAllocation({
      baseQuota,
      bonusQuota: 0,
      bonusBreakdown: new Map()
    });
  }

  static restore(data: any): QuotaAllocation {
    return new QuotaAllocation({
      baseQuota: data.baseQuota,
      bonusQuota: data.bonusQuota,
      bonusBreakdown: new Map(data.bonusBreakdown || [])
    });
  }

  addBonus(bonusType: BonusType, amount: number): QuotaAllocation {
    const currentBonus = this.props.bonusBreakdown.get(bonusType) || 0;
    const newBreakdown = new Map(this.props.bonusBreakdown);
    newBreakdown.set(bonusType, currentBonus + amount);

    return new QuotaAllocation({
      baseQuota: this.props.baseQuota,
      bonusQuota: this.props.bonusQuota + amount,
      bonusBreakdown: newBreakdown
    });
  }

  getAvailableQuota(): number {
    return this.props.baseQuota + this.props.bonusQuota;
  }

  getBonusQuota(): number {
    return this.props.bonusQuota;
  }

  getBonusBreakdown(): Map<BonusType, number> {
    return new Map(this.props.bonusBreakdown);
  }
}
