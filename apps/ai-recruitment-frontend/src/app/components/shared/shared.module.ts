import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Components
import { LoadingComponent } from './loading/loading.component';
import { AlertComponent } from './alert/alert.component';
import { DashboardCardComponent } from './dashboard-card/dashboard-card.component';

const COMPONENTS = [
  LoadingComponent,
  AlertComponent,
  DashboardCardComponent,
];

@NgModule({
  declarations: [
    ...COMPONENTS
  ],
  imports: [
    CommonModule,
    RouterModule,
  ],
  exports: [
    ...COMPONENTS,
    CommonModule,
    RouterModule,
  ]
})
export class SharedModule { }