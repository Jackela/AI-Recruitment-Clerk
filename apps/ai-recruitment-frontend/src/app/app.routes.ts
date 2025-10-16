import { Route } from '@angular/router';

// Preloading strategy configuration
export const preloadingStrategy = {
  preloadingStrategy: 'quicklink', // Use quicklink for intelligent preloading
  delay: 2000, // Delay preloading by 2 seconds for better initial page load
};

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'jobs',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/enhanced-dashboard.component').then(
        (m) => m.EnhancedDashboardComponent,
      ),
    data: { preload: true, priority: 'high' },
  },
  {
    path: 'jobs',
    loadChildren: () =>
      import('./pages/jobs/jobs.module').then((m) => m.JobsModule),
    data: { preload: true, priority: 'medium' },
  },
  {
    path: 'reports',
    loadChildren: () =>
      import('./pages/reports/reports.module').then((m) => m.ReportsModule),
    data: { preload: false, priority: 'low' },
  },
  {
    path: 'resume',
    loadComponent: () =>
      import('./pages/resume/upload-resume.component').then(
        (m) => m.UploadResumeComponent,
      ),
    data: { preload: true, priority: 'high' },
  },
  {
    path: 'analysis',
    loadComponent: () =>
      import('./pages/analysis/unified-analysis.component').then(
        (m) => m.UnifiedAnalysisComponent,
      ),
    data: { preload: true, priority: 'medium' },
  },
  {
    path: 'results/:sessionId',
    loadComponent: () =>
      import('./pages/results/detailed-results.component').then(
        (m) => m.DetailedResultsComponent,
      ),
    data: { preload: false, priority: 'low' },
  },
  {
    path: 'coach',
    loadComponent: () =>
      import('./pages/coach/coach.component').then((m) => m.CoachComponent),
    data: { preload: true, priority: 'high' },
  },
  {
    path: '**',
    redirectTo: '/dashboard',
  },
];
