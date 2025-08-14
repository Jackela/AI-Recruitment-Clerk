import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { GuestApiService } from '../../services/guest/guest-api.service';

@Component({
  selector: 'arc-upload-resume',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="container">
    <h2>Upload Resume (Guest)</h2>
    <form (submit)="onSubmit($event)">
      <div class="row">
        <label>
          Candidate Name
          <input [(ngModel)]="candidateName" name="candidateName" placeholder="Optional" />
        </label>
        <label>
          Candidate Email
          <input [(ngModel)]="candidateEmail" name="candidateEmail" placeholder="Optional" />
        </label>
      </div>
      <label>
        Notes
        <textarea [(ngModel)]="notes" name="notes" rows="2" placeholder="Optional"></textarea>
      </label>
      <input type="file" (change)="onFileChange($event)" accept=".pdf,.doc,.docx" />
      <div class="actions">
        <button type="submit">Upload & Analyze</button>
        <button type="button" (click)="getDemo()">Get Demo Analysis</button>
      </div>
    </form>

    <div class="status" *ngIf="analysisId()">analysisId: {{ analysisId() }}</div>
    <div class="actions" *ngIf="analysisId()">
      <button (click)="poll()">Check Result</button>
    </div>
    <pre class="output">{{ output() }}</pre>
  </div>
  `,
  styles: [`
    .container{max-width:900px;margin:24px auto;padding:0 12px;font-family:system-ui,-apple-system,Segoe UI,Roboto}
    .row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:8px 0}
    input,textarea{width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:8px}
    .actions{margin:12px 0;display:flex;gap:8px}
    button{background:#111;color:#fff;border:none;padding:8px 12px;border-radius:8px;cursor:pointer}
    .output{background:#0b1020;color:#c7d2fe;border-radius:8px;padding:10px;min-height:120px}
  `]
})
export class UploadResumeComponent {
  file?: File;
  candidateName = '';
  candidateEmail = '';
  notes = '';

  analysisId = signal('');
  output = signal('Ready.');

  constructor(private readonly guestApi: GuestApiService) {}

  onFileChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    this.file = input.files?.[0] || undefined;
  }

  async onSubmit(ev: Event) {
    ev.preventDefault();
    if (!this.file) { this.output.set('Please choose a resume file.'); return; }
    this.output.set('Uploading...');
    this.guestApi.analyzeResume(this.file, this.candidateName, this.candidateEmail, this.notes)
      .subscribe({
        next: (res) => {
          this.analysisId.set(res?.data?.analysisId || '');
          this.output.set(JSON.stringify(res, null, 2));
        },
        error: (err: HttpErrorResponse) => {
          this.output.set(JSON.stringify(err.error || { message: err.message }, null, 2));
        }
      });
  }

  getDemo() {
    this.output.set('Fetching demo...');
    this.guestApi.getDemoAnalysis().subscribe({
      next: (res) => this.output.set(JSON.stringify(res, null, 2)),
      error: (err: HttpErrorResponse) => this.output.set(JSON.stringify(err.error || { message: err.message }, null, 2))
    });
  }

  poll() {
    const id = this.analysisId();
    if (!id) { this.output.set('Missing analysisId'); return; }
    this.output.set('Polling...');
    this.guestApi.getAnalysisResults(id).subscribe({
      next: (res) => this.output.set(JSON.stringify(res, null, 2)),
      error: (err: HttpErrorResponse) => this.output.set(JSON.stringify(err.error || { message: err.message }, null, 2))
    });
  }
}


