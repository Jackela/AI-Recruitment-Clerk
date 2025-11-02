export interface FeatureFlagDto {
  key: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  cohorts?: string[];
  killSwitch?: boolean;
  updatedBy?: string;
  updatedAt?: string; // ISO
}

