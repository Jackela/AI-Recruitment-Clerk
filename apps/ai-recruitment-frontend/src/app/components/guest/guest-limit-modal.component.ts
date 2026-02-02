import type { OnInit, OnDestroy} from '@angular/core';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import type { Observable} from 'rxjs';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import type { GuestState } from '../../store/guest/guest.state';
import * as GuestActions from '../../store/guest/guest.actions';

/**
 * Represents the guest limit modal component.
 */
@Component({
  selector: 'arc-guest-limit-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      *ngIf="showModal$ | async"
      (click)="onBackdropClick($event)"
    >
      <div class="bg-white rounded-lg p-6 max-w-md mx-4 relative">
        <button
          (click)="closeModal()"
          class="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          aria-label="Close modal"
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

        <div class="text-center">
          <!-- Icon -->
          <div
            class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-4"
          >
            <svg
              class="h-6 w-6 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              ></path>
            </svg>
          </div>

          <!-- Title -->
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            免费次数已用完！
          </h3>

          <!-- Message -->
          <p class="text-gray-600 mb-4">
            您已经使用完了
            <span class="font-semibold">5次</span> 免费简历分析次数。
          </p>

          <!-- Incentive -->
          <div
            class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-6"
          >
            <div class="flex items-center justify-center mb-2">
              <svg
                class="w-5 h-5 text-green-500 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                  clip-rule="evenodd"
                ></path>
              </svg>
              <span class="text-green-600 font-semibold">奖励 ¥3 现金</span>
            </div>
            <p class="text-sm text-gray-700">
              参与问卷反馈可再获
              <span class="font-semibold text-blue-600">5次使用权</span>！
            </p>
          </div>

          <!-- Usage stats -->
          <div
            class="text-sm text-gray-500 mb-6"
            *ngIf="guestState$ | async as state"
          >
            <div class="flex justify-between items-center py-1">
              <span>已使用:</span>
              <span class="font-medium"
                >{{ state.usageCount }}/{{ state.maxUsage }}</span
              >
            </div>
            <div class="flex justify-between items-center py-1">
              <span>剩余次数:</span>
              <span class="font-medium text-orange-600">{{
                state.remainingCount
              }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="space-y-3">
            <button
              (click)="generateFeedbackCode()"
              [disabled]="isLoading$ | async"
              class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span *ngIf="!(isLoading$ | async)">获取反馈码参与活动</span>
              <span
                *ngIf="isLoading$ | async"
                class="flex items-center justify-center"
              >
                <svg
                  class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                生成中...
              </span>
            </button>

            <button
              (click)="tryDemo()"
              class="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              查看演示分析
            </button>

            <button
              (click)="closeModal()"
              class="w-full text-gray-500 py-2 px-4 rounded-lg font-medium hover:text-gray-700 transition-colors"
            >
              稍后再说
            </button>
          </div>

          <!-- Error message -->
          <div
            *ngIf="error$ | async as error"
            class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md"
          >
            <p class="text-sm text-red-600">{{ error }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-enter {
        opacity: 0;
        transform: scale(0.95);
      }
      .modal-enter-active {
        opacity: 1;
        transform: scale(1);
        transition: all 0.2s ease-out;
      }
    `,
  ],
})
export class GuestLimitModalComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

  public showModal$: Observable<boolean>;
  public guestState$: Observable<GuestState>;
  public isLoading$: Observable<boolean>;
  public error$: Observable<string | null>;

  private readonly store = inject(Store<{ guest: GuestState }>);

  /**
   * Initializes a new instance of the Guest Limit Modal Component.
   */
  constructor() {
    this.showModal$ = this.store.select((state) => state.guest.showLimitModal);
    this.guestState$ = this.store.select((state) => state.guest);
    this.isLoading$ = this.store.select((state) => state.guest.isLoading);
    this.error$ = this.store.select((state) => state.guest.error);
  }

  /**
   * Performs the ng on init operation.
   */
  public ngOnInit(): void {
    // Auto-close modal after 30 seconds if no action taken
    this.showModal$.pipe(takeUntil(this.destroy$)).subscribe((showModal) => {
      if (showModal) {
        // Clear any existing timer
        if (this.autoCloseTimer) {
          clearTimeout(this.autoCloseTimer);
        }

        this.autoCloseTimer = setTimeout(() => {
          this.store.dispatch(GuestActions.hideLimitModal());
        }, 30000);
      } else {
        // Clear timer when modal is hidden
        if (this.autoCloseTimer) {
          clearTimeout(this.autoCloseTimer);
          this.autoCloseTimer = null;
        }
      }
    });
  }

  /**
   * Performs the ng on destroy operation.
   */
  public ngOnDestroy(): void {
    // Clear any pending timer
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }

    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Performs the close modal operation.
   */
  public closeModal(): void {
    this.store.dispatch(GuestActions.hideLimitModal());
  }

  /**
   * Performs the on backdrop click operation.
   * @param event - The event.
   */
  public onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  /**
   * Generates feedback code.
   */
  public generateFeedbackCode(): void {
    this.store.dispatch(GuestActions.generateFeedbackCode());
  }

  /**
   * Performs the try demo operation.
   */
  public tryDemo(): void {
    this.store.dispatch(GuestActions.loadDemoAnalysis());
    this.closeModal();
  }
}
