import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';

/**
 * Defines the shape of the dashboard stats.
 */
export interface DashboardStats {
  totalJobs: number;
  totalResumes: number;
  totalReports: number;
  activeMatches: number;
  systemHealth: {
    status: 'healthy' | 'warning' | 'error';
    uptime: string;
    responseTime: number;
  };
  recentActivity: ActivityItem[];
  serviceMetrics: {
    analysisInProgress: number;
    completedToday: number;
    averageProcessingTime: string;
    successRate: number;
  };
}

/**
 * Defines the shape of the activity item.
 */
export interface ActivityItem {
  id: string;
  type:
    | 'job-created'
    | 'resume-uploaded'
    | 'report-generated'
    | 'match-found'
    | 'analysis-completed'
    | 'analysis-active';
  title: string;
  description: string;
  timestamp: Date;
  status?: 'processing' | 'completed' | 'failed';
  metadata?: {
    jobId?: string;
    resumeId?: string;
    reportId?: string;
    score?: number;
  };
}

/**
 * Defines the shape of the system health.
 */
export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  timestamp: string;
  services: {
    gateway: { status: string; responseTime: number };
    resumeParser: { status: string; responseTime: number };
    scoringEngine: { status: string; responseTime: number };
    reportGenerator: { status: string; responseTime: number };
    database: { status: string; responseTime: number };
    messageQueue: { status: string; responseTime: number };
  };
  processingMetrics: {
    queueDepth: number;
    averageProcessingTime: number;
    successRate: number;
    errorRate: number;
  };
}

/**
 * Provides dashboard api functionality.
 */
@Injectable({
  providedIn: 'root',
})
export class DashboardApiService {
  private readonly baseUrl = '/api';

  private http = inject(HttpClient);

  /**
   * Get comprehensive dashboard statistics
   */
  public getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.baseUrl}/dashboard/stats`);
  }

  /**
   * Get system health status
   */
  public getSystemHealth(): Observable<SystemHealth> {
    return this.http.get<SystemHealth>(`${this.baseUrl}/health`);
  }

  /**
   * Get recent activity feed
   */
  public getRecentActivity(limit = 10): Observable<ActivityItem[]> {
    return this.http.get<ActivityItem[]>(
      `${this.baseUrl}/dashboard/activity?limit=${limit}`,
    );
  }

  /**
   * Get service statistics for guest users
   */
  public getGuestStats(): Observable<{
    totalGuests: number;
    activeGuests: number;
    analysisCompleted: number;
    averageScore: number;
  }> {
    return this.http.get<{
      totalGuests: number;
      activeGuests: number;
      analysisCompleted: number;
      averageScore: number;
    }>(`${this.baseUrl}/guest/stats`);
  }

  /**
   * Get processing metrics
   */
  public getProcessingMetrics(): Observable<{
    analysisInProgress: number;
    completedToday: number;
    averageProcessingTime: string;
    successRate: number;
    queueDepth: number;
  }> {
    return this.http.get<{
      analysisInProgress: number;
      completedToday: number;
      averageProcessingTime: string;
      successRate: number;
      queueDepth: number;
    }>(`${this.baseUrl}/dashboard/metrics`);
  }
}
