import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { App } from './app';
import { jobReducer } from './store/jobs/job.reducer';
import { resumeReducer } from './store/resumes/resume.reducer';
import { reportReducer } from './store/reports/report.reducer';
import { JobEffects } from './store/jobs/job.effects';
import { ResumeEffects } from './store/resumes/resume.effects';
import { ReportEffects } from './store/reports/report.effects';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        App,
        RouterTestingModule.withRoutes([]),
        HttpClientTestingModule,
        StoreModule.forRoot({
          jobs: jobReducer,
          resumes: resumeReducer,
          reports: reportReducer,
        }),
        EffectsModule.forRoot([JobEffects, ResumeEffects, ReportEffects]),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the application title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app-title')?.textContent).toContain(
      'AI 招聘助理',
    );
  });

  it('should have navigation links', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const navLinks = compiled.querySelectorAll('.nav-link');
    expect(navLinks.length).toBeGreaterThanOrEqual(2);
    // Check for actual navigation link text content (ignoring extra accessibility text)
    const firstNavText = navLinks[0].textContent
      ?.replace(/\s*-\s*Alt\+\d+\s*/, '')
      .trim();
    const secondNavText = navLinks[1].textContent
      ?.replace(/\s*-\s*Alt\+\d+\s*/, '')
      .trim();
    expect(firstNavText).toContain('仪表板');
    expect(secondNavText).toContain('智能分析'); // Updated to match actual content
  });

  it('should have router outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
