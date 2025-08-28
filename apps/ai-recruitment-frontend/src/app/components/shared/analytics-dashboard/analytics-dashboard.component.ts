import { Component, OnInit, OnDestroy } from '@angular/core';
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

interface AnalyticsDashboardData {
  jobsStatistics: any;
  reportsStatistics: any;
  resumeStatistics: any;
  recentJobs: JobListItem[];
  recentReports: ReportListItem[];
  recentResumes: ResumeListItem[];
  highScoringResumes: ResumeListItem[];
  activeJobsCount: number;
  completedReportsCount: number;
  processedResumesCount: number;
}

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
            <span class="stat-value">{{ data.jobsStatistics.activePercentage }}%</span>
            <span class="stat-label">Active Rate</span>
          </div>
        </div>
        
        <div class="recent-items" *ngIf="data.recentJobs.length > 0">
          <h4>Recent Jobs</h4>
          <div class="item-list">
            <div class="item" *ngFor="let job of data.recentJobs">
              <span class="item-title">{{ job.title }}</span>
              <span class="item-status" [class]="'status-' + job.status">{{ job.status }}</span>
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
            <span class="stat-value">{{ data.reportsStatistics.completionRate }}%</span>
            <span class="stat-label">Completion Rate</span>
          </div>
        </div>
        
        <div class="recent-items" *ngIf="data.recentReports.length > 0">
          <h4>Recent Reports</h4>
          <div class="item-list">
            <div class="item" *ngFor="let report of data.recentReports">
              <span class="item-title">Report #{{ report.id }}</span>
              <span class="item-status" [class]="'status-' + report.status">{{ report.status }}</span>
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
            <span class="stat-value">{{ data.resumeStatistics.averageScore }}</span>
            <span class="stat-label">Avg Score</span>
          </div>
        </div>

        <div class="high-scoring-resumes" *ngIf="data.highScoringResumes.length > 0">
          <h4>High Scoring Resumes (≥75)</h4>
          <div class="item-list">
            <div class="item" *ngFor="let resume of data.highScoringResumes">
              <span class="item-title">{{ resume.candidateName || 'Anonymous' }}</span>
              <span class="item-score">{{ resume.analysis?.overallScore }}%</span>
            </div>
          </div>
        </div>
        
        <div class="top-skills" *ngIf="data.resumeStatistics.topSkills?.length > 0">
          <h4>Top Skills</h4>
          <div class="skills-list">
            <div class="skill-item" *ngFor="let skill of data.resumeStatistics.topSkills.slice(0, 5)">
              <span class="skill-name">{{ skill.skill }}</span>
              <span class="skill-count">{{ skill.count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analytics-dashboard {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
      padding: 24px;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .analytics-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid #e5e7eb;
    }

    .analytics-section h3 {
      margin: 0 0 16px 0;
      color: #111827;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-item {
      text-align: center;
      padding: 16px;
      background: #f9fafb;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }

    .stat-value {
      display: block;
      font-size: 2rem;
      font-weight: 700;
      color: #3b82f6;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 0.875rem;
      color: #6b7280;
      font-weight: 500;
    }

    .recent-items, .high-scoring-resumes, .top-skills {
      margin-top: 24px;
    }

    .recent-items h4, .high-scoring-resumes h4, .top-skills h4 {
      margin: 0 0 12px 0;
      color: #374151;
      font-size: 1rem;
      font-weight: 600;
    }

    .item-list, .skills-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: #f9fafb;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }

    .item-title {
      font-weight: 500;
      color: #111827;
    }

    .item-status {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-active { background: #dbeafe; color: #1e40af; }
    .status-draft { background: #fef3c7; color: #d97706; }
    .status-closed { background: #fee2e2; color: #dc2626; }
    .status-completed { background: #dcfce7; color: #166534; }
    .status-processing { background: #fef3c7; color: #d97706; }
    .status-failed { background: #fee2e2; color: #dc2626; }
    .status-processed { background: #dcfce7; color: #166534; }
    .status-pending { background: #e0e7ff; color: #3730a3; }

    .item-score {
      font-weight: 600;
      color: #059669;
      font-size: 0.875rem;
    }

    .skill-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #f3f4f6;
      border-radius: 6px;
    }

    .skill-name {
      font-weight: 500;
      color: #374151;
    }

    .skill-count {
      background: #3b82f6;
      color: white;
      padding: 2px 6px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .analytics-dashboard {
        grid-template-columns: 1fr;
        padding: 16px;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AnalyticsDashboardComponent implements OnInit, OnDestroy {
  dashboardData$: Observable<AnalyticsDashboardData>;

  constructor(private store: Store<AppState>) {
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
      map(([
        jobsStatistics,
        activeJobs,
        reportsStatistics,
        recentReports,
        completedReports,
        resumeStatistics,
        recentResumes,
        highScoringResumes,
        processedResumes
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
        processedResumesCount: processedResumes.length
      }))
    );
  }

  ngOnInit(): void {
    // Component initialization
    console.log('Analytics Dashboard initialized with NgRx selectors');
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }
}