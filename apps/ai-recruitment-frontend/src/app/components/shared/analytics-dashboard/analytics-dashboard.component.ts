import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

import { AppState } from '../../../store/app.state';

// Job selectors and models
import * as JobSelectors from '../../../store/jobs/job.selectors';
import { JobListItem } from '../../../store/jobs/job.model';

// Report selectors and models
import * as ReportSelectors from '../../../store/reports/report.selectors';
import { ReportListItem } from '../../../store/reports/report.model';

// Resume selectors and models
import * as ResumeSelectors from '../../../store/resumes/resume.selectors';
import { ResumeListItem } from '../../../store/resumes/resume.model';

interface AnalyticsStatsSummary {
  total: number;
  activePercentage?: number;
  completionRate?: number;
  averageScore?: number;
  processingTime?: number;
}

interface AnalyticsDashboardData {
  jobsStatistics: AnalyticsStatsSummary;
  reportsStatistics: AnalyticsStatsSummary;
  resumeStatistics: AnalyticsStatsSummary;
  recentJobs: JobListItem[];
  recentReports: ReportListItem[];
  recentResumes: ResumeListItem[];
  highScoringResumes: ResumeListItem[];
  activeJobsCount: number;
  completedReportsCount: number;
  processedResumesCount: number;
}

/**
 * Represents the analytics dashboard component.
 */
@Component({
  selector: 'arc-analytics-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="analytics-dashboard" *ngIf="dashboardData$ | async as data">
      <!-- Jobs Analytics -->
      <div class="analytics-section">
        <h3>📋 Jobs Analytics</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">{{ data.jobsStatistics.total }}</span>
            <span class="stat-label">Total Jobs</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ data.activeJobsCount }}</span>
            <span class="stat-label">Active Jobs</span>
          </div>
          <div class="stat-item">
            <span class="stat-value"
              >{{ data.jobsStatistics.activePercentage }}%</span
            >
            <span class="stat-label">Active Rate</span>
          </div>
        </div>

        <div class="recent-items" *ngIf="data.recentJobs.length > 0">
          <h4>Recent Jobs</h4>
          <div class="item-list">
            <div class="item" *ngFor="let job of data.recentJobs">
              <span class="item-title">{{ job.title }}</span>
              <span class="item-status" [class]="'status-' + job.status">{{
                job.status
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Reports Analytics -->
      <div class="analytics-section">
        <h3>📊 Reports Analytics</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">{{ data.reportsStatistics.total }}</span>
            <span class="stat-label">Total Reports</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ data.completedReportsCount }}</span>
            <span class="stat-label">Completed</span>
          </div>
          <div class="stat-item">
            <span class="stat-value"
              >{{ data.reportsStatistics.completionRate }}%</span
            >
            <span class="stat-label">Completion Rate</span>
          </div>
        </div>

        <div class="recent-items" *ngIf="data.recentReports.length > 0">
          <h4>Recent Reports</h4>
          <div class="item-list">
            <div class="item" *ngFor="let report of data.recentReports">
              <span class="item-title">Report #{{ report.id }}</span>
              <span class="item-status" [class]="'status-' + report.status">{{
                report.status
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Resumes Analytics -->
      <div class="analytics-section">
        <h3>👤 Resumes Analytics</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">{{ data.resumeStatistics.total }}</span>
            <span class="stat-label">Total Resumes</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ data.processedResumesCount }}</span>
            <span class="stat-label">Completed</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{
              data.resumeStatistics.averageScore
            }}</span>
            <span class="stat-label">Avg Score</span>
          </div>
        </div>

        <div
          class="high-scoring-resumes"
          *ngIf="data.highScoringResumes.length > 0"
        >
          <h4>High Scoring Resumes (≥75)</h4>
          <div class="item-list">
            <div class="item" *ngFor="let resume of data.highScoringResumes">
              <span class="item-title">{{
                resume.candidateName || 'Anonymous'
              }}</span>
              <span class="item-score"
                >{{ resume.analysis?.overallScore }}%</span
              >
            </div>
          </div>
        </div>

        <div
          class="top-skills"
          *ngIf="data.resumeStatistics.topSkills?.length > 0"
        >
          <h4>Top Skills</h4>
          <div class="skills-list">
            <div
              class="skill-item"
              *ngFor="let skill of data.resumeStatistics.topSkills.slice(0, 5)"
            >
              <span class="skill-name">{{ skill.skill }}</span>
              <span class="skill-count">{{ skill.count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .analytics-dashboard {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: var(--space-6);
        padding: var(--space-6);
        font-family: var(--font-family-body);
      }

      .analytics-section {
        background: var(--color-bg-primary);
        border-radius: var(--radius-2xl);
        padding: var(--space-6);
        box-shadow: var(--shadow-2xl);
        border: 1px solid var(--color-border-secondary);
        position: relative;
        overflow: hidden;
        transition: all var(--transition-base);

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            var(--color-primary-300),
            transparent
          );
          opacity: 0.6;
        }

        &:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-3xl);
          border-color: var(--color-primary-300);
        }
      }

      .analytics-section h3 {
        margin: 0 0 var(--space-4) 0;
        font-family: var(--font-family-fantasy-heading);
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-fantasy-h2);
        color: var(--color-text-fantasy);
        background: linear-gradient(
          135deg,
          var(--color-primary-800),
          var(--color-royal-700)
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: -0.01em;
        position: relative;

        &::after {
          content: '';
          position: absolute;
          bottom: -var(--space-1);
          left: 0;
          width: 40px;
          height: 2px;
          background: linear-gradient(
            90deg,
            var(--color-primary-600),
            var(--color-royal-500)
          );
          border-radius: var(--radius-full);
        }
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--space-4);
        margin-bottom: var(--space-6);
      }

      .stat-item {
        text-align: center;
        padding: var(--space-4);
        background: linear-gradient(
          135deg,
          var(--color-bg-secondary),
          var(--color-bg-tertiary)
        );
        border-radius: var(--radius-xl);
        border: 1px solid var(--color-border-fantasy);
        box-shadow: var(--shadow-sm);
        transition: all var(--transition-base);
        position: relative;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 50%;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.1),
            transparent
          );
          border-radius: var(--radius-xl) var(--radius-xl) 0 0;
          pointer-events: none;
        }

        &:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--color-primary-300);
        }
      }

      .stat-value {
        display: block;
        font-family: var(--font-family-fantasy-heading);
        font-size: var(--font-size-3xl);
        font-weight: var(--font-weight-fantasy-h1);
        background: linear-gradient(
          135deg,
          var(--color-primary-800),
          var(--color-royal-700)
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: var(--space-1);
        letter-spacing: -0.02em;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .stat-label {
        font-family: var(--font-family-body);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-secondary);
      }

      .recent-items,
      .high-scoring-resumes,
      .top-skills {
        margin-top: var(--space-6);
      }

      .recent-items h4,
      .high-scoring-resumes h4,
      .top-skills h4 {
        margin: 0 0 var(--space-3) 0;
        font-family: var(--font-family-fantasy-heading);
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-fantasy-large);
        color: var(--color-text-fantasy);
        opacity: 0.95;
      }

      .item-list,
      .skills-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }

      .item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-3);
        background: linear-gradient(
          135deg,
          var(--color-bg-secondary),
          rgba(255, 255, 255, 0.02)
        );
        border-radius: var(--radius-lg);
        border: 1px solid var(--color-border-secondary);
        transition: all var(--transition-base);
        position: relative;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 0;
          background: linear-gradient(
            180deg,
            var(--color-primary-600),
            var(--color-royal-600)
          );
          border-radius: var(--radius-full);
          transition: height var(--transition-base);
        }

        &:hover {
          background: linear-gradient(
            135deg,
            var(--color-primary-25),
            var(--color-royal-25)
          );
          transform: translateX(4px);
          border-color: var(--color-primary-200);

          &::before {
            height: 60%;
          }
        }
      }

      .item-title {
        font-family: var(--font-family-body);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
      }

      .item-status {
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-lg);
        font-family: var(--font-family-body);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border: 1px solid transparent;
        box-shadow: var(--shadow-xs);
      }

      .status-active {
        background: linear-gradient(
          135deg,
          var(--color-primary-100),
          var(--color-primary-50)
        );
        color: var(--color-primary-800);
        border-color: var(--color-primary-200);
      }
      .status-draft {
        background: linear-gradient(
          135deg,
          var(--color-warning-100),
          var(--color-warning-50)
        );
        color: var(--color-warning-800);
        border-color: var(--color-warning-200);
      }
      .status-closed {
        background: linear-gradient(
          135deg,
          var(--color-error-100),
          var(--color-error-50)
        );
        color: var(--color-error-800);
        border-color: var(--color-error-200);
      }
      .status-completed {
        background: linear-gradient(
          135deg,
          var(--color-success-100),
          var(--color-success-50)
        );
        color: var(--color-success-800);
        border-color: var(--color-success-200);
      }
      .status-processing {
        background: linear-gradient(
          135deg,
          var(--color-warning-100),
          var(--color-ember-50)
        );
        color: var(--color-warning-800);
        border-color: var(--color-warning-200);
      }
      .status-failed {
        background: linear-gradient(
          135deg,
          var(--color-error-100),
          var(--color-error-50)
        );
        color: var(--color-error-800);
        border-color: var(--color-error-200);
      }
      .status-processed {
        background: linear-gradient(
          135deg,
          var(--color-success-100),
          var(--color-emerald-50)
        );
        color: var(--color-success-800);
        border-color: var(--color-success-200);
      }
      .status-pending {
        background: linear-gradient(
          135deg,
          var(--color-royal-100),
          var(--color-royal-50)
        );
        color: var(--color-royal-800);
        border-color: var(--color-royal-200);
      }

      .item-score {
        font-family: var(--font-family-fantasy-heading);
        font-weight: var(--font-weight-fantasy-large);
        color: var(--color-success-700);
        font-size: var(--font-size-sm);
        background: linear-gradient(
          135deg,
          var(--color-success-700),
          var(--color-emerald-600)
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .skill-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-2) var(--space-3);
        background: linear-gradient(
          135deg,
          var(--color-bg-secondary),
          rgba(255, 255, 255, 0.03)
        );
        border-radius: var(--radius-lg);
        border: 1px solid var(--color-border-secondary);
        transition: all var(--transition-base);

        &:hover {
          background: linear-gradient(
            135deg,
            var(--color-primary-25),
            var(--color-royal-25)
          );
          border-color: var(--color-primary-200);
          transform: translateX(2px);
        }
      }

      .skill-name {
        font-family: var(--font-family-body);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
      }

      .skill-count {
        background: linear-gradient(
          135deg,
          var(--color-primary-600),
          var(--color-royal-600)
        );
        color: white;
        padding: var(--space-0-5) var(--space-2);
        border-radius: var(--radius-full);
        font-family: var(--font-family-body);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
        box-shadow: var(--shadow-sm);
        border: 1px solid rgba(255, 255, 255, 0.2);
        min-width: 20px;
        text-align: center;
      }

      @media (max-width: 768px) {
        .analytics-dashboard {
          grid-template-columns: 1fr;
          padding: var(--space-4);
          gap: var(--space-4);
        }

        .analytics-section {
          padding: var(--space-4);

          &:hover {
            transform: translateY(-1px);
          }
        }

        .stats-grid {
          grid-template-columns: 1fr;
          gap: var(--space-3);
        }

        .stat-item {
          padding: var(--space-3);

          &:hover {
            transform: translateY(-1px);
          }
        }

        .stat-value {
          font-size: var(--font-size-2xl);
        }

        .item {
          padding: var(--space-2);

          &:hover {
            transform: translateX(2px);
          }
        }
      }
    `,
  ],
})
export class AnalyticsDashboardComponent {
  private readonly store = inject<Store<AppState>>(Store);
  dashboardData$: Observable<AnalyticsDashboardData>;

  /**
   * Initializes a new instance of the Analytics Dashboard Component.
   * @param store - The store.
   */
  constructor() {
    // Demonstrate usage of selectors from all three feature stores
    this.dashboardData$ = combineLatest([
      // Job selectors
      this.store.select(JobSelectors.selectJobsStatistics),
      this.store.select(JobSelectors.selectActiveJobs),

      // Report selectors
      this.store.select(ReportSelectors.selectReportsStatistics),
      this.store.select(ReportSelectors.selectRecentReports(5)),
      this.store.select(ReportSelectors.selectReportsByStatus('completed')),

      // Resume selectors
      this.store.select(ResumeSelectors.selectResumeStatistics),
      this.store.select(ResumeSelectors.selectRecentResumes(5)),
      this.store.select(ResumeSelectors.selectHighScoringResumes(75)),
      this.store.select(ResumeSelectors.selectProcessedResumes),
    ]).pipe(
      map(
        ([
          jobsStatistics,
          activeJobs,
          reportsStatistics,
          recentReports,
          completedReports,
          resumeStatistics,
          recentResumes,
          highScoringResumes,
          processedResumes,
        ]) => ({
          jobsStatistics,
          reportsStatistics,
          resumeStatistics,
          recentJobs: activeJobs.slice(0, 5), // Show first 5 active jobs
          recentReports,
          recentResumes,
          highScoringResumes: highScoringResumes.slice(0, 5), // Show top 5
          activeJobsCount: activeJobs.length,
          completedReportsCount: completedReports.length,
          processedResumesCount: processedResumes.length,
        }),
      ),
    );
  }

}
