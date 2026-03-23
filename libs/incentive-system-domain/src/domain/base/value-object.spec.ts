import {
  ValueObject,
  RestoreData,
  SerializedRestoreData,
} from './value-object';

class TestValueObject extends ValueObject<{ value: string }> {
  public static create(value: string): TestValueObject {
    return new TestValueObject({ value });
  }

  public static restore(data: RestoreData<{ value: string }>): TestValueObject {
    return new TestValueObject(data);
  }

  public getValue(): string {
    return this.props.value;
  }
}

describe('ValueObject', () => {
  describe('constructor', () => {
    it('should freeze props', () => {
      const vo = TestValueObject.create('test');
      expect(Object.isFrozen(vo.props)).toBe(true);
    });

    it('should create instance with props', () => {
      const vo = TestValueObject.create('hello');
      expect(vo.getValue()).toBe('hello');
    });
  });

  describe('equals', () => {
    it('should return true for same instance', () => {
      const vo = TestValueObject.create('test');
      expect(vo.equals(vo)).toBe(true);
    });

    it('should return true for equal value objects', () => {
      const vo1 = TestValueObject.create('test');
      const vo2 = TestValueObject.create('test');
      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should return false for different value objects', () => {
      const vo1 = TestValueObject.create('test1');
      const vo2 = TestValueObject.create('test2');
      expect(vo1.equals(vo2)).toBe(false);
    });

    it('should return false for null', () => {
      const vo = TestValueObject.create('test');
      expect(vo.equals(null as unknown as ValueObject<{ value: string }>)).toBe(
        false,
      );
    });

    it('should return false for undefined', () => {
      const vo = TestValueObject.create('test');
      expect(
        vo.equals(undefined as unknown as ValueObject<{ value: string }>),
      ).toBe(false);
    });

    it('should handle nested objects correctly', () => {
      class NestedVO extends ValueObject<{ nested: { key: string } }> {
        public static create(nested: { key: string }): NestedVO {
          return new NestedVO({ nested });
        }
      }

      const vo1 = NestedVO.create({ key: 'value' });
      const vo2 = NestedVO.create({ key: 'value' });
      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should handle arrays in props', () => {
      class ArrayVO extends ValueObject<{ items: string[] }> {
        public static create(items: string[]): ArrayVO {
          return new ArrayVO({ items });
        }
      }

      const vo1 = ArrayVO.create(['a', 'b', 'c']);
      const vo2 = ArrayVO.create(['a', 'b', 'c']);
      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should return false for objects with different nested values', () => {
      class NestedVO extends ValueObject<{ nested: { key: string } }> {
        public static create(nested: { key: string }): NestedVO {
          return new NestedVO({ nested });
        }
      }

      const vo1 = NestedVO.create({ key: 'value1' });
      const vo2 = NestedVO.create({ key: 'value2' });
      expect(vo1.equals(vo2)).toBe(false);
    });
  });

  describe('restore', () => {
    it('should restore from plain data', () => {
      const vo = TestValueObject.restore({ value: 'restored' });
      expect(vo.getValue()).toBe('restored');
    });
  });
});

describe('RestoreData', () => {
  it('should be a type alias for T', () => {
    type Expected = { value: string };
    type Actual = RestoreData<Expected>;
    const _assignable: Actual = { value: 'test' };
    expect(_assignable.value).toBe('test');
  });
});

describe('SerializedRestoreData', () => {
  it('should allow Date or string for Date fields', () => {
    interface DateProps {
      createdAt: Date;
      name: string;
    }

    type Serialized = SerializedRestoreData<DateProps>;

    const withDate: Serialized = {
      createdAt: new Date(),
      name: 'test',
    };

    const withString: Serialized = {
      createdAt: '2024-01-01T00:00:00Z',
      name: 'test',
    };

    expect(withDate.createdAt).toBeInstanceOf(Date);
    expect(withString.createdAt).toBe('2024-01-01T00:00:00Z');
  });
});
