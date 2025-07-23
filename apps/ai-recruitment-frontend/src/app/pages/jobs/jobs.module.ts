import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { JobsRoutingModule } from './jobs-routing.module';
import { JobsListComponent } from './jobs-list/jobs-list.component';
import { CreateJobComponent } from './create-job/create-job.component';

@NgModule({
  declarations: [
    JobsListComponent,
    CreateJobComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    JobsRoutingModule
  ]
})
export class JobsModule { }
