/**
 * @fileoverview Interface definitions for statistics panel components.
 */

/**
 * Defines the shape of the usage statistics.
 */
export interface UsageStatistics {
  todayAnalyses: number;
  totalAnalyses: number;
  averageScore: number;
  monthlyAnalyses?: number;
  successRate?: number;
}

/**
 * Defines the shape of the usage tip.
 */
export interface UsageTip {
  icon: string;
  title: string;
  description: string;
  category?: 'file' | 'accuracy' | 'analysis' | 'general';
}

/**
 * Defines the shape of performance insight.
 */
export interface PerformanceInsight {
  icon: string;
  text: string;
}

/**
 * Defines the shape of a statistic card item.
 */
export interface StatCardData {
  value: number;
  label: string;
  icon: string;
  type: 'today' | 'total' | 'score' | 'monthly' | 'success';
  scoreClass?: 'high' | 'medium' | 'low';
  suffix?: string;
  title?: string;
}

/**
 * Type for tip categories.
 */
export type TipCategory = 'general' | 'file' | 'accuracy' | 'analysis';

/**
 * Category labels mapping.
 */
export const CATEGORY_LABELS: Record<TipCategory, string> = {
  general: '通用',
  file: '文件',
  accuracy: '准确性',
  analysis: '分析',
};
