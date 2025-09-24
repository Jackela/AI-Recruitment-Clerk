/**
 * 全局类型定义统一导出
 * 提供类型安全和智能提示
 */

// 应用配置类型
export type { AppConfig } from '../config';
export type { I18nTexts } from '../config/i18n.config';

// 主题和可访问性类型
export type FontSize = 'normal' | 'large' | 'larger';
export type Theme = 'light' | 'dark' | 'high-contrast';

// 通知类型
export type NotificationType = 'success' | 'info' | 'warning' | 'error';

// 组件通用类型
export interface BaseComponent {
  id: string;
  className?: string;
  ariaLabel?: string;
}

// 表单类型
export interface FormValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// 用户偏好设置
export interface UserPreferences {
  theme: Theme;
  fontSize: FontSize;
  reducedMotion: boolean;
  highContrast: boolean;
  language: string;
}

// 性能指标类型
export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  cacheHitRatio: number;
  databaseLatency: number;
  networkLatency: number;
  reliability: number;
}
