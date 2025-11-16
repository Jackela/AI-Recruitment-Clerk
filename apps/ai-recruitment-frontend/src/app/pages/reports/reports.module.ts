import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReportsPlaceholderComponent } from './reports-placeholder/reports-placeholder.component';

/**
 * Configures the reports module.
 */
@NgModule({
  imports: [
    CommonModule,
    ReportsPlaceholderComponent,
    RouterModule.forChild([
      {
        path: '',
        component: ReportsPlaceholderComponent,
      },
    ]),
  ],
})
export class ReportsModule {}
