import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MODULE_COMPONENTS: any[] = [];

/**
 * Configures the shared module.
 * Note: This module only exports CommonModule and RouterModule.
 * Standalone components should be imported directly where needed.
 */
@NgModule({
  declarations: MODULE_COMPONENTS,
  imports: [CommonModule, RouterModule],
  exports: [...MODULE_COMPONENTS, CommonModule, RouterModule],
})
export class SharedModule {}
