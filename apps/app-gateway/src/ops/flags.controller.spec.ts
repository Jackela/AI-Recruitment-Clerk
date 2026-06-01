import { FlagsController } from './flags.controller';
import { flagsStore } from './flags.store';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('FlagsController', () => {
  let controller: FlagsController;

  beforeEach(() => {
    controller = new FlagsController();
    // Clear all flags before each test
    const flags = flagsStore.list();
    for (const flag of flags) {
      flagsStore.delete(flag.key);
    }
  });

  afterEach(() => {
    // Clean up after each test
    const flags = flagsStore.list();
    for (const flag of flags) {
      flagsStore.delete(flag.key);
    }
  });

  describe('list', () => {
    it('should return empty array when no flags exist', () => {
      const result = controller.list();
      expect(result.items).toEqual([]);
    });

    it('should return all flags', () => {
      flagsStore.upsert({
        key: 'flag1',
        enabled: true,
        rolloutPercentage: 100,
        description: 'Test flag 1',
      });
      flagsStore.upsert({
        key: 'flag2',
        enabled: false,
        rolloutPercentage: 0,
        description: 'Test flag 2',
      });

      const result = controller.list();

      expect(result.items).toHaveLength(2);
      expect(result.items[0].key).toBe('flag1');
      expect(result.items[1].key).toBe('flag2');
    });
  });

  describe('get', () => {
    it('should return flag when it exists', () => {
      flagsStore.upsert({
        key: 'test-flag',
        enabled: true,
        rolloutPercentage: 100,
        description: 'Test flag',
      });

      const result = controller.get('test-flag');

      expect(result.key).toBe('test-flag');
      expect(result.enabled).toBe(true);
      expect(result.description).toBe('Test flag');
    });

    it('should throw NotFoundException for non-existent flag', () => {
      expect(() => controller.get('non-existent')).toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid key characters', () => {
      expect(() => controller.get('invalid/key!')).toThrow(BadRequestException);
    });
  });

  describe('upsert', () => {
    it('should create a new flag', () => {
      const result = controller.upsert({
        key: 'new-flag',
        enabled: true,
        rolloutPercentage: 100,
        description: 'New test flag',
      });

      expect(result.key).toBe('new-flag');
      expect(result.enabled).toBe(true);
      expect(result.description).toBe('New test flag');
      expect(result.rolloutPercentage).toBe(100);
    });

    it('should update existing flag', () => {
      flagsStore.upsert({
        key: 'existing-flag',
        enabled: false,
        rolloutPercentage: 0,
        description: 'Old description',
      });

      const result = controller.upsert({
        key: 'existing-flag',
        enabled: true,
        rolloutPercentage: 100,
        description: 'New description',
      });

      expect(result.enabled).toBe(true);
      expect(result.description).toBe('New description');
      expect(result.rolloutPercentage).toBe(100);
    });

    it('should clamp rollout percentage to 0-100 range', () => {
      const result = controller.upsert({
        key: 'clamped-flag',
        enabled: true,
        rolloutPercentage: 150,
      });

      expect(result.rolloutPercentage).toBe(100);
    });

    it('should sanitize description to prevent XSS', () => {
      expect(() =>
        controller.upsert({
          key: 'xss-test',
          enabled: true,
          rolloutPercentage: 100,
          description: '<script>alert("xss")</script>',
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject invalid flag keys', () => {
      expect(() =>
        controller.upsert({
          key: 'invalid key!',
          enabled: true,
          rolloutPercentage: 100,
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete existing flag', () => {
      flagsStore.upsert({
        key: 'to-delete',
        enabled: true,
        rolloutPercentage: 100,
      });

      controller.remove('to-delete');

      expect(flagsStore.get('to-delete')).toBeUndefined();
    });

    it('should throw NotFoundException for non-existent flag', () => {
      expect(() => controller.remove('non-existent')).toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid key', () => {
      expect(() => controller.remove('')).toThrow(BadRequestException);
      expect(() => controller.remove('invalid/key!')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('validation', () => {
    it('should reject description with javascript: protocol', () => {
      expect(() =>
        controller.upsert({
          key: 'js-test',
          enabled: true,
          rolloutPercentage: 100,
          description: 'javascript:alert(1)',
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject description with HTML tags', () => {
      expect(() =>
        controller.upsert({
          key: 'html-test',
          enabled: true,
          rolloutPercentage: 100,
          description: '<img src=x onerror=alert(1)>',
        }),
      ).toThrow(BadRequestException);
    });

    it('should accept valid cohort identifiers', () => {
      const result = controller.upsert({
        key: 'cohort-test',
        enabled: true,
        rolloutPercentage: 100,
        cohorts: ['team-alpha', 'beta_users', 'namespace/group'],
      });

      expect(result.cohorts).toEqual([
        'team-alpha',
        'beta_users',
        'namespace/group',
      ]);
    });

    it('should reject invalid cohort identifiers', () => {
      expect(() =>
        controller.upsert({
          key: 'bad-cohort-test',
          enabled: true,
          rolloutPercentage: 100,
          cohorts: ['valid', 'invalid cohort!'],
        }),
      ).toThrow(BadRequestException);
    });
  });
});
