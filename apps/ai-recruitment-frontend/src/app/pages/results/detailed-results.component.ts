import type { OnInit, OnDestroy } from '@angular/core';
import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GuestApiService } from '../../services/guest/guest-api.service';
import type {
  DetailedAnalysisResult,
  RadarChartData,
  SkillTagStyle,
} from '../../interfaces/detailed-analysis.interface';

/**
 * Represents the detailed results component.
 */
@Component({
  selector: 'arc-detailed-results',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="results-container" [class]="getLayoutClass()">
      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading()">
        <div class="loading-spinner"></div>
        <p class="loading-text">正在加载详细报告...</p>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="hasError()">
        <div class="error-icon">❌</div>
        <h2 class="error-title">加载失败</h2>
        <p class="error-message">{{ errorMessage() }}</p>
        <button (click)="retryLoad()" class="retry-btn">重新加载</button>
      </div>

      <!-- Main Content -->
      <div
        class="main-content"
        *ngIf="!isLoading() && !hasError() && analysisResult()"
      >
        <!-- Header Section -->
        <div class="header-section">
          <button (click)="goBack()" class="back-btn">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M19 12H5"></path>
              <path d="M12 19l-7-7 7-7"></path>
            </svg>
            返回分析
          </button>
          <h1>详细分析报告</h1>
          <p class="subtitle">Session ID: {{ sessionId() }}</p>
        </div>

        <!-- Content Grid -->
        <div class="content-grid">
          <!-- Overview Card -->
          <div class="overview-card card">
            <h2>📊 分析概览</h2>
            <div class="overview-content">
              <div class="score-display">
                <div class="score-circle">
                  <span class="score-value">{{ analysisResult()?.score }}</span>
                  <span class="score-label">分</span>
                </div>
              </div>
              <div class="candidate-info">
                <h3 class="candidate-name">
                  {{ analysisResult()?.candidateName }}
                </h3>
                <p class="candidate-email">
                  {{ analysisResult()?.candidateEmail }}
                </p>
                <p class="target-position">
                  目标职位: {{ analysisResult()?.targetPosition }}
                </p>
              </div>
              <div class="analysis-time">
                <p>分析时间: {{ getFormattedAnalysisTime() }}</p>
              </div>
            </div>
          </div>

          <!-- Skills Card -->
          <div class="skills-card card">
            <div class="card-header">
              <h2>🎯 技能分析</h2>
              <button (click)="toggleSkillsExpanded()" class="expand-btn">
                <span
                  [class]="
                    isSkillsExpanded()
                      ? 'skills-collapse-btn'
                      : 'skills-expand-btn'
                  "
                >
                  {{ isSkillsExpanded() ? '收起' : '展开' }}
                </span>
              </button>
            </div>
            <div class="skills-content">
              <div class="skill-tags">
                <span
                  *ngFor="let skill of analysisResult()?.keySkills"
                  class="skill-tag"
                  [ngStyle]="getSkillTagStyle(skill)"
                >
                  {{ skill }}
                </span>
              </div>
              <div class="skill-match">
                <p>技能匹配度: {{ getOverallMatch() }}%</p>
              </div>
              <div class="skills-heatmap">
                <div
                  class="heatmap-item"
                  *ngFor="let item of getRadarChartData()"
                >
                  <span class="skill-name">{{ item.skill }}</span>
                  <div class="skill-bar">
                    <div class="skill-fill" [style.width.%]="item.value"></div>
                  </div>
                  <span class="skill-value">{{ item.value }}%</span>
                </div>
              </div>
              <div class="skills-detailed" *ngIf="isSkillsExpanded()">
                <p>详细的技能分析内容...</p>
              </div>
            </div>
          </div>

          <!-- Experience Card -->
          <div class="experience-card card">
            <h2>💼 经验分析</h2>
            <div class="experience-content">
              <div class="experience-timeline">
                <div
                  class="timeline-item"
                  *ngFor="let exp of analysisResult()?.experienceDetails"
                >
                  <div class="timeline-marker"></div>
                  <div class="timeline-content">
                    <h4>{{ exp.position }}</h4>
                    <p class="company">{{ exp.company }}</p>
                    <p class="duration">{{ exp.duration }}</p>
                    <p class="description">{{ exp.description }}</p>
                  </div>
                </div>
              </div>
              <div class="position-match">
                <p>工作经验年限: {{ getExperienceYears() }}年</p>
                <p>职位匹配度: 高</p>
              </div>
            </div>
          </div>

          <!-- Education Card -->
          <div class="education-card card">
            <h2>🎓 教育背景</h2>
            <div class="education-content">
              <div class="education-level">
                <h4>{{ analysisResult()?.educationDetails?.degree }}学位</h4>
                <p class="major">
                  {{ analysisResult()?.educationDetails?.major }}
                </p>
                <p class="university">
                  {{ analysisResult()?.educationDetails?.university }}
                </p>
                <p class="graduation">
                  {{ analysisResult()?.educationDetails?.graduationYear }}年毕业
                </p>
              </div>
              <div class="major-match">
                <p>专业匹配度: 高</p>
              </div>
            </div>
          </div>

          <!-- Recommendations Card -->
          <div class="recommendations-card card">
            <h2>🤖 AI建议</h2>
            <div class="recommendations-content">
              <div class="recommendation-list">
                <div
                  class="recommendation-item"
                  *ngFor="let rec of analysisResult()?.recommendations"
                >
                  <span class="rec-icon">💡</span>
                  <p>{{ rec }}</p>
                </div>
              </div>
              <div class="strengths-section">
                <h4>优势分析</h4>
                <ul>
                  <li *ngFor="let strength of analysisResult()?.strengths">
                    {{ strength }}
                  </li>
                </ul>
              </div>
              <div class="improvements-section">
                <h4>改进建议</h4>
                <ul>
                  <li
                    *ngFor="let improvement of analysisResult()?.improvements"
                  >
                    {{ improvement }}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Radar Chart Card -->
          <div class="radar-chart-card card">
            <h2>📈 能力雷达图</h2>
            <div
              class="radar-chart-container"
              [attr.data-updated]="chartUpdated()"
            >
              <div class="chart-placeholder">
                <p>雷达图组件将在此处显示</p>
                <div class="chart-data">
                  <div
                    *ngFor="let item of getRadarChartData()"
                    class="data-item"
                  >
                    {{ item.skill }}: {{ item.value }}%
                  </div>
                </div>
              </div>
              <div class="chart-tooltip" style="display: none;">工具提示</div>
            </div>
            <div class="chart-legend">
              <div class="legend-item" *ngFor="let item of getRadarChartData()">
                <span class="legend-color"></span>
                <span class="legend-label">{{ item.skill }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Export Actions -->
        <div class="export-actions">
          <button (click)="exportToPdf()" class="export-pdf-btn">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              ></path>
              <polyline points="14,2 14,8 20,8"></polyline>
            </svg>
            导出PDF
          </button>
          <button (click)="exportToExcel()" class="export-excel-btn">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              ></path>
              <polyline points="14,2 14,8 20,8"></polyline>
            </svg>
            导出Excel
          </button>
          <button (click)="shareReport()" class="share-btn">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
              <path d="M16 6l-4-4-4 4"></path>
              <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
            分享链接
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./detailed-results.component.css'],
})
export class DetailedResultsComponent implements OnInit, OnDestroy {
  // State signals
  public sessionId = signal('');
  public isLoading = signal(false);
  public hasError = signal(false);
  public errorMessage = signal('');
  public analysisResult = signal<DetailedAnalysisResult | null>(null);
  public isSkillsExpanded = signal(false);
  public chartUpdated = signal(false);

  // Cleanup
  private readonly destroy$ = new Subject<void>();
  private lastLoadedSessionId = '';

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly guestApi = inject(GuestApiService);

  /**
   * Performs the ng on init operation.
   */
  public ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const sessionId = params.get('sessionId');
      if (sessionId) {
        this.sessionId.set(sessionId);
        this.loadDetailedResults(sessionId);
      } else {
        this.hasError.set(true);
        this.errorMessage.set('无效的会话ID');
      }
    });
  }

  /**
   * Performs the ng on destroy operation.
   */
  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads detailed results.
   * @param sessionId - The session id.
   */
  public loadDetailedResults(sessionId: string): void {
    // Prevent duplicate loading
    if (this.lastLoadedSessionId === sessionId && this.analysisResult()) {
      return;
    }

    this.isLoading.set(true);
    this.hasError.set(false);
    this.errorMessage.set('');

    // Check if getDetailedResults method exists, if not create mock data
    if (this.guestApi.getDetailedResults) {
      this.guestApi
        .getDetailedResults(sessionId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result: DetailedAnalysisResult) => {
            this.analysisResult.set(result);
            this.isLoading.set(false);
            this.lastLoadedSessionId = sessionId;
          },
          error: (error) => {
            this.handleLoadError(error);
          },
        });
    } else {
      // Use mock data for development/testing
      setTimeout(() => {
        this.analysisResult.set(this.getMockAnalysisResult(sessionId));
        this.isLoading.set(false);
        this.lastLoadedSessionId = sessionId;
      }, 1000);
    }
  }

  private handleLoadError(error: unknown): void {
    this.isLoading.set(false);
    this.hasError.set(true);

    const errorObj = error as { name?: string; status?: number; message?: string };
    if (errorObj?.name === 'TimeoutError') {
      this.errorMessage.set('请求超时，请检查网络连接后重试');
    } else if (errorObj?.status === 404) {
      this.errorMessage.set('未找到分析结果，请检查会话ID是否正确');
    } else if (errorObj?.status === 500) {
      this.errorMessage.set('服务器错误，请稍后重试');
    } else if (errorObj?.message?.includes('Network')) {
      this.errorMessage.set('网络连接失败，请检查网络设置');
    } else {
      this.errorMessage.set('加载失败，请稍后重试');
    }
  }

  private getMockAnalysisResult(sessionId: string): DetailedAnalysisResult {
    return {
      sessionId,
      candidateName: '张三',
      candidateEmail: 'zhangsan@example.com',
      targetPosition: '前端开发工程师',
      analysisTime: '2024-01-15T10:30:00Z',
      score: 85,
      summary: '该候选人具有优秀的前端开发技能',
      keySkills: ['JavaScript', 'TypeScript', 'Angular', 'React', 'Vue.js'],
      experience: '5年前端开发经验',
      education: '计算机科学学士学位',
      recommendations: [
        '技术栈匹配度高，适合高级前端开发岗位',
        '建议进行技术面试验证实际能力',
        '可以考虑架构设计相关的技术考察',
      ],
      skillAnalysis: {
        technical: 90,
        communication: 75,
        problemSolving: 88,
        teamwork: 82,
        leadership: 70,
      },
      experienceDetails: [
        {
          company: 'ABC科技公司',
          position: '高级前端工程师',
          duration: '2021-2024',
          description: '负责企业级Web应用开发',
        },
        {
          company: 'XYZ创业公司',
          position: '前端工程师',
          duration: '2019-2021',
          description: '参与产品从0到1的开发过程',
        },
      ],
      educationDetails: {
        degree: '学士',
        major: '计算机科学与技术',
        university: '清华大学',
        graduationYear: '2019',
      },
      strengths: [
        '技术栈覆盖面广，掌握多种前端框架',
        '有丰富的项目实战经验',
        '学习能力强，能快速适应新技术',
      ],
      improvements: [
        '可以加强团队领导能力的培养',
        '建议深入学习后端技术，成为全栈开发者',
        '可以参与开源项目，提升技术影响力',
      ],
      reportUrl: `http://localhost:3000/api/reports/${sessionId}`,
    };
  }

  // User Interaction Methods
  /**
   * Performs the go back operation.
   */
  public goBack(): void {
    this.router.navigate(['/analysis']);
  }

  /**
   * Performs the retry load operation.
   */
  public retryLoad(): void {
    const sessionId = this.sessionId();
    if (sessionId) {
      this.lastLoadedSessionId = ''; // Reset to allow reload
      this.loadDetailedResults(sessionId);
    }
  }

  /**
   * Performs the toggle skills expanded operation.
   */
  public toggleSkillsExpanded(): void {
    this.isSkillsExpanded.set(!this.isSkillsExpanded());
  }

  /**
   * Performs the export to pdf operation.
   */
  public exportToPdf(): void {
    const result = this.analysisResult();
    if (result?.reportUrl) {
      window.open(`${result.reportUrl}/pdf`, '_blank');
    }
  }

  /**
   * Performs the export to excel operation.
   */
  public exportToExcel(): void {
    const result = this.analysisResult();
    if (result?.reportUrl) {
      window.open(`${result.reportUrl}/excel`, '_blank');
    }
  }

  /**
   * Performs the share report operation.
   * @returns A promise that resolves when the operation completes.
   */
  public async shareReport(): Promise<void> {
    const result = this.analysisResult();
    if (!result) return;

    const shareData = {
      title: `简历分析报告 - ${result.candidateName}`,
      text: '查看详细的AI简历分析报告',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('分享取消或失败:', error);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('链接已复制到剪贴板');
      } catch (error) {
        console.error('复制失败:', error);
      }
    }
  }

  // Data Computation Methods
  /**
   * Retrieves radar chart data.
   * @returns The an array of RadarChartData.
   */
  public getRadarChartData(): RadarChartData[] {
    const skillAnalysis = this.analysisResult()?.skillAnalysis;
    if (!skillAnalysis) return [];

    return [
      { skill: '技术能力', value: skillAnalysis.technical },
      { skill: '沟通能力', value: skillAnalysis.communication },
      { skill: '问题解决', value: skillAnalysis.problemSolving },
      { skill: '团队协作', value: skillAnalysis.teamwork },
      { skill: '领导能力', value: skillAnalysis.leadership },
    ];
  }

  /**
   * Retrieves overall match.
   * @returns The number value.
   */
  public getOverallMatch(): number {
    const radarData = this.getRadarChartData();
    if (radarData.length === 0) return 0;

    const total = radarData.reduce((sum, item) => sum + item.value, 0);
    return Math.round(total / radarData.length);
  }

  /**
   * Retrieves formatted analysis time.
   * @returns The string value.
   */
  public getFormattedAnalysisTime(): string {
    const result = this.analysisResult();
    if (!result?.analysisTime) return '';

    const date = new Date(result.analysisTime);
    // Format deterministically in zh-CN using Asia/Shanghai timezone to avoid environment variance
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes): string =>
      parts.find((p) => p.type === type)?.value || '';
    const year = get('year');
    const month = get('month');
    const day = get('day');
    const hour = get('hour');
    const minute = get('minute');
    return `${year}年${month}月${day}日 ${hour}:${minute}`;
  }

  /**
   * Retrieves experience years.
   * @returns The number value.
   */
  public getExperienceYears(): number {
    const experienceText = this.analysisResult()?.experience || '';
    const match = experienceText.match(/(\d+)年/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Retrieves skill tag style.
   * @param skill - The skill.
   * @returns The SkillTagStyle.
   */
  public getSkillTagStyle(skill: string): SkillTagStyle {
    // Generate consistent colors based on skill name
    const colors = [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#06b6d4',
    ];
    const index = skill.length % colors.length;

    return {
      'background-color': colors[index],
      color: 'white',
    };
  }

  // Responsive Design Support
  /**
   * Performs the is mobile device operation.
   * @returns The boolean value.
   */
  public isMobileDevice(): boolean {
    return window.innerWidth <= 768;
  }

  /**
   * Retrieves layout class.
   * @returns The string value.
   */
  public getLayoutClass(): string {
    const classes = ['results-container'];
    if (this.isMobileDevice()) {
      classes.push('mobile-layout');
    }
    return classes.join(' ');
  }
}
