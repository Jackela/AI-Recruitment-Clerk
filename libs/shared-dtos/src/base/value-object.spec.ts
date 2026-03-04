import { ValueObject, type RestoreData, type SerializedRestoreData } from './value-object';

/**
 * Concrete implementation of ValueObject for testing.
 */
class TestValueObject extends ValueObject<{ value: string }> {
  public getValue(): string {
    return this.props.value;
  }
}

describe('ValueObject', () => {
  describe('constructor', () => {
    it('should freeze props to prevent mutation', () => {
    const vo = new TestValueObject({ value: 'test' });

      expect(Object.isFrozen(vo['props'])).toBe(true);
    });

    it('should store the provided props', () => {
      const vo = new TestValueObject({ value: 'hello' });

      expect(vo.getValue()).toBe('hello');
    });
  });

  describe('equals', () => {
    it('should return true for equal value objects', () => {
      const vo1 = new TestValueObject({ value: 'same' });
      const vo2 = new TestValueObject({ value: 'same' });

      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should return false for different value objects', () => {
      const vo1 = new TestValueObject({ value: 'one' });
      const vo2 = new TestValueObject({ value: 'two' });

      expect(vo1.equals(vo2)).toBe(false);
    });

    it('should return false when comparing to null', () => {
      const vo = new TestValueObject({ value: 'test' });

      expect(vo.equals(null as unknown as TestValueObject)).toBe(false);
    });

    it('should return false when comparing to undefined', () => {
      const vo = new TestValueObject({ value: 'test' });

      expect(vo.equals(undefined as unknown as TestValueObject)).toBe(false);
    });

    it('should return false when comparing to object with undefined props', () => {
      const vo1 = new TestValueObject({ value: 'test' });
      // Create an object without props
      const vo2 = { props: undefined } as unknown as TestValueObject;

      expect(vo1.equals(vo2)).toBe(false);
    });

    it('should return true when comparing to itself', () => {
      const vo = new TestValueObject({ value: 'self' });

      expect(vo.equals(vo)).toBe(true);
    });

    it('should handle complex nested objects', () => {
      class ComplexValueObject extends ValueObject<{ data: { nested: string[] } }> {
        public getData() {
          return this.props.data;
        }
      }

      const vo1 = new ComplexValueObject({ data: { nested: ['a', 'b'] } });
      const vo2 = new ComplexValueObject({ data: { nested: ['a', 'b'] } });

      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should return false for different nested objects', () => {
      class ComplexValueObject extends ValueObject<{ data: { nested: string[] } }> {
        public getData() {
          return this.props.data;
        }
      }

      const vo1 = new ComplexValueObject({ data: { nested: ['a', 'b'] } });
      const vo2 = new ComplexValueObject({ data: { nested: ['a', 'c'] } });

      expect(vo1.equals(vo2)).toBe(false);
    });
  });
});

describe('RestoreData', () => {
  it('should be a type alias that preserves the shape of T', () => {
    type TestRestore = RestoreData<{ id: string; count: number }>;
    const data: TestRestore = { id: '123', count: 5 };

    expect(data.id).toBe('123');
    expect(data.count).toBe(5);
  });
});

describe('SerializedRestoreData', () => {
  it('should allow Date fields to be strings', () => {
    type TestSerialized = SerializedRestoreData<{ createdAt: Date; name: string }>;

    // Should accept string for Date field
    const withDateString: TestSerialized = {
      createdAt: '2024-01-15T10:30:00Z',
      name: 'test',
    };

    expect(withDateString.createdAt).toBe('2024-01-15T10:30:00Z');
    expect(withDateString.name).toBe('test');
  });

  it('should allow Date fields to be Date objects', () => {
    type TestSerialized = SerializedRestoreData<{ createdAt: Date; name: string }>;

    // Should also accept Date object
    const withDateObject: TestSerialized = {
      createdAt: new Date('2024-01-15T10:30:00Z'),
      name: 'test',
    };

    expect(withDateObject.createdAt).toBeInstanceOf(Date);
    expect(withDateObject.name).toBe('test');
  });

  it('should preserve non-Date fields as-is', () => {
    type TestSerialized = SerializedRestoreData<{ count: number; text: string }>;

    const data: TestSerialized = {
      count: 42,
      text: 'hello',
    };

    expect(data.count).toBe(42);
    expect(data.text).toBe('hello');
  });
});
