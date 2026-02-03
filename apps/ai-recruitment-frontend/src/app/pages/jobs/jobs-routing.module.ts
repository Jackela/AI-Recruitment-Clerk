import { NgModule } from '@angular/core';
import type { Routes } from '@angular/router';
import { RouterModule } from '@angular/router';

import { JobsListComponent } from './jobs-list/jobs-list.component';
import { CreateJobComponent } from './create-job/create-job.component';

const routes: Routes = [
  {
    path: '',
    component: JobsListComponent,
  },
  {
    path: 'create',
    component: CreateJobComponent,
  },
];

/**
 * Configures the jobs routing module.
 */
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class JobsRoutingModule {}
