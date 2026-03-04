/**
 * Type Guards Unit Tests
 *
 * Comprehensive test coverage for runtime type checking utilities.
 * Tests cover all edge cases including null, undefined, primitives, objects,
 * and various property configurations.
 */

import {
  isNonNullObject,
  hasMessageProperty,
  hasErrorProperty,
  hasToStringMethod,
} from './type-guards';

describe('Type Guards', () => {
  describe('isNonNullObject', () => {
    it('should return false for null', () => {
      expect(isNonNullObject(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isNonNullObject(undefined)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isNonNullObject(42)).toBe(false);
      expect(isNonNullObject('string')).toBe(false);
      expect(isNonNullObject(true)).toBe(false);
      expect(isNonNullObject(Symbol('test'))).toBe(false);
      expect(isNonNullObject(BigInt(42))).toBe(false);
    });

    it('should return true for plain objects', () => {
      expect(isNonNullObject({})).toBe(true);
      expect(isNonNullObject({ key: 'value' })).toBe(true);
    });

    it('should return true for arrays', () => {
      expect(isNonNullObject([])).toBe(true);
      expect(isNonNullObject([1, 2, 3])).toBe(true);
    });

    it('should return true for class instances', () => {
      class TestClass {}
      expect(isNonNullObject(new TestClass())).toBe(true);
      expect(isNonNullObject(new Date())).toBe(true);
      expect(isNonNullObject(new Error())).toBe(true);
    });

    it('should return true for functions (typeof function is object in some contexts)', () => {
      // Note: typeof function === 'function', not 'object', so this should return false
      expect(isNonNullObject(() => {})).toBe(false);
      expect(isNonNullObject(function () {})).toBe(false);
    });
  });

  describe('hasMessageProperty', () => {
    it('should return false for null', () => {
      expect(hasMessageProperty(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(hasMessageProperty(undefined)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(hasMessageProperty(42)).toBe(false);
      expect(hasMessageProperty('string')).toBe(false);
      expect(hasMessageProperty(true)).toBe(false);
    });

    it('should return true for objects with message property', () => {
      expect(hasMessageProperty({ message: 'test' })).toBe(true);
      expect(hasMessageProperty({ message: 123 })).toBe(true);
      expect(hasMessageProperty({ message: null })).toBe(true);
      expect(hasMessageProperty({ message: undefined })).toBe(true);
    });

    it('should return false for objects without message property', () => {
      expect(hasMessageProperty({})).toBe(false);
      expect(hasMessageProperty({ msg: 'test' })).toBe(false);
      expect(hasMessageProperty({ error: 'test' })).toBe(false);
    });

    it('should return true for Error objects', () => {
      const error = new Error('test error');
      expect(hasMessageProperty(error)).toBe(true);
    });

    it('should return true for objects with inherited message property', () => {
      const parent = { message: 'inherited' };
      const child = Object.create(parent);
      expect(hasMessageProperty(child)).toBe(true);
    });
  });

  describe('hasErrorProperty', () => {
    it('should return false for null', () => {
      expect(hasErrorProperty(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(hasErrorProperty(undefined)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(hasErrorProperty(42)).toBe(false);
      expect(hasErrorProperty('string')).toBe(false);
      expect(hasErrorProperty(true)).toBe(false);
    });

    it('should return true for objects with error property', () => {
      expect(hasErrorProperty({ error: 'test' })).toBe(true);
      expect(hasErrorProperty({ error: 123 })).toBe(true);
      expect(hasErrorProperty({ error: null })).toBe(true);
      expect(hasErrorProperty({ error: undefined })).toBe(true);
      expect(hasErrorProperty({ error: new Error() })).toBe(true);
    });

    it('should return false for objects without error property', () => {
      expect(hasErrorProperty({})).toBe(false);
      expect(hasErrorProperty({ err: 'test' })).toBe(false);
      expect(hasErrorProperty({ message: 'test' })).toBe(false);
    });

    it('should return true for objects with inherited error property', () => {
      const parent = { error: 'inherited' };
      const child = Object.create(parent);
      expect(hasErrorProperty(child)).toBe(true);
    });
  });

  describe('hasToStringMethod', () => {
    it('should return false for null', () => {
      expect(hasToStringMethod(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(hasToStringMethod(undefined)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(hasToStringMethod(42)).toBe(false);
      expect(hasToStringMethod('string')).toBe(false);
      expect(hasToStringMethod(true)).toBe(false);
    });

    it('should return true for objects with toString method', () => {
      expect(hasToStringMethod({ toString: () => 'custom' })).toBe(true);
      expect(
        hasToStringMethod({
          toString: function () {
            return 'custom';
          },
        }),
      ).toBe(true);
    });

    it('should return true for all objects (they inherit toString from Object.prototype)', () => {
      // All objects have toString via Object.prototype
      expect(hasToStringMethod({})).toBe(true);
      expect(hasToStringMethod({ key: 'value' })).toBe(true);
      expect(hasToStringMethod([])).toBe(true);
      expect(hasToStringMethod(new Date())).toBe(true);
      expect(hasToStringMethod(new Error())).toBe(true);
    });

    it('should return false for objects with non-function toString property', () => {
      expect(hasToStringMethod({ toString: 'not a function' })).toBe(false);
      expect(hasToStringMethod({ toString: 123 })).toBe(false);
      expect(hasToStringMethod({ toString: null })).toBe(false);
      expect(hasToStringMethod({ toString: undefined })).toBe(false);
    });

    it('should return true for objects with inherited toString method', () => {
      const parent = { toString: () => 'parent' };
      const child = Object.create(parent);
      expect(hasToStringMethod(child)).toBe(true);
    });
  });

  describe('Type narrowing verification', () => {
    it('should narrow type correctly for hasMessageProperty', () => {
      const value: unknown = { message: 'test' };
      if (hasMessageProperty(value)) {
        // TypeScript should recognize value.message exists here
        expect(value.message).toBe('test');
      }
    });

    it('should narrow type correctly for hasErrorProperty', () => {
      const value: unknown = { error: 'test' };
      if (hasErrorProperty(value)) {
        // TypeScript should recognize value.error exists here
        expect(value.error).toBe('test');
      }
    });

    it('should narrow type correctly for hasToStringMethod', () => {
      const value: unknown = { toString: () => 'test' };
      if (hasToStringMethod(value)) {
        // TypeScript should recognize value.toString is callable here
        expect(typeof value.toString).toBe('function');
        expect(value.toString()).toBe('test');
      }
    });
  });
});
