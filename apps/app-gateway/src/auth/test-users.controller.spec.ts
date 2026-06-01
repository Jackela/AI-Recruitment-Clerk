import { TestUsersController } from './test-users.controller';

describe('TestUsersController', () => {
  let controller: TestUsersController;

  beforeEach(() => {
    controller = new TestUsersController({} as any);
  });

  describe('createUser', () => {
    it('should create test user', async () => {
      const result = await controller.createUser({
        email: 'test@test.com',
      } as any);

      expect(result).toHaveProperty('id');
    });
  });

  describe('getUser', () => {
    it('should get test user', async () => {
      const result = await controller.getUser('user-123');

      expect(result).toHaveProperty('id');
    });
  });
});
