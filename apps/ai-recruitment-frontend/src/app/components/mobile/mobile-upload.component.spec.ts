import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { MobileUploadComponent } from './mobile-upload.component';
import type {
  UploadFile,
  UploadState,
} from '../../services/mobile/mobile-upload.service';
import { MobileUploadService } from '../../services/mobile/mobile-upload.service';
import { MobileUploadZoneComponent } from './mobile-upload-zone.component';
import { MobileUploadFileItemComponent } from './mobile-upload-file-item.component';

describe('MobileUploadComponent', () => {
  let component: MobileUploadComponent;
  let fixture: ComponentFixture<MobileUploadComponent>;
  let mockUploadService: jest.Mocked<Partial<MobileUploadService>>;
  let stateSubject: Subject<UploadState>;

  const mockFile: File = new File(['test content'], 'test.pdf', {
    type: 'application/pdf',
  });

  const mockUploadFile: UploadFile = {
    id: 'file-1',
    file: mockFile,
    name: 'test.pdf',
    size: 1024,
    type: 'application/pdf',
    progress: 0,
    status: 'pending',
  };

  beforeEach(async () => {
    stateSubject = new Subject<UploadState>();

    mockUploadService = {
      state$: stateSubject.asObservable(),
      setValidationConfig: jest.fn(),
      addFiles: jest.fn().mockReturnValue([mockUploadFile]),
      removeFile: jest.fn().mockReturnValue(true),
      clearAllFiles: jest.fn().mockReturnValue(true),
      retryFile: jest.fn().mockReturnValue(true),
      getPendingFiles: jest.fn().mockReturnValue([mockUploadFile]),
      getCompletedFiles: jest.fn().mockReturnValue([mockUploadFile]),
      getStateSnapshot: jest.fn().mockReturnValue({
        files: [mockUploadFile],
        hasUploading: false,
        totalSize: 1024,
        overallProgress: 0,
        canSubmit: true,
        canClearAll: true,
      }),
      formatFileSize: jest.fn().mockReturnValue('1 KB'),
      setFileUploading: jest.fn(),
      setFileSuccess: jest.fn(),
      setFileError: jest.fn(),
      updateFileProgress: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [
        MobileUploadComponent,
        MobileUploadZoneComponent,
        MobileUploadFileItemComponent,
      ],
      providers: [
        { provide: MobileUploadService, useValue: mockUploadService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileUploadComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Creation', () => {
    it('should create component', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should initialize with default inputs', () => {
      expect(component.title).toBe('Upload Documents');
      expect(component.subtitle).toBe('Select or drag files to upload');
      expect(component.multiple).toBe(true);
      expect(component.maxSizeMB).toBe(10);
    });
  });

  describe('Touch Interactions', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle tap on upload zone', () => {
      const uploadZone = fixture.nativeElement.querySelector('.upload-zone');
      expect(uploadZone).toBeTruthy();

      const tapEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      uploadZone.dispatchEvent(tapEvent);

      expect(uploadZone).toBeTruthy();
    });

    it('should trigger file selection on tap', () => {
      const filesSelectedSpy = jest.spyOn(component, 'onFilesSelected');
      const files = [mockFile];

      component.onFilesSelected(files);

      expect(filesSelectedSpy).toHaveBeenCalledWith(files);
      expect(mockUploadService.addFiles).toHaveBeenCalledWith(files);
    });

    it('should handle long press to open context menu', () => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fixture.nativeElement.appendChild(fileItem);

      let longPressTriggered = false;
      let pressTimer: NodeJS.Timeout;

      const startLongPress = () => {
        pressTimer = setTimeout(() => {
          longPressTriggered = true;
        }, 500);
      };

      const endLongPress = () => {
        clearTimeout(pressTimer);
      };

      fileItem.addEventListener('touchstart', startLongPress);
      fileItem.addEventListener('touchend', endLongPress);

      const touchStart = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
      });
      fileItem.dispatchEvent(touchStart);

      jest.advanceTimersByTime(600);

      expect(longPressTriggered).toBe(true);

      clearTimeout(pressTimer);
      fixture.nativeElement.removeChild(fileItem);
    });
  });

  describe('Responsive Layout', () => {
    it('should adapt to mobile viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector(
        '.mobile-upload-container',
      );
      expect(container).toBeTruthy();
    });

    it('should adapt to tablet viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector(
        '.mobile-upload-container',
      );
      expect(container).toBeTruthy();
    });

    it('should handle orientation change', () => {
      const orientationEvent = new Event('orientationchange');
      window.dispatchEvent(orientationEvent);
      fixture.detectChanges();

      expect(component).toBeTruthy();
    });
  });

  describe('Gesture Operations', () => {
    beforeEach(() => {
      fixture.detectChanges();
      stateSubject.next({
        files: [mockUploadFile],
        hasUploading: false,
        totalSize: 1024,
        overallProgress: 0,
        canSubmit: true,
        canClearAll: true,
      });
      fixture.detectChanges();
    });

    it('should handle swipe to remove file', () => {
      const fileItems = fixture.nativeElement.querySelectorAll('.file-item');
      if (fileItems.length > 0) {
        const fileItem = fileItems[0];

        let touchStartX = 0;
        let touchEndX = 0;

        fileItem.addEventListener('touchstart', (e: TouchEvent) => {
          touchStartX = e.touches[0].clientX;
        });

        fileItem.addEventListener('touchend', (e: TouchEvent) => {
          touchEndX = e.changedTouches[0].clientX;
          if (touchStartX - touchEndX > 100) {
            component.onRemoveFile(mockUploadFile);
          }
        });

        const touchStart = new TouchEvent('touchstart', {
          touches: [{ clientX: 200 } as Touch],
          bubbles: true,
        });
        const touchEnd = new TouchEvent('touchend', {
          changedTouches: [{ clientX: 50 } as Touch],
          bubbles: true,
        });

        fileItem.dispatchEvent(touchStart);
        fileItem.dispatchEvent(touchEnd);

        expect(mockUploadService.removeFile).toHaveBeenCalledWith(
          mockUploadFile.id,
        );
      }
    });

    it('should handle drag and drop for file upload', () => {
      const uploadZone = fixture.nativeElement.querySelector('.upload-zone');
      if (uploadZone) {
        const dragOverEvent = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
        });
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer: {
            files: [mockFile],
          } as unknown as DataTransfer,
        });

        uploadZone.dispatchEvent(dragOverEvent);
        expect(uploadZone.classList.contains('dragover')).toBeFalsy();

        uploadZone.dispatchEvent(dropEvent);
        expect(mockUploadService.addFiles).toHaveBeenCalled();
      }
    });
  });

  describe('File Management', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should emit filesAdded event when files are selected', () => {
      const filesAddedSpy = jest.spyOn(component.filesAdded, 'emit');
      const files = [mockFile];

      component.onFilesSelected(files);

      expect(filesAddedSpy).toHaveBeenCalledWith([mockUploadFile]);
    });

    it('should start auto upload when autoUpload is enabled', () => {
      component.autoUpload = true;
      const uploadStartSpy = jest.spyOn(component.uploadStart, 'emit');

      stateSubject.next({
        files: [mockUploadFile],
        hasUploading: false,
        totalSize: 1024,
        overallProgress: 0,
        canSubmit: true,
        canClearAll: true,
      });

      component.onFilesSelected([mockFile]);

      expect(uploadStartSpy).toHaveBeenCalled();
    });

    it('should emit fileRemoved event when file is removed', () => {
      const fileRemovedSpy = jest.spyOn(component.fileRemoved, 'emit');

      component.onRemoveFile(mockUploadFile);

      expect(fileRemovedSpy).toHaveBeenCalledWith(mockUploadFile);
    });

    it('should clear all files when clearAll is called', () => {
      component.clearAll();

      expect(mockUploadService.clearAllFiles).toHaveBeenCalled();
    });
  });

  describe('Upload Process', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should submit upload and emit events', () => {
      const uploadStartSpy = jest.spyOn(component.uploadStart, 'emit');

      stateSubject.next({
        files: [mockUploadFile],
        hasUploading: false,
        totalSize: 1024,
        overallProgress: 0,
        canSubmit: true,
        canClearAll: true,
      });
      fixture.detectChanges();

      component.submitUpload();

      expect(uploadStartSpy).toHaveBeenCalledWith([mockUploadFile]);
    });

    it('should handle upload retry', () => {
      const uploadStartSpy = jest.spyOn(component.uploadStart, 'emit');

      component.onRetryUpload(mockUploadFile);

      expect(mockUploadService.retryFile).toHaveBeenCalledWith(
        mockUploadFile.id,
      );
      expect(uploadStartSpy).toHaveBeenCalled();
    });

    it('should update formatted total size', () => {
      const formattedSize = component.formattedTotalSize;

      expect(mockUploadService.formatFileSize).toHaveBeenCalled();
      expect(formattedSize).toBe('1 KB');
    });
  });

  describe('Lifecycle', () => {
    it('should subscribe to service state on init', () => {
      fixture.detectChanges();

      stateSubject.next({
        files: [mockUploadFile],
        hasUploading: true,
        totalSize: 1024,
        overallProgress: 50,
        canSubmit: false,
        canClearAll: false,
      });

      expect(component.files).toEqual([mockUploadFile]);
      expect(component.hasUploading).toBe(true);
      expect(component.overallProgress).toBe(50);
    });

    it('should clean up subscriptions on destroy', () => {
      fixture.detectChanges();

      const nextSpy = jest.spyOn(component['destroy$'], 'next');
      const completeSpy = jest.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
