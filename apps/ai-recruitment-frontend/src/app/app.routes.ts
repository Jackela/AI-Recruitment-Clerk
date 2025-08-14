import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('./pages/resume/upload-resume.component').then(m => m.UploadResumeComponent)
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
    path: '**',
    redirectTo: '/jobs'
  }
];
