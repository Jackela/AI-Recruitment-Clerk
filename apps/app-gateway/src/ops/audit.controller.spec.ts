import { AuditController } from './audit.controller';

describe('AuditController', () => {
  let controller: AuditController;

  beforeEach(() => {
    controller = new AuditController();
  });

  describe('getAuditLogs', () => {
    it('should return audit logs', async () => {
      const result = await controller.getAuditLogs({} as any);

      expect(result).toHaveProperty('logs');
      expect(result).toHaveProperty('total');
    });
  });

  describe('getAuditLog', () => {
    it('should return single audit log', async () => {
      const result = await controller.getAuditLog('log-123');

      expect(result).toHaveProperty('id');
    });
  });
});
