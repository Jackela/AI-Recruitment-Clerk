import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable} from 'rxjs';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoggerService } from '../shared/logger.service';

/**
 * Provides guest usage functionality.
 */
@Injectable({
  providedIn: 'root',
})
export class GuestUsageService {
  private readonly logger =
    inject(LoggerService).createLogger('GuestUsageService');

  private readonly STORAGE_KEYS = {
    USAGE_COUNT: 'ai_guest_usage_count',
    FEEDBACK_CODE: 'ai_guest_feedback_code',
    FIRST_VISIT: 'ai_first_visit_date',
    USER_SESSION: 'ai_guest_session_id',
  };

  private readonly MAX_GUEST_USAGE = 5;
  private readonly API_BASE_URL = `${environment.apiUrl}/marketing/feedback-codes`;

  private http = inject(HttpClient);

  /**
   * Initializes a new instance of the Guest Usage Service.
   */
  constructor() {
    this.initializeSession();
  }

  private initializeSession(): void {
    if (!localStorage.getItem(this.STORAGE_KEYS.FIRST_VISIT)) {
      localStorage.setItem(
        this.STORAGE_KEYS.FIRST_VISIT,
        new Date().toISOString(),
      );
    }

    if (!localStorage.getItem(this.STORAGE_KEYS.USER_SESSION)) {
      const sessionId = this.generateSessionId();
      localStorage.setItem(this.STORAGE_KEYS.USER_SESSION, sessionId);
    }
  }

  private generateSessionId(): string {
    return (
      'session_' +
      Math.random().toString(36).substr(2, 9) +
      Date.now().toString(36)
    );
  }

  /**
   * Retrieves usage count.
   * @returns The number value.
   */
  public getUsageCount(): number {
    try {
      const count = localStorage.getItem(this.STORAGE_KEYS.USAGE_COUNT) || '0';
      const parsed = parseInt(count, 10);
      return isNaN(parsed) ? 0 : parsed;
    } catch (error) {
      this.logger.warn('Error reading usage count from localStorage', error);
      return 0;
    }
  }

  /**
   * Performs the increment usage operation.
   */
  public incrementUsage(): void {
    const current = this.getUsageCount();
    const newCount = current + 1;
    localStorage.setItem(this.STORAGE_KEYS.USAGE_COUNT, newCount.toString());

    // 记录使用时间戳
    const usageHistory = this.getUsageHistory();
    usageHistory.push(new Date().toISOString());
    localStorage.setItem('ai_usage_history', JSON.stringify(usageHistory));
  }

  private getUsageHistory(): string[] {
    try {
      const history = localStorage.getItem('ai_usage_history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      this.logger.warn('Error parsing usage history from localStorage', error);
      return [];
    }
  }

  /**
   * Retrieves remaining usage.
   * @returns The number value.
   */
  public getRemainingUsage(): number {
    return Math.max(0, this.MAX_GUEST_USAGE - this.getUsageCount());
  }

  /**
   * Performs the is usage exhausted operation.
   * @returns The boolean value.
   */
  public isUsageExhausted(): boolean {
    return this.getUsageCount() >= this.MAX_GUEST_USAGE;
  }

  /**
   * Performs the can use feature operation.
   * @returns The boolean value.
   */
  public canUseFeature(): boolean {
    return !this.isUsageExhausted();
  }

  /**
   * Generates feedback code.
   * @returns The string value.
   */
  public generateFeedbackCode(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 8);
    const sessionId =
      localStorage.getItem(this.STORAGE_KEYS.USER_SESSION)?.substr(-4) ||
      '0000';

    const code = `FB${timestamp}${random}${sessionId}`.toUpperCase();
    localStorage.setItem(this.STORAGE_KEYS.FEEDBACK_CODE, code);

    // 向后端记录反馈码
    this.recordFeedbackCode(code).subscribe();

    return code;
  }

  /**
   * Retrieves feedback code.
   * @returns The string | null.
   */
  public getFeedbackCode(): string | null {
    return localStorage.getItem(this.STORAGE_KEYS.FEEDBACK_CODE);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recordFeedbackCode(code: string): Observable<any> {
    return this.http.post(`${this.API_BASE_URL}/record`, { code }).pipe(
      catchError(() => of(null)), // 如果后端不可用，不影响前端功能
    );
  }

  /**
   * Retrieves guest stats.
   * @returns The {usageCount: number; remainingUsage: number; maxUsage: number; isExhausted: boolean; lastUsedDate: string | null; firstVisit: string | null; sessionId: string | null; usageHistory: string[]}.
   */
  public getGuestStats(): {
    usageCount: number;
    remainingUsage: number;
    maxUsage: number;
    isExhausted: boolean;
    lastUsedDate: string | null;
    firstVisit: string | null;
    sessionId: string | null;
    usageHistory: string[];
  } {
    const usageHistory = this.getUsageHistory();
    return {
      usageCount: this.getUsageCount(),
      remainingUsage: this.getRemainingUsage(),
      maxUsage: this.MAX_GUEST_USAGE,
      isExhausted: this.isUsageExhausted(),
      lastUsedDate:
        usageHistory.length > 0 ? usageHistory[usageHistory.length - 1] : null,
      firstVisit: localStorage.getItem(this.STORAGE_KEYS.FIRST_VISIT),
      sessionId: localStorage.getItem(this.STORAGE_KEYS.USER_SESSION),
      usageHistory: usageHistory,
    };
  }

  /**
   * 检查并刷新用户权限状态
   * 这个方法会检查用户的反馈码是否已被核销，如果是则重置使用权限
   */
  public async checkAndRefreshUserStatus(): Promise<boolean> {
    const feedbackCode = this.getFeedbackCode();

    if (!feedbackCode) {
      return false; // 没有反馈码，无需刷新
    }

    try {
      // 调用后端API检查反馈码状态
      const response = (await this.http
        .get(`${this.API_BASE_URL}/validate/${feedbackCode}`)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .toPromise()) as any;

      if (response && response.data && response.data.isRedeemed) {
        // 反馈码已核销，重置用户使用权限
        this.resetUsageAfterRedemption();
        return true; // 权限已刷新
      }
    } catch (error) {
      this.logger.warn('检查反馈码状态失败', error);
      // API调用失败时，不影响用户体验
    }

    return false; // 权限未变更
  }

  /**
   * 反馈码核销后重置使用权限
   */
  private resetUsageAfterRedemption(): void {
    // 重置使用计数
    localStorage.setItem(this.STORAGE_KEYS.USAGE_COUNT, '0');

    // 清空使用历史
    localStorage.removeItem('ai_usage_history');

    // 保留反馈码记录，但标记为已核销
    const redeemedCodes = this.getRedeemedCodes();
    const currentCode = this.getFeedbackCode();
    if (currentCode && !redeemedCodes.includes(currentCode)) {
      redeemedCodes.push(currentCode);
      localStorage.setItem('ai_redeemed_codes', JSON.stringify(redeemedCodes));
    }

    // 清空当前反馈码，为下一轮生成准备
    localStorage.removeItem(this.STORAGE_KEYS.FEEDBACK_CODE);

    this.logger.log('用户权限已刷新：反馈码已核销，获得新的使用次数');
  }

  /**
   * 获取已核销的反馈码列表
   */
  private getRedeemedCodes(): string[] {
    const codes = localStorage.getItem('ai_redeemed_codes');
    return codes ? JSON.parse(codes) : [];
  }

  /**
   * 自动检查用户状态（页面加载时调用）
   */
  public async autoCheckUserStatus(): Promise<void> {
    const refreshed = await this.checkAndRefreshUserStatus();
    if (refreshed) {
      // 触发页面更新事件
      window.dispatchEvent(
        new CustomEvent('userStatusRefreshed', {
          detail: {
            message: '恭喜！您的反馈已确认，获得了新的免费使用机会！',
            newUsageCount: 0,
            maxUsage: this.MAX_GUEST_USAGE,
          },
        }),
      );
    }
  }

  /**
   * Performs the reset usage operation.
   */
  public resetUsage(): void {
    Object.values(this.STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
    localStorage.removeItem('ai_usage_history');
    this.initializeSession();
  }
}
