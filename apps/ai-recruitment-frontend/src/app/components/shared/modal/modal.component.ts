import type { OnInit, OnDestroy, ElementRef, Renderer2 } from '@angular/core';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';

/**
 * Represents the modal component for displaying dialog overlays.
 */
@Component({
  selector: 'arc-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      *ngIf="isOpen"
      class="modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      (click)="onBackdropClick($event)"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="titleId"
      tabindex="-1"
      #modalContainer
      (keydown)="trapFocus($event)"
    >
      <div
        class="modal-dialog bg-white rounded-lg shadow-xl max-w-full mx-4"
        [class.modal-sm]="size === 'sm'"
        [class.modal-md]="size === 'md'"
        [class.modal-lg]="size === 'lg'"
        [class.modal-xl]="size === 'xl'"
        (click)="$event.stopPropagation()"
      >
        <div
          class="modal-header flex items-center justify-between p-4 border-b"
        >
          <h2
            *ngIf="title"
            [id]="titleId"
            class="modal-title text-lg font-semibold"
          >
            {{ title }}
          </h2>
          <button
            *ngIf="showCloseButton"
            type="button"
            class="modal-close-btn text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            (click)="close()"
            [attr.aria-label]="closeButtonLabel"
            #closeButton
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        <div class="modal-content p-4">
          <ng-content></ng-content>
        </div>

        <div
          *ngIf="showFooter"
          class="modal-footer flex justify-end gap-2 p-4 border-t"
        >
          <button
            *ngIf="showCancelButton"
            type="button"
            class="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
            (click)="cancel()"
            #cancelBtn
          >
            {{ cancelButtonText }}
          </button>
          <button
            *ngIf="showConfirmButton"
            type="button"
            class="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            (click)="confirm()"
            #confirmBtn
          >
            {{ confirmButtonText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-sm {
        width: 300px;
        max-width: 90vw;
      }
      .modal-md {
        width: 500px;
        max-width: 90vw;
      }
      .modal-lg {
        width: 800px;
        max-width: 90vw;
      }
      .modal-xl {
        width: 1140px;
        max-width: 95vw;
      }

      .modal-backdrop {
        animation: fadeIn 0.2s ease-out;
      }

      .modal-dialog {
        animation: slideIn 0.2s ease-out;
      }

      .modal-backdrop:focus {
        outline: none;
      }

      .modal-dialog:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class ModalComponent implements OnInit, OnDestroy {
  @ViewChild('modalContainer', { static: false })
  public modalContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('closeButton', { static: false })
  public closeButton!: ElementRef<HTMLButtonElement>;
  @ViewChild('cancelBtn', { static: false })
  public cancelBtn!: ElementRef<HTMLButtonElement>;
  @ViewChild('confirmBtn', { static: false })
  public confirmBtn!: ElementRef<HTMLButtonElement>;

  private destroy$ = new Subject<void>();
  private static idCounter = 0;
  private previouslyFocusedElement: Element | null = null;

  @Input() public isOpen = false;
  @Input() public title = '';
  @Input() public size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() public closeOnBackdropClick = true;
  @Input() public showCloseButton = true;
  @Input() public showFooter = false;
  @Input() public showCancelButton = true;
  @Input() public showConfirmButton = true;
  @Input() public cancelButtonText = '取消';
  @Input() public confirmButtonText = '确认';
  @Input() public closeButtonLabel = '关闭';
  @Input() public restoreFocus = true;

  @Output() public closed = new EventEmitter<void>();
  @Output() public confirmed = new EventEmitter<void>();
  @Output() public cancelled = new EventEmitter<void>();

  public titleId: string;

  constructor() {
    ModalComponent.idCounter++;
    this.titleId = `modal-title-${ModalComponent.idCounter}`;
  }

  public ngOnInit(): void {
    if (this.isOpen) {
      this.openModal();
    }
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public ngOnChanges(): void {
    if (this.isOpen) {
      this.openModal();
    } else {
      this.restorePreviouslyFocusedElement();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  public onEscapeKey(event: KeyboardEvent): void {
    if (this.isOpen) {
      event.preventDefault();
      this.close();
    }
  }

  /**
   * Traps focus within the modal for accessibility.
   * Implements focus trap pattern for WCAG compliance.
   */
  public trapFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;

    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab - move backward
      if (document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
      }
    } else {
      // Tab - move forward
      if (document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  }

  /**
   * Gets all focusable elements within the modal.
   */
  private getFocusableElements(): HTMLElement[] {
    if (!this.modalContainer?.nativeElement) return [];

    const selectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const elements = Array.from(
      this.modalContainer.nativeElement.querySelectorAll(selectors),
    ) as HTMLElement[];

    return elements.filter((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  /**
   * Opens the modal and sets up focus management.
   */
  private openModal(): void {
    // Store the currently focused element before opening modal
    this.previouslyFocusedElement = document.activeElement;

    // Focus the modal container after a short delay to ensure it's rendered
    setTimeout(() => {
      this.focusFirstElement();
    }, 100);
  }

  /**
   * Focuses the first focusable element in the modal.
   */
  private focusFirstElement(): void {
    const focusableElements = this.getFocusableElements();

    if (focusableElements.length > 0) {
      // Prioritize: confirm button > cancel button > close button > first element
      const confirmButton = this.confirmBtn?.nativeElement;
      const cancelButton = this.cancelBtn?.nativeElement;
      const closeBtn = this.closeButton?.nativeElement;

      if (confirmButton && this.showConfirmButton) {
        confirmButton.focus();
      } else if (cancelButton && this.showCancelButton) {
        cancelButton.focus();
      } else if (closeBtn && this.showCloseButton) {
        closeBtn.focus();
      } else {
        focusableElements[0].focus();
      }
    } else if (this.modalContainer?.nativeElement) {
      // If no focusable elements, focus the container itself
      this.modalContainer.nativeElement.focus();
    }
  }

  /**
   * Restores focus to the element that was focused before the modal opened.
   */
  private restorePreviouslyFocusedElement(): void {
    if (this.restoreFocus && this.previouslyFocusedElement) {
      setTimeout(() => {
        (this.previouslyFocusedElement as HTMLElement)?.focus();
        this.previouslyFocusedElement = null;
      }, 0);
    }
  }

  /**
   * Closes the modal dialog.
   */
  public close(): void {
    this.isOpen = false;
    this.closed.emit();
    this.restorePreviouslyFocusedElement();
  }

  /**
   * Confirms the modal action.
   */
  public confirm(): void {
    this.confirmed.emit();
    this.close();
  }

  /**
   * Cancels the modal action.
   */
  public cancel(): void {
    this.cancelled.emit();
    this.close();
  }

  /**
   * Handles the backdrop click event.
   * @param event - The click event.
   */
  public onBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdropClick && event.target === event.currentTarget) {
      this.close();
    }
  }

  private focusModal(): void {
    setTimeout(() => {
      if (this.modalContainer?.nativeElement) {
        this.modalContainer.nativeElement.focus();
      }
    }, 0);
  }
}
