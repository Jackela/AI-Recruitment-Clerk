import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { EducationDetails } from '../../../../interfaces/detailed-analysis.interface';

@Component({
  selector: 'arc-education-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="education-card card">
      <h2>🎓 教育背景</h2>
      <div class="education-content" *ngIf="education">
        <div class="education-level">
          <h4 *ngIf="education.degree">{{ education.degree }}学位</h4>
          <p class="major" *ngIf="education.major">{{ education.major }}</p>
          <p class="university" *ngIf="education.university">
            {{ education.university }}
          </p>
          <p class="graduation" *ngIf="education.graduationYear">
            {{ education.graduationYear }}年毕业
          </p>
        </div>
        <div class="major-match" *ngIf="matchLevel">
          <p>专业匹配度: {{ matchLevel }}</p>
        </div>
      </div>
      <div class="no-education" *ngIf="!education">
        <p>暂无教育背景数据</p>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .education-card {
        background: white;
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      .education-card h2 {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 1rem;
      }
      .education-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .education-level {
        text-align: center;
      }
      .education-level h4 {
        font-size: 1.125rem;
        font-weight: 600;
        margin: 0 0 0.5rem 0;
        color: #1f2937;
      }
      .major {
        font-size: 1rem;
        color: #4b5563;
        margin: 0 0 0.25rem 0;
        font-weight: 500;
      }
      .university {
        color: #6b7280;
        margin: 0 0 0.25rem 0;
      }
      .graduation {
        color: #9ca3af;
        font-size: 0.875rem;
        margin: 0;
      }
      .major-match {
        padding: 0.75rem;
        background: rgba(139, 92, 246, 0.1);
        border-radius: 8px;
        text-align: center;
      }
      .major-match p {
        margin: 0;
        color: #7c3aed;
        font-weight: 500;
      }
      .no-education {
        text-align: center;
        padding: 2rem;
        color: #9ca3af;
      }
    `,
  ],
})
export class EducationCardComponent {
  @Input() education: EducationDetails | null = null;
  @Input() matchLevel: string | null = null;
}
