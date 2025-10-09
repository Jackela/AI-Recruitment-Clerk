import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import {
  GapAnalysisRequest,
  GapAnalysisResult,
} from '../../interfaces/gap-analysis.interface';
import { GapAnalysisReportComponent } from './gap-analysis-report.component';
import { LoggerService } from '../../services/shared/logger.service';

/**
 * Represents the coach component.
 */
@Component({
  standalone: true,
  selector: 'arc-coach',
  imports: [CommonModule, ReactiveFormsModule, GapAnalysisReportComponent],
  styles: [
    `
    .coach-container { max-width: 880px; margin: 0 auto; padding: 16px; }
    textarea { width: 100%; min-height: 140px; }
    .actions { margin-top: 12px; display: flex; gap: 8px; align-items: center; }
    .section { margin-top: 16px; }
    `,
  ],
  template: `
    <div class="coach-container">
      <h2>Coach: Quick Gap Analysis</h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="section">
          <label for="jd">Paste Job Description</label>
          <textarea id="jd" formControlName="jdText" placeholder="Paste the JD text here..."></textarea>
        </div>

        <div class="section">
          <label for="resume">Upload Resume (.pdf or .txt)</label>
          <input id="resume" type="file" (change)="onFileSelected($event)" accept=".pdf,.txt,.md,.text" />
        </div>

        <div class="actions">
          <button type="submit" [disabled]="loading || form.invalid">Analyze</button>
          <span *ngIf="loading">Analyzing...</span>
        </div>
      </form>

      <div class="section">
        <arc-gap-analysis-report [result]="result"></arc-gap-analysis-report>
      </div>
    </div>
  `,
})
export class CoachComponent {
  form: FormGroup;

  loading = false;
  result: GapAnalysisResult | null = null;
  private selectedFile: File | null = null;

  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private logger = inject(LoggerService).createLogger('CoachComponent');

  /**
   * Initializes a new instance of the Coach Component.
   */
  constructor() {
    this.form = this.fb.group({
      jdText: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  /**
   * Performs the on file selected operation.
   * @param evt - The evt.
   * @returns The result of the operation.
   */
  onFileSelected(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.selectedFile = file;
  }

  /**
   * Performs the on submit operation.
   * @returns The result of the operation.
   */
  onSubmit() {
    if (this.form.invalid) return;
    const jdText = this.form.value.jdText || '';
    const file = this.selectedFile;
    if (!file) return;
    this.logger.debug('Starting gap analysis API call');
    this.logger.debug('JD Text provided', { textLength: jdText.length });
    this.logger.debug('Resume file provided', { fileName: file.name, fileSize: file.size });
    this.loading = true;
    this.result = null;
    this.api.submitGapAnalysisWithFile(jdText, file).subscribe({
      next: (res) => {
        this.result = res;
        this.loading = false;
      },
      error: (error) => {
        this.logger.error('Gap analysis API call failed', error);
        this.logger.error('API error details', error?.error);
        // Surface error softly in UI by returning empty result
        this.result = { matchedSkills: [], missingSkills: [], suggestedSkills: [] };
        this.loading = false;
      },
    });
  }
}
