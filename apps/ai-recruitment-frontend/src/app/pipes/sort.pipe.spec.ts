import { SortPipe } from './sort.pipe';

interface TestItem {
  name: string;
  age: number;
  date?: Date;
}

describe('SortPipe', () => {
  let pipe: SortPipe;

  beforeEach(() => {
    pipe = new SortPipe();
  });

  describe('transform', () => {
    it('should sort array by string property ascending', () => {
      const items: TestItem[] = [
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 35 },
      ];
      const sorted = pipe.transform(items, 'name', 'asc');
      expect(sorted.map((i) => i.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should sort array by string property descending', () => {
      const items: TestItem[] = [
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 35 },
      ];
      const sorted = pipe.transform(items, 'name', 'desc');
      expect(sorted.map((i) => i.name)).toEqual(['Charlie', 'Bob', 'Alice']);
    });

    it('should sort array by number property', () => {
      const items: TestItem[] = [
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 35 },
      ];
      const sorted = pipe.transform(items, 'age', 'asc');
      expect(sorted.map((i) => i.age)).toEqual([25, 30, 35]);
    });

    it('should return empty array for null/undefined input', () => {
      expect(pipe.transform(null, 'name')).toEqual([]);
      expect(pipe.transform(undefined, 'name')).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      expect(pipe.transform([], 'name')).toEqual([]);
    });

    it('should handle items with null/undefined values', () => {
      const items = [
        { name: 'Charlie', age: null },
        { name: 'Alice', age: 25 },
        { name: null, age: 30 },
      ] as TestItem[];
      const sorted = pipe.transform(items, 'age', 'asc');
      expect(sorted[0].age).toBe(25);
    });

    it('should use ascending order as default', () => {
      const items: TestItem[] = [
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
      ];
      const sorted = pipe.transform(items, 'name');
      expect(sorted.map((i) => i.name)).toEqual(['Alice', 'Charlie']);
    });
  });
});
