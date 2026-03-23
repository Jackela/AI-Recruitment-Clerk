import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MobileUploadZoneComponent } from './mobile-upload-zone.component';

describe('MobileUploadZoneComponent', () => {
  let component: MobileUploadZoneComponent;
  let fixture: ComponentFixture<MobileUploadZoneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileUploadZoneComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileUploadZoneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Properties', () => {
    it('should accept placeholderText input', () => {
      component.placeholderText = 'Drop files here';
      expect(component.placeholderText).toBe('Drop files here');
    });

    it('should have default placeholder text', () => {
      const newComponent = TestBed.createComponent(MobileUploadZoneComponent);
      expect(newComponent.componentInstance.placeholderText).toBe(
        'Tap to upload or drag files',
      );
    });

    it('should accept multiple input', () => {
      component.multiple = false;
      expect(component.multiple).toBe(false);
    });

    it('should have default multiple value of true', () => {
      const newComponent = TestBed.createComponent(MobileUploadZoneComponent);
      expect(newComponent.componentInstance.multiple).toBe(true);
    });

    it('should accept maxSizeMB input', () => {
      component.maxSizeMB = 20;
      expect(component.maxSizeMB).toBe(20);
    });

    it('should have default maxSizeMB value of 10', () => {
      const newComponent = TestBed.createComponent(MobileUploadZoneComponent);
      expect(newComponent.componentInstance.maxSizeMB).toBe(10);
    });

    it('should accept allowedTypes input', () => {
      component.allowedTypes = ['PDF', 'DOC'];
      expect(component.allowedTypes).toEqual(['PDF', 'DOC']);
    });

    it('should accept disabled input', () => {
      component.disabled = true;
      expect(component.disabled).toBe(true);
    });

    it('should accept showActions input', () => {
      component.showActions = false;
      expect(component.showActions).toBe(false);
    });

    it('should have default showActions value of true', () => {
      const newComponent = TestBed.createComponent(MobileUploadZoneComponent);
      expect(newComponent.componentInstance.showActions).toBe(true);
    });
  });

  describe('Output Events', () => {
    it('should emit filesSelected event', () => {
      const emitSpy = jest.spyOn(component.filesSelected, 'emit');
      const files = [
        new File(['test'], 'test.pdf', { type: 'application/pdf' }),
      ];
      component.filesSelected.emit(files);
      expect(emitSpy).toHaveBeenCalledWith(files);
    });
  });

  describe('Methods', () => {
    it('should set drag over state on drag over', () => {
      const event = new DragEvent('dragover', { bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
      component.onDragOver(event);
      expect(component.isDragOver).toBe(true);
    });

    it('should set drag over state to false on drag leave', () => {
      component.isDragOver = true;
      const event = new DragEvent('dragleave', { bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
      Object.defineProperty(event, 'clientX', { value: 0 });
      Object.defineProperty(event, 'clientY', { value: 0 });
      Object.defineProperty(event, 'currentTarget', {
        value: {
          getBoundingClientRect: () => ({
            left: 0,
            right: 100,
            top: 0,
            bottom: 100,
          }),
        },
      });
      component.onDragLeave(event);
      expect(component.isDragOver).toBe(false);
    });

    it('should emit files on drop', () => {
      const emitSpy = jest.spyOn(component.filesSelected, 'emit');
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const dataTransfer = { files: [file] } as unknown as DataTransfer;
      const event = new DragEvent('drop', { bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
      Object.defineProperty(event, 'stopPropagation', { value: jest.fn() });
      Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
      component.onDrop(event);
      expect(emitSpy).toHaveBeenCalledWith([file]);
      expect(component.isDragOver).toBe(false);
    });

    it('should not emit files on drop when disabled', () => {
      component.disabled = true;
      const emitSpy = jest.spyOn(component.filesSelected, 'emit');
      const event = new DragEvent('drop', { bubbles: true });
      component.onDrop(event);
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should have acceptedMimeTypes getter', () => {
      expect(component.acceptedMimeTypes).toBeDefined();
      expect(typeof component.acceptedMimeTypes).toBe('string');
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should initialize on ngOnInit', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      component.ngOnInit();
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'dragover',
        expect.any(Function),
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'drop',
        expect.any(Function),
      );
    });

    it('should cleanup on ngOnDestroy', () => {
      const removeEventListenerSpy = jest.spyOn(
        document,
        'removeEventListener',
      );
      component.ngOnDestroy();
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'dragover',
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'drop',
        expect.any(Function),
      );
    });
  });

  describe('Template Rendering', () => {
    it('should render upload zone', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.upload-zone')).toBeTruthy();
    });

    it('should render upload icon', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.upload-icon')).toBeTruthy();
    });

    it('should render placeholder text', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const text = compiled.querySelector('.upload-text');
      expect(text?.textContent).toContain('Tap to upload or drag files');
    });

    it('should render file type hint', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const hint = compiled.querySelector('.upload-hint');
      expect(hint?.textContent).toContain('PDF, DOC, DOCX, JPG, PNG');
    });

    it('should render quick actions when showActions is true', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.upload-actions')).toBeTruthy();
    });

    it('should render camera button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll('.upload-btn');
      expect(buttons[0].textContent).toContain('Camera');
    });

    it('should render files button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll('.upload-btn');
      expect(buttons[1].textContent).toContain('Files');
    });

    it('should apply dragover class when isDragOver is true', () => {
      component.isDragOver = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.upload-zone.dragover')).toBeTruthy();
    });

    it('should apply disabled class when disabled is true', () => {
      component.disabled = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.upload-zone.disabled')).toBeTruthy();
    });

    it('should hide actions when showActions is false', () => {
      component.showActions = false;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.upload-actions')).toBeFalsy();
    });

    it('should have hidden file input', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fileInput = compiled.querySelector('input[type="file"]#fileInput');
      expect(fileInput).toBeTruthy();
    });

    it('should have hidden camera input', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const cameraInput = compiled.querySelector(
        'input[type="file"]#cameraInput',
      );
      expect(cameraInput).toBeTruthy();
    });
  });
});
