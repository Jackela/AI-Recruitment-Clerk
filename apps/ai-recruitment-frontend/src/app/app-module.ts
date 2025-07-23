import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { StoreRouterConnectingModule, routerReducer } from '@ngrx/router-store';

import { App } from './app';
import { appRoutes } from './app.routes';
import { NxWelcome } from './nx-welcome';

// Reducers
import { jobReducer } from './store/jobs/job.reducer';
import { resumeReducer } from './store/resumes/resume.reducer';
import { reportReducer } from './store/reports/report.reducer';

// Effects - now fixed and restored
import { JobEffects } from './store/jobs/job.effects';
import { ResumeEffects } from './store/resumes/resume.effects';
import { ReportEffects } from './store/reports/report.effects';

@NgModule({
  declarations: [App, NxWelcome],
  imports: [
    BrowserModule,
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
      maxAge: 25, // Retains last 25 states
      logOnly: false, // Restrict extension to log-only mode
    })
  ],
  providers: [provideBrowserGlobalErrorListeners()],
  bootstrap: [App],
})
export class AppModule {}
