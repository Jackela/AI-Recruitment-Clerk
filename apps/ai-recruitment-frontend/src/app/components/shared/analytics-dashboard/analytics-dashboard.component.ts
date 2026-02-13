import { Component, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { CommonModule } from '@angular/common';

import { AnalyticsStatsCardComponent } from './analytics-stats-card.component';
import { AnalyticsItemsListComponent, type AnalyticsListItem } from './analytics-items-list.component';
import { AnalyticsSkillsListComponent } from './analytics-skills-list.component';
import {
  AnalyticsDataService,
  type AnalyticsDashboardData,
} from './analytics-data.service';

/**
 * Represents analytics dashboard component.
 * Displays aggregated analytics for jobs, reports, and resumes.
 */
@Component({
  selector: 'arc-analytics-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    AnalyticsStatsCardComponent,
    AnalyticsItemsListComponent,
    AnalyticsSkillsListComponent,
  ],
  template: `
    <div class="analytics-dashboard" *ngIf="dashboardData$ | async as data">
      <!-- Jobs Analytics -->
      <div class="analytics-section">
        <h3>📋 Jobs Analytics</h3>
        <div class="stats-grid">
          <arc-analytics-stats-card
            [value]="data.jobsStatistics.total"
            label="Total Jobs"
          />
          <arc-analytics-stats-card
            [value]="data.activeJobsCount"
            label="Active Jobs"
          />
          <arc-analytics-stats-card
            [value]="data.jobsStatistics.activePercentage + '%'"
            label="Active Rate"
          />
        </div>

        <arc-analytics-items-list
          title="Recent Jobs"
          [items]="jobListItems(data.recentJobs)"
        />
      </div>

      <!-- Reports Analytics -->
      <div class="analytics-section">
        <h3>📊 Reports Analytics</h3>
        <div class="stats-grid">
          <arc-analytics-stats-card
            [value]="data.reportsStatistics.total"
            label="Total Reports"
          />
          <arc-analytics-stats-card
            [value]="data.completedReportsCount"
            label="Completed"
          />
          <arc-analytics-stats-card
            [value]="data.reportsStatistics.completionRate + '%'"
            label="Completion Rate"
          />
        </div>

        <arc-analytics-items-list
          title="Recent Reports"
          [items]="reportListItems(data.recentReports)"
        />
      </div>

      <!-- Resumes Analytics -->
      <div class="analytics-section">
        <h3>👤 Resumes Analytics</h3>
        <div class="stats-grid">
          <arc-analytics-stats-card
            [value]="data.resumeStatistics.total"
            label="Total Resumes"
          />
          <arc-analytics-stats-card
            [value]="data.processedResumesCount"
            label="Completed"
          />
          <arc-analytics-stats-card
            [value]="data.resumeStatistics.averageScore"
            label="Avg Score"
          />
        </div>

        @if (data.highScoringResumes.length > 0) {
          <div class="high-scoring-resumes">
            <h4>High Scoring Resumes (≥75)</h4>
            <arc-analytics-items-list
              title=""
              [items]="highScoringResumeItems(data.highScoringResumes)"
            />
          </div>
        }

        <arc-analytics-skills-list
          [skills]="data.resumeStatistics.topSkills ?? []"
        />
      </div>
    </div>
  `,
  styleUrl: './analytics-dashboard.component.scss',
})
export class AnalyticsDashboardComponent {
  private readonly analyticsDataService = inject(AnalyticsDataService);
  public readonly dashboardData$: Observable<AnalyticsDashboardData>;

  constructor() {
    this.dashboardData$ = this.analyticsDataService.getDashboardData$();
  }

  /**
   * Converts job list items to analytics list items.
   */
  private jobListItems(_jobs: unknown[]): AnalyticsListItem[] {
    return [];
  }

  /**
   * Converts report list items to analytics list items.
   */
  private reportListItems(_reports: unknown[]): AnalyticsListItem[] {
    return [];
  }

  /**
   * Converts high-scoring resume items to analytics list items.
   */
  private highScoringResumeItems(_resumes: unknown[]): AnalyticsListItem[] {
    return [];
  }
}

// Re-export types for convenience
export type { AnalyticsDashboardData, JobsStatistics, ReportsStatistics, ResumeStatistics } from './analytics-data.service';
