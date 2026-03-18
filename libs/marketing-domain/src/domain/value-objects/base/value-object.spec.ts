import {
  ValueObject,
  RestoreData,
  SerializedRestoreData,
} from './value-object.js';

class TestValueObject extends ValueObject<{ name: string; value: number }> {
  get name(): string {
    return this.props.name;
  }

  get value(): number {
    return this.props.value;
  }

  public testEquals(other: TestValueObject): boolean {
    return this.equals(other);
  }
}

describe('ValueObject', () => {
  describe('constructor', () => {
    it('should initialize with props', () => {
      const vo = new TestValueObject({ name: 'test', value: 42 });
      expect(vo.name).toBe('test');
      expect(vo.value).toBe(42);
    });
  });

  describe('equals', () => {
    it('should return true for same props', () => {
      const vo1 = new TestValueObject({ name: 'test', value: 42 });
      const vo2 = new TestValueObject({ name: 'test', value: 42 });
      expect(vo1.testEquals(vo2)).toBe(true);
    });

    it('should return false for different props', () => {
      const vo1 = new TestValueObject({ name: 'test', value: 42 });
      const vo2 = new TestValueObject({ name: 'test', value: 43 });
      expect(vo1.testEquals(vo2)).toBe(false);
    });

    it('should return false for different names', () => {
      const vo1 = new TestValueObject({ name: 'test1', value: 42 });
      const vo2 = new TestValueObject({ name: 'test2', value: 42 });
      expect(vo1.testEquals(vo2)).toBe(false);
    });

    it('should return true for complex objects with same structure', () => {
      class ComplexVO extends ValueObject<{
        data: { nested: string; arr: number[] };
      }> {}
      const vo1 = new ComplexVO({ data: { nested: 'value', arr: [1, 2, 3] } });
      const vo2 = new ComplexVO({ data: { nested: 'value', arr: [1, 2, 3] } });
      expect((vo1 as any).equals(vo2)).toBe(true);
    });

    it('should return false for complex objects with different structure', () => {
      class ComplexVO extends ValueObject<{
        data: { nested: string; arr: number[] };
      }> {}
      const vo1 = new ComplexVO({ data: { nested: 'value', arr: [1, 2, 3] } });
      const vo2 = new ComplexVO({ data: { nested: 'value', arr: [1, 2, 4] } });
      expect((vo1 as any).equals(vo2)).toBe(false);
    });
  });
});

describe('RestoreData type', () => {
  it('should work with simple types', () => {
    type SimpleData = RestoreData<{ value: string }>;
    const data: SimpleData = { value: 'test' };
    expect(data.value).toBe('test');
  });

  it('should work with complex types', () => {
    interface ComplexProps {
      name: string;
      email: string;
      count: number;
    }
    type ComplexData = RestoreData<ComplexProps>;
    const data: ComplexData = {
      name: 'John',
      email: 'john@test.com',
      count: 5,
    };
    expect(data.name).toBe('John');
    expect(data.count).toBe(5);
  });
});

describe('SerializedRestoreData type', () => {
  it('should convert Date to string in serialized data', () => {
    type DataWithDate = SerializedRestoreData<{
      timestamp: Date;
      name: string;
    }>;
    const data: DataWithDate = {
      timestamp: '2024-01-01T00:00:00Z',
      name: 'test',
    };
    expect(typeof data.timestamp).toBe('string');
  });

  it('should keep non-Date types unchanged', () => {
    type MixedData = SerializedRestoreData<{
      date: Date;
      count: number;
      flag: boolean;
    }>;
    const data: MixedData = { date: new Date(), count: 10, flag: true };
    expect(typeof data.count).toBe('number');
    expect(typeof data.flag).toBe('boolean');
  });
});
