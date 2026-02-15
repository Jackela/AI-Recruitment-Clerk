import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Represents a skill with its count.
 */
export interface SkillItem {
  /** Name of the skill */
  skill: string;
  /** Number of occurrences */
  count: number;
}

/**
 * Analytics skills list component.
 * Displays top skills with their occurrence counts.
 */
@Component({
  selector: 'arc-analytics-skills-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="top-skills" *ngIf="skills().length > 0">
      <h4>Top Skills</h4>
      <div class="skills-list">
        <div class="skill-item" *ngFor="let skillItem of skills()">
          <span class="skill-name">{{ skillItem.skill }}</span>
          <span class="skill-count">{{ skillItem.count }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .top-skills {
        margin-top: var(--space-6);
      }

      .top-skills h4 {
        margin: 0 0 var(--space-3) 0;
        font-family: var(--font-family-fantasy-heading);
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-fantasy-large);
        color: var(--color-text-fantasy);
        opacity: 0.95;
      }

      .skills-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }

      .skill-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-2) var(--space-3);
        background: linear-gradient(
          135deg,
          var(--color-bg-secondary),
          rgba(255, 255, 255, 0.03)
        );
        border-radius: var(--radius-lg);
        border: 1px solid var(--color-border-secondary);
        transition: all var(--transition-base);

        &:hover {
          background: linear-gradient(
            135deg,
            var(--color-primary-25),
            var(--color-royal-25)
          );
          border-color: var(--color-primary-200);
          transform: translateX(2px);
        }
      }

      .skill-name {
        font-family: var(--font-family-body);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
      }

      .skill-count {
        background: linear-gradient(
          135deg,
          var(--color-primary-600),
          var(--color-royal-600)
        );
        color: white;
        padding: var(--space-0-5) var(--space-2);
        border-radius: var(--radius-full);
        font-family: var(--font-family-body);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
        box-shadow: var(--shadow-sm);
        border: 1px solid rgba(255, 255, 255, 0.2);
        min-width: 20px;
        text-align: center;
      }
    `,
  ],
})
export class AnalyticsSkillsListComponent {
  /** Array of skills to display */
  public readonly skills = input.required<SkillItem[]>();
}
