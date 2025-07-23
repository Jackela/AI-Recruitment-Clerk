import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, mergeMap, tap } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import * as JobActions from './job.actions';
import { Router } from '@angular/router';

@Injectable()
export class JobEffects {
  loadJobs$;
  loadJob$; 
  createJob$;
  createJobSuccess$;

  constructor(
    private actions$: Actions,
    private apiService: ApiService,
    private router: Router
  ) {
    this.loadJobs$ = createEffect(() =>
      this.actions$.pipe(
        ofType(JobActions.loadJobs),
        mergeMap(() =>
          this.apiService.getAllJobs().pipe(
            map((jobs) => JobActions.loadJobsSuccess({ jobs })),
            catchError((error) =>
              of(JobActions.loadJobsFailure({ error: error.message || 'Failed to load jobs' }))
            )
          )
        )
      )
    );

    this.loadJob$ = createEffect(() =>
      this.actions$.pipe(
        ofType(JobActions.loadJob),
        mergeMap(({ jobId }) =>
          this.apiService.getJobById(jobId).pipe(
            map((job) => JobActions.loadJobSuccess({ job })),
            catchError((error) =>
              of(JobActions.loadJobFailure({ error: error.message || 'Failed to load job' }))
            )
          )
        )
      )
    );

    this.createJob$ = createEffect(() =>
      this.actions$.pipe(
        ofType(JobActions.createJob),
        mergeMap(({ request }) =>
          this.apiService.createJob(request).pipe(
            map((response) => JobActions.createJobSuccess({ response })),
            catchError((error) =>
              of(JobActions.createJobFailure({ error: error.message || 'Failed to create job' }))
            )
          )
        )
      )
    );

    this.createJobSuccess$ = createEffect(() =>
      this.actions$.pipe(
        ofType(JobActions.createJobSuccess),
        tap(({ response }) => {
          // Navigate to job details page after successful creation
          this.router.navigate(['/jobs', response.jobId]);
        }),
        // Reload jobs list after creation
        map(() => JobActions.loadJobs())
      )
    );
  }
}
