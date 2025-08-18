import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('./pages/dashboard/enhanced-dashboard.component').then(m => m.EnhancedDashboardComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/enhanced-dashboard.component').then(m => m.EnhancedDashboardComponent)
  },
  {
    path: 'jobs',
    loadChildren: () => import('./pages/jobs/jobs.module').then(m => m.JobsModule)
  },
  {
    path: 'reports',
    loadChildren: () => import('./pages/reports/reports.module').then(m => m.ReportsModule)
  },
  {
    path: 'resume',
    loadComponent: () => import('./pages/resume/upload-resume.component').then(m => m.UploadResumeComponent)
  },
  {
    path: 'analysis',
    loadComponent: () => import('./pages/analysis/unified-analysis.component').then(m => m.UnifiedAnalysisComponent)
  },
  {
    path: 'results/:sessionId',
    loadComponent: () => import('./pages/results/detailed-results.component').then(m => m.DetailedResultsComponent)
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
