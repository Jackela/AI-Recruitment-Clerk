import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ExperienceDetail } from '../../../../interfaces/detailed-analysis.interface';

@Component({
  selector: 'arc-experience-timeline',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="experience-card card">
      <h2>💼 经验分析</h2>
      <div class="experience-content">
        <div class="experience-timeline" *ngIf="experiences.length > 0">
          <div
            class="timeline-item"
            *ngFor="let exp of experiences; let last = last"
            [class.last]="last"
          >
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <h4>{{ exp.position }}</h4>
              <p class="company">{{ exp.company }}</p>
              <p class="duration">{{ exp.duration }}</p>
              <p class="description" *ngIf="exp.description">
                {{ exp.description }}
              </p>
            </div>
          </div>
        </div>

        <div class="position-match" *ngIf="experienceYears !== null">
          <p>工作经验年限: {{ experienceYears }}年</p>
          <p *ngIf="matchLevel">职位匹配度: {{ matchLevel }}</p>
        </div>

        <div class="no-experience" *ngIf="experiences.length === 0">
          <p>暂无工作经验数据</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .experience-card {
        background: white;
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      .experience-card h2 {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 1rem;
      }
      .experience-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .experience-timeline {
        position: relative;
      }
      .timeline-item {
        display: flex;
        gap: 1rem;
        padding-bottom: 1.5rem;
        position: relative;
      }
      .timeline-item:last-child {
        padding-bottom: 0;
      }
      .timeline-item:not(.last)::before {
        content: '';
        position: absolute;
        left: 7px;
        top: 16px;
        bottom: 0;
        width: 2px;
        background: #e5e7eb;
      }
      .timeline-marker {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #3b82f6;
        border: 3px solid white;
        box-shadow: 0 0 0 2px #3b82f6;
        flex-shrink: 0;
        margin-top: 2px;
      }
      .timeline-content {
        flex: 1;
      }
      .timeline-content h4 {
        font-size: 1rem;
        font-weight: 600;
        margin: 0 0 0.25rem 0;
      }
      .company {
        color: #6b7280;
        margin: 0 0 0.25rem 0;
        font-weight: 500;
      }
      .duration {
        color: #9ca3af;
        font-size: 0.875rem;
        margin: 0 0 0.5rem 0;
      }
      .description {
        color: #4b5563;
        font-size: 0.875rem;
        line-height: 1.5;
        margin: 0;
      }
      .position-match {
        padding: 1rem;
        background: rgba(16, 185, 129, 0.1);
        border-radius: 8px;
        text-align: center;
      }
      .position-match p {
        margin: 0.25rem 0;
        color: #059669;
        font-weight: 500;
      }
      .no-experience {
        text-align: center;
        padding: 2rem;
        color: #9ca3af;
      }
    `,
  ],
})
export class ExperienceTimelineComponent {
  @Input() experiences: ExperienceDetail[] = [];
  @Input() experienceYears: number | null = null;
  @Input() matchLevel: string | null = null;
}
