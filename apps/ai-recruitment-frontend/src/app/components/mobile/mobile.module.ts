import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Mobile Services
import { TouchGestureService } from '../../services/mobile/touch-gesture.service';
import { PWAService } from '../../services/mobile/pwa.service';

/**
 * Mobile UI Module
 *
 * Note: All mobile components are standalone and should be imported directly
 * where needed. This module provides CommonModule, FormsModule, RouterModule
 * and mobile-specific services.
 */
@NgModule({
  imports: [CommonModule, FormsModule, RouterModule],
  exports: [CommonModule, FormsModule, RouterModule],
  providers: [TouchGestureService, PWAService],
})
export class MobileModule {
  public static forRoot(): {
    ngModule: typeof MobileModule;
    providers: (typeof TouchGestureService | typeof PWAService)[];
  } {
    return {
      ngModule: MobileModule,
      providers: [TouchGestureService, PWAService],
    };
  }
}
