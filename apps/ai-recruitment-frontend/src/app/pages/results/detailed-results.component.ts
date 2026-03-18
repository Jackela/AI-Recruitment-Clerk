import type { OnInit, OnDestroy } from '@angular/core';
import {
  Component,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GuestApiService } from '../../services/guest/guest-api.service';
import type { DetailedAnalysisResult } from '../../interfaces/detailed-analysis.interface';
import { ResultOverviewComponent } from './components/result-overview/result-overview.component';
import { SkillsAnalysisComponent } from './components/skills-analysis/skills-analysis.component';
import { ExperienceTimelineComponent } from './components/experience-timeline/experience-timeline.component';
import { EducationCardComponent } from './components/education-card/education-card.component';
import { RecommendationsPanelComponent } from './components/recommendations-panel/recommendations-panel.component';
import { getMockAnalysisResult } from './components/mocks/detailed-results.mock';
import {
  getRadarChartData,
  getOverallMatch,
  getFormattedAnalysisTime,
  getExperienceYears,
  getLayoutClass,
} from './components/utils/results.utils';

/**
 * Displays detailed analysis results for a resume evaluation.
 */
@Component({
  selector: 'arc-detailed-results',
  standalone: true,
  imports: [
    CommonModule,
    ResultOverviewComponent,
    SkillsAnalysisComponent,
    ExperienceTimelineComponent,
    EducationCardComponent,
    RecommendationsPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="results-container" [class]="layoutClass()">
      <div class="loading-state" *ngIf="isLoading()">
        <div class="loading-spinner"></div>
        <p class="loading-text">正在加载详细报告...</p>
      </div>

      <div class="error-state" *ngIf="hasError()">
        <div class="error-icon">❌</div>
        <h2 class="error-title">加载失败</h2>
        <p class="error-message">{{ errorMessage() }}</p>
        <button (click)="retryLoad()" class="retry-btn">重新加载</button>
      </div>

      <div
        class="main-content"
        *ngIf="!isLoading() && !hasError() && analysisResult()"
      >
        <div class="header-section">
          <button (click)="goBack()" class="back-btn">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              width="20"
              height="20"
            >
              <path d="M19 12H5"></path>
              <path d="M12 19l-7-7 7-7"></path></svg
            >返回分析
          </button>
          <h1>详细分析报告</h1>
          <p class="subtitle">Session ID: {{ sessionId() }}</p>
        </div>

        <div class="content-grid">
          <arc-result-overview
            [score]="analysisResult()!.score"
            [candidateName]="analysisResult()!.candidateName"
            [candidateEmail]="analysisResult()!.candidateEmail"
            [targetPosition]="analysisResult()!.targetPosition"
            [analysisTime]="formattedAnalysisTime()"
          ></arc-result-overview>
          <arc-skills-analysis
            [skills]="analysisResult()!.keySkills"
            [radarData]="radarChartData()"
            [overallMatch]="overallMatch()"
            [isExpanded]="isSkillsExpanded()"
            (toggleExpand)="toggleSkillsExpanded()"
          ></arc-skills-analysis>
          <arc-experience-timeline
            [experiences]="analysisResult()!.experienceDetails"
            [experienceYears]="experienceYears()"
            matchLevel="高"
          ></arc-experience-timeline>
          <arc-education-card
            [education]="analysisResult()!.educationDetails"
            matchLevel="高"
          ></arc-education-card>
          <arc-recommendations-panel
            [recommendations]="analysisResult()!.recommendations"
            [strengths]="analysisResult()!.strengths"
            [improvements]="analysisResult()!.improvements"
          ></arc-recommendations-panel>
        </div>

        <div class="export-actions">
          <button (click)="exportToPdf()" class="export-pdf-btn">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              width="20"
              height="20"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              ></path>
              <polyline points="14,2 14,8 20,8"></polyline></svg
            >导出PDF
          </button>
          <button (click)="exportToExcel()" class="export-excel-btn">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              width="20"
              height="20"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              ></path>
              <polyline points="14,2 14,8 20,8"></polyline></svg
            >导出Excel
          </button>
          <button (click)="shareReport()" class="share-btn">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              width="20"
              height="20"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
              <path d="M16 6l-4-4-4 4"></path>
              <line x1="12" y1="2" x2="12" y2="15"></line></svg
            >分享链接
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./detailed-results.component.css'],
})
export class DetailedResultsComponent implements OnInit, OnDestroy {
  sessionId = signal('');
  isLoading = signal(false);
  hasError = signal(false);
  errorMessage = signal('');
  analysisResult = signal<DetailedAnalysisResult | null>(null);
  isSkillsExpanded = signal(false);

  radarChartData = () =>
    getRadarChartData(this.analysisResult()?.skillAnalysis);
  overallMatch = () => getOverallMatch(this.radarChartData());
  formattedAnalysisTime = () =>
    getFormattedAnalysisTime(this.analysisResult()?.analysisTime);
  experienceYears = () => getExperienceYears(this.analysisResult()?.experience);
  layoutClass = () => getLayoutClass();

  private readonly destroy$ = new Subject<void>();
  private lastLoadedSessionId = '';
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly guestApi = inject(GuestApiService);

  ngOnInit(): void {
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDetailedResults(sessionId: string): void {
    if (this.lastLoadedSessionId === sessionId && this.analysisResult()) return;
    this.isLoading.set(true);
    this.hasError.set(false);
    this.errorMessage.set('');
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
          error: (error) => this.handleLoadError(error),
        });
    } else {
      setTimeout(() => {
        this.analysisResult.set(getMockAnalysisResult(sessionId));
        this.isLoading.set(false);
        this.lastLoadedSessionId = sessionId;
      }, 1000);
    }
  }

  private handleLoadError(error: unknown): void {
    this.isLoading.set(false);
    this.hasError.set(true);
    const err = error as { name?: string; status?: number; message?: string };
    if (err?.name === 'TimeoutError')
      this.errorMessage.set('请求超时，请检查网络连接后重试');
    else if (err?.status === 404)
      this.errorMessage.set('未找到分析结果，请检查会话ID是否正确');
    else if (err?.status === 500)
      this.errorMessage.set('服务器错误，请稍后重试');
    else if (err?.message?.includes('Network'))
      this.errorMessage.set('网络连接失败，请检查网络设置');
    else this.errorMessage.set('加载失败，请稍后重试');
  }

  goBack(): void {
    this.router.navigate(['/analysis']);
  }
  retryLoad(): void {
    this.lastLoadedSessionId = '';
    this.loadDetailedResults(this.sessionId());
  }
  toggleSkillsExpanded(): void {
    this.isSkillsExpanded.set(!this.isSkillsExpanded());
  }
  exportToPdf(): void {
    const url = this.analysisResult()?.reportUrl;
    if (url) window.open(`${url}/pdf`, '_blank');
  }
  exportToExcel(): void {
    const url = this.analysisResult()?.reportUrl;
    if (url) window.open(`${url}/excel`, '_blank');
  }

  async shareReport(): Promise<void> {
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
      } catch (e) {
        console.log('分享失败:', e);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('链接已复制到剪贴板');
      } catch (e) {
        console.error('复制失败:', e);
      }
    }
  }
}
