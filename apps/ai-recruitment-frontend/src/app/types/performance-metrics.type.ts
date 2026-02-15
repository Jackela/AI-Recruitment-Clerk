/**
 * Defines shape of performance metrics.
 */
export interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift

  // Additional metrics
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  tbt: number | null; // Total Blocking Time

  // Memory and resources
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;

  // Network
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;

  // Device
  deviceMemory: number;
  hardwareConcurrency: number;

  // Performance status
  overall: 'excellent' | 'good' | 'needs-improvement' | 'poor';
}
