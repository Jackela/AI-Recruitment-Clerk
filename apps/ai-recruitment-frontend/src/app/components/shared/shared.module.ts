import type { Type } from '@angular/core';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Components
import { LoadingComponent } from './loading/loading.component';
import { AlertComponent } from './alert/alert.component';
import { DashboardCardComponent } from './dashboard-card/dashboard-card.component';
import { BentoGridComponent } from './bento-grid/bento-grid.component';
import { BentoCardComponent } from './bento-grid/bento-card.component';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MODULE_COMPONENTS: Type<any>[] = [];

const STANDALONE_COMPONENTS = [
  LoadingComponent,
  AlertComponent,
  DashboardCardComponent,
  BentoGridComponent,
  BentoCardComponent,
];

/**
 * Configures the shared module.
 */
@NgModule({
  declarations: MODULE_COMPONENTS,
  imports: [CommonModule, RouterModule, ...STANDALONE_COMPONENTS],
  exports: [
    ...MODULE_COMPONENTS,
    ...STANDALONE_COMPONENTS,
    CommonModule,
    RouterModule,
  ],
})
export class SharedModule {}
