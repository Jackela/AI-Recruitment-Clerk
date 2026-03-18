/**
 * 工具函数统一导出
 * 提供常用的工具函数和辅助方法
 */

// 防抖函数
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// 节流函数
/**
 * Performs the throttle operation.
 * @param func - The func.
 * @param delay - The delay.
 * @returns The (...args: Parameters<T>) => void.
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

// 深拷贝函数
/**
 * Performs the deep clone operation.
 * @param obj - The obj.
 * @returns The T.
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}

// 生成随机ID
/**
 * Generates id.
 * @param prefix - The prefix.
 * @param length - The length.
 * @returns The string value.
 */
export function generateId(prefix = '', length = 8): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = prefix ? `${prefix}-` : '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

// 格式化文件大小
/**
 * Performs the format file size operation.
 * @param bytes - The bytes.
 * @returns The string value.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化日期
/**
 * Performs the format date operation.
 * @param date - The date.
 * @param format - The format.
 * @returns The string value.
 */
export function formatDate(
  date: Date | string,
  format = 'YYYY-MM-DD HH:mm:ss',
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

// 相对时间翻译接口
export interface RelativeTimeTranslations {
  just_now: string;
  minutes_ago: string;
  hours_ago: string;
  days_ago: string;
  weeks_ago: string;
  months_ago: string;
  years_ago: string;
}

// 默认中文翻译
const defaultRelativeTimeTranslations: RelativeTimeTranslations = {
  just_now: '刚刚',
  minutes_ago: '{{count}} 分钟前',
  hours_ago: '{{count}} 小时前',
  days_ago: '{{count}} 天前',
  weeks_ago: '{{count}} 周前',
  months_ago: '{{count}} 个月前',
  years_ago: '{{count}} 年前',
};

// 计算相对时间
/**
 * Retrieves relative time.
 * @param date - The date.
 * @param translations - Optional translations object or translation function.
 * @returns The string value.
 */
export function getRelativeTime(
  date: Date | string,
  translations?:
    | RelativeTimeTranslations
    | ((key: string, params?: Record<string, unknown>) => string),
): string {
  const now = new Date();
  const target = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - target.getTime()) / 1000);

  const t =
    typeof translations === 'function'
      ? translations
      : (key: string, params?: Record<string, unknown>) => {
          const trans = translations || defaultRelativeTimeTranslations;
          let text = trans[key as keyof RelativeTimeTranslations] || key;
          if (params) {
            Object.entries(params).forEach(([k, v]) => {
              text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
            });
          }
          return text;
        };

  if (diffInSeconds < 60) return t('just_now');

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return t('minutes_ago', { count: diffInMinutes });

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return t('hours_ago', { count: diffInHours });

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return t('days_ago', { count: diffInDays });

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return t('weeks_ago', { count: diffInWeeks });

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return t('months_ago', { count: diffInMonths });

  const diffInYears = Math.floor(diffInDays / 365);
  return t('years_ago', { count: diffInYears });
}

// 验证邮箱
/**
 * Performs the is valid email operation.
 * @param email - The email.
 * @returns The boolean value.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 验证手机号
/**
 * Performs the is valid phone operation.
 * @param phone - The phone.
 * @returns The boolean value.
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

// 获取文件扩展名
/**
 * Retrieves file extension.
 * @param filename - The filename.
 * @returns The string value.
 */
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
}

// 检查是否为移动设备
/**
 * Performs the is mobile device operation.
 * @returns The boolean value.
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

// 检查是否支持 WebP
/**
 * Performs the supports web p operation.
 * @returns A promise that resolves to boolean value.
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => resolve(webP.height === 2);
    webP.src =
      'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
}

// 复制到剪贴板
/**
 * Performs the copy to clipboard operation.
 * @param text - The text.
 * @returns A promise that resolves to boolean value.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    return false;
  }
}

// 等待函数
/**
 * Performs the sleep operation.
 * @param ms - The ms.
 * @returns A promise that resolves when the operation completes.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 错误处理包装器
/**
 * Performs the with error handling operation.
 * @param fn - The fn.
 * @param errorHandler - The error handler.
 * @returns The T.
 */
export function withErrorHandling<T extends (...args: unknown[]) => unknown>(
  fn: T,
  errorHandler?: (error: Error) => void,
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.catch((error: Error) => {
          if (errorHandler) {
            errorHandler(error);
          } else {
            console.error('Function execution error:', error);
          }
          throw error;
        });
      }
      return result;
    } catch (error) {
      if (errorHandler) {
        errorHandler(error as Error);
      } else {
        console.error('Function execution error:', error);
      }
      throw error;
    }
  }) as T;
}
