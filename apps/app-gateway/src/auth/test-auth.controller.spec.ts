import { TestAuthController } from './test-auth.controller';

describe('TestAuthController', () => {
  let controller: TestAuthController;

  beforeEach(() => {
    controller = new TestAuthController({} as any);
  });

  describe('login', () => {
    it('should login user for testing', async () => {
      const result = await controller.login({
        email: 'test@test.com',
        password: 'test',
      } as any);

      expect(result).toHaveProperty('token');
    });
  });

  describe('logout', () => {
    it('should logout user for testing', async () => {
      const result = await controller.logout({} as any);

      expect(result).toHaveProperty('success');
    });
  });
});
