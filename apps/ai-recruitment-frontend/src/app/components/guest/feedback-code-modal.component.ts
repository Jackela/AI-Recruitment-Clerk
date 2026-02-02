import type { OnInit } from '@angular/core';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import type { Observable } from 'rxjs';
import type { GuestState } from '../../store/guest/guest.state';
import * as GuestActions from '../../store/guest/guest.actions';
import { ToastService } from '../../services/toast.service';

/**
 * Represents the feedback code modal component.
 */
@Component({
  selector: 'arc-feedback-code-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      *ngIf="showModal$ | async"
      (click)="onBackdropClick($event)"
      (keydown.escape)="closeModal()"
      tabindex="0"
      role="dialog"
      aria-modal="true"
    >
      <div class="bg-white rounded-lg p-6 max-w-lg mx-4 relative">
        <button
          (click)="closeModal()"
          class="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
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
          <!-- Success Icon -->
          <div
            class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4"
          >
            <svg
              class="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
          </div>

          <!-- Title -->
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            反馈码生成成功！
          </h3>

          <!-- Instructions -->
          <p class="text-gray-600 mb-6">
            请复制此码，并点击下方链接前往问卷填写。<br />
            提交成功后，您将获得奖励和新的使用次数！
          </p>

          <!-- Feedback Code Display -->
          <div
            class="bg-gray-50 p-4 rounded-lg mb-4"
            *ngIf="guestState$ | async as state"
          >
            <label class="block text-sm font-medium text-gray-700 mb-2"
              >您的反馈码：</label
            >
            <div class="flex items-center space-x-2">
              <input
                type="text"
                [value]="state.feedbackCode"
                readonly
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white font-mono text-sm"
                #feedbackCodeInput
              />
              <button
                (click)="copyFeedbackCode(feedbackCodeInput)"
                [class]="copiedClass"
                class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
              >
                <svg
                  *ngIf="!copied"
                  class="w-4 h-4 mr-1 inline"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  ></path>
                </svg>
                <svg
                  *ngIf="copied"
                  class="w-4 h-4 mr-1 inline"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                {{ copied ? '已复制' : '复制' }}
              </button>
            </div>
          </div>

          <!-- Rewards Info -->
          <div
            class="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg mb-6"
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
              <span class="text-green-600 font-semibold">完成问卷可获得</span>
            </div>
            <div class="space-y-1 text-sm">
              <div class="flex items-center justify-center">
                <span
                  class="bg-red-100 text-red-600 px-2 py-1 rounded font-medium mr-2"
                  >¥3 现金奖励</span
                >
                <span
                  class="bg-blue-100 text-blue-600 px-2 py-1 rounded font-medium"
                  >+5 使用次数</span
                >
              </div>
            </div>
          </div>

          <!-- Survey Button -->
          <div class="space-y-3">
            <a
              [href]="(guestState$ | async)?.surveyUrl || '#'"
              target="_blank"
              rel="noopener noreferrer"
              class="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors no-underline"
              (click)="trackSurveyClick()"
            >
              <svg
                class="w-5 h-5 mr-2 inline"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                ></path>
              </svg>
              前往问卷调查 (新窗口)
            </a>

            <!-- Redemption Section -->
            <div class="border-t pt-4">
              <p class="text-sm text-gray-600 mb-3">
                如果您已完成问卷，请在此输入反馈码兑换奖励：
              </p>
              <div class="flex space-x-2">
                <input
                  type="text"
                  [(ngModel)]="redemptionCode"
                  placeholder="输入反馈码"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  (click)="redeemCode()"
                  [disabled]="!redemptionCode || (isLoading$ | async)"
                  class="px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  兑换
                </button>
              </div>
            </div>

            <button
              (click)="closeModal()"
              class="w-full text-gray-500 py-2 px-4 rounded-lg font-medium hover:text-gray-700 transition-colors"
            >
              稍后处理
            </button>
          </div>

          <!-- Error/Success Messages -->
          <div
            *ngIf="error$ | async as error"
            class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md"
          >
            <p class="text-sm text-red-600">{{ error }}</p>
          </div>

          <!-- Instructions -->
          <div class="mt-6 text-xs text-gray-500">
            <p>
              💡 提示: 问卷大约需要 2-3 分钟完成，请如实填写以获得最佳体验改进。
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .copy-button-success {
        @apply bg-green-100 text-green-700 border-green-200;
      }
      .copy-button-default {
        @apply bg-gray-100 text-gray-700 border-gray-200;
      }
    `,
  ],
})
export class FeedbackCodeModalComponent implements OnInit {
  public showModal$: Observable<boolean>;
  public guestState$: Observable<GuestState>;
  public isLoading$: Observable<boolean>;
  public error$: Observable<string | null>;

  public copied = false;
  public redemptionCode = '';

  private readonly store = inject(Store<{ guest: GuestState }>);
  private readonly toastService = inject(ToastService);

  /**
   * Initializes a new instance of the Feedback Code Modal Component.
   */
  constructor() {
    this.showModal$ = this.store.select(
      (state) => state.guest.showFeedbackModal,
    );
    this.guestState$ = this.store.select((state) => state.guest);
    this.isLoading$ = this.store.select((state) => state.guest.isLoading);
    this.error$ = this.store.select((state) => state.guest.error);
  }

  /**
   * Performs the ng on init operation.
   */
  public ngOnInit(): void {
    // Pre-populate redemption code with generated feedback code
    this.guestState$.subscribe((state) => {
      if (state.feedbackCode && !this.redemptionCode) {
        this.redemptionCode = state.feedbackCode;
      }
    });
  }

  /**
   * Performs the copied class operation.
   * @returns The string value.
   */
  public get copiedClass(): string {
    return this.copied
      ? 'bg-green-100 text-green-700 border border-green-200'
      : 'bg-gray-100 text-gray-700 border border-gray-200';
  }

  /**
   * Performs the close modal operation.
   */
  public closeModal(): void {
    this.store.dispatch(GuestActions.hideFeedbackModal());
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
   * Performs the copy feedback code operation.
   * @param input - The input.
   */
  public copyFeedbackCode(input: HTMLInputElement): void {
    input.select();
    input.setSelectionRange(0, 99999); // For mobile devices

    try {
      document.execCommand('copy');
      this.copied = true;

      // Reset copy status after 2 seconds
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    } catch {
      this.toastService.error('复制失败，请手动选择复制');
    }
  }

  /**
   * Performs the track survey click operation.
   */
  public trackSurveyClick(): void {
    // Track survey click for analytics
    this.store.dispatch(GuestActions.updateLastActivity());
  }

  /**
   * Performs the redeem code operation.
   */
  public redeemCode(): void {
    if (this.redemptionCode.trim()) {
      this.store.dispatch(
        GuestActions.redeemFeedbackCode({
          feedbackCode: this.redemptionCode.trim(),
        }),
      );
    }
  }
}
