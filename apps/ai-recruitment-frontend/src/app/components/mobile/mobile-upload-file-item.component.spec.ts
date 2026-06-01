import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MobileUploadFileItemComponent } from './mobile-upload-file-item.component';
import type { UploadFile } from '../../services/mobile/mobile-upload.service';

describe('MobileUploadFileItemComponent', () => {
  let component: MobileUploadFileItemComponent;
  let fixture: ComponentFixture<MobileUploadFileItemComponent>;

  const mockFile: UploadFile = {
    id: '1',
    file: new File(['test'], 'resume.pdf', { type: 'application/pdf' }),
    name: 'resume.pdf',
    size: 1024 * 1024,
    type: 'application/pdf',
    progress: 0,
    status: 'pending',
  };

  const mockUploadingFile: UploadFile = {
    id: '2',
    file: new File(['test'], 'photo.jpg', { type: 'image/jpeg' }),
    name: 'photo.jpg',
    size: 2 * 1024 * 1024,
    type: 'image/jpeg',
    progress: 50,
    status: 'uploading',
  };

  const mockErrorFile: UploadFile = {
    id: '3',
    file: new File(['test'], 'error.pdf', { type: 'application/pdf' }),
    name: 'error.pdf',
    size: 1024,
    type: 'application/pdf',
    progress: 0,
    status: 'error',
    error: 'Upload failed',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileUploadFileItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileUploadFileItemComponent);
    component = fixture.componentInstance;
    component.file = mockFile;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Properties', () => {
    it('should accept file input', () => {
      expect(component.file).toBe(mockFile);
    });
  });

  describe('Output Events', () => {
    it('should emit retry event', () => {
      const emitSpy = jest.spyOn(component.retry, 'emit');
      component.onRetry();
      expect(emitSpy).toHaveBeenCalledWith(mockFile);
    });

    it('should emit remove event', () => {
      const emitSpy = jest.spyOn(component.remove, 'emit');
      component.onRemove();
      expect(emitSpy).toHaveBeenCalledWith(mockFile);
    });
  });

  describe('Methods', () => {
    it('should emit retry', () => {
      const emitSpy = jest.spyOn(component.retry, 'emit');
      component.onRetry();
      expect(emitSpy).toHaveBeenCalledWith(mockFile);
    });

    it('should emit remove', () => {
      const emitSpy = jest.spyOn(component.remove, 'emit');
      component.onRemove();
      expect(emitSpy).toHaveBeenCalledWith(mockFile);
    });

    it('should format file size', () => {
      expect(component.formattedSize).toBeDefined();
      expect(typeof component.formattedSize).toBe('string');
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should initialize on ngOnInit', () => {
      component.ngOnInit();
      expect(component).toBeTruthy();
    });
  });

  describe('Template Rendering - Pending Status', () => {
    it('should render file item', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.file-item')).toBeTruthy();
    });

    it('should render file name', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const name = compiled.querySelector('.file-name');
      expect(name?.textContent).toContain('resume.pdf');
    });

    it('should render file size', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.file-size')).toBeTruthy();
    });

    it('should render pending status', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Pending');
    });

    it('should render placeholder for non-image files', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.preview-placeholder')).toBeTruthy();
    });

    it('should render remove button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll('.file-action');
      const removeButton = Array.from(buttons).find((b) =>
        b.classList.contains('remove'),
      );
      expect(removeButton).toBeTruthy();
    });
  });

  describe('Template Rendering - Uploading Status', () => {
    beforeEach(() => {
      component.file = mockUploadingFile;
      fixture.detectChanges();
    });

    it('should apply uploading class', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.file-item.uploading')).toBeTruthy();
    });

    it('should render uploading status text', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Uploading');
      expect(compiled.textContent).toContain('50%');
    });

    it('should render progress bar', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.progress-bar')).toBeTruthy();
    });

    it('should set progress bar width', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fill = compiled.querySelector('.progress-fill');
      expect(fill?.getAttribute('style')).toContain('50%');
    });
  });

  describe('Template Rendering - Error Status', () => {
    beforeEach(() => {
      component.file = mockErrorFile;
      fixture.detectChanges();
    });

    it('should apply error class', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.file-item.error')).toBeTruthy();
    });

    it('should render error message', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Upload failed');
    });

    it('should render retry button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll('.file-action');
      const retryButton = Array.from(buttons).find((b) =>
        b.classList.contains('retry'),
      );
      expect(retryButton).toBeTruthy();
    });
  });
});
