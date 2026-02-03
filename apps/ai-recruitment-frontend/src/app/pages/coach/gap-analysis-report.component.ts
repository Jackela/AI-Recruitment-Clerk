import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { GapAnalysisResult } from '../../interfaces/gap-analysis.interface';

/**
 * Represents the gap analysis report component.
 */
@Component({
  standalone: true,
  selector: 'arc-gap-analysis-report',
  imports: [CommonModule],
  template: `
    <div *ngIf="result; else empty">
      <h3>Diagnostic Report</h3>
      <div>
        <strong>Matched Skills ({{ result.matchedSkills.length }}):</strong>
        <span>{{ result.matchedSkills.join(', ') || 'None' }}</span>
      </div>
      <div style="margin-top: 8px;">
        <strong>Missing Skills ({{ result.missingSkills.length }}):</strong>
        <span>{{ result.missingSkills.join(', ') || 'None' }}</span>
      </div>
      <div *ngIf="result.suggestedSkills?.length" style="margin-top: 8px;">
        <strong>Suggested Skills:</strong>
        <span>{{ result.suggestedSkills?.join(', ') }}</span>
      </div>
    </div>
    <ng-template #empty>
      <p>No analysis yet. Submit a JD and resume to view gaps.</p>
    </ng-template>
  `,
})
export class GapAnalysisReportComponent {
  @Input() public result: GapAnalysisResult | null = null;
}
