import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { CoachComponent } from './coach.component';
import { ApiService } from '../../services/api.service';
import { LoggerService } from '../../services/shared/logger.service';
import { of, throwError } from 'rxjs';
import type { GapAnalysisResult } from '../../interfaces/gap-analysis.interface';

describe('CoachComponent', () => {
  let component: CoachComponent;
  let fixture: ComponentFixture<CoachComponent>;
  let mockApiService: jest.Mocked<ApiService>;
  let mockLogger: jest.Mocked<LoggerService>;

  const mockGapAnalysisResult: GapAnalysisResult = {
    matchedSkills: ['JavaScript', 'TypeScript'],
    missingSkills: ['Python', 'Go'],
    suggestedSkills: ['Rust', 'Kotlin'],
  };

  beforeEach(async () => {
    mockApiService = {
      submitGapAnalysisWithFile: jest.fn(),
    } as unknown as jest.Mocked<ApiService>;

    mockLogger = {
      createLogger: jest.fn().mockReturnValue({
        debug: jest.fn(),
        error: jest.fn(),
      }),
    } as unknown as jest.Mocked<LoggerService>;

    await TestBed.configureTestingModule({
      imports: [CoachComponent],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CoachComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize form with required validators', () => {
      expect(component.form).toBeDefined();
      expect(component.form.get('jdText')).toBeDefined();
      expect(component.form.get('jdText')?.hasError('required')).toBe(true);
    });

    it('should have initial state values', () => {
      expect(component.loading).toBe(false);
      expect(component.result).toBeNull();
      expect(component.selectedFile).toBeNull();
    });
  });

  describe('表单验证测试', () => {
    it('should require jdText field', () => {
      const jdControl = component.form.get('jdText');
      jdControl?.setValue('');
      expect(jdControl?.valid).toBe(false);
      expect(jdControl?.hasError('required')).toBe(true);
    });

    it('should validate minimum length of jdText', () => {
      const jdControl = component.form.get('jdText');
      jdControl?.setValue('short');
      expect(jdControl?.valid).toBe(false);
      expect(jdControl?.hasError('minlength')).toBe(true);
    });

    it('should accept valid jdText', () => {
      const jdControl = component.form.get('jdText');
      jdControl?.setValue('这是一个有效的职位描述，包含足够的长度要求');
      expect(jdControl?.valid).toBe(true);
    });

    it('should mark form as invalid when empty', () => {
      expect(component.form.valid).toBe(false);
    });
  });

  describe('文件选择测试', () => {
    it('should handle file selection', () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const event = { target: { files: [file] } } as unknown as Event;

      component.onFileSelected(event);
      expect(component.selectedFile).toBe(file);
    });

    it('should not update selectedFile when no file selected', () => {
      const event = { target: { files: [] } } as unknown as Event;

      component.onFileSelected(event);
      expect(component.selectedFile).toBeNull();
    });
  });

  describe('表单提交测试', () => {
    it('should not submit when form is invalid', () => {
      const apiSpy = jest.spyOn(mockApiService, 'submitGapAnalysisWithFile');
      component.onSubmit();
      expect(apiSpy).not.toHaveBeenCalled();
    });

    it('should not submit when no file selected', () => {
      component.form.get('jdText')?.setValue('有效的职位描述内容');
      const apiSpy = jest.spyOn(mockApiService, 'submitGapAnalysisWithFile');
      component.onSubmit();
      expect(apiSpy).not.toHaveBeenCalled();
    });

    it('should submit valid form with file', () => {
      component.form.get('jdText')?.setValue('这是一个有效的职位描述');
      component.selectedFile = new File(['test'], 'test.pdf', {
        type: 'application/pdf',
      });

      mockApiService.submitGapAnalysisWithFile.mockReturnValue(
        of(mockGapAnalysisResult),
      );

      component.onSubmit();

      expect(component.loading).toBe(true);
      expect(mockApiService.submitGapAnalysisWithFile).toHaveBeenCalledWith(
        '这是一个有效的职位描述',
        component.selectedFile,
      );
    });

    it('should handle successful submission', () => {
      component.form.get('jdText')?.setValue('有效的职位描述');
      component.selectedFile = new File(['test'], 'test.pdf', {
        type: 'application/pdf',
      });

      mockApiService.submitGapAnalysisWithFile.mockReturnValue(
        of(mockGapAnalysisResult),
      );

      component.onSubmit();

      expect(component.result).toEqual(mockGapAnalysisResult);
      expect(component.loading).toBe(false);
    });

    it('should handle submission error', () => {
      component.form.get('jdText')?.setValue('有效的职位描述');
      component.selectedFile = new File(['test'], 'test.pdf', {
        type: 'application/pdf',
      });

      const error = new Error('API Error');
      mockApiService.submitGapAnalysisWithFile.mockReturnValue(
        throwError(() => error),
      );

      component.onSubmit();

      expect(component.result).toEqual({
        matchedSkills: [],
        missingSkills: [],
        suggestedSkills: [],
      });
      expect(component.loading).toBe(false);
    });
  });

  describe('日志记录测试', () => {
    it('should log debug information on submit', () => {
      const logger = mockLogger.createLogger();
      component.form.get('jdText')?.setValue('测试职位描述');
      component.selectedFile = new File(['test'], 'test.pdf', {
        type: 'application/pdf',
      });

      mockApiService.submitGapAnalysisWithFile.mockReturnValue(
        of(mockGapAnalysisResult),
      );

      component.onSubmit();

      expect(logger.debug).toHaveBeenCalledWith(
        'Starting gap analysis API call',
      );
    });

    it('should log errors on API failure', () => {
      const logger = mockLogger.createLogger();
      component.form.get('jdText')?.setValue('测试职位描述');
      component.selectedFile = new File(['test'], 'test.pdf', {
        type: 'application/pdf',
      });

      const error = new Error('API Error');
      mockApiService.submitGapAnalysisWithFile.mockReturnValue(
        throwError(() => error),
      );

      component.onSubmit();

      expect(logger.error).toHaveBeenCalledWith(
        'Gap analysis API call failed',
        error,
      );
    });
  });
});
