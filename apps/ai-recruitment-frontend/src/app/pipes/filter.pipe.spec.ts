import { FilterPipe } from './filter.pipe';

interface TestItem {
  name: string;
  category: string;
}

describe('FilterPipe', () => {
  let pipe: FilterPipe;

  beforeEach(() => {
    pipe = new FilterPipe();
  });

  describe('transform', () => {
    it('should filter array by string property', () => {
      const items: TestItem[] = [
        { name: 'Apple', category: 'fruit' },
        { name: 'Banana', category: 'fruit' },
        { name: 'Carrot', category: 'vegetable' },
      ];
      const filtered = pipe.transform(items, 'category', 'fruit');
      expect(filtered.length).toBe(2);
      expect(filtered.map((i) => i.name)).toEqual(['Apple', 'Banana']);
    });

    it('should be case insensitive', () => {
      const items: TestItem[] = [
        { name: 'Apple', category: 'fruit' },
        { name: 'Banana', category: 'FRUIT' },
      ];
      const filtered = pipe.transform(items, 'category', 'fruit');
      expect(filtered.length).toBe(2);
    });

    it('should return all items when search term is empty', () => {
      const items: TestItem[] = [
        { name: 'Apple', category: 'fruit' },
        { name: 'Banana', category: 'fruit' },
      ];
      expect(pipe.transform(items, 'category', '')).toEqual(items);
      expect(pipe.transform(items, 'category', null as never)).toEqual(items);
    });

    it('should return empty array for null/undefined input', () => {
      expect(pipe.transform(null, 'name', 'test')).toEqual([]);
      expect(pipe.transform(undefined, 'name', 'test')).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      expect(pipe.transform([], 'name', 'test')).toEqual([]);
    });

    it('should handle partial matches', () => {
      const items: TestItem[] = [
        { name: 'Apple', category: 'red fruit' },
        { name: 'Banana', category: 'yellow fruit' },
        { name: 'Carrot', category: 'vegetable' },
      ];
      const filtered = pipe.transform(items, 'category', 'fruit');
      expect(filtered.length).toBe(2);
    });

    it('should exclude items with null/undefined values', () => {
      const items = [
        { name: 'Apple', category: 'fruit' },
        { name: 'Unknown', category: null },
      ] as TestItem[];
      const filtered = pipe.transform(items, 'category', 'fruit');
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Apple');
    });
  });
});
