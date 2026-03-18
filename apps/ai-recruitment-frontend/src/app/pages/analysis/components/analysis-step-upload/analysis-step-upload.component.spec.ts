import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AnalysisStepUploadComponent } from './analysis-step-upload.component';

describe('AnalysisStepUploadComponent', () => {
  let component: AnalysisStepUploadComponent;
  let fixture: ComponentFixture<AnalysisStepUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysisStepUploadComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalysisStepUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should render upload title', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('上传简历');
    });
  });

  describe('文件上传测试', () => {
    it('should handle file selection', () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const event = { target: { files: [file] } } as unknown as Event;

      component.onFileSelected(event);
      expect(component.selectedFile).toBe(file);
    });

    it('should emit file upload event', () => {
      const emitSpy = jest.spyOn(component.fileUploaded, 'emit');
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      component.selectedFile = file;

      component.onUpload();
      expect(emitSpy).toHaveBeenCalledWith(file);
    });

    it('should validate file type', () => {
      const invalidFile = new File(['test'], 'test.txt', {
        type: 'text/plain',
      });
      const event = { target: { files: [invalidFile] } } as unknown as Event;

      component.onFileSelected(event);
      expect(component.errorMessage).toContain('不支持的文件格式');
    });
  });
});
