import { FlagsStore } from './flags.store';

describe('FlagsStore', () => {
  let store: FlagsStore;

  beforeEach(() => {
    store = new FlagsStore();
  });

  describe('get', () => {
    it('should return undefined for non-existent flag', () => {
      expect(store.get('non-existent')).toBeUndefined();
    });

    it('should return default value when flag exists', () => {
      store.set('test-flag', true);

      expect(store.get('test-flag')).toBe(true);
    });
  });

  describe('set', () => {
    it('should set flag value', () => {
      store.set('new-flag', false);

      expect(store.get('new-flag')).toBe(false);
    });
  });

  describe('isEnabled', () => {
    it('should return false for non-existent flag', () => {
      expect(store.isEnabled('non-existent')).toBe(false);
    });

    it('should return true when flag is enabled', () => {
      store.set('enabled', true);

      expect(store.isEnabled('enabled')).toBe(true);
    });
  });
});
