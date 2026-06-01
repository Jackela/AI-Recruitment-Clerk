import { TestUsersStore } from './test-users.store';

describe('TestUsersStore', () => {
  let store: TestUsersStore;

  beforeEach(() => {
    store = new TestUsersStore();
  });

  describe('addUser', () => {
    it('should add user to store', () => {
      store.addUser({ id: 'user-1', email: 'test@test.com' } as any);

      const user = store.getUser('user-1');
      expect(user).toBeDefined();
    });
  });

  describe('getUser', () => {
    it('should return undefined for non-existent user', () => {
      const user = store.getUser('non-existent');
      expect(user).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all users', () => {
      store.addUser({ id: 'user-1', email: 'test@test.com' } as any);
      store.clear();

      expect(store.getUser('user-1')).toBeUndefined();
    });
  });
});
