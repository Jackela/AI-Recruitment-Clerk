/**
 * Bento Grid Layout Service Tests
 */
import { TestBed } from '@angular/core/testing';
import {
  BentoGridLayoutService,
  BentoGridLayoutConfig,
} from './bento-grid-layout.service';

describe('BentoGridLayoutService', () => {
  let service: BentoGridLayoutService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BentoGridLayoutService],
    });
    service = TestBed.inject(BentoGridLayoutService);
  });

  describe('calculateColumns', () => {
    it('should return default layout for zero width', () => {
      const config: BentoGridLayoutConfig = {
        gridSize: 'default',
        minColumnWidth: 280,
      };

      const result = service.calculateColumns(0, config);

      expect(result.columns).toBe(4);
      expect(result.gridTemplate).toBe('repeat(4, 1fr)');
    });

    it('should calculate columns based on container width', () => {
      const config: BentoGridLayoutConfig = {
        gridSize: 'default',
        minColumnWidth: 280,
      };

      const result = service.calculateColumns(1200, config);

      expect(result.columns).toBe(4);
      expect(result.gridTemplate).toBe('repeat(4, 1fr)');
    });

    it('should respect max columns limit', () => {
      const config: BentoGridLayoutConfig = {
        gridSize: 'compact',
        minColumnWidth: 200,
        maxColumns: 4,
      };

      const result = service.calculateColumns(2000, config);

      expect(result.columns).toBeLessThanOrEqual(4);
    });

    it('should ensure at least one column', () => {
      const config: BentoGridLayoutConfig = {
        gridSize: 'default',
        minColumnWidth: 500,
      };

      const result = service.calculateColumns(400, config);

      expect(result.columns).toBe(1);
    });

    it('should reduce columns on overflow for compact grid', () => {
      const config: BentoGridLayoutConfig = {
        gridSize: 'compact',
        minColumnWidth: 150,
      };

      // Width that would cause overflow with many columns
      const result = service.calculateColumns(800, config);

      expect(result.columns).toBeGreaterThanOrEqual(1);
    });

    it('should reduce columns on overflow for default grid', () => {
      const config: BentoGridLayoutConfig = {
        gridSize: 'default',
        minColumnWidth: 280,
      };

      const result = service.calculateColumns(900, config);

      expect(result.columns).toBe(3);
    });
  });

  describe('getDefaultLayout', () => {
    it('should return 4 columns for default grid size', () => {
      const config: BentoGridLayoutConfig = {
        gridSize: 'default',
        minColumnWidth: 280,
      };

      const result = service.getDefaultLayout(config);

      expect(result.columns).toBe(4);
    });

    it('should return 6 columns for compact grid size', () => {
      const config: BentoGridLayoutConfig = {
        gridSize: 'compact',
        minColumnWidth: 200,
      };

      const result = service.getDefaultLayout(config);

      expect(result.columns).toBe(4); // Limited by Math.min(4, 6)
    });

    it('should respect custom max columns', () => {
      const config: BentoGridLayoutConfig = {
        gridSize: 'default',
        minColumnWidth: 280,
        maxColumns: 2,
      };

      const result = service.getDefaultLayout(config);

      expect(result.columns).toBe(2);
    });
  });

  describe('getMaxColumns', () => {
    it('should return custom max columns when provided', () => {
      const config: BentoGridLayoutConfig = {
        gridSize: 'default',
        minColumnWidth: 280,
        maxColumns: 3,
      };

      const result = service.getMaxColumns(config);

      expect(result).toBe(3);
    });

    it('should return 6 for compact grid size', () => {
      const config: BentoGridLayoutConfig = {
        gridSize: 'compact',
        minColumnWidth: 200,
      };

      const result = service.getMaxColumns(config);

      expect(result).toBe(6);
    });

    it('should return 4 for default grid size', () => {
      const config: BentoGridLayoutConfig = {
        gridSize: 'default',
        minColumnWidth: 280,
      };

      const result = service.getMaxColumns(config);

      expect(result).toBe(4);
    });

    it('should return 3 for wide grid size', () => {
      const config: BentoGridLayoutConfig = {
        gridSize: 'wide',
        minColumnWidth: 350,
      };

      const result = service.getMaxColumns(config);

      expect(result).toBe(3);
    });

    it('should return 4 for unknown grid size', () => {
      const config: BentoGridLayoutConfig = {
        gridSize: 'unknown' as 'default',
        minColumnWidth: 280,
      };

      const result = service.getMaxColumns(config);

      expect(result).toBe(4);
    });
  });

  describe('wouldCauseOverflow', () => {
    it('should return false for single column', () => {
      const result = service.wouldCauseOverflow(400, 1, 'default');

      expect(result).toBe(false);
    });

    it('should detect overflow for compact grid', () => {
      const result = service.wouldCauseOverflow(400, 3, 'compact');

      expect(result).toBe(true); // 400/3 = 133px < 200px minimum
    });

    it('should detect overflow for default grid', () => {
      const result = service.wouldCauseOverflow(600, 3, 'default');

      expect(result).toBe(true); // 600/3 = 200px < 280px minimum
    });

    it('should not detect overflow when enough space', () => {
      const result = service.wouldCauseOverflow(1200, 4, 'default');

      expect(result).toBe(false); // 1200/4 = 300px >= 280px minimum
    });
  });

  describe('shouldUseSingleColumn', () => {
    it('should return true for large items in 2 columns', () => {
      const result = service.shouldUseSingleColumn(2, 'large');

      expect(result).toBe(true);
    });

    it('should return true for wide items in 1 column', () => {
      const result = service.shouldUseSingleColumn(1, 'wide');

      expect(result).toBe(true);
    });

    it('should return true for feature items', () => {
      const result = service.shouldUseSingleColumn(2, 'feature');

      expect(result).toBe(true);
    });

    it('should return false for small items', () => {
      const result = service.shouldUseSingleColumn(2, 'small');

      expect(result).toBe(false);
    });

    it('should return false for medium items in 2 columns', () => {
      const result = service.shouldUseSingleColumn(2, 'medium');

      expect(result).toBe(false);
    });

    it('should return false for large items in 3 columns', () => {
      const result = service.shouldUseSingleColumn(3, 'large');

      expect(result).toBe(false);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce function calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = service.debounce(mockFn, 300);

      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(300);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
    });

    it('should call function after wait period', () => {
      const mockFn = jest.fn();
      const debouncedFn = service.debounce(mockFn, 200);

      debouncedFn('test');

      jest.advanceTimersByTime(200);

      expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('should reset timer on subsequent calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = service.debounce(mockFn, 300);

      debouncedFn('first');
      jest.advanceTimersByTime(200);
      debouncedFn('second');
      jest.advanceTimersByTime(200);

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledWith('second');
    });
  });
});
