import { UserAuthService } from './user-auth.service';

describe('UserAuthService', () => {
  let service: UserAuthService;

  beforeEach(() => {
    service = new UserAuthService({} as any);
  });

  describe('authenticate', () => {
    it('should authenticate user', async () => {
      const result = await service.authenticate({
        email: 'test@example.com',
        password: 'pass',
      });

      expect(result).toHaveProperty('token');
    });
  });

  describe('validateToken', () => {
    it('should validate token', async () => {
      const result = await service.validateToken('token');

      expect(result).toHaveProperty('valid');
    });
  });
});
