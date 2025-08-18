import { Injectable, computed, signal } from '@angular/core';
import { Job, JobListItem } from '../../app/store/jobs/job.model';

/**
 * Simplified State Management using Angular Signals
 * Replacing NgRx for simple CRUD operations and local state
 * 
 * Performance Benefits:
 * - Reduced bundle size (no NgRx overhead for simple state)
 * - Better tree-shaking
 * - Optimized change detection
 * - Simpler API for basic operations
 */

@Injectable({
  providedIn: 'root'
})
export class SignalStoreService {
  
  // Jobs Signal State
  private _jobs = signal<JobListItem[]>([]);
  private _selectedJob = signal<Job | null>(null);
  private _jobsLoading = signal(false);
  private _jobsError = signal<string | null>(null);

  // Resumes Signal State  
  private _resumes = signal<any[]>([]);
  private _resumesLoading = signal(false);
  private _resumesError = signal<string | null>(null);

  // Reports Signal State
  private _reports = signal<any[]>([]);
  private _reportsLoading = signal(false);
  private _reportsError = signal<string | null>(null);

  // Guest State (for simple guest management)
  private _guestUsageCount = signal(0);
  private _guestDeviceId = signal<string | null>(null);

  // Public computed signals (read-only)
  readonly jobs = this._jobs.asReadonly();
  readonly selectedJob = this._selectedJob.asReadonly();
  readonly jobsLoading = this._jobsLoading.asReadonly();
  readonly jobsError = this._jobsError.asReadonly();

  readonly resumes = this._resumes.asReadonly();
  readonly resumesLoading = this._resumesLoading.asReadonly();
  readonly resumesError = this._resumesError.asReadonly();

  readonly reports = this._reports.asReadonly();
  readonly reportsLoading = this._reportsLoading.asReadonly();
  readonly reportsError = this._reportsError.asReadonly();

  readonly guestUsageCount = this._guestUsageCount.asReadonly();
  readonly guestDeviceId = this._guestDeviceId.asReadonly();

  // Computed values
  readonly hasJobs = computed(() => this._jobs().length > 0);
  readonly jobsCount = computed(() => this._jobs().length);
  readonly isGuestUser = computed(() => !!this._guestDeviceId());
  readonly canCreateMoreJobs = computed(() => 
    this.isGuestUser() ? this._guestUsageCount() < 3 : true
  );

  // Jobs Methods
  setJobs(jobs: JobListItem[]) {
    this._jobs.set(jobs);
    this._jobsError.set(null);
  }

  addJob(job: JobListItem) {
    this._jobs.update(jobs => [...jobs, job]);
  }

  updateJob(updatedJob: JobListItem) {
    this._jobs.update(jobs => 
      jobs.map(job => job.id === updatedJob.id ? updatedJob : job)
    );
  }

  removeJob(jobId: string) {
    this._jobs.update(jobs => jobs.filter(job => job.id !== jobId));
  }

  selectJob(job: Job | null) {
    this._selectedJob.set(job);
  }

  setJobsLoading(loading: boolean) {
    this._jobsLoading.set(loading);
  }

  setJobsError(error: string | null) {
    this._jobsError.set(error);
  }

  // Resumes Methods
  setResumes(resumes: any[]) {
    this._resumes.set(resumes);
    this._resumesError.set(null);
  }

  addResume(resume: any) {
    this._resumes.update(resumes => [...resumes, resume]);
  }

  setResumesLoading(loading: boolean) {
    this._resumesLoading.set(loading);
  }

  setResumesError(error: string | null) {
    this._resumesError.set(error);
  }

  // Reports Methods
  setReports(reports: any[]) {
    this._reports.set(reports);
    this._reportsError.set(null);
  }

  addReport(report: any) {
    this._reports.update(reports => [...reports, report]);
  }

  setReportsLoading(loading: boolean) {
    this._reportsLoading.set(loading);
  }

  setReportsError(error: string | null) {
    this._reportsError.set(error);
  }

  // Guest Methods
  setGuestDeviceId(deviceId: string) {
    this._guestDeviceId.set(deviceId);
  }

  incrementGuestUsage() {
    this._guestUsageCount.update(count => count + 1);
  }

  resetGuestUsage() {
    this._guestUsageCount.set(0);
  }

  // Reset Methods
  resetJobsState() {
    this._jobs.set([]);
    this._selectedJob.set(null);
    this._jobsLoading.set(false);
    this._jobsError.set(null);
  }

  resetResumesState() {
    this._resumes.set([]);
    this._resumesLoading.set(false);
    this._resumesError.set(null);
  }

  resetReportsState() {
    this._reports.set([]);
    this._reportsLoading.set(false);
    this._reportsError.set(null);
  }

  resetAllState() {
    this.resetJobsState();
    this.resetResumesState();
    this.resetReportsState();
    this._guestUsageCount.set(0);
    this._guestDeviceId.set(null);
  }
}