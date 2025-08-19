import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom, isDevMode } from '@angular/core';
import { RouterModule, PreloadAllModules } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { StoreRouterConnectingModule, routerReducer } from '@ngrx/router-store';
import { provideBrowserGlobalErrorListeners } from '@angular/core';

import { App } from './app/app';
import { appRoutes } from './app/app.routes';
import { SmartPreloadingStrategy } from './app/services/smart-preloading.strategy';

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
    SmartPreloadingStrategy,
    importProvidersFrom(
      HttpClientModule,
      ReactiveFormsModule,
      RouterModule.forRoot(appRoutes, {
        preloadingStrategy: SmartPreloadingStrategy,
        enableTracing: false, // Disable in production
        scrollPositionRestoration: 'enabled',
        paramsInheritanceStrategy: 'emptyOnly',
        onSameUrlNavigation: 'reload',
        urlUpdateStrategy: 'deferred'
      }),
      StoreModule.forRoot({
        jobs: jobReducer,
        resumes: resumeReducer,
        reports: reportReducer,
        router: routerReducer
      }, {
        runtimeChecks: {
          strictStateImmutability: isDevMode(),
          strictActionImmutability: isDevMode(),
          strictStateSerializability: isDevMode(),
          strictActionSerializability: isDevMode()
        },
        metaReducers: [],
        initialState: {}
      }),
      EffectsModule.forRoot([
        JobEffects,
        ResumeEffects,
        ReportEffects
      ]),
      StoreRouterConnectingModule.forRoot({
        serializer: 'minimal'
      }),
      StoreDevtoolsModule.instrument({
        maxAge: 25,
        logOnly: !isDevMode(),
        connectInZone: true,
        features: {
          pause: false,
          lock: false,
          persist: true
        }
      })
    )
  ]
}).catch((err) => console.error(err));
