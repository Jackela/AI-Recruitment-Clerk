import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AnalysisStepUploadComponent } from './analysis-step-upload.component';
import { ResumeFileUploadComponent } from '../resume-file-upload.component';

describe('AnalysisStepUploadComponent', () => {
  let component: AnalysisStepUploadComponent;
  let fixture: ComponentFixture<AnalysisStepUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysisStepUploadComponent, ResumeFileUploadComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalysisStepUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default isSubmitting value', () => {
      expect(component.isSubmitting).toBe(false);
    });
  });

  describe('输入属性测试', () => {
    it('should accept isSubmitting input', () => {
      component.isSubmitting = true;
      expect(component.isSubmitting).toBe(true);

      component.isSubmitting = false;
      expect(component.isSubmitting).toBe(false);
    });
  });

  describe('事件发射测试', () => {
    it('should emit fileSubmitted event', () => {
      const emitSpy = jest.spyOn(component.fileSubmitted, 'emit');
      const mockFileData = {
        file: new File(['test'], 'test.pdf', { type: 'application/pdf' }),
        candidateInfo: {
          name: 'Test User',
          email: 'test@example.com',
          targetPosition: 'Developer',
          notes: 'Test notes',
        },
      };

      component.onFileSubmitted(mockFileData);
      expect(emitSpy).toHaveBeenCalledWith(mockFileData);
    });

    it('should emit demoRequested event', () => {
      const emitSpy = jest.spyOn(component.demoRequested, 'emit');

      component.onDemoRequested();
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should emit fileValidationError event', () => {
      const emitSpy = jest.spyOn(component.fileValidationError, 'emit');
      const errorMessage = 'Invalid file type';

      component.onFileValidationError(errorMessage);
      expect(emitSpy).toHaveBeenCalledWith(errorMessage);
    });
  });
});
