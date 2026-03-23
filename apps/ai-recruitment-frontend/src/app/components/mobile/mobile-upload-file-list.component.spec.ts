import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type {
  UploadFile} from './mobile-upload-file-list.component';
import {
  MobileUploadFileListComponent
} from './mobile-upload-file-list.component';

describe('MobileUploadFileListComponent', () => {
  let component: MobileUploadFileListComponent;
  let fixture: ComponentFixture<MobileUploadFileListComponent>;

  const mockFiles: UploadFile[] = [
    {
      id: '1',
      file: new File(['test'], 'resume.pdf', { type: 'application/pdf' }),
      name: 'resume.pdf',
      size: 1024 * 1024,
      type: 'application/pdf',
      progress: 100,
      status: 'success',
    },
    {
      id: '2',
      file: new File(['test'], 'photo.jpg', { type: 'image/jpeg' }),
      name: 'photo.jpg',
      size: 2 * 1024 * 1024,
      type: 'image/jpeg',
      progress: 50,
      status: 'uploading',
    },
    {
      id: '3',
      file: new File(['test'], 'error.pdf', { type: 'application/pdf' }),
      name: 'error.pdf',
      size: 1024,
      type: 'application/pdf',
      progress: 0,
      status: 'error',
      error: 'Upload failed',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileUploadFileListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileUploadFileListComponent);
    component = fixture.componentInstance;
    component.files = mockFiles;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Properties', () => {
    it('should accept files input', () => {
      expect(component.files).toBe(mockFiles);
    });

    it('should accept canClearAll input', () => {
      component.canClearAll = true;
      expect(component.canClearAll).toBe(true);
    });

    it('should have default canClearAll value of false', () => {
      const newComponent = TestBed.createComponent(
        MobileUploadFileListComponent,
      );
      expect(newComponent.componentInstance.canClearAll).toBe(false);
    });
  });

  describe('Output Events', () => {
    it('should emit remove event', () => {
      const emitSpy = jest.spyOn(component.remove, 'emit');
      component.remove.emit(mockFiles[0]);
      expect(emitSpy).toHaveBeenCalledWith(mockFiles[0]);
    });

    it('should emit retry event', () => {
      const emitSpy = jest.spyOn(component.retry, 'emit');
      component.retry.emit(mockFiles[2]);
      expect(emitSpy).toHaveBeenCalledWith(mockFiles[2]);
    });

    it('should emit clearAll event', () => {
      const emitSpy = jest.spyOn(component.clearAll, 'emit');
      component.clearAll.emit();
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('Methods', () => {
    it('should format file size in bytes', () => {
      const size = component.formatFileSize(500);
      expect(size).toBe('500 B');
    });

    it('should format file size in KB', () => {
      const size = component.formatFileSize(1024);
      expect(size).toBe('1 KB');
    });

    it('should format file size in MB', () => {
      const size = component.formatFileSize(1024 * 1024);
      expect(size).toBe('1 MB');
    });

    it('should format file size in GB', () => {
      const size = component.formatFileSize(1024 * 1024 * 1024);
      expect(size).toBe('1 GB');
    });

    it('should return 0 B for zero bytes', () => {
      const size = component.formatFileSize(0);
      expect(size).toBe('0 B');
    });

    it('should track by file id', () => {
      const id = component.trackByFileId(0, mockFiles[0]);
      expect(id).toBe('1');
    });
  });

  describe('Template Rendering', () => {
    it('should render upload list', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.upload-list')).toBeTruthy();
    });

    it('should not render when files is empty', () => {
      component.files = [];
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.upload-list')).toBeFalsy();
    });

    it('should render list title with file count', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const title = compiled.querySelector('.list-title');
      expect(title?.textContent).toContain('Uploaded Files (3)');
    });

    it('should render file items', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const items = compiled.querySelectorAll('.file-item');
      expect(items.length).toBe(3);
    });

    it('should render clear all button when canClearAll is true', () => {
      component.canClearAll = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.clear-all')).toBeTruthy();
    });

    it('should not render clear all button when canClearAll is false', () => {
      component.canClearAll = false;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.clear-all')).toBeFalsy();
    });

    it('should apply success class to completed file', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const items = compiled.querySelectorAll('.file-item');
      expect(items[0].classList.contains('success')).toBe(true);
    });

    it('should apply uploading class to uploading file', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const items = compiled.querySelectorAll('.file-item');
      expect(items[1].classList.contains('uploading')).toBe(true);
    });

    it('should apply error class to error file', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const items = compiled.querySelectorAll('.file-item');
      expect(items[2].classList.contains('error')).toBe(true);
    });

    it('should render retry button for error files', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const items = compiled.querySelectorAll('.file-item');
      const errorActions = items[2].querySelectorAll('.file-action');
      const retryButton = Array.from(errorActions).find((a) =>
        a.classList.contains('retry'),
      );
      expect(retryButton).toBeTruthy();
    });

    it('should render progress bar for uploading files', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const items = compiled.querySelectorAll('.file-item');
      const progressBar = items[1].querySelector('.progress-bar');
      expect(progressBar).toBeTruthy();
    });

    it('should render file names', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const names = compiled.querySelectorAll('.file-name');
      expect(names[0].textContent).toContain('resume.pdf');
      expect(names[1].textContent).toContain('photo.jpg');
    });

    it('should render file sizes', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const sizes = compiled.querySelectorAll('.file-size');
      expect(sizes.length).toBe(3);
    });
  });
});
