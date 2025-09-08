import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="loading-container"
      [class.inline]="inline"
      [class.overlay]="overlay"
    >
      <div
        class="loading-spinner"
        [class.sm]="size === 'sm'"
        [class.lg]="size === 'lg'"
      >
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <p *ngIf="message" class="loading-message">{{ message }}</p>
    </div>
  `,
  styles: [
    `
      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;

        &.inline {
          padding: 0.5rem;
          flex-direction: row;
          gap: 0.5rem;
        }

        &.overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 1000;
        }
      }

      .loading-spinner {
        display: inline-block;
        position: relative;
        width: 40px;
        height: 40px;

        &.sm {
          width: 20px;
          height: 20px;
        }

        &.lg {
          width: 60px;
          height: 60px;
        }
      }

      .spinner-ring {
        box-sizing: border-box;
        display: block;
        position: absolute;
        width: 32px;
        height: 32px;
        margin: 4px;
        border: 3px solid #3498db;
        border-radius: 50%;
        animation: loading-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        border-color: #3498db transparent transparent transparent;

        .sm & {
          width: 16px;
          height: 16px;
          margin: 2px;
          border-width: 2px;
        }

        .lg & {
          width: 48px;
          height: 48px;
          margin: 6px;
          border-width: 4px;
        }
      }

      .spinner-ring:nth-child(1) {
        animation-delay: -0.45s;
      }

      .spinner-ring:nth-child(2) {
        animation-delay: -0.3s;
      }

      .spinner-ring:nth-child(3) {
        animation-delay: -0.15s;
      }

      @keyframes loading-ring {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      .loading-message {
        margin-top: 1rem;
        color: #7f8c8d;
        font-size: 0.9rem;

        .inline & {
          margin-top: 0;
          margin-left: 0.5rem;
        }
      }
    `,
  ],
})
export class LoadingComponent {
  @Input() message = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() inline = false;
  @Input() overlay = false;
}
