import { AuditEventDto } from './audit-event.dto';

describe('AuditEventDto', () => {
  describe('AuditEventDto interface', () => {
    it('should accept valid audit event for deploy', () => {
      const event: AuditEventDto = {
        id: 'audit-123',
        actor: 'admin@company.com',
        action: 'deploy',
        target: 'production',
        detail: { version: '1.2.3', environment: 'prod' },
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      expect(event.id).toBe('audit-123');
      expect(event.actor).toBe('admin@company.com');
      expect(event.action).toBe('deploy');
      expect(event.target).toBe('production');
      expect(event.detail?.version).toBe('1.2.3');
    });

    it('should accept valid audit event for rollout', () => {
      const event: AuditEventDto = {
        actor: 'system',
        action: 'rollout',
        target: 'feature-flag:new-ui',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      expect(event.action).toBe('rollout');
      expect(event.target).toBe('feature-flag:new-ui');
    });

    it('should accept valid audit event for rollback', () => {
      const event: AuditEventDto = {
        actor: 'dev@company.com',
        action: 'rollback',
        target: 'service:api-gateway',
        detail: { reason: 'Performance issues detected' },
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      expect(event.action).toBe('rollback');
      expect(event.detail?.reason).toBe('Performance issues detected');
    });

    it('should accept flag-update action', () => {
      const event: AuditEventDto = {
        actor: 'admin',
        action: 'flag-update',
        target: 'feature-flag:beta-feature',
        detail: { field: 'rolloutPercentage', oldValue: 50, newValue: 100 },
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      expect(event.action).toBe('flag-update');
    });

    it('should accept threshold-update action', () => {
      const event: AuditEventDto = {
        actor: 'admin',
        action: 'threshold-update',
        target: 'rate-limiter:api',
        detail: { oldThreshold: 1000, newThreshold: 2000 },
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      expect(event.action).toBe('threshold-update');
    });

    it('should accept custom action types', () => {
      const event: AuditEventDto = {
        actor: 'service',
        action: 'custom-action',
        target: 'resource',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      expect(event.action).toBe('custom-action');
    });

    it('should allow optional id', () => {
      const event: AuditEventDto = {
        actor: 'user',
        action: 'deploy',
        target: 'env',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      expect(event.id).toBeUndefined();
    });

    it('should allow optional detail', () => {
      const event: AuditEventDto = {
        actor: 'user',
        action: 'deploy',
        target: 'env',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      expect(event.detail).toBeUndefined();
    });

    it('should accept event with ISO timestamp', () => {
      const event: AuditEventDto = {
        actor: 'user',
        action: 'deploy',
        target: 'prod',
        createdAt: '2024-06-15T14:30:00.000Z',
      };

      expect(event.createdAt).toBe('2024-06-15T14:30:00.000Z');
    });
  });
});
