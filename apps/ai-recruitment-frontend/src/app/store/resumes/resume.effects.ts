import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, mergeMap, switchMap } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import * as ResumeActions from './resume.actions';

/**
 * Represents the resume effects.
 */
@Injectable()
export class ResumeEffects {
  loadResumesByJob$;
  loadResume$;
  uploadResumes$;
  uploadResumesSuccess$;

  /**
   * Initializes a new instance of the Resume Effects.
   * @param actions$ - The actions$.
   * @param apiService - The api service.
   */
  constructor(
    private actions$: Actions,
    private apiService: ApiService,
  ) {
    this.loadResumesByJob$ = createEffect(() =>
      this.actions$.pipe(
        ofType(ResumeActions.loadResumesByJob),
        mergeMap(({ jobId }) =>
          this.apiService.getResumesByJobId(jobId).pipe(
            map((resumes) =>
              ResumeActions.loadResumesByJobSuccess({ resumes }),
            ),
            catchError((error) =>
              of(
                ResumeActions.loadResumesByJobFailure({
                  error: error.message || 'Failed to load resumes',
                }),
              ),
            ),
          ),
        ),
      ),
    );

    this.loadResume$ = createEffect(() =>
      this.actions$.pipe(
        ofType(ResumeActions.loadResume),
        mergeMap(({ resumeId }) =>
          this.apiService.getResumeById(resumeId).pipe(
            map((resume) => ResumeActions.loadResumeSuccess({ resume })),
            catchError((error) =>
              of(
                ResumeActions.loadResumeFailure({
                  error: error.message || 'Failed to load resume',
                }),
              ),
            ),
          ),
        ),
      ),
    );

    this.uploadResumes$ = createEffect(() =>
      this.actions$.pipe(
        ofType(ResumeActions.uploadResumes),
        switchMap(({ jobId, files }) => {
          return this.apiService.uploadResumes(jobId, files).pipe(
            map((response) => ResumeActions.uploadResumesSuccess({ response })),
            catchError((error) =>
              of(
                ResumeActions.uploadResumesFailure({
                  error: error.message || 'Failed to upload resumes',
                }),
              ),
            ),
          );
        }),
      ),
    );

    this.uploadResumesSuccess$ = createEffect(() =>
      this.actions$.pipe(
        ofType(ResumeActions.uploadResumesSuccess),
        // Reload resumes after successful upload
        map(({ response }) =>
          ResumeActions.loadResumesByJob({ jobId: response.jobId }),
        ),
      ),
    );
  }
}
