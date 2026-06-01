import type { OnInit } from '@angular/core';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { EmptyStateAction, EmptyStateType } from './empty-state.types';
import { TranslatePipe } from '../../../pipes/translate.pipe';

/**
 * 统一空状态组件
 *
 * @example
 * ```html
 * <!-- 默认空状态 -->
 * <arc-empty-state
 *   icon="inbox"
 *   title="empty.default.title"
 *   description="empty.default.description">
 * </arc-empty-state>
 *
 * <!-- 带操作的空状态 -->
 * <arc-empty-state
 *   type="search"
 *   icon="search"
 *   title="empty.search.title"
 *   description="empty.search.description"
 *   [actions]="searchActions"
 *   (actionClick)="handleAction($event)">
 * </arc-empty-state>
 * ```
 */
@Component({
  selector: 'arc-empty-state',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div
      class="empty-state"
      [class.empty-state--search]="type === 'search'"
      [class.empty-state--error]="type === 'error'"
      [class.empty-state--success]="type === 'success'"
      role="status"
      aria-live="polite"
    >
      <!-- Icon -->
      <div class="empty-state__icon" *ngIf="icon && !image">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <!-- Inbox Icon -->
          <g *ngIf="icon === 'inbox'">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
            <path
              d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
            ></path>
          </g>

          <!-- Search Icon -->
          <g *ngIf="icon === 'search'">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </g>

          <!-- Error/Alert Icon -->
          <g *ngIf="icon === 'alert-circle' || icon === 'error'">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </g>

          <!-- Briefcase Icon -->
          <g *ngIf="icon === 'briefcase'">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </g>

          <!-- File Text Icon -->
          <g *ngIf="icon === 'file-text'">
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            ></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </g>

          <!-- Grid/Table Icon (Default) -->
          <g *ngIf="icon === 'grid' || (!icon && !image)">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </g>

          <!-- Calendar Icon -->
          <g *ngIf="icon === 'calendar'">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </g>

          <!-- User Icon -->
          <g *ngIf="icon === 'user'">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </g>

          <!-- Success/Check Icon -->
          <g *ngIf="icon === 'check-circle' || icon === 'success'">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </g>

          <!-- Folder Icon -->
          <g *ngIf="icon === 'folder'">
            <path
              d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
            ></path>
          </g>

          <!-- Database Icon -->
          <g *ngIf="icon === 'database'">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          </g>

          <!-- Trash Icon -->
          <g *ngIf="icon === 'trash'">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path
              d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
            ></path>
          </g>
        </svg>
      </div>

      <!-- Custom Image -->
      <div class="empty-state__image" *ngIf="image">
        <img [src]="image" [alt]="title || '' | translate" loading="lazy" />
      </div>

      <!-- Title -->
      <h3 class="empty-state__title" *ngIf="title">
        {{ title | translate }}
      </h3>

      <!-- Description -->
      <p class="empty-state__description" *ngIf="description">
        {{ description | translate }}
      </p>

      <!-- Actions -->
      <div class="empty-state__actions" *ngIf="actions?.length">
        <button
          *ngFor="let action of actions"
          type="button"
          [class.btn-primary]="!action.variant || action.variant === 'primary'"
          [class.btn-secondary]="action.variant === 'secondary'"
          [class.btn-outline]="action.variant === 'outline'"
          (click)="onActionClick(action)"
          [attr.aria-label]="action.label | translate"
        >
          <!-- Action Icon -->
          <svg
            *ngIf="action.icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
            class="btn-icon"
          >
            <!-- Plus Icon -->
            <g *ngIf="action.icon === 'plus'">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </g>

            <!-- X/Close Icon -->
            <g *ngIf="action.icon === 'x'">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </g>

            <!-- Arrow Left Icon -->
            <g *ngIf="action.icon === 'arrow-left'">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </g>

            <!-- Refresh Icon -->
            <g *ngIf="action.icon === 'refresh'">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path
                d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
              ></path>
            </g>

            <!-- Search Icon -->
            <g *ngIf="action.icon === 'search'">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </g>

            <!-- Trash Icon -->
            <g *ngIf="action.icon === 'trash'">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path
                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
              ></path>
            </g>

            <!-- Edit Icon -->
            <g *ngIf="action.icon === 'edit'">
              <path
                d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
              ></path>
              <path
                d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
              ></path>
            </g>

            <!-- Filter Icon -->
            <g *ngIf="action.icon === 'filter'">
              <polygon
                points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"
              ></polygon>
            </g>
          </svg>
          <span>{{ action.label | translate }}</span>
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./empty-state.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent implements OnInit {
  /** 空状态类型，影响默认样式 */
  @Input() public type: EmptyStateType = 'default';

  /** 图标名称 */
  @Input() public icon?: string;

  /** 自定义图片 URL */
  @Input() public image?: string;

  /** 标题翻译键 */
  @Input() public title?: string;

  /** 描述翻译键 */
  @Input() public description?: string;

  /** 操作按钮列表 */
  @Input() public actions?: EmptyStateAction[];

  /** 操作点击事件 */
  @Output() public actionClick = new EventEmitter<EmptyStateAction>();

  public ngOnInit(): void {
    // 设置默认图标
    if (!this.icon && !this.image) {
      this.icon = 'grid';
    }
  }

  /**
   * 处理操作按钮点击
   */
  public onActionClick(action: EmptyStateAction): void {
    if (action.handler) {
      action.handler();
    }
    this.actionClick.emit(action);
  }
}
