import { FlagsController } from './flags.controller';
import { FlagsStore } from './flags.store';

describe('FlagsController', () => {
  let controller: FlagsController;
  let store: FlagsStore;

  beforeEach(() => {
    store = new FlagsStore();
    controller = new FlagsController(store);
  });

  describe('getFlag', () => {
    it('should return flag value', () => {
      store.set('test-flag', true);

      const result = controller.getFlag('test-flag');

      expect(result).toEqual({ flag: 'test-flag', enabled: true });
    });

    it('should return disabled for non-existent flag', () => {
      const result = controller.getFlag('non-existent');

      expect(result).toEqual({ flag: 'non-existent', enabled: false });
    });
  });

  describe('setFlag', () => {
    it('should set flag value', () => {
      const result = controller.setFlag({ flag: 'new-flag', enabled: true });

      expect(result).toEqual({ flag: 'new-flag', enabled: true });
      expect(store.get('new-flag')).toBe(true);
    });
  });

  describe('listFlags', () => {
    it('should return all flags', () => {
      store.set('flag1', true);
      store.set('flag2', false);

      const result = controller.listFlags();

      expect(result).toHaveLength(2);
    });
  });
});
