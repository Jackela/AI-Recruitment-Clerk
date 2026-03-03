import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ProgressFeedbackService, ProgressUpdate, StatusNotification, LoadingState } from './progress-feedback.service';

describe('ProgressFeedbackService', () => {
  let service: ProgressFeedbackService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProgressFeedbackService],
    });
    service = TestBed.inject(ProgressFeedbackService);
    service.reset();
  });

  afterEach(() => {
    service.reset();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with empty progress updates', () => {
      expect(service.progressUpdates()).toEqual([]);
    });

    it('should initialize with empty notifications', () => {
      expect(service.notifications()).toEqual([]);
    });

    it('should initialize with not loading state', () => {
      expect(service.globalLoading().isLoading).toBe(false);
    });
  });

  describe('startProgress()', () => {
    it('should start a new progress operation', () => {
      service.startProgress('test-op', 'Starting operation');

      const updates = service.progressUpdates();
      expect(updates).toHaveLength(1);
      expect(updates[0].id).toBe('test-op');
      expect(updates[0].message).toBe('Starting operation');
      expect(updates[0].progress).toBe(0);
      expect(updates[0].type).toBe('info');
    });

    it('should track multiple operations', () => {
      service.startProgress('op1', 'Operation 1');
      service.startProgress('op2', 'Operation 2');

      expect(service.progressUpdates()).toHaveLength(2);
    });
  });

  describe('updateProgress()', () => {
    it('should update existing progress', () => {
      service.startProgress('test-op', 'Starting');
      service.updateProgress('test-op', 50, 'Halfway');

      const updates = service.progressUpdates();
      expect(updates[0].progress).toBe(50);
      expect(updates[0].message).toBe('Halfway');
    });

    it('should clamp progress to valid range', () => {
      service.startProgress('test-op', 'Starting');
      service.updateProgress('test-op', 150, 'Over 100');

      expect(service.progressUpdates()[0].progress).toBe(100);
    });

    it('should clamp negative progress to 0', () => {
      service.startProgress('test-op', 'Starting');
      service.updateProgress('test-op', -50, 'Negative');

      expect(service.progressUpdates()[0].progress).toBe(0);
    });

    it('should not update non-existent operation', () => {
      service.updateProgress('non-existent', 50, 'Update');

      expect(service.progressUpdates()).toHaveLength(0);
    });

    it('should update stage when provided', () => {
      service.startProgress('test-op', 'Starting');
      service.updateProgress('test-op', 50, 'Processing', 'processing');

      expect(service.progressUpdates()[0].stage).toBe('processing');
    });

    it('should update type when provided', () => {
      service.startProgress('test-op', 'Starting');
      service.updateProgress('test-op', 50, 'Warning', undefined, 'warning');

      expect(service.progressUpdates()[0].type).toBe('warning');
    });

    it('should auto-complete at 100%', fakeAsync(() => {
      service.startProgress('test-op', 'Starting');
      service.updateProgress('test-op', 100, 'Done');

      expect(service.progressUpdates()[0].progress).toBe(100);

      // Auto-complete timeout is 1500ms, then removal is 3000ms
      tick(1500); // First timeout triggers completeProgress
      tick(3100); // Second timeout removes from list

      // Should be removed after auto-complete
      expect(service.progressUpdates()).toHaveLength(0);
    }));
  });

  describe('completeProgress()', () => {
    it('should complete progress with default message', () => {
      service.startProgress('test-op', 'Starting');
      service.completeProgress('test-op');

      expect(service.progressUpdates()[0].progress).toBe(100);
      expect(service.progressUpdates()[0].message).toBe('完成');
      expect(service.progressUpdates()[0].type).toBe('success');
    });

    it('should complete progress with custom message', () => {
      service.startProgress('test-op', 'Starting');
      service.completeProgress('test-op', 'All done!');

      expect(service.progressUpdates()[0].message).toBe('All done!');
    });

    it('should not complete non-existent operation', () => {
      service.completeProgress('non-existent', 'Done');

      expect(service.progressUpdates()).toHaveLength(0);
    });

    it('should remove completed progress after delay', fakeAsync(() => {
      service.startProgress('test-op', 'Starting');
      service.completeProgress('test-op');

      expect(service.progressUpdates()).toHaveLength(1);

      tick(3100);

      expect(service.progressUpdates()).toHaveLength(0);
    }));
  });

  describe('errorProgress()', () => {
    it('should set error state', () => {
      service.startProgress('test-op', 'Starting');
      service.errorProgress('test-op', 'Something went wrong');

      expect(service.progressUpdates()[0].type).toBe('error');
      expect(service.progressUpdates()[0].message).toBe('Something went wrong');
    });

    it('should not error non-existent operation', () => {
      service.errorProgress('non-existent', 'Error');

      expect(service.progressUpdates()).toHaveLength(0);
    });

    it('should remove error progress after delay', fakeAsync(() => {
      service.startProgress('test-op', 'Starting');
      service.errorProgress('test-op', 'Error');

      expect(service.progressUpdates()).toHaveLength(1);

      tick(5100);

      expect(service.progressUpdates()).toHaveLength(0);
    }));
  });

  describe('showNotification()', () => {
    it('should show notification', () => {
      const id = service.showNotification('Test Title', 'Test message');

      expect(id).toMatch(/^notification-\d+$/);
      expect(service.notifications()).toHaveLength(1);
    });

    it('should show notification with all options', () => {
      const action = { label: 'Click', handler: jest.fn() };
      service.showNotification('Title', 'Message', 'success', 5000, action, true);

      const notifications = service.notifications();
      expect(notifications[0].title).toBe('Title');
      expect(notifications[0].message).toBe('Message');
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].duration).toBe(5000);
      expect(notifications[0].action).toEqual(action);
      expect(notifications[0].persistent).toBe(true);
    });

    it('should auto-remove non-persistent notification', fakeAsync(() => {
      service.showNotification('Title', 'Message', 'info', 1000);

      expect(service.notifications()).toHaveLength(1);

      tick(1100);

      expect(service.notifications()).toHaveLength(0);
    }));

    it('should not auto-remove persistent notification', fakeAsync(() => {
      service.showNotification('Title', 'Message', 'info', 1000, undefined, true);

      expect(service.notifications()).toHaveLength(1);

      tick(1100);

      expect(service.notifications()).toHaveLength(1);
    }));
  });

  describe('Convenience notification methods', () => {
    it('showSuccess() should show success notification', () => {
      service.showSuccess('Title', 'Message');

      expect(service.notifications()[0].type).toBe('success');
    });

    it('showError() should show persistent error notification', () => {
      service.showError('Title', 'Message');

      expect(service.notifications()[0].type).toBe('error');
      expect(service.notifications()[0].persistent).toBe(true);
    });

    it('showWarning() should show warning notification', () => {
      service.showWarning('Title', 'Message');

      expect(service.notifications()[0].type).toBe('warning');
    });

    it('showInfo() should show info notification', () => {
      service.showInfo('Title', 'Message');

      expect(service.notifications()[0].type).toBe('info');
    });
  });

  describe('removeNotification()', () => {
    it('should remove specific notification', () => {
      const id = service.showNotification('Title', 'Message');
      service.removeNotification(id);

      expect(service.notifications()).toHaveLength(0);
    });
  });

  describe('clearAllNotifications()', () => {
    it('should clear all notifications', () => {
      service.showNotification('Title 1', 'Message 1');
      service.showNotification('Title 2', 'Message 2');
      service.clearAllNotifications();

      expect(service.notifications()).toHaveLength(0);
    });
  });

  describe('Loading state methods', () => {
    it('startLoading() should start loading state', () => {
      service.startLoading('test-key', 'Loading...');

      expect(service.globalLoading().isLoading).toBe(true);
      expect(service.globalLoading().message).toBe('Loading...');
    });

    it('startLoading() should track progress', () => {
      service.startLoading('test-key', 'Loading...', 25);

      expect(service.globalLoading().progress).toBe(25);
    });

    it('updateLoading() should update existing state', () => {
      service.startLoading('test-key', 'Loading...');
      service.updateLoading('test-key', 'Still loading...', 50, 'processing');

      const loading = service.globalLoading();
      expect(loading.message).toBe('Still loading...');
      expect(loading.progress).toBe(50);
      expect(loading.stage).toBe('processing');
    });

    it('updateLoading() should not affect non-existent key', () => {
      service.updateLoading('non-existent', 'Update');

      expect(service.globalLoading().isLoading).toBe(false);
    });

    it('stopLoading() should stop loading', () => {
      service.startLoading('test-key', 'Loading...');
      service.stopLoading('test-key');

      expect(service.globalLoading().isLoading).toBe(false);
    });

    it('should use most recent loading state with multiple keys', () => {
      service.startLoading('key1', 'Loading 1');
      service.startLoading('key2', 'Loading 2');

      expect(service.globalLoading().message).toBe('Loading 2');
    });
  });

  describe('Helper methods', () => {
    it('isOperationActive() should return true for active operation', () => {
      service.startProgress('test-op', 'Starting');

      expect(service.isOperationActive('test-op')).toBe(true);
    });

    it('isOperationActive() should return false for inactive operation', () => {
      expect(service.isOperationActive('non-existent')).toBe(false);
    });

    it('getOperationProgress() should return progress', () => {
      service.startProgress('test-op', 'Starting');
      service.updateProgress('test-op', 75, 'Progress');

      expect(service.getOperationProgress('test-op')).toBe(75);
    });

    it('getOperationProgress() should return 0 for non-existent', () => {
      expect(service.getOperationProgress('non-existent')).toBe(0);
    });

    it('hasActiveOperations() should return true when operations exist', () => {
      service.startProgress('test-op', 'Starting');

      expect(service.hasActiveOperations()).toBe(true);
    });

    it('hasActiveOperations() should return false when no operations', () => {
      expect(service.hasActiveOperations()).toBe(false);
    });

    it('hasNotifications() should return true when notifications exist', () => {
      service.showNotification('Title', 'Message');

      expect(service.hasNotifications()).toBe(true);
    });

    it('hasNotifications() should return false when no notifications', () => {
      expect(service.hasNotifications()).toBe(false);
    });
  });

  describe('Batch operations', () => {
    it('showBatchProgress() should start multiple operations', () => {
      service.showBatchProgress([
        { id: 'op1', message: 'Op 1' },
        { id: 'op2', message: 'Op 2' },
      ]);

      expect(service.progressUpdates()).toHaveLength(2);
    });

    it('updateBatchProgress() should update multiple operations', () => {
      service.startProgress('op1', 'Op 1');
      service.startProgress('op2', 'Op 2');

      service.updateBatchProgress([
        { id: 'op1', progress: 50 },
        { id: 'op2', progress: 75 },
      ]);

      expect(service.getOperationProgress('op1')).toBe(50);
      expect(service.getOperationProgress('op2')).toBe(75);
    });
  });

  describe('getProgressSummary()', () => {
    it('should return summary with no operations', () => {
      const summary = service.getProgressSummary();

      expect(summary.active).toBe(0);
      expect(summary.completed).toBe(0);
      expect(summary.averageProgress).toBe(0);
    });

    it('should return summary with operations', () => {
      service.startProgress('op1', 'Op 1');
      service.updateProgress('op1', 50, 'Half');
      service.startProgress('op2', 'Op 2');
      service.updateProgress('op2', 100, 'Done');

      const summary = service.getProgressSummary();

      expect(summary.active).toBe(2);
      expect(summary.completed).toBe(1);
      expect(summary.averageProgress).toBe(75);
    });
  });

  describe('reset()', () => {
    it('should reset all state', () => {
      service.startProgress('op1', 'Op 1');
      service.showNotification('Title', 'Message');
      service.startLoading('key1', 'Loading');

      service.reset();

      expect(service.progressUpdates()).toHaveLength(0);
      expect(service.notifications()).toHaveLength(0);
      expect(service.globalLoading().isLoading).toBe(false);
    });
  });
});
