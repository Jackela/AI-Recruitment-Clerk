import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';

export interface MobileNavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: number;
  disabled?: boolean;
}

@Component({
  selector: 'app-mobile-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Mobile Header -->
    <header class="mobile-header" [class.scrolled]="isScrolled">
      <button 
        class="header-back"
        *ngIf="showBackButton"
        (click)="onBackClick()"
        [attr.aria-label]="'Go back'">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
      </button>
      
      <div class="header-title-container">
        <h1 class="header-title">{{ pageTitle }}</h1>
        <p class="header-subtitle" *ngIf="pageSubtitle">{{ pageSubtitle }}</p>
      </div>
      
      <div class="header-actions">
        <button 
          class="header-action"
          *ngFor="let action of headerActions"
          (click)="onActionClick(action)"
          [attr.aria-label]="action.label"
          [disabled]="action.disabled">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path [attr.d]="action.icon"/>
          </svg>
          <span class="action-badge" *ngIf="action.badge">{{ action.badge }}</span>
        </button>
        
        <!-- Menu button -->
        <button 
          class="header-menu"
          (click)="toggleMenu()"
          [attr.aria-label]="'Open menu'"
          [attr.aria-expanded]="isMenuOpen">
          <div class="hamburger" [class.active]="isMenuOpen">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      </div>
    </header>

    <!-- Mobile Menu Overlay -->
    <div 
      class="mobile-menu-overlay" 
      [class.open]="isMenuOpen"
      (click)="closeMenu()"
      [attr.aria-hidden]="!isMenuOpen">
      
      <nav class="mobile-menu" (click)="$event.stopPropagation()">
        <div class="menu-header">
          <h2>Menu</h2>
          <button 
            class="menu-close"
            (click)="closeMenu()"
            [attr.aria-label]="'Close menu'">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        
        <ul class="menu-items" role="menu">
          <li role="none" *ngFor="let item of menuItems">
            <a 
              [routerLink]="item.route"
              class="menu-item"
              [class.active]="currentRoute === item.route"
              [class.disabled]="item.disabled"
              (click)="onMenuItemClick(item)"
              role="menuitem"
              [attr.aria-current]="currentRoute === item.route ? 'page' : null">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="menu-icon">
                <path [attr.d]="item.icon"/>
              </svg>
              <span class="menu-label">{{ item.label }}</span>
              <span class="menu-badge" *ngIf="item.badge">{{ item.badge }}</span>
            </a>
          </li>
        </ul>
        
        <div class="menu-footer">
          <button 
            class="menu-action"
            *ngFor="let action of menuActions"
            (click)="onMenuActionClick(action)"
            [disabled]="action.disabled">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path [attr.d]="action.icon"/>
            </svg>
            {{ action.label }}
          </button>
        </div>
      </nav>
    </div>

    <!-- Bottom Navigation -->
    <nav class="mobile-bottom-nav" [attr.aria-label]="'Main navigation'">
      <a 
        *ngFor="let item of navItems"
        [routerLink]="item.route"
        class="nav-item"
        [class.active]="currentRoute === item.route"
        [class.disabled]="item.disabled"
        [attr.aria-current]="currentRoute === item.route ? 'page' : null"
        [attr.aria-label]="item.label">
        
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="nav-icon">
          <path [attr.d]="item.icon"/>
        </svg>
        <span class="nav-label">{{ item.label }}</span>
        <span class="nav-badge" *ngIf="item.badge">{{ item.badge }}</span>
      </a>
    </nav>
  `,
  styles: [`
    .mobile-header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 56px;
      background: white;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      z-index: 1000;
      transition: box-shadow 0.2s ease;
      padding-top: env(safe-area-inset-top);

      &.scrolled {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .header-back {
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        color: #3498db;
        cursor: pointer;
        border-radius: 50%;
        transition: background-color 0.2s ease;

        &:active {
          background-color: rgba(52, 152, 219, 0.1);
        }
      }

      .header-title-container {
        flex: 1;
        text-align: center;
        margin: 0 16px;

        .header-title {
          font-size: 18px;
          font-weight: 600;
          color: #2c3e50;
          margin: 0;
          line-height: 1.2;
        }

        .header-subtitle {
          font-size: 12px;
          color: #6c757d;
          margin: 2px 0 0 0;
          line-height: 1.2;
        }
      }

      .header-actions {
        display: flex;
        gap: 8px;
        align-items: center;

        .header-action {
          position: relative;
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: #6c757d;
          cursor: pointer;
          border-radius: 50%;
          transition: all 0.2s ease;

          &:active {
            background-color: rgba(108, 117, 125, 0.1);
          }

          .action-badge {
            position: absolute;
            top: 8px;
            right: 8px;
            background: #e74c3c;
            color: white;
            font-size: 10px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 10px;
            min-width: 16px;
            text-align: center;
          }
        }

        .header-menu {
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          cursor: pointer;
          border-radius: 50%;
          transition: background-color 0.2s ease;

          &:active {
            background-color: rgba(108, 117, 125, 0.1);
          }

          .hamburger {
            width: 20px;
            height: 16px;
            position: relative;
            transition: transform 0.3s ease;

            span {
              display: block;
              position: absolute;
              height: 2px;
              width: 100%;
              background: #6c757d;
              border-radius: 1px;
              transition: all 0.3s ease;

              &:nth-child(1) {
                top: 0;
              }

              &:nth-child(2) {
                top: 7px;
              }

              &:nth-child(3) {
                top: 14px;
              }
            }

            &.active {
              span:nth-child(1) {
                transform: rotate(45deg);
                top: 7px;
              }

              span:nth-child(2) {
                opacity: 0;
              }

              span:nth-child(3) {
                transform: rotate(-45deg);
                top: 7px;
              }
            }
          }
        }
      }
    }

    .mobile-menu-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1500;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;

      &.open {
        opacity: 1;
        visibility: visible;
      }

      .mobile-menu {
        position: absolute;
        top: 0;
        right: 0;
        width: min(320px, 80vw);
        height: 100%;
        background: white;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        display: flex;
        flex-direction: column;
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);

        .menu-header {
          padding: 20px 16px;
          border-bottom: 1px solid #f1f3f4;
          display: flex;
          align-items: center;
          justify-content: space-between;

          h2 {
            font-size: 20px;
            font-weight: 600;
            color: #2c3e50;
            margin: 0;
          }

          .menu-close {
            min-width: 44px;
            min-height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: none;
            border: none;
            color: #6c757d;
            cursor: pointer;
            border-radius: 50%;

            &:active {
              background-color: rgba(108, 117, 125, 0.1);
            }
          }
        }

        .menu-items {
          flex: 1;
          list-style: none;
          margin: 0;
          padding: 8px 0;
          overflow-y: auto;

          .menu-item {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            color: #2c3e50;
            text-decoration: none;
            transition: background-color 0.2s ease;
            position: relative;

            &:active {
              background-color: rgba(52, 152, 219, 0.05);
            }

            &.active {
              background-color: rgba(52, 152, 219, 0.1);
              color: #3498db;

              .menu-icon {
                color: #3498db;
              }
            }

            &.disabled {
              opacity: 0.5;
              pointer-events: none;
            }

            .menu-icon {
              width: 24px;
              height: 24px;
              margin-right: 16px;
              color: #6c757d;
            }

            .menu-label {
              flex: 1;
              font-size: 16px;
              font-weight: 500;
            }

            .menu-badge {
              background: #e74c3c;
              color: white;
              font-size: 12px;
              font-weight: 600;
              padding: 2px 8px;
              border-radius: 12px;
              margin-left: 8px;
            }
          }
        }

        .menu-footer {
          padding: 16px;
          border-top: 1px solid #f1f3f4;

          .menu-action {
            width: 100%;
            display: flex;
            align-items: center;
            padding: 12px;
            background: none;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            color: #6c757d;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-bottom: 8px;

            &:last-child {
              margin-bottom: 0;
            }

            &:active {
              background-color: #f8f9fa;
            }

            svg {
              margin-right: 8px;
            }
          }
        }
      }

      &.open .mobile-menu {
        transform: translateX(0);
      }
    }

    .mobile-bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 64px;
      background: white;
      border-top: 1px solid #e0e0e0;
      display: flex;
      z-index: 1000;
      padding-bottom: env(safe-area-inset-bottom);

      .nav-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #95a5a6;
        text-decoration: none;
        transition: color 0.2s ease;
        position: relative;
        min-height: 64px;

        &.active {
          color: #3498db;
        }

        &.disabled {
          opacity: 0.5;
          pointer-events: none;
        }

        .nav-icon {
          width: 24px;
          height: 24px;
          margin-bottom: 4px;
        }

        .nav-label {
          font-size: 10px;
          font-weight: 500;
          line-height: 1;
        }

        .nav-badge {
          position: absolute;
          top: 8px;
          right: 50%;
          transform: translateX(12px);
          background: #e74c3c;
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 16px;
          text-align: center;
        }
      }
    }

    @media (min-width: 768px) {
      :host {
        display: none;
      }
    }
  `]
})
export class MobileNavigationComponent implements OnInit, OnDestroy {
  @Input() pageTitle = '';
  @Input() pageSubtitle = '';
  @Input() showBackButton = false;
  @Input() navItems: MobileNavItem[] = [];
  @Input() menuItems: MobileNavItem[] = [];
  @Input() headerActions: any[] = [];
  @Input() menuActions: any[] = [];

  @Output() backClick = new EventEmitter<void>();
  @Output() actionClick = new EventEmitter<any>();
  @Output() menuActionClick = new EventEmitter<any>();

  currentRoute = '';
  isMenuOpen = false;
  isScrolled = false;
  private destroy$ = new Subject<void>();

  constructor(private router: Router) {}

  ngOnInit() {
    // Track current route
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.urlAfterRedirects;
      });

    // Set initial route
    this.currentRoute = this.router.url;

    // Track scroll for header shadow
    window.addEventListener('scroll', this.handleScroll.bind(this));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('scroll', this.handleScroll.bind(this));
  }

  private handleScroll() {
    this.isScrolled = window.scrollY > 10;
  }

  onBackClick() {
    this.backClick.emit();
  }

  onActionClick(action: any) {
    this.actionClick.emit(action);
  }

  onMenuActionClick(action: any) {
    this.menuActionClick.emit(action);
    this.closeMenu();
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    
    // Prevent body scroll when menu is open
    if (this.isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMenu() {
    this.isMenuOpen = false;
    document.body.style.overflow = '';
  }

  onMenuItemClick(item: MobileNavItem) {
    if (!item.disabled) {
      this.closeMenu();
    }
  }
}