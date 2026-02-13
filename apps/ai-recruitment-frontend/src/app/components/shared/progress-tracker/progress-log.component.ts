import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ProgressMessage } from './progress-tracker.types';

/**
 * Displays real-time message log for progress tracking.
 */
@Component({
  selector: 'arc-progress-log',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="message-log">
      <h4>实时日志</h4>
      <div class="log-container">
        <div
          class="log-entry"
          *ngFor="
            let message of displayMessages;
            trackBy: trackByMessage
          "
          [class]="message.type"
        >
          <span class="timestamp">{{
            formatTimestamp(message.timestamp)
          }}</span>
          <span class="message">{{ message.message }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .message-log {
        margin-top: 1.5rem;
        border-top: 1px solid #e5e7eb;
        padding-top: 1rem;
      }

      .message-log h4 {
        margin: 0 0 0.75rem 0;
        font-size: 1rem;
        font-weight: 600;
        color: #111827;
      }

      .log-container {
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 0.75rem;
        background: #f9fafb;
      }

      .log-entry {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
      }

      .log-entry:last-child {
        margin-bottom: 0;
      }

      .timestamp {
        color: #6b7280;
        font-family: monospace;
        flex-shrink: 0;
      }

      .message {
        color: #111827;
      }

      .log-entry.error .message {
        color: #dc2626;
      }

      .log-entry.progress .message {
        color: #059669;
      }

      @media (max-width: 768px) {
        .log-container {
          max-height: 150px;
        }
      }
    `,
  ],
})
export class ProgressLogComponent {
  @Input() public messages: ProgressMessage[] = [];
  @Input() public maxMessages = 20;

  public get displayMessages(): ProgressMessage[] {
    return this.messages.slice(-this.maxMessages);
  }

  /**
   * Performs format timestamp operation.
   * @param timestamp - The timestamp.
   * @returns The string value.
   */
  public formatTimestamp(timestamp: Date): string {
    return timestamp.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  /**
   * Performs track by message operation.
   * @param index - The index.
   * @param message - The message.
   * @returns The string value.
   */
  public trackByMessage(index: number, message: ProgressMessage): string {
    return `${message.timestamp.getTime()}_${index}`;
  }
}
