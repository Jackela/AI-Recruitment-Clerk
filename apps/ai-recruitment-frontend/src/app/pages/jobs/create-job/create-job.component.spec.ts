import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Router } from '@angular/router';
// import { DebugElement } from '@angular/core'; // Removed unused import
import { By } from '@angular/platform-browser';
import { CreateJobComponent } from './create-job.component';
import { AppState } from '../../../store/app.state';
import * as JobActions from '../../../store/jobs/job.actions';
import { initialJobState } from '../../../store/jobs/job.state';
import { I18nService } from '../../../services/i18n/i18n.service';

type TranslationValue =
  | string
  | ((params?: Record<string, unknown>) => string);

describe('CreateJobComponent', () => {
  let component: CreateJobComponent;
  let fixture: ComponentFixture<CreateJobComponent>;
  let store: MockStore<AppState>;
  let router: Router;
  let dispatchSpy: jest.SpyInstance;
  const translationMap: Record<string, TranslationValue> = {
    'common.back': '返回',
    'common.characters': '字符',
    'common.close': '关闭',
    'common.loading': '加载中',
    'jobs.createJob.title': '创建新岗位',
    'jobs.createJob.information': '岗位信息',
    'jobs.createJob.jobTitle.label': '岗位名称',
    'jobs.createJob.jobTitle.placeholder': '请输入岗位名称',
    'jobs.createJob.jobTitle.hint': '提供清晰的岗位名称',
    'jobs.createJob.jobDescription.label': '岗位描述',
    'jobs.createJob.jobDescription.placeholder': '请输入岗位描述',
    'jobs.createJob.jobDescription.hint': '描述岗位职责与要求',
    'jobs.createJob.jobDescription.requirements.skills': '列出核心技能要求',
    'jobs.createJob.jobDescription.requirements.experience': '说明经验要求',
    'jobs.createJob.jobDescription.requirements.education': '说明教育背景',
    'jobs.createJob.jobDescription.requirements.other': '补充其他要求',
    'jobs.createJob.actions.cancel': '取消',
    'jobs.createJob.actions.create': '创建岗位',
    'jobs.createJob.actions.creating': '创建中',
    'jobs.createJob.progress.initializing': '初始化',
    'jobs.createJob.progress.processing': '处理中',
    'jobs.createJob.progress.estimatedTimeRemaining': '预计剩余时间',
    'jobs.createJob.progress.title': '创建进度',
    'messages.success': '成功',
    'validation.required': '该字段不能为空',
    'validation.minLength': (params) =>
      `至少 ${params?.['length'] ?? 0} 个字符`,
    'validation.maxLength': (params) =>
      `最多 ${params?.['length'] ?? 0} 个字符`,
  };
  const i18nServiceMock = {
    translate: jest.fn(
      (key: string, params?: Record<string, unknown>) => {
        const translation = translationMap[key];
        if (typeof translation === 'function') {
          return translation(params);
        }
        return translation ?? key;
      },
    ),
  };

  const initialState: Partial<AppState> = {
    jobs: {
      ...initialJobState,
      creating: false,
      error: null,
    },
  };

  beforeEach(async () => {
    i18nServiceMock.translate.mockClear();
    i18nServiceMock.translate.mockImplementation(
      (key: string, params?: Record<string, unknown>) => {
        const translation = translationMap[key];
        if (typeof translation === 'function') {
          return translation(params);
        }
        return translation ?? key;
      },
    );

    await TestBed.configureTestingModule({
      imports: [
        CreateJobComponent,
        ReactiveFormsModule,
        RouterTestingModule.withRoutes([
          { path: 'jobs', component: CreateJobComponent },
        ]),
      ],
      providers: [
        provideMockStore({ initialState }),
        {
          provide: I18nService,
          useValue: i18nServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateJobComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router);

    dispatchSpy = jest.spyOn(store, 'dispatch');

    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize form with empty values', () => {
      expect(component.createJobForm.get('jobTitle')?.value).toBe('');
      expect(component.createJobForm.get('jdText')?.value).toBe('');
    });

    it('should dispatch clearJobError on init', () => {
      expect(dispatchSpy).toHaveBeenCalledWith(JobActions.clearJobError());
    });

    it('should dispatch initializeWebSocketConnection on init', () => {
      expect(dispatchSpy).toHaveBeenCalledWith(
        JobActions.initializeWebSocketConnection({
          sessionId: expect.any(String),
          organizationId: undefined,
        }),
      );
    });

    it('should initialize observables', () => {
      expect(component.creating$).toBeDefined();
      expect(component.error$).toBeDefined();
    });
  });

  describe('Form Validation', () => {
    it('should be invalid when form is empty', () => {
      expect(component.createJobForm.valid).toBe(false);
    });

    it('should be invalid with only job title', () => {
      component.createJobForm.patchValue({
        jobTitle: '软件工程师',
      });
      expect(component.createJobForm.valid).toBe(false);
    });

    it('should be invalid with only jdText', () => {
      component.createJobForm.patchValue({
        jdText: '这是一个岗位描述',
      });
      expect(component.createJobForm.valid).toBe(false);
    });

    it('should be valid with both fields filled', () => {
      component.createJobForm.patchValue({
        jobTitle: '软件工程师',
        jdText: '这是一个详细的岗位描述文本',
      });
      expect(component.createJobForm.valid).toBe(true);
    });

    describe('Job Title Validation', () => {
      it('should require job title', () => {
        const jobTitle = component.createJobForm.get('jobTitle');
        jobTitle?.setValue('');
        jobTitle?.markAsTouched();

        expect(jobTitle?.errors?.['required']).toBeTruthy();
        expect(component.getFieldError('jobTitle')).toEqual({
          key: 'validation.required',
        });
      });

      it('should enforce minimum length', () => {
        const jobTitle = component.createJobForm.get('jobTitle');
        jobTitle?.setValue('A');
        jobTitle?.markAsTouched();

        expect(jobTitle?.errors?.['minlength']).toBeTruthy();
        expect(component.getFieldError('jobTitle')).toEqual({
          key: 'validation.minLength',
          params: { length: 2 },
        });
      });

      it('should enforce maximum length', () => {
        const longTitle = 'A'.repeat(101);
        const jobTitle = component.createJobForm.get('jobTitle');
        jobTitle?.setValue(longTitle);
        jobTitle?.markAsTouched();

        expect(jobTitle?.errors?.['maxlength']).toBeTruthy();
        expect(component.getFieldError('jobTitle')).toEqual({
          key: 'validation.maxLength',
          params: { length: 100 },
        });
      });
    });

    describe('JD Text Validation', () => {
      it('should require jdText', () => {
        const jdText = component.createJobForm.get('jdText');
        jdText?.setValue('');
        jdText?.markAsTouched();

        expect(jdText?.errors?.['required']).toBeTruthy();
        expect(component.getFieldError('jdText')).toEqual({
          key: 'validation.required',
        });
      });

      it('should enforce minimum length', () => {
        const jdText = component.createJobForm.get('jdText');
        jdText?.setValue('Short');
        jdText?.markAsTouched();

        expect(jdText?.errors?.['minlength']).toBeTruthy();
        expect(component.getFieldError('jdText')).toEqual({
          key: 'validation.minLength',
          params: { length: 10 },
        });
      });

      it('should enforce maximum length', () => {
        const longText = 'A'.repeat(5001);
        const jdText = component.createJobForm.get('jdText');
        jdText?.setValue(longText);
        jdText?.markAsTouched();

        expect(jdText?.errors?.['maxlength']).toBeTruthy();
        expect(component.getFieldError('jdText')).toEqual({
          key: 'validation.maxLength',
          params: { length: 5000 },
        });
      });
    });
  });

  describe('Template Rendering', () => {
    it('should render page title', () => {
      const titleElement = fixture.debugElement.query(By.css('.page-title'));
      expect(titleElement.nativeElement.textContent.trim()).toBe('创建新岗位');
    });

    it('should render back button', () => {
      const backButton = fixture.debugElement.query(By.css('button'));
      expect(backButton.nativeElement.textContent.trim()).toContain('返回');
    });

    it('should render job title input', () => {
      const jobTitleInput = fixture.debugElement.query(
        By.css('input[formControlName="jobTitle"]'),
      );
      expect(jobTitleInput).toBeTruthy();
    });

    it('should render jd text textarea', () => {
      const jdTextArea = fixture.debugElement.query(
        By.css('textarea[formControlName="jdText"]'),
      );
      expect(jdTextArea).toBeTruthy();
    });

    it('should render submit button', () => {
      const submitButton = fixture.debugElement.query(
        By.css('button[type="submit"]'),
      );
      expect(submitButton).toBeTruthy();
    });

    it('should disable submit button when form is invalid', () => {
      const submitButton = fixture.debugElement.query(
        By.css('button[type="submit"]'),
      );
      expect(submitButton.nativeElement.disabled).toBe(true);
    });

    it('should enable submit button when form is valid', () => {
      component.createJobForm.patchValue({
        jobTitle: '软件工程师',
        jdText: '这是一个详细的岗位描述文本',
      });
      fixture.detectChanges();

      const submitButton = fixture.debugElement.query(
        By.css('button[type="submit"]'),
      );
      expect(submitButton.nativeElement.disabled).toBe(false);
    });
  });

  describe('Character Count', () => {
    it('should display character count for jdText', () => {
      const charCount = fixture.debugElement.query(By.css('.character-count'));
      expect(charCount).toBeTruthy();
      expect(charCount.nativeElement.textContent).toContain('0 / 5000');
    });

    it('should update character count when typing', () => {
      const testText = '这是一个测试文本';
      component.createJobForm.patchValue({ jdText: testText });
      fixture.detectChanges();

      const charCount = fixture.debugElement.query(By.css('.character-count'));
      expect(charCount.nativeElement.textContent).toContain(
        `${testText.length} / 5000`,
      );
    });
  });

  describe('Error Display', () => {
    it('should display error message when error exists', () => {
      store.setState({
        jobs: {
          ...initialJobState,
          error: 'Creation failed',
        },
      } as AppState);
      fixture.detectChanges();

      const errorAlert = fixture.debugElement.query(By.css('.alert-danger'));
      expect(errorAlert).toBeTruthy();
      expect(errorAlert.nativeElement.textContent).toContain('Creation failed');
    });

    it('should display field validation errors', () => {
      const jobTitle = component.createJobForm.get('jobTitle');
      jobTitle?.setValue('');
      jobTitle?.markAsTouched();
      fixture.detectChanges();

      const errorMessage = fixture.debugElement.query(
        By.css('.invalid-feedback'),
      );
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.nativeElement.textContent.trim()).toBe(
        '该字段不能为空',
      );
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      store.setState({
        jobs: {
          ...initialJobState,
          creating: true,
        },
      } as AppState);
      fixture.detectChanges();
    });

    it('should show loading spinner when creating', () => {
      const spinner = fixture.debugElement.query(By.css('.spinner'));
      expect(spinner).toBeTruthy();
    });

    it('should disable buttons when creating', () => {
      const buttons = fixture.debugElement.queryAll(By.css('button'));
      buttons.forEach((button) => {
        expect(button.nativeElement.disabled).toBe(true);
      });
    });

    it('should show creating text on submit button', () => {
      const submitButton = fixture.debugElement.query(
        By.css('button[type="submit"]'),
      );
      expect(submitButton.nativeElement.textContent).toContain('创建中');
    });
  });

  describe('User Interactions', () => {
    it('should call onCancel when back button is clicked', () => {
      jest.spyOn(component, 'onCancel');
      const backButton = fixture.debugElement.query(By.css('button'));
      backButton.nativeElement.click();

      expect(component.onCancel).toHaveBeenCalled();
    });

    it('should navigate to jobs list on cancel', () => {
      jest.spyOn(router, 'navigate');
      component.onCancel();

      expect(router.navigate).toHaveBeenCalledWith(['/jobs']);
    });

    it('should call onSubmit when form is submitted', () => {
      jest.spyOn(component, 'onSubmit');
      component.createJobForm.patchValue({
        jobTitle: '软件工程师',
        jdText: '这是一个详细的岗位描述文本',
      });
      fixture.detectChanges();

      const form = fixture.debugElement.query(By.css('form'));
      form.nativeElement.dispatchEvent(new Event('submit'));

      expect(component.onSubmit).toHaveBeenCalled();
    });

    it('should dispatch createJob action on valid form submission', () => {
      const formData = {
        jobTitle: '软件工程师',
        jdText: '这是一个详细的岗位描述文本',
      };
      component.createJobForm.patchValue(formData);

      component.onSubmit();

      expect(dispatchSpy).toHaveBeenCalledWith(
        JobActions.createJob({
          request: formData,
        }),
      );
    });

    it('should not dispatch action on invalid form submission', () => {
      component.createJobForm.patchValue({
        jobTitle: '',
        jdText: '',
      });

      const initialCallCount = dispatchSpy.mock.calls.length;
      component.onSubmit();

      expect(dispatchSpy.mock.calls.length).toBe(initialCallCount);
    });

    it('should mark form as touched on invalid submission', () => {
      jest.spyOn(
        component as typeof component & { markFormGroupTouched: () => void },
        'markFormGroupTouched',
      );
      component.createJobForm.patchValue({
        jobTitle: '',
        jdText: '',
      });

      component.onSubmit();

      expect(component['markFormGroupTouched']).toHaveBeenCalled();
    });
  });

  describe('Component Methods', () => {
    it('should handle onClearError', () => {
      component.onClearError();
      expect(dispatchSpy).toHaveBeenCalledWith(JobActions.clearJobError());
    });

    it('should provide jobTitle getter', () => {
      expect(component.jobTitle).toBe(component.createJobForm.get('jobTitle'));
    });

    it('should provide jdText getter', () => {
      expect(component.jdText).toBe(component.createJobForm.get('jdText'));
    });

    describe('getFieldError method', () => {
      it('should return null for valid field', () => {
        component.createJobForm.patchValue({ jobTitle: '有效标题' });
        expect(component.getFieldError('jobTitle')).toBeNull();
      });

      it('should return null for untouched field', () => {
        const jobTitle = component.createJobForm.get('jobTitle');
        jobTitle?.setValue('');
        expect(component.getFieldError('jobTitle')).toBeNull();
      });

      it('should return error message for touched invalid field', () => {
        const jobTitle = component.createJobForm.get('jobTitle');
        jobTitle?.setValue('');
        jobTitle?.markAsTouched();
        expect(component.getFieldError('jobTitle')).toEqual({
          key: 'validation.required',
        });
      });

      it('should resolve translation descriptors to localized strings', () => {
        const translateSpy = jest
          .spyOn(component['i18nService'], 'translate')
          .mockReturnValue('translated message');

        expect(
          component.getFieldErrorMessage({ key: 'validation.required' }),
        ).toBe('translated message');

        translateSpy.mockRestore();
      });
    });

    it('should report field errors via hasFieldError', () => {
      const jobTitle = component.createJobForm.get('jobTitle');
      jobTitle?.setValue('');
      jobTitle?.markAsTouched();

      expect(component.hasFieldError('jobTitle')).toBe(true);
    });
  });

  describe('Component Lifecycle', () => {
    it('should call ngOnDestroy without errors', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('should complete destroy subject on ngOnDestroy', () => {
      jest.spyOn(component['destroy$'], 'next');
      jest.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      const labels = fixture.debugElement.queryAll(By.css('label'));
      expect(labels.length).toBeGreaterThan(0);
      expect(labels[0].nativeElement.textContent).toContain('岗位名称');
    });

    it('should have proper aria attributes', () => {
      const inputs = fixture.debugElement.queryAll(By.css('input, textarea'));
      inputs.forEach((input) => {
        expect(input.nativeElement.id).toBeTruthy();
      });
    });
  });
});
