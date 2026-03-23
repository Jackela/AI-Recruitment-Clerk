/**
 * Analysis Step Upload Component
 * Wrapper for file upload step
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type {
  FileUploadData} from '../resume-file-upload.component';
import {
  ResumeFileUploadComponent
} from '../resume-file-upload.component';

@Component({
  selector: 'arc-analysis-step-upload',
  standalone: true,
  imports: [CommonModule, ResumeFileUploadComponent],
  template: `
    <arc-resume-file-upload
      [isSubmitting]="isSubmitting"
      (fileSubmitted)="onFileSubmitted($event)"
      (demoRequested)="onDemoRequested()"
      (fileValidationError)="onFileValidationError($event)"
    >
    </arc-resume-file-upload>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisStepUploadComponent {
  @Input() public isSubmitting = false;

  @Output() public fileSubmitted = new EventEmitter<FileUploadData>();
  @Output() public demoRequested = new EventEmitter<void>();
  @Output() public fileValidationError = new EventEmitter<string>();

  public onFileSubmitted(data: FileUploadData): void {
    this.fileSubmitted.emit(data);
  }

  public onDemoRequested(): void {
    this.demoRequested.emit();
  }

  public onFileValidationError(error: string): void {
    this.fileValidationError.emit(error);
  }
}
