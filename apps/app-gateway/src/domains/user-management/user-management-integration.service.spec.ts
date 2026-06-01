import { UserManagementIntegrationService } from './user-management-integration.service';

describe('UserManagementIntegrationService', () => {
  let service: UserManagementIntegrationService;

  beforeEach(() => {
    service = new UserManagementIntegrationService({} as any);
  });

  describe('syncUser', () => {
    it('should sync user', async () => {
      const result = await service.syncUser('user-123');

      expect(result).toHaveProperty('synced');
    });
  });

  describe('getIntegrationStatus', () => {
    it('should get status', async () => {
      const result = await service.getIntegrationStatus();

      expect(result).toHaveProperty('status');
    });
  });
});
