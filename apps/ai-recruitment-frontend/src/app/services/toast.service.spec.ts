import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastService, ToastMessage } from './toast.service';
import { ProgressFeedbackService } from './feedback/progress-feedback.service';

describe('ToastService', () => {
  let service: ToastService;
  let progressFeedbackMock: jest.Mocked<ProgressFeedbackService>;

  beforeEach(() => {
    progressFeedbackMock = {
      showNotification: jest.fn().mockReturnValue('notification-id-1'),
      clearAllNotifications: jest.fn(),
      removeNotification: jest.fn(),
    } as unknown as jest.Mocked<ProgressFeedbackService>;

    TestBed.configureTestingModule({
      providers: [
        ToastService,
        { provide: ProgressFeedbackService, useValue: progressFeedbackMock },
      ],
    });

    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    service.clear();
    jest.clearAllMocks();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should start with empty toasts', () => {
      expect(service.getToasts()).toEqual([]);
    });
  });

  describe('success()', () => {
    it('should show success toast', () => {
      service.success('Test success message');

      const toasts = service.getToasts();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe('Test success message');
      expect(toasts[0].type).toBe('success');
    });

    it('should use default duration of 3000ms', () => {
      service.success('Test message');

      expect(progressFeedbackMock.showNotification).toHaveBeenCalledWith(
        '成功',
        'Test message',
        'success',
        3000,
        undefined,
        false
      );
    });

    it('should allow custom duration', () => {
      service.success('Test message', 5000);

      expect(progressFeedbackMock.showNotification).toHaveBeenCalledWith(
        '成功',
        'Test message',
        'success',
        5000,
        undefined,
        false
      );
    });
  });

  describe('error()', () => {
    it('should show error toast', () => {
      service.error('Test error message');

      const toasts = service.getToasts();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe('Test error message');
      expect(toasts[0].type).toBe('error');
    });

    it('should use default duration of 5000ms for errors', () => {
      service.error('Test error');

      expect(progressFeedbackMock.showNotification).toHaveBeenCalledWith(
        '错误',
        'Test error',
        'error',
        5000,
        undefined,
        false
      );
    });

    it('should allow custom duration for errors', () => {
      service.error('Test error', 10000);

      expect(progressFeedbackMock.showNotification).toHaveBeenCalledWith(
        '错误',
        'Test error',
        'error',
        10000,
        undefined,
        false
      );
    });
  });

  describe('warning()', () => {
    it('should show warning toast', () => {
      service.warning('Test warning message');

      const toasts = service.getToasts();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe('Test warning message');
      expect(toasts[0].type).toBe('warning');
    });

    it('should use default duration of 4000ms for warnings', () => {
      service.warning('Test warning');

      expect(progressFeedbackMock.showNotification).toHaveBeenCalledWith(
        '警告',
        'Test warning',
        'warning',
        4000,
        undefined,
        false
      );
    });
  });

  describe('info()', () => {
    it('should show info toast', () => {
      service.info('Test info message');

      const toasts = service.getToasts();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe('Test info message');
      expect(toasts[0].type).toBe('info');
    });

    it('should use default duration of 3000ms for info', () => {
      service.info('Test info');

      expect(progressFeedbackMock.showNotification).toHaveBeenCalledWith(
        '信息',
        'Test info',
        'info',
        3000,
        undefined,
        false
      );
    });
  });

  describe('getToasts()', () => {
    it('should return current toasts array', () => {
      service.success('Message 1');
      service.error('Message 2');

      const toasts = service.getToasts();
      expect(toasts).toHaveLength(2);
    });
  });

  describe('getToasts$()', () => {
    it('should return observable of toasts', (done) => {
      service.success('Test message');

      service.getToasts$().subscribe((toasts) => {
        expect(toasts.length).toBe(1);
        done();
      });
    });
  });

  describe('clear()', () => {
    it('should clear all toasts', () => {
      service.success('Message 1');
      service.error('Message 2');
      service.clear();

      expect(service.getToasts()).toEqual([]);
    });

    it('should call clearAllNotifications on ProgressFeedbackService', () => {
      service.clear();

      expect(progressFeedbackMock.clearAllNotifications).toHaveBeenCalled();
    });
  });

  describe('Auto-remove functionality', () => {
    it('should auto-remove toast after duration', fakeAsync(() => {
      service.success('Test message', 1000);

      expect(service.getToasts()).toHaveLength(1);

      tick(1100);

      expect(service.getToasts()).toHaveLength(0);
    }));

    it('should not auto-remove toast with duration 0', fakeAsync(() => {
      service.success('Test message', 0);

      expect(service.getToasts()).toHaveLength(1);

      tick(5000);

      // Should still be there since duration is 0
      expect(service.getToasts()).toHaveLength(1);
    }));
  });

  describe('Multiple toasts', () => {
    it('should handle multiple toasts', () => {
      service.success('Success 1');
      service.error('Error 1');
      service.warning('Warning 1');
      service.info('Info 1');

      const toasts = service.getToasts();
      expect(toasts).toHaveLength(4);
    });

    it('should maintain toast order', () => {
      service.success('First');
      service.error('Second');
      service.warning('Third');

      const toasts = service.getToasts();
      expect(toasts[0].type).toBe('success');
      expect(toasts[1].type).toBe('error');
      expect(toasts[2].type).toBe('warning');
    });
  });

  describe('ProgressFeedbackService integration', () => {
    it('should call showNotification with correct title for success', () => {
      service.success('Test');

      expect(progressFeedbackMock.showNotification).toHaveBeenCalledWith(
        '成功',
        'Test',
        'success',
        3000,
        undefined,
        false
      );
    });

    it('should call showNotification with correct title for error', () => {
      service.error('Test');

      expect(progressFeedbackMock.showNotification).toHaveBeenCalledWith(
        '错误',
        'Test',
        'error',
        5000,
        undefined,
        false
      );
    });

    it('should call showNotification with correct title for warning', () => {
      service.warning('Test');

      expect(progressFeedbackMock.showNotification).toHaveBeenCalledWith(
        '警告',
        'Test',
        'warning',
        4000,
        undefined,
        false
      );
    });

    it('should call showNotification with correct title for info', () => {
      service.info('Test');

      expect(progressFeedbackMock.showNotification).toHaveBeenCalledWith(
        '信息',
        'Test',
        'info',
        3000,
        undefined,
        false
      );
    });
  });

  describe('Toast removal', () => {
    it('should remove specific toast', fakeAsync(() => {
      service.success('Keep this', 10000);
      service.error('Remove this', 1000);

      tick(1100);

      const toasts = service.getToasts();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe('Keep this');
    }));
  });
});
