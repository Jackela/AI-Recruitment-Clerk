export interface FeatureFlagsConfig {
  rolloutPercentage: number;
  killSwitch: boolean;
  dualRun: boolean;
}

export const featureFlags: FeatureFlagsConfig = {
  rolloutPercentage: 0,
  killSwitch: false,
  dualRun: false,
};
