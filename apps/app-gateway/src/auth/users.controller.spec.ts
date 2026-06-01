import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(() => {
    controller = new UsersController({} as any);
  });

  describe('getUser', () => {
    it('should get user', async () => {
      const result = await controller.getUser('user-123');

      expect(result).toHaveProperty('id');
    });
  });

  describe('updateUser', () => {
    it('should update user', async () => {
      const result = await controller.updateUser('user-123', {
        name: 'Test',
      } as any);

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
