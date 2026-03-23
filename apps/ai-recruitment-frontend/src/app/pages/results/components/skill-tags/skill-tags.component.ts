import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getSkillTagStyle } from '../utils/results.utils';
import type { SkillTagStyle } from '../../../../interfaces/detailed-analysis.interface';

@Component({
  selector: 'arc-skill-tags',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="skill-tags">
      <span
        *ngFor="let skill of skills"
        class="skill-tag"
        [ngStyle]="getTagStyle(skill)"
      >
        {{ skill }}
      </span>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .skill-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      .skill-tag {
        padding: 0.375rem 0.75rem;
        border-radius: 20px;
        font-size: 0.875rem;
        font-weight: 500;
        transition:
          transform 0.2s,
          box-shadow 0.2s;
      }
      .skill-tag:hover {
        transform: translateY(-2px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }
    `,
  ],
})
export class SkillTagsComponent {
  @Input() skills: string[] = [];

  getTagStyle(skill: string): SkillTagStyle {
    return getSkillTagStyle(skill);
  }
}
