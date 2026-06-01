import type { ComponentFixture } from '@angular/core/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  ResumeFileUploadComponent,
  type CandidateInfo,
} from './resume-file-upload.component';

describe('ResumeFileUploadComponent', () => {
  let component: ResumeFileUploadComponent;
  let fixture: ComponentFixture<ResumeFileUploadComponent>;

  const mockFile = new File(['test content'], 'test.pdf', {
    type: 'application/pdf',
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumeFileUploadComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ResumeFileUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty file selection', () => {
      expect(component.selectedFile()).toBeNull();
      expect(component.isDragOver()).toBe(false);
    });

    it('should initialize candidate info with empty strings', () => {
      expect(component.candidateInfo).toEqual({
        name: '',
        email: '',
        targetPosition: '',
        notes: '',
      });
    });
  });

  describe('文件选择测试', () => {
    it('should handle valid PDF file selection', () => {
      const event = {
        target: { files: [mockFile] },
      } as unknown as Event;

      component.onFileSelect(event);
      expect(component.selectedFile()).toBe(mockFile);
    });

    it('should reject invalid file type', () => {
      const emitSpy = jest.spyOn(component.fileValidationError, 'emit');
      const invalidFile = new File(['test'], 'test.txt', {
        type: 'text/plain',
      });
      const event = {
        target: { files: [invalidFile] },
      } as unknown as Event;

      component.onFileSelect(event);
      expect(emitSpy).toHaveBeenCalledWith(
        '不支持的文件格式。请上传 PDF、DOC 或 DOCX 文件。',
      );
      expect(component.selectedFile()).toBeNull();
    });

    it('should reject oversized file', () => {
      const emitSpy = jest.spyOn(component.fileValidationError, 'emit');
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', {
        type: 'application/pdf',
      });
      const event = {
        target: { files: [largeFile] },
      } as unknown as Event;

      component.onFileSelect(event);
      expect(emitSpy).toHaveBeenCalledWith(
        '文件大小超过限制。请上传小于10MB的文件。',
      );
      expect(component.selectedFile()).toBeNull();
    });
  });

  describe('拖放功能测试', () => {
    it('should set drag over state', () => {
      const event = new DragEvent('dragover');
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });

      component.onDragOver(event);
      expect(component.isDragOver()).toBe(true);
    });

    it('should clear drag over state', () => {
      component.isDragOver.set(true);
      const event = new DragEvent('dragleave');
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });

      component.onDragLeave(event);
      expect(component.isDragOver()).toBe(false);
    });

    it('should handle file drop', () => {
      const event = new DragEvent('drop');
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
      Object.defineProperty(event, 'dataTransfer', {
        value: { files: [mockFile] },
      });

      component.onDrop(event);
      expect(component.selectedFile()).toBe(mockFile);
      expect(component.isDragOver()).toBe(false);
    });
  });

  describe('文件操作测试', () => {
    it('should remove selected file', () => {
      component.selectedFile.set(mockFile);
      const event = new MouseEvent('click');
      Object.defineProperty(event, 'stopPropagation', { value: jest.fn() });

      component.removeFile(event);
      expect(component.selectedFile()).toBeNull();
    });

    it('should format file size correctly', () => {
      expect(component.formatFileSize(500)).toBe('500 B');
      expect(component.formatFileSize(1024)).toBe('1.0 KB');
      expect(component.formatFileSize(1024 * 1024)).toBe('1.0 MB');
    });
  });

  describe('表单提交测试', () => {
    it('should emit fileSubmitted with file and candidate info', () => {
      const emitSpy = jest.spyOn(component.fileSubmitted, 'emit');
      component.selectedFile.set(mockFile);
      component.candidateInfo = {
        name: '张三',
        email: 'zhangsan@example.com',
        targetPosition: '前端开发',
        notes: '测试备注',
      };

      const event = new Event('submit');
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });

      component.onSubmit(event);
      expect(emitSpy).toHaveBeenCalledWith({
        file: mockFile,
        candidateInfo: component.candidateInfo,
      });
    });

    it('should emit validation error when no file selected', () => {
      const emitSpy = jest.spyOn(component.fileValidationError, 'emit');

      const event = new Event('submit');
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });

      component.onSubmit(event);
      expect(emitSpy).toHaveBeenCalledWith('请选择一个简历文件');
    });
  });

  describe('演示功能测试', () => {
    it('should emit demoRequested event', () => {
      const emitSpy = jest.spyOn(component.demoRequested, 'emit');

      component.onDemoClick();
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('表单重置测试', () => {
    it('should reset all form data', () => {
      component.selectedFile.set(mockFile);
      component.candidateInfo = {
        name: '张三',
        email: 'zhangsan@example.com',
        targetPosition: '前端开发',
        notes: '测试备注',
      };

      component.resetForm();

      expect(component.selectedFile()).toBeNull();
      expect(component.candidateInfo).toEqual({
        name: '',
        email: '',
        targetPosition: '',
        notes: '',
      });
    });
  });
});
