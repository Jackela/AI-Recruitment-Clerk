import type { OnInit } from '@angular/core';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GuestUsageService } from '../../services/marketing/guest-usage.service';

/**
 * Represents the campaign component.
 */
@Component({
  selector: 'arc-campaign',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="campaign-container">
      <!-- 顶部横幅 -->
      <div class="campaign-header">
        <div class="header-content">
          <h1 class="main-title">🎉 免费体验AI招聘助手</h1>
          <p class="subtitle">
            体验完成后填写反馈问卷，立得<span class="highlight"
              >3元支付宝红包</span
            >
          </p>
          <div class="reward-badge">
            <span class="badge-text"
              >💰 已有<strong>200+</strong>用户成功收款</span
            >
          </div>
        </div>
      </div>

      <!-- 功能展示卡片 -->
      <div class="features-section">
        <h2>✨ 体验内容</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">📄</div>
            <h3>智能简历解析</h3>
            <p>AI自动提取简历关键信息，告别手动录入</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🎯</div>
            <h3>职位匹配分析</h3>
            <p>秒级计算候选人与职位的匹配度</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📊</div>
            <h3>专业报告生成</h3>
            <p>一键生成候选人评估报告</p>
          </div>
        </div>
      </div>

      <!-- 体验状态区域 -->
      <div class="experience-section">
        <div *ngIf="!isUsageExhausted" class="usage-status">
          <div class="usage-counter">
            <h3>🔥 开始您的免费体验</h3>
            <p class="usage-info">
              您还有
              <strong class="remaining-count">{{ remainingUsage }}</strong>
              次免费体验机会
            </p>
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="usageProgress"></div>
            </div>
            <p class="progress-text">已使用: {{ usageCount }}/5 次</p>
          </div>
          <button class="start-btn" (click)="startExperience()">
            <span class="btn-icon">🚀</span>
            立即开始体验
          </button>
        </div>

        <div *ngIf="isUsageExhausted" class="feedback-section">
          <div class="feedback-guide">
            <h3>🎁 恭喜！获得奖励的时候到了</h3>
            <div class="steps-container">
              <div class="step">
                <span class="step-number">1</span>
                <div class="step-content">
                  <h4>复制您的专属反馈码</h4>
                  <div class="feedback-code-container">
                    <code class="feedback-code">{{ feedbackCode }}</code>
                    <button class="copy-btn" (click)="copyFeedbackCode()">
                      <span *ngIf="!codeCopied">📋 复制</span>
                      <span *ngIf="codeCopied">✅ 已复制</span>
                    </button>
                  </div>
                </div>
              </div>

              <div class="step">
                <span class="step-number">2</span>
                <div class="step-content">
                  <h4>填写体验反馈问卷</h4>
                  <p>点击下方按钮，在问卷中粘贴您的反馈码</p>
                </div>
              </div>

              <div class="step">
                <span class="step-number">3</span>
                <div class="step-content">
                  <h4>等待奖励到账</h4>
                  <p>提交问卷后24小时内收到3元支付宝红包</p>
                </div>
              </div>
            </div>

            <a
              [href]="questionnaireUrl"
              class="questionnaire-btn"
              target="_blank"
              (click)="trackQuestionnaireClick()"
            >
              💰 填写问卷，获得3元奖励
            </a>
          </div>
        </div>
      </div>

      <!-- 真实支付截图展示 -->
      <div class="proof-section">
        <h3>💳 真实支付证明</h3>
        <div class="payment-screenshots">
          <div class="screenshot-placeholder">
            <p>支付截图展示区域</p>
            <small>（后续上传真实支付截图）</small>
          </div>
        </div>
      </div>

      <!-- 使用指南链接 -->
      <div class="guide-section">
        <h3>❓ 需要帮助？</h3>
        <div class="guide-links">
          <button class="guide-link" (click)="router.navigate(['/guide'])">
            📖 查看详细使用指南
          </button>
          <button class="guide-link" (click)="showGuestStats()">
            📊 查看我的使用统计
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./campaign.component.scss'],
})
export class CampaignComponent implements OnInit {
  public remainingUsage = 0;
  public usageCount = 0;
  public isUsageExhausted = false;
  public feedbackCode = '';
  public codeCopied = false;
  public questionnaireUrl = 'https://wj.qq.com/s2/14781436/'; // 待替换为实际问卷链接

  private readonly guestUsageService = inject(GuestUsageService);
  public readonly router = inject(Router);

  /**
   * Performs the ng on init operation.
   */
  public ngOnInit(): void {
    this.initializeComponent();
  }

  private async initializeComponent(): Promise<void> {
    // 首先自动检查用户状态
    await this.guestUsageService.autoCheckUserStatus();

    // 然后更新UI状态
    this.updateUsageStatus();

    // 监听用户状态刷新事件
    this.listenForStatusUpdates();
  }

  private listenForStatusUpdates(): void {
    window.addEventListener('userStatusRefreshed', ((event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      // 用户权限已刷新，更新UI
      this.updateUsageStatus();

      // 显示成功消息
      if (customEvent.detail?.message) {
        // 这里可以集成toast服务显示消息
        console.log('🎉 ' + customEvent.detail.message);

        // 可选：显示用户友好的提示
        this.showRefreshNotification(customEvent.detail.message);
      }
    }) as EventListener);
  }

  private showRefreshNotification(message: string): void {
    // 简单的通知实现，实际项目中可以使用更好的UI组件
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      max-width: 300px;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // 3秒后自动消失
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  private updateUsageStatus(): void {
    const stats = this.guestUsageService.getGuestStats();
    this.remainingUsage = stats.remainingUsage;
    this.usageCount = stats.usageCount;
    this.isUsageExhausted = stats.isExhausted;

    if (this.isUsageExhausted) {
      this.feedbackCode =
        this.guestUsageService.getFeedbackCode() ||
        this.guestUsageService.generateFeedbackCode();
    }
  }

  /**
   * Performs the usage progress operation.
   * @returns The number value.
   */
  public get usageProgress(): number {
    return (this.usageCount / 5) * 100;
  }

  /**
   * Performs the start experience operation.
   */
  public startExperience(): void {
    if (this.guestUsageService.canUseFeature()) {
      this.router.navigate(['/dashboard']);
    }
  }

  /**
   * Performs the copy feedback code operation.
   */
  public copyFeedbackCode(): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(this.feedbackCode).then(() => {
        this.codeCopied = true;
        setTimeout(() => (this.codeCopied = false), 2000);
      });
    } else {
      // 兼容旧浏览器
      const textArea = document.createElement('textarea');
      textArea.value = this.feedbackCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.codeCopied = true;
      setTimeout(() => (this.codeCopied = false), 2000);
    }
  }

  /**
   * Performs the track questionnaire click operation.
   */
  public trackQuestionnaireClick(): void {
    // 记录问卷点击事件，用于后续数据分析
    console.log('用户点击问卷链接', {
      feedbackCode: this.feedbackCode,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Performs the show guest stats operation.
   */
  public showGuestStats(): void {
    const stats = this.guestUsageService.getGuestStats();
    alert(
      `您的使用统计：\n已使用：${stats.usageCount}/5 次\n首次访问：${stats.firstVisit}\n会话ID：${stats.sessionId}`,
    );
  }
}
