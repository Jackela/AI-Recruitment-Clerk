import { UserCrudService } from './user-crud.service';

describe('UserCrudService', () => {
  let service: UserCrudService;

  beforeEach(() => {
    service = new UserCrudService({} as any);
  });

  describe('createUser', () => {
    it('should create user', async () => {
      const result = await service.createUser({
        email: 'test@example.com',
      } as any);

      expect(result).toHaveProperty('id');
    });
  });

  describe('getUser', () => {
    it('should get user', async () => {
      const result = await service.getUser('user-123');

      expect(result).toHaveProperty('id');
    });
  });

  describe('updateUser', () => {
    it('should update user', async () => {
      const result = await service.updateUser('user-123', {
        name: 'Test',
      } as any);

      expect(result).toHaveProperty('id');
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const result = await service.deleteUser('user-123');

      expect(result).toHaveProperty('deleted');
    });
  });
});
