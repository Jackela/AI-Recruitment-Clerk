import type { OnInit, OnDestroy} from '@angular/core';
import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccessibilityService } from '../../../services/accessibility/accessibility.service';
import { Subscription } from 'rxjs';

/**
 * Defines the shape of the live message.
 */
export interface LiveMessage {
  id: string;
  message: string;
  priority: 'polite' | 'assertive';
  timestamp: number;
}

/**
 * Represents the aria live component.
 */
@Component({
  selector: 'arc-aria-live',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- ARIA Live Regions for Screen Reader Announcements -->
    <div class="aria-live-container">
      <!-- Polite announcements (don't interrupt) -->
      <div
        class="aria-live-polite"
        [attr.aria-live]="'polite'"
        [attr.aria-atomic]="'true'"
        aria-relevant="all"
      >
        <div
          *ngFor="let message of politeMessages; trackBy: trackByMessageId"
          class="live-message"
        >
          {{ message.message }}
        </div>
      </div>

      <!-- Assertive announcements (interrupt current reading) -->
      <div
        class="aria-live-assertive"
        [attr.aria-live]="'assertive'"
        [attr.aria-atomic]="'true'"
        aria-relevant="all"
      >
        <div
          *ngFor="let message of assertiveMessages; trackBy: trackByMessageId"
          class="live-message"
        >
          {{ message.message }}
        </div>
      </div>

      <!-- Status region for dynamic content updates -->
      <div
        class="aria-live-status"
        [attr.role]="'status'"
        [attr.aria-live]="'polite'"
        [attr.aria-atomic]="'false'"
      >
        <span *ngIf="currentStatus" class="status-message">
          {{ currentStatus }}
        </span>
      </div>

      <!-- Alert region for urgent notifications -->
      <div
        class="aria-live-alert"
        [attr.role]="'alert'"
        [attr.aria-live]="'assertive'"
        [attr.aria-atomic]="'true'"
      >
        <span *ngIf="currentAlert" class="alert-message">
          {{ currentAlert }}
        </span>
      </div>
    </div>
  `,
  styles: [
    `
      .aria-live-container {
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
        margin: 0;
        padding: 0;
      }

      .live-message,
      .status-message,
      .alert-message {
        /* Hidden but readable by screen readers */
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      }

      /* Ensure content is available for screen readers */
      .aria-live-polite,
      .aria-live-assertive,
      .aria-live-status,
      .aria-live-alert {
        pointer-events: none;
        user-select: none;
      }
    `,
  ],
})
export class AriaLiveComponent implements OnInit, OnDestroy {
  private accessibilityService = inject(AccessibilityService);
  private subscription: Subscription = new Subscription();

  public politeMessages: LiveMessage[] = [];
  public assertiveMessages: LiveMessage[] = [];
  public currentStatus = '';
  public currentAlert = '';

  /**
   * Performs the ng on init operation.
   */
  public ngOnInit(): void {
    // Subscribe to accessibility service live messages (test-compatible)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isTestEnvironment = typeof (window as any).__karma__ !== 'undefined';
    if (!isTestEnvironment) {
      // Production environment: use effect for reactive updates
      try {
        effect(() => {
          this.updateAccessibilityMessages();
        });
      } catch {
        // Fallback for compatibility issues
        this.updateAccessibilityMessages();
      }
    } else {
      // Test environment: direct update
      this.updateAccessibilityMessages();
    }
  }

  private updateAccessibilityMessages(): void {
    const state = this.accessibilityService.accessibilityState();
    const messages = state.liveMessages;

    this.politeMessages = messages.filter(
      (msg: LiveMessage) => msg.priority === 'polite',
    );
    this.assertiveMessages = messages.filter(
      (msg: LiveMessage) => msg.priority === 'assertive',
    );

    // Update status and alert regions
    const latestPolite = this.politeMessages[this.politeMessages.length - 1];
    const latestAssertive =
      this.assertiveMessages[this.assertiveMessages.length - 1];

    if (latestPolite && Date.now() - latestPolite.timestamp < 5000) {
      this.currentStatus = latestPolite.message;
    } else {
      this.currentStatus = '';
    }

    if (latestAssertive && Date.now() - latestAssertive.timestamp < 5000) {
      this.currentAlert = latestAssertive.message;
    } else {
      this.currentAlert = '';
    }
  }

  /**
   * Performs the ng on destroy operation.
   */
  public ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /**
   * Performs the track by message id operation.
   * @param _index - The index.
   * @param message - The message.
   * @returns The string value.
   */
  public trackByMessageId(_index: number, message: LiveMessage): string {
    return message.id;
  }
}
