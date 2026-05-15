import type { FeatureFlagDto } from './feature-flag.dto';

describe('FeatureFlagDto', () => {
  describe('FeatureFlagDto interface', () => {
    it('should accept valid feature flag', () => {
      const flag: FeatureFlagDto = {
        key: 'new_resume_parser',
        description: 'Enable new resume parser',
        enabled: true,
        rolloutPercentage: 50,
        cohorts: ['beta-users', 'internal'],
        killSwitch: false,
        updatedBy: 'admin',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      expect(flag.key).toBe('new_resume_parser');
      expect(flag.enabled).toBe(true);
      expect(flag.rolloutPercentage).toBe(50);
      expect(flag.cohorts).toContain('beta-users');
    });

    it('should accept minimal feature flag', () => {
      const flag: FeatureFlagDto = {
        key: 'simple_feature',
        enabled: false,
        rolloutPercentage: 0,
      };

      expect(flag.key).toBe('simple_feature');
      expect(flag.enabled).toBe(false);
      expect(flag.rolloutPercentage).toBe(0);
    });

    it('should accept 100% rollout', () => {
      const flag: FeatureFlagDto = {
        key: 'fully_rolled_out',
        enabled: true,
        rolloutPercentage: 100,
      };

      expect(flag.rolloutPercentage).toBe(100);
    });

    it('should accept flag with kill switch', () => {
      const flag: FeatureFlagDto = {
        key: 'critical_feature',
        enabled: true,
        rolloutPercentage: 100,
        killSwitch: true,
      };

      expect(flag.killSwitch).toBe(true);
    });

    it('should accept flag without optional fields', () => {
      const flag: FeatureFlagDto = {
        key: 'minimal_flag',
        enabled: true,
        rolloutPercentage: 25,
      };

      expect(flag.description).toBeUndefined();
      expect(flag.cohorts).toBeUndefined();
      expect(flag.updatedBy).toBeUndefined();
    });

    it('should accept flag with ISO timestamp', () => {
      const flag: FeatureFlagDto = {
        key: 'recently_updated',
        enabled: true,
        rolloutPercentage: 10,
        updatedAt: '2024-06-15T10:30:00.000Z',
      };

      expect(flag.updatedAt).toBe('2024-06-15T10:30:00.000Z');
    });
  });
});
