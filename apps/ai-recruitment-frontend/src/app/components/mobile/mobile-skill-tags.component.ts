import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Skill tags display component.
 * Displays a list of skill tags with overflow indicator.
 * Pure display component using @Input for skills array.
 */
@Component({
  selector: 'arc-mobile-skill-tags',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skills-container" *ngIf="skills.length > 0">
      <span *ngFor="let skill of visibleSkills" class="skill-tag">
        {{ skill }}
      </span>
      <span *ngIf="hasMoreSkills" class="skill-more">
        +{{ remainingCount }}
      </span>
    </div>
  `,
  styles: [
    `
      .skills-container {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-bottom: 8px;
        padding-left: 60px;

        .skill-tag {
          padding: 2px 6px;
          background: #f1f3f4;
          color: #495057;
          font-size: 10px;
          font-weight: 500;
          border-radius: 4px;
        }

        .skill-more {
          padding: 2px 6px;
          background: #e9ecef;
          color: #6c757d;
          font-size: 10px;
          font-weight: 500;
          border-radius: 4px;
        }
      }
    `,
  ],
})
export class MobileSkillTagsComponent {
  @Input() public skills: string[] = [];
  @Input() public maxVisible = 3;

  public get visibleSkills(): string[] {
    return this.skills.slice(0, this.maxVisible);
  }

  public get hasMoreSkills(): boolean {
    return this.skills.length > this.maxVisible;
  }

  public get remainingCount(): number {
    return this.skills.length - this.maxVisible;
  }
}
