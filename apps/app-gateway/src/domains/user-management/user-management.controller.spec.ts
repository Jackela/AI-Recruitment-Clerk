import { UserManagementController } from './user-management.controller';

describe('UserManagementController', () => {
  let controller: UserManagementController;

  beforeEach(() => {
    controller = new UserManagementController({} as any);
  });

  describe('getUser', () => {
    it('should get user', async () => {
      const result = await controller.getUser('user-123');

      expect(result).toHaveProperty('id');
    });
  });

  describe('listUsers', () => {
    it('should list users', async () => {
      const result = await controller.listUsers({} as any);

      expect(result).toHaveProperty('items');
    });
  });
});
