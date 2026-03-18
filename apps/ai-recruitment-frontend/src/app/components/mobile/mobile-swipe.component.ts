import type { ElementRef, OnInit, OnDestroy } from '@angular/core';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  HostListener,
  ChangeDetectionStrategy,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Defines the shape of the swipe action.
 */
export interface SwipeAction {
  id: string;
  label: string;
  icon: string;
  color: 'primary' | 'success' | 'danger' | 'warning';
  width?: number;
  keyboardShortcut?: string;
}

/**
 * Defines the shape of the swipe event.
 */
export interface SwipeEvent<T = unknown> {
  action: SwipeAction;
  item: T;
}

/**
 * Represents the mobile swipe component.
 */
@Component({
  selector: 'arc-mobile-swipe',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="mobile-swipe-container"
      #container
      [class.swiping]="isSwiping"
      [class.actions-visible]="actionsVisible || keyboardActionsVisible"
      tabindex="0"
      [attr.aria-label]="ariaLabel"
      [attr.aria-description]="keyboardHint"
      (focus)="onFocus()"
      (blur)="onBlur()"
      (touchstart)="onTouchStart($event)"
      (touchmove)="onTouchMove($event)"
      (touchend)="onTouchEnd($event)"
      (mousedown)="onMouseDown($event)"
      (mousemove)="onMouseMove($event)"
      (mouseup)="onMouseUp($event)"
      (mouseleave)="onMouseLeave($event)"
    >
      <!-- Swipe Actions Background -->
      <div class="swipe-actions" #actionsContainer role="list">
        <button
          *ngFor="let action of actions; let i = index"
          class="swipe-action"
          [class]="'swipe-action--' + action.color"
          [class.keyboard-focused]="isActionFocused(i)"
          [style.width.px]="action.width || 80"
          (click)="onActionClick(action)"
          [attr.aria-label]="getActionAriaLabel(action)"
          [attr.tabindex]="isActionFocused(i) ? 0 : -1"
          role="listitem"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path [attr.d]="action.icon" />
          </svg>
          <span class="action-label">{{ action.label }}</span>
          <span *ngIf="action.keyboardShortcut" class="shortcut-hint">{{
            action.keyboardShortcut
          }}</span>
        </button>
      </div>

      <!-- Swipe Content -->
      <div
        class="swipe-content"
        #content
        [style.transform]="'translateX(' + translateX + 'px)'"
      >
        <ng-content></ng-content>
      </div>

      <!-- Keyboard Instructions (Screen Reader Only) -->
      <div class="sr-only" role="region" aria-live="polite">
        {{ keyboardHint }}
      </div>
    </div>
  `,
  styles: [
    `
      .mobile-swipe-container {
        position: relative;
        overflow: hidden;
        background: white;
        user-select: none;
        -webkit-user-select: none;
        touch-action: pan-y;
        outline: none;

        &:focus-visible {
          outline: 2px solid #3498db;
          outline-offset: 2px;
        }

        &.swiping {
          .swipe-content {
            transition: none !important;
          }
        }

        &.actions-visible {
          .swipe-actions {
            opacity: 1;
          }
        }

        .swipe-actions {
          position: absolute;
          top: 0;
          right: 0;
          height: 100%;
          display: flex;
          opacity: 0;
          transition: opacity 0.2s ease;
          z-index: 1;

          .swipe-action {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            border: none;
            color: white;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            min-width: 60px;
            padding: 8px;
            outline: none;

            &:active {
              transform: scale(0.95);
            }

            &:focus-visible {
              outline: 2px solid white;
              outline-offset: -4px;
              box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.5);
            }

            &.keyboard-focused {
              transform: scale(1.05);
              box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.5);
              z-index: 10;
            }

            &--primary {
              background: #3498db;

              &:hover {
                background: #2980b9;
              }
            }

            &--success {
              background: #27ae60;

              &:hover {
                background: #229954;
              }
            }

            &--danger {
              background: #e74c3c;

              &:hover {
                background: #c0392b;
              }
            }

            &--warning {
              background: #f39c12;

              &:hover {
                background: #e67e22;
              }
            }

            .action-label {
              line-height: 1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 100%;
            }

            .shortcut-hint {
              font-size: 9px;
              opacity: 0.8;
              margin-top: 2px;
              padding: 1px 4px;
              background: rgba(0, 0, 0, 0.2);
              border-radius: 3px;
            }

            svg {
              flex-shrink: 0;
            }
          }
        }

        .swipe-content {
          position: relative;
          background: white;
          z-index: 2;
          transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          will-change: transform;
        }
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
      }

      @media (min-width: 768px) {
        .mobile-swipe-container {
          touch-action: auto;

          .swipe-actions {
            opacity: 0 !important;
          }

          .swipe-content {
            transform: none !important;
          }
        }
      }
    `,
  ],

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileSwipeComponent<T = unknown> implements OnInit, OnDestroy {
  @Input() public actions: SwipeAction[] = [];
  @Input() public swipeThreshold = 80;
  @Input() public disabled = false;
  @Input() public item!: T;
  @Input() public itemLabel = '项目';

  @Output() public swipeAction = new EventEmitter<SwipeEvent<T>>();
  @Output() public swipeStart = new EventEmitter<void>();
  @Output() public swipeEnd = new EventEmitter<void>();
  @Output() public keyboardAction = new EventEmitter<SwipeEvent<T>>();

  @ViewChild('container') public container!: ElementRef<HTMLElement>;
  @ViewChild('content') public content!: ElementRef<HTMLElement>;
  @ViewChild('actionsContainer')
  public actionsContainer!: ElementRef<HTMLElement>;

  public translateX = 0;
  public isSwiping = false;
  public actionsVisible = false;
  public keyboardActionsVisible = false;

  private startX = 0;
  private currentX = 0;
  private isDragging = false;
  private maxSwipeDistance = 0;
  private isMouseEvent = false;
  private focusedActionIndex = signal<number>(-1);
  private isKeyboardActive = signal<boolean>(false);

  public get ariaLabel(): string {
    return `${this.itemLabel}，按Tab键查看可执行的操作`;
  }

  public get keyboardHint(): string {
    if (this.actions.length === 0) return '';
    const shortcuts = this.actions
      .filter((a) => a.keyboardShortcut)
      .map((a) => `${a.keyboardShortcut}键${a.label}`)
      .join('，');
    return shortcuts
      ? `快捷键：${shortcuts}。按Delete键删除，Enter键确认。`
      : '按Enter键查看操作';
  }

  /**
   * Performs the ng on init operation.
   * @returns The result of the operation.
   */
  public ngOnInit(): void {
    this.calculateMaxSwipeDistance();
  }

  /**
   * Performs the ng on destroy operation.
   * @returns The result of the operation.
   */
  public ngOnDestroy(): void {
    this.resetSwipe();
  }

  private calculateMaxSwipeDistance(): void {
    this.maxSwipeDistance = this.actions.reduce((total, action) => {
      return total + (action.width || 80);
    }, 0);
  }

  public onFocus(): void {
    if (!this.keyboardActionsVisible && this.actions.length > 0) {
      this.focusedActionIndex.set(-1);
    }
    this.isKeyboardActive.set(true);
  }

  public onBlur(): void {
    if (!this.keyboardActionsVisible) {
      this.isKeyboardActive.set(false);
      this.focusedActionIndex.set(-1);
    }
  }

  @HostListener('keydown', ['$event'])
  public handleKeyboardEvent(event: KeyboardEvent): void {
    if (this.disabled) return;

    // Handle global shortcuts
    const shortcutAction = this.actions.find(
      (a) => a.keyboardShortcut === event.key,
    );
    if (shortcutAction) {
      event.preventDefault();
      this.swipeAction.emit({ action: shortcutAction, item: this.item });
      this.keyboardAction.emit({ action: shortcutAction, item: this.item });
      return;
    }

    switch (event.key) {
      case 'Tab':
        if (this.actions.length > 0) {
          event.preventDefault();
          this.keyboardActionsVisible = true;
          if (event.shiftKey) {
            this.previousAction();
          } else {
            this.nextAction();
          }
        }
        break;

      case 'ArrowRight':
      case 'ArrowDown':
        if (this.keyboardActionsVisible) {
          event.preventDefault();
          this.nextAction();
        }
        break;

      case 'ArrowLeft':
      case 'ArrowUp':
        if (this.keyboardActionsVisible) {
          event.preventDefault();
          this.previousAction();
        }
        break;

      case 'Enter':
        if (this.keyboardActionsVisible && this.focusedActionIndex() >= 0) {
          event.preventDefault();
          const action = this.actions[this.focusedActionIndex()];
          this.onActionClick(action);
        } else if (!this.keyboardActionsVisible && this.actions.length > 0) {
          event.preventDefault();
          this.keyboardActionsVisible = true;
          this.focusedActionIndex.set(0);
        }
        break;

      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        const deleteAction = this.actions.find(
          (a) => a.id === 'delete' || a.color === 'danger',
        );
        if (deleteAction) {
          this.swipeAction.emit({ action: deleteAction, item: this.item });
          this.keyboardAction.emit({ action: deleteAction, item: this.item });
        }
        break;

      case 'Escape':
        if (this.keyboardActionsVisible) {
          event.preventDefault();
          this.hideKeyboardActions();
        }
        break;
    }
  }

  private nextAction(): void {
    const current = this.focusedActionIndex();
    if (current < this.actions.length - 1) {
      this.focusedActionIndex.set(current + 1);
    } else {
      this.focusedActionIndex.set(0);
    }
  }

  private previousAction(): void {
    const current = this.focusedActionIndex();
    if (current > 0) {
      this.focusedActionIndex.set(current - 1);
    } else {
      this.focusedActionIndex.set(this.actions.length - 1);
    }
  }

  private hideKeyboardActions(): void {
    this.keyboardActionsVisible = false;
    this.focusedActionIndex.set(-1);
  }

  public isActionFocused(index: number): boolean {
    return this.keyboardActionsVisible && this.focusedActionIndex() === index;
  }

  public getActionAriaLabel(action: SwipeAction): string {
    const shortcut = action.keyboardShortcut
      ? `，快捷键${action.keyboardShortcut}`
      : '';
    return `${action.label}${shortcut}`;
  }

  /**
   * Performs the on touch start operation.
   * @param event - The event.
   * @returns The result of the operation.
   */
  public onTouchStart(event: TouchEvent): void {
    if (this.disabled) return;

    this.isMouseEvent = false;
    const touch = event.touches[0];
    this.startSwipe(touch.clientX);
  }

  /**
   * Performs the on touch move operation.
   * @param event - The event.
   * @returns The result of the operation.
   */
  public onTouchMove(event: TouchEvent): void {
    if (this.disabled || !this.isDragging) return;

    event.preventDefault();
    const touch = event.touches[0];
    this.updateSwipe(touch.clientX);
  }

  /**
   * Performs the on touch end operation.
   * @param _event - The event.
   * @returns The result of the operation.
   */
  public onTouchEnd(_event: TouchEvent): void {
    if (this.disabled) return;

    this.endSwipe();
  }

  /**
   * Performs the on mouse down operation.
   * @param event - The event.
   * @returns The result of the operation.
   */
  public onMouseDown(event: MouseEvent): void {
    if (this.disabled || window.innerWidth >= 768) return; // Disable on desktop

    this.isMouseEvent = true;
    this.startSwipe(event.clientX);
    event.preventDefault();
  }

  /**
   * Performs the on mouse move operation.
   * @param event - The event.
   * @returns The result of the operation.
   */
  public onMouseMove(event: MouseEvent): void {
    if (this.disabled || !this.isDragging || !this.isMouseEvent) return;

    this.updateSwipe(event.clientX);
    event.preventDefault();
  }

  /**
   * Performs the on mouse up operation.
   * @param _event - The event.
   * @returns The result of the operation.
   */
  public onMouseUp(_event: MouseEvent): void {
    if (this.disabled || !this.isMouseEvent) return;

    this.endSwipe();
  }

  /**
   * Performs the on mouse leave operation.
   * @param _event - The event.
   * @returns The result of the operation.
   */
  public onMouseLeave(_event: MouseEvent): void {
    if (this.disabled || !this.isMouseEvent) return;

    this.endSwipe();
  }

  private startSwipe(clientX: number): void {
    this.startX = clientX;
    this.currentX = clientX;
    this.isDragging = true;
    this.isSwiping = true;
    this.swipeStart.emit();
  }

  private updateSwipe(clientX: number): void {
    this.currentX = clientX;
    const deltaX = this.startX - this.currentX;

    // Only allow left swipe (positive deltaX)
    if (deltaX > 0) {
      this.translateX = -Math.min(deltaX, this.maxSwipeDistance);
      this.actionsVisible = Math.abs(this.translateX) > this.swipeThreshold / 2;
    } else {
      this.translateX = 0;
      this.actionsVisible = false;
    }
  }

  private endSwipe(): void {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.isSwiping = false;

    const deltaX = this.startX - this.currentX;

    if (deltaX > this.swipeThreshold) {
      // Swipe threshold reached - show actions
      this.translateX = -this.maxSwipeDistance;
      this.actionsVisible = true;
    } else {
      // Snap back to original position
      this.resetSwipe();
    }

    this.swipeEnd.emit();
  }

  /**
   * Performs the on action click operation.
   * @param action - The action.
   * @returns The result of the operation.
   */
  public onActionClick(action: SwipeAction): void {
    this.swipeAction.emit({ action, item: this.item });
    this.resetSwipe();
    this.hideKeyboardActions();
  }

  /**
   * Performs the reset swipe operation.
   * @returns The result of the operation.
   */
  public resetSwipe(): void {
    this.translateX = 0;
    this.actionsVisible = false;
    this.isDragging = false;
    this.isSwiping = false;
    this.isMouseEvent = false;
  }

  // Public method to reset swipe programmatically
  /**
   * Performs the reset operation.
   * @returns The result of the operation.
   */
  public reset(): void {
    this.resetSwipe();
  }

  // Public method to show actions programmatically
  /**
   * Performs the show actions operation.
   * @returns The result of the operation.
   */
  public showActions(): void {
    this.translateX = -this.maxSwipeDistance;
    this.actionsVisible = true;
  }
}
