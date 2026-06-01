import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkillTagsComponent } from '../skill-tags/skill-tags.component';
import type { RadarChartData } from '../../../../interfaces/detailed-analysis.interface';

@Component({
  selector: 'arc-skills-analysis',
  standalone: true,
  imports: [CommonModule, SkillTagsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="skills-card card">
      <div class="card-header">
        <h2>🎯 技能分析</h2>
        <button (click)="onToggleExpand()" class="expand-btn">
          {{ isExpanded ? '收起' : '展开' }}
        </button>
      </div>

      <div class="skills-content">
        <arc-skill-tags [skills]="skills"></arc-skill-tags>

        <div class="skill-match" *ngIf="overallMatch !== null">
          <p>技能匹配度: {{ overallMatch }}%</p>
        </div>

        <div class="skills-heatmap" *ngIf="radarData.length > 0">
          <div class="heatmap-item" *ngFor="let item of radarData">
            <span class="skill-name">{{ item.skill }}</span>
            <div class="skill-bar">
              <div class="skill-fill" [style.width.%]="item.value"></div>
            </div>
            <span class="skill-value">{{ item.value }}%</span>
          </div>
        </div>

        <div class="skills-detailed" *ngIf="isExpanded">
          <p>详细的技能分析内容... (扩展视图)</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .skills-card {
        background: white;
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }
      .card-header h2 {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0;
      }
      .expand-btn {
        padding: 0.5rem 1rem;
        border: 1px solid #e5e7eb;
        background: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.875rem;
        transition: all 0.2s;
      }
      .expand-btn:hover {
        background: #f3f4f6;
      }
      .skills-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .skill-match {
        text-align: center;
        padding: 0.75rem;
        background: rgba(59, 130, 246, 0.1);
        border-radius: 8px;
        font-weight: 500;
        color: #1d4ed8;
      }
      .skills-heatmap {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .heatmap-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .skill-name {
        width: 80px;
        font-size: 0.875rem;
        color: #4b5563;
        flex-shrink: 0;
      }
      .skill-bar {
        flex: 1;
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        overflow: hidden;
      }
      .skill-fill {
        height: 100%;
        background: linear-gradient(90deg, #3b82f6, #1d4ed8);
        border-radius: 4px;
        transition: width 0.3s ease;
      }
      .skill-value {
        width: 40px;
        text-align: right;
        font-size: 0.875rem;
        font-weight: 500;
        color: #1f2937;
      }
      .skills-detailed {
        padding: 1rem;
        background: #f9fafb;
        border-radius: 8px;
        border-left: 4px solid #3b82f6;
      }
    `,
  ],
})
export class SkillsAnalysisComponent {
  @Input() skills: string[] = [];
  @Input() radarData: RadarChartData[] = [];
  @Input() overallMatch: number | null = null;
  @Input() isExpanded = false;

  @Output() toggleExpand = new EventEmitter<void>();

  onToggleExpand(): void {
    this.toggleExpand.emit();
  }
}
