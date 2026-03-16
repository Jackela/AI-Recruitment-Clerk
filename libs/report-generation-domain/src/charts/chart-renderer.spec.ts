/**
 * Chart Renderer Tests
 * Tests for chart generation and rendering functionality
 */

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

interface ChartOptions {
  width: number;
  height: number;
  title?: string;
  showLegend?: boolean;
}

type ChartType = 'bar' | 'pie' | 'line';

class ChartRenderer {
  private validateData(data: ChartData): boolean {
    if (!data.labels || data.labels.length === 0) return false;
    if (!data.datasets || data.datasets.length === 0) return false;
    return data.datasets.every(
      (ds) => ds.data && ds.data.length === data.labels.length,
    );
  }

  renderBarChart(data: ChartData, options: ChartOptions): string {
    if (!this.validateData(data)) {
      throw new Error('Invalid chart data');
    }
    return `bar-chart-${options.width}x${options.height}`;
  }

  renderPieChart(data: ChartData, options: ChartOptions): string {
    if (!this.validateData(data)) {
      throw new Error('Invalid chart data');
    }
    if (data.datasets.length > 1) {
      throw new Error('Pie chart supports only one dataset');
    }
    return `pie-chart-${options.width}x${options.height}`;
  }

  renderLineChart(data: ChartData, options: ChartOptions): string {
    if (!this.validateData(data)) {
      throw new Error('Invalid chart data');
    }
    return `line-chart-${options.width}x${options.height}`;
  }

  exportToFormat(chartType: ChartType, format: 'png' | 'svg' | 'json'): string {
    const validFormats = ['png', 'svg', 'json'];
    if (!validFormats.includes(format)) {
      throw new Error(`Unsupported format: ${format}`);
    }
    return `${chartType}.${format}`;
  }

  calculateScale(data: ChartData): { min: number; max: number } {
    const allValues = data.datasets.flatMap((ds) => ds.data);
    return {
      min: Math.min(...allValues),
      max: Math.max(...allValues),
    };
  }
}

describe('ChartRenderer', () => {
  let renderer: ChartRenderer;
  const validData: ChartData = {
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [
      {
        label: 'Sales',
        data: [100, 200, 150],
        color: 'blue',
      },
    ],
  };
  const defaultOptions: ChartOptions = {
    width: 800,
    height: 600,
    title: 'Test Chart',
  };

  beforeEach(() => {
    renderer = new ChartRenderer();
  });

  describe('renderBarChart', () => {
    it('should render bar chart with valid data', () => {
      const result = renderer.renderBarChart(validData, defaultOptions);
      expect(result).toContain('bar-chart');
    });

    it('should throw error for invalid data', () => {
      const invalidData = { labels: [], datasets: [] };
      expect(() =>
        renderer.renderBarChart(invalidData as ChartData, defaultOptions),
      ).toThrow('Invalid chart data');
    });

    it('should handle multiple datasets', () => {
      const multiData: ChartData = {
        labels: ['A', 'B'],
        datasets: [
          { label: 'Series 1', data: [10, 20] },
          { label: 'Series 2', data: [30, 40] },
        ],
      };
      const result = renderer.renderBarChart(multiData, defaultOptions);
      expect(result).toContain('bar-chart');
    });
  });

  describe('renderPieChart', () => {
    it('should render pie chart with valid data', () => {
      const result = renderer.renderPieChart(validData, defaultOptions);
      expect(result).toContain('pie-chart');
    });

    it('should throw error for multiple datasets', () => {
      const multiData: ChartData = {
        labels: ['A', 'B'],
        datasets: [
          { label: 'S1', data: [10, 20] },
          { label: 'S2', data: [30, 40] },
        ],
      };
      expect(() => renderer.renderPieChart(multiData, defaultOptions)).toThrow(
        'Pie chart supports only one dataset',
      );
    });

    it('should throw error for empty data', () => {
      expect(() =>
        renderer.renderPieChart({ labels: [], datasets: [] }, defaultOptions),
      ).toThrow('Invalid chart data');
    });
  });

  describe('renderLineChart', () => {
    it('should render line chart with valid data', () => {
      const result = renderer.renderLineChart(validData, defaultOptions);
      expect(result).toContain('line-chart');
    });

    it('should handle time series data', () => {
      const timeData: ChartData = {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{ label: 'Revenue', data: [1000, 1200, 1100, 1300] }],
      };
      const result = renderer.renderLineChart(timeData, defaultOptions);
      expect(result).toContain('line-chart');
    });
  });

  describe('calculateScale', () => {
    it('should calculate correct min and max values', () => {
      const scale = renderer.calculateScale(validData);
      expect(scale.min).toBe(100);
      expect(scale.max).toBe(200);
    });

    it('should handle negative values', () => {
      const dataWithNegatives: ChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [{ label: 'Test', data: [-10, 0, 10] }],
      };
      const scale = renderer.calculateScale(dataWithNegatives);
      expect(scale.min).toBe(-10);
      expect(scale.max).toBe(10);
    });
  });

  describe('exportToFormat', () => {
    it('should export to PNG', () => {
      const result = renderer.exportToFormat('bar', 'png');
      expect(result).toBe('bar.png');
    });

    it('should export to SVG', () => {
      const result = renderer.exportToFormat('pie', 'svg');
      expect(result).toBe('pie.svg');
    });

    it('should export to JSON', () => {
      const result = renderer.exportToFormat('line', 'json');
      expect(result).toBe('line.json');
    });

    it('should throw error for unsupported format', () => {
      expect(() => renderer.exportToFormat('bar', 'pdf' as any)).toThrow(
        'Unsupported format: pdf',
      );
    });
  });

  describe('data validation', () => {
    it('should reject mismatched label and data lengths', () => {
      const mismatchedData: ChartData = {
        labels: ['A', 'B'],
        datasets: [{ label: 'Test', data: [1, 2, 3] }],
      };
      expect(() =>
        renderer.renderBarChart(mismatchedData, defaultOptions),
      ).toThrow('Invalid chart data');
    });

    it('should reject empty labels', () => {
      const emptyLabels: ChartData = {
        labels: [],
        datasets: [{ label: 'Test', data: [] }],
      };
      expect(() =>
        renderer.renderBarChart(emptyLabels, defaultOptions),
      ).toThrow('Invalid chart data');
    });
  });
});
