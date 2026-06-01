export type CohortType = 'whitelist' | 'label' | 'random';

export interface FeatureFlag {
  key: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  cohorts?: string[]; // identifiers for whitelist/labels
  killSwitch?: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

// Internal storage (shared across instances for in-memory store)
const flags = new Map<string, FeatureFlag>();

function audit(event: { action: string; key: string; detail?: unknown }): void {
  // Placeholder audit hook; integrate with audit middleware/service when available (T027)
  console.log(`[audit] feature-flag`, event);
}

/**
 * Feature flags store for managing feature toggles.
 */
export class FlagsStore {
  list(): FeatureFlag[] {
    return Array.from(flags.values());
  }

  get(key: string): FeatureFlag | undefined {
    return flags.get(key);
  }

  set(key: string, value: boolean): void {
    const existing = flags.get(key);
    if (existing) {
      existing.enabled = value;
      existing.updatedAt = new Date().toISOString();
    } else {
      flags.set(key, {
        key,
        enabled: value,
        rolloutPercentage: 100,
        updatedAt: new Date().toISOString(),
      });
    }
    audit({ action: 'flag-update', key });
  }

  upsert(input: FeatureFlag): FeatureFlag {
    const flag: FeatureFlag = {
      ...input,
      updatedAt: new Date().toISOString(),
    };
    flags.set(flag.key, flag);
    audit({ action: 'flag-update', key: flag.key, detail: flag });
    return flag;
  }

  delete(key: string): boolean {
    const ok = flags.delete(key);
    if (ok) audit({ action: 'flag-delete', key });
    return ok;
  }

  isEnabled(key: string): boolean {
    const flag = flags.get(key);
    return flag?.enabled ?? false;
  }
}

// Also export a singleton instance for convenience
export const flagsStore = new FlagsStore();
