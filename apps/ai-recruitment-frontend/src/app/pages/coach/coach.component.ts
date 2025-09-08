import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import {
  GapAnalysisRequest,
  GapAnalysisResult,
} from '../../interfaces/gap-analysis.interface';
import { GapAnalysisReportComponent } from './gap-analysis-report.component';

@Component({
  standalone: true,
  selector: 'app-coach',
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
          <label for="resume">Upload Resume (.txt for MVP)</label>
          <input id="resume" type="file" (change)="onFileSelected($event)" accept=".txt,.md,.text" />
        </div>

        <div class="actions">
          <button type="submit" [disabled]="loading || form.invalid">Analyze</button>
          <span *ngIf="loading">Analyzing...</span>
        </div>
      </form>

      <div class="section">
        <app-gap-analysis-report [result]="result"></app-gap-analysis-report>
      </div>
    </div>
  `,
})
export class CoachComponent {
  form = this.fb.group({
    jdText: ['', [Validators.required, Validators.minLength(10)]],
  });

  loading = false;
  result: GapAnalysisResult | null = null;
  private resumeText: string = '';

  constructor(private fb: FormBuilder, private api: ApiService) {}

  onFileSelected(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.resumeText = String(reader.result || '');
    };
    reader.readAsText(file);
  }

  onSubmit() {
    if (this.form.invalid) return;
    const req: GapAnalysisRequest = {
      jdText: this.form.value.jdText || '',
      resumeText: this.resumeText || '',
    };
    this.loading = true;
    this.result = null;
    this.api.submitGapAnalysis(req).subscribe({
      next: (res) => {
        this.result = res;
        this.loading = false;
      },
      error: () => {
        // Fallback: minimal client-side diff if backend not reachable
        this.result = this.localFallback(req);
        this.loading = false;
      },
    });
  }

  private localFallback(req: GapAnalysisRequest): GapAnalysisResult {
    const jdTokens = this.tokenize(req.jdText);
    const resumeTokens = this.tokenize(req.resumeText);
    const matched = jdTokens.filter((s) => resumeTokens.includes(s));
    const missing = jdTokens.filter((s) => !resumeTokens.includes(s));
    return { matchedSkills: matched, missingSkills: missing, suggestedSkills: [] };
  }

  private tokenize(text: string): string[] {
    return Array.from(
      new Set(
        (text || '')
          .toLowerCase()
          .split(/[^a-z0-9+#\.\-]+/)
          .filter((t) => t && t.length > 1)
      ),
    );
  }
}

