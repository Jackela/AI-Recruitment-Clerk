import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { StoreRouterConnectingModule, routerReducer } from '@ngrx/router-store';
import { provideBrowserGlobalErrorListeners } from '@angular/core';

import { App } from './app/app';
import { appRoutes } from './app/app.routes';

// Reducers
import { jobReducer } from './app/store/jobs/job.reducer';
import { resumeReducer } from './app/store/resumes/resume.reducer';
import { reportReducer } from './app/store/reports/report.reducer';

// Effects
import { JobEffects } from './app/store/jobs/job.effects';
import { ResumeEffects } from './app/store/resumes/resume.effects';
import { ReportEffects } from './app/store/reports/report.effects';

bootstrapApplication(App, {
  providers: [
    provideBrowserGlobalErrorListeners(),
    importProvidersFrom(
      HttpClientModule,
      ReactiveFormsModule,
      RouterModule.forRoot(appRoutes),
      StoreModule.forRoot({
        jobs: jobReducer,
        resumes: resumeReducer,
        reports: reportReducer,
        router: routerReducer
      }),
      EffectsModule.forRoot([
        JobEffects,
        ResumeEffects,
        ReportEffects
      ]),
      StoreRouterConnectingModule.forRoot(),
      StoreDevtoolsModule.instrument({
        maxAge: 25,
        logOnly: false,
      })
    )
  ]
}).catch((err) => console.error(err));
