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

const flags = new Map<string, FeatureFlag>();

function audit(event: { action: string; key: string; detail?: unknown }) {
  // Placeholder audit hook; integrate with audit middleware/service when available (T027)
  console.log(`[audit] feature-flag`, event);
}

export const FlagsStore = {
  list(): FeatureFlag[] {
    return Array.from(flags.values());
  },
  get(key: string): FeatureFlag | undefined {
    return flags.get(key);
  },
  upsert(input: FeatureFlag): FeatureFlag {
    const flag: FeatureFlag = {
      ...input,
      updatedAt: new Date().toISOString(),
    };
    flags.set(flag.key, flag);
    audit({ action: 'flag-update', key: flag.key, detail: flag });
    return flag;
  },
  delete(key: string): boolean {
    const ok = flags.delete(key);
    if (ok) audit({ action: 'flag-delete', key });
    return ok;
  },
};

