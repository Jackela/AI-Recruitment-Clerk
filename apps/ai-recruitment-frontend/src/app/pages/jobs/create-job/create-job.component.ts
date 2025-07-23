import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppState } from '../../../store/app.state';
import * as JobActions from '../../../store/jobs/job.actions';
import { Router } from '@angular/router';

@Component({
  selector: 'arc-create-job',
  standalone: false,
  templateUrl: './create-job.component.html',
  styleUrl: './create-job.component.scss'
})
export class CreateJobComponent implements OnInit, OnDestroy {
  createJobForm: FormGroup;
  creating$: Observable<boolean>;
  error$: Observable<string | null>;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store<AppState>,
    private router: Router
  ) {
    this.createJobForm = this.fb.group({
      jobTitle: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      jdText: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]]
    });

    this.creating$ = this.store.select(state => state.jobs.creating);
    this.error$ = this.store.select(state => state.jobs.error);
  }

  ngOnInit(): void {
    // Clear any previous errors
    this.store.dispatch(JobActions.clearJobError());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.createJobForm.valid) {
      const formValue = this.createJobForm.value;
      this.store.dispatch(JobActions.createJob({
        request: {
          jobTitle: formValue.jobTitle,
          jdText: formValue.jdText
        }
      }));
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.router.navigate(['/jobs']);
  }

  onClearError(): void {
    this.store.dispatch(JobActions.clearJobError());
  }

  // Getter methods for easy access to form controls in template
  get jobTitle() {
    return this.createJobForm.get('jobTitle');
  }

  get jdText() {
    return this.createJobForm.get('jdText');
  }

  private markFormGroupTouched(): void {
    Object.keys(this.createJobForm.controls).forEach(key => {
      this.createJobForm.get(key)?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string | null {
    const control = this.createJobForm.get(fieldName);
    if (control && control.errors && control.touched) {
      if (control.errors['required']) {
        return '该字段不能为空';
      }
      if (control.errors['minlength']) {
        return `最少输入${control.errors['minlength'].requiredLength}个字符`;
      }
      if (control.errors['maxlength']) {
        return `最多输入${control.errors['maxlength'].requiredLength}个字符`;
      }
    }
    return null;
  }
}
