import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import * as ReportActions from './report.actions';

/**
 * Represents the report effects.
 */
@Injectable()
export class ReportEffects {
  loadReportsByJob$;
  loadReport$;

  private readonly actions$ = inject(Actions);
  private readonly apiService = inject(ApiService);

  constructor() {
    this.loadReportsByJob$ = createEffect(() =>
      this.actions$.pipe(
        ofType(ReportActions.loadReportsByJob),
        mergeMap(({ jobId }) =>
          this.apiService.getReportsByJobId(jobId).pipe(
            map((reportsList) =>
              ReportActions.loadReportsByJobSuccess({ reportsList }),
            ),
            catchError((error) =>
              of(
                ReportActions.loadReportsByJobFailure({
                  error: error.message || 'Failed to load reports',
                }),
              ),
            ),
          ),
        ),
      ),
    );

    this.loadReport$ = createEffect(() =>
      this.actions$.pipe(
        ofType(ReportActions.loadReport),
        mergeMap(({ reportId }) =>
          this.apiService.getReportById(reportId).pipe(
            map((report) => ReportActions.loadReportSuccess({ report })),
            catchError((error) =>
              of(
                ReportActions.loadReportFailure({
                  error: error.message || 'Failed to load report',
                }),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
