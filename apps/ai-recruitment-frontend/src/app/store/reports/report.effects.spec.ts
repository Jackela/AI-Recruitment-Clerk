import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';
import { Action } from '@ngrx/store';
import { ReportEffects } from './report.effects';
import { ApiService } from '../../services/api.service';
import * as ReportActions from './report.actions';
import { AnalysisReport, ReportsList, ReportListItem } from './report.model';

describe('ReportEffects', () => {
  let actions$: Observable<Action>;
  let effects: ReportEffects;
  let apiService: jest.Mocked<ApiService>;

  const mockReportListItems: ReportListItem[] = [
    {
      id: 'report1',
      jobId: 'job1',
      jobTitle: '软件工程师',
      status: 'completed',
      createdAt: new Date('2024-01-01'),
      resumeCount: 5,
    },
  ];

  const mockReportsList: ReportsList = {
    jobId: 'job1',
    reports: mockReportListItems,
  };

  const mockReport: AnalysisReport = {
    id: 'report1',
    jobId: 'job1',
    jobTitle: '软件工程师',
    status: 'completed',
    createdAt: new Date('2024-01-01'),
    resumeCount: 5,
    analysisData: {
      totalCandidates: 5,
      averageScore: 85,
      topCandidates: [],
    },
  };

  beforeEach(() => {
    const apiServiceSpy = {
      getReportsByJobId: jest.fn(),
      getReportById: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ReportEffects,
        provideMockActions(() => actions$),
        { provide: ApiService, useValue: apiServiceSpy },
      ],
    });

    effects = TestBed.inject(ReportEffects);
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
  });

  describe('loadReportsByJob$', () => {
    it('should return loadReportsByJobSuccess action on successful API call', (done) => {
      apiService.getReportsByJobId.mockReturnValue(of(mockReportsList));

      actions$ = of(ReportActions.loadReportsByJob({ jobId: 'job1' }));

      effects.loadReportsByJob$.subscribe((action) => {
        expect(action).toEqual(
          ReportActions.loadReportsByJobSuccess({
            reportsList: mockReportsList,
          }),
        );
        expect(apiService.getReportsByJobId).toHaveBeenCalledWith('job1');
        done();
      });
    });

    it('should return loadReportsByJobFailure action on API error', (done) => {
      const error = new Error('Network error');
      apiService.getReportsByJobId.mockReturnValue(throwError(() => error));

      actions$ = of(ReportActions.loadReportsByJob({ jobId: 'job1' }));

      effects.loadReportsByJob$.subscribe((action) => {
        expect(action).toEqual(
          ReportActions.loadReportsByJobFailure({
            error: 'Network error',
          }),
        );
        done();
      });
    });

    it('should handle API error with custom message', (done) => {
      const error = { message: 'Custom error message' };
      apiService.getReportsByJobId.mockReturnValue(throwError(() => error));

      actions$ = of(ReportActions.loadReportsByJob({ jobId: 'job1' }));

      effects.loadReportsByJob$.subscribe((action) => {
        expect(action).toEqual(
          ReportActions.loadReportsByJobFailure({
            error: 'Custom error message',
          }),
        );
        done();
      });
    });
  });

  describe('loadReport$', () => {
    it('should return loadReportSuccess action on successful API call', (done) => {
      apiService.getReportById.mockReturnValue(of(mockReport));

      actions$ = of(ReportActions.loadReport({ reportId: 'report1' }));

      effects.loadReport$.subscribe((action) => {
        expect(action).toEqual(
          ReportActions.loadReportSuccess({ report: mockReport }),
        );
        expect(apiService.getReportById).toHaveBeenCalledWith('report1');
        done();
      });
    });

    it('should return loadReportFailure action on API error', (done) => {
      const error = new Error('Report not found');
      apiService.getReportById.mockReturnValue(throwError(() => error));

      actions$ = of(ReportActions.loadReport({ reportId: 'nonexistent' }));

      effects.loadReport$.subscribe((action) => {
        expect(action).toEqual(
          ReportActions.loadReportFailure({
            error: 'Report not found',
          }),
        );
        done();
      });
    });
  });

  describe('Effect Integration', () => {
    it('should chain loadReportsByJob and loadReportsByJobSuccess effects', (done) => {
      apiService.getReportsByJobId.mockReturnValue(of(mockReportsList));

      actions$ = of(ReportActions.loadReportsByJob({ jobId: 'job1' }));

      effects.loadReportsByJob$.subscribe((successAction) => {
        expect(successAction.type).toBe('[Report] Load Reports By Job Success');
        expect(apiService.getReportsByJobId).toHaveBeenCalled();
        done();
      });
    });
  });
});
