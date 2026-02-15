import type { OnInit, OnDestroy } from '@angular/core';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';

import { MobileNavigationMenuComponent } from './mobile-navigation-menu.component';
import { MobileNavigationRouteService } from './mobile-navigation-route.service';
import {
  MobileNavigationHeaderComponent,
  type HeaderAction,
} from './mobile-navigation-header.component';
import { MobileBottomNavComponent } from './mobile-bottom-nav.component';

/**
 * Defines the shape of a mobile navigation item.
 */
export interface MobileNavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: number;
  disabled?: boolean;
}

/**
 * Represents the mobile navigation component.
 * Serves as an orchestrator that delegates route tracking to MobileNavigationRouteService
 * and menu rendering to MobileNavigationMenuComponent.
 */
@Component({
  selector: 'arc-mobile-navigation',
  standalone: true,
  imports: [
    CommonModule,
    MobileNavigationMenuComponent,
    MobileNavigationHeaderComponent,
    MobileBottomNavComponent,
  ],
  template: `
    <!-- Mobile Header (delegated to child component) -->
    <arc-mobile-navigation-header
      [pageTitle]="pageTitle"
      [pageSubtitle]="pageSubtitle"
      [showBackButton]="showBackButton"
      [isScrolled]="routeService.isScrolled"
      [isMenuOpen]="isMenuOpen"
      [headerActions]="headerActions"
      (backClick)="onBackClick()"
      (actionClick)="onHeaderActionClick($event)"
      (menuToggle)="toggleMenu()"
    />

    <!-- Mobile Menu (delegated to child component) -->
    <arc-mobile-navigation-menu
      [isOpen]="isMenuOpen"
      [menuItems]="menuItems"
      [menuActions]="menuActions"
      (close)="closeMenu()"
      (itemClick)="onMenuItemClick($event)"
      (actionClick)="onMenuActionClick($event)"
    />

    <!-- Bottom Navigation (delegated to child component) -->
    <arc-mobile-bottom-nav
      [navItems]="navItems"
      [isActive]="routeService.isRouteActive.bind(routeService)"
    />
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class MobileNavigationComponent implements OnInit, OnDestroy {
  @Input() public pageTitle = '';
  @Input() public pageSubtitle = '';
  @Input() public showBackButton = false;
  @Input() public navItems: MobileNavItem[] = [];
  @Input() public menuItems: MobileNavItem[] = [];
  @Input()
  public headerActions: HeaderAction[] = [];
  @Input()
  public menuActions: Array<{
    id: string;
    label: string;
    icon?: string;
    action: () => void;
    disabled?: boolean;
  }> = [];

  @Output() public backClick = new EventEmitter<void>();
  @Output() public actionClick = new EventEmitter<{
    id: string;
    label: string;
  }>();
  @Output() public menuActionClick = new EventEmitter<{
    id: string;
    label: string;
  }>();

  public isMenuOpen = false;
  private readonly destroy$ = new Subject<void>();

  public routeService = inject(MobileNavigationRouteService);

  /**
   * Performs ng on init operation.
   */
  public ngOnInit(): void {
    this.routeService.initialize();
  }

  /**
   * Performs ng on destroy operation.
   */
  public ngOnDestroy(): void {
    this.routeService.destroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Performs on back click operation.
   */
  public onBackClick(): void {
    this.backClick.emit();
  }

  /**
   * Performs on header action click operation.
   */
  public onHeaderActionClick(action: HeaderAction): void {
    this.actionClick.emit({ id: action.id, label: action.label });
  }

  /**
   * Performs on menu action click operation.
   */
  public onMenuActionClick(action: { id: string; label: string }): void {
    this.menuActionClick.emit(action);
  }

  /**
   * Performs on menu item click operation.
   */
  public onMenuItemClick(_item: MobileNavItem): void {
    // Menu closing is handled by the child component
  }

  /**
   * Performs toggle menu operation.
   */
  public toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;

    // Prevent body scroll when menu is open
    if (this.isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  /**
   * Performs close menu operation.
   */
  public closeMenu(): void {
    this.isMenuOpen = false;
    document.body.style.overflow = '';
  }
}
