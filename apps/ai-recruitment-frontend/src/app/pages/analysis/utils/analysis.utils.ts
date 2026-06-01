/**
 * Analysis utility functions
 * Pure functions for data processing and formatting
 */

/**
 * Normalizes a score value to be between 0 and 100
 */
export function normalizeScore(value: unknown, fallback = 0): number {
  const numeric =
    typeof value === 'number' && Number.isFinite(value) ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, numeric));
}

/**
 * Normalizes a string value, returning fallback if invalid
 */
export function normalizeString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

/**
 * Normalizes an array of strings, filtering out invalid entries
 */
export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Normalizes a URL string, returning undefined if invalid
 */
export function normalizeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    return undefined;
  }
}

/**
 * Maps Chinese step names to step IDs
 */
export const STEP_NAME_MAP: Record<string, string> = {
  上传文件: 'upload',
  解析简历: 'parse',
  提取关键信息: 'extract',
  智能分析: 'analyze',
  生成报告: 'report',
};

/**
 * Maps a step name to its ID
 */
export function mapStepNameToId(stepName: string): string {
  return STEP_NAME_MAP[stepName] || stepName.toLowerCase();
}

/**
 * Formats a number for display (e.g., 1000 -> 1K)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Formats a timestamp for display
 */
export function formatTimestamp(timestamp: Date | undefined): string {
  if (!timestamp) return 'N/A';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp);
}

/**
 * Gets score category label based on score
 */
export function getScoreCategory(score: number): string {
  if (score >= 80) return '优秀';
  if (score >= 60) return '良好';
  return '待提升';
}

/**
 * Gets score CSS class based on score
 */
export function getScoreClass(score: number): string {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

/**
 * Gets priority label based on score
 */
export function getPriorityLabel(score: number): string {
  if (score >= 85) return '高优先级';
  if (score >= 70) return '中优先级';
  if (score >= 50) return '低优先级';
  return '待考虑';
}

/**
 * Gets priority CSS class based on score
 */
export function getPriorityClass(score: number): string {
  if (score >= 85) return 'high';
  if (score >= 70) return 'medium';
  return 'low';
}
