import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { StatusNotificationsComponent } from './status-notifications.component';
import { ProgressFeedbackService } from '../../../services/feedback/progress-feedback.service';

describe('StatusNotificationsComponent', () => {
  let component: StatusNotificationsComponent;
  let fixture: ComponentFixture<StatusNotificationsComponent>;
  let feedbackService: jest.Mocked<ProgressFeedbackService>;

  beforeEach(async () => {
    const mockFeedbackService = {
      notifications: jest.fn().mockReturnValue([]),
      globalLoading: jest.fn().mockReturnValue({
        isLoading: false,
        message: '',
        progress: undefined,
        stage: undefined,
      }),
      removeNotification: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [StatusNotificationsComponent],
      providers: [
        { provide: ProgressFeedbackService, useValue: mockFeedbackService },
      ],
    }).compileComponents();

    feedbackService = TestBed.inject(
      ProgressFeedbackService,
    ) as jest.Mocked<ProgressFeedbackService>;

    fixture = TestBed.createComponent(StatusNotificationsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should not render notifications container when no notifications', () => {
      feedbackService.notifications.mockReturnValue([]);
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector(
        '.notifications-container',
      );
      expect(container).toBeFalsy();
    });

    it('should render notifications when present', () => {
      feedbackService.notifications.mockReturnValue([
        {
          id: '1',
          type: 'info',
          title: 'Test Title',
          message: 'Test Message',
          persistent: false,
        },
      ]);
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector(
        '.notifications-container',
      );
      expect(container).toBeTruthy();
    });

    it('should render notification with correct structure', () => {
      feedbackService.notifications.mockReturnValue([
        {
          id: '1',
          type: 'info',
          title: 'Test Title',
          message: 'Test Message',
          persistent: false,
        },
      ]);
      fixture.detectChanges();

      const notification = fixture.nativeElement.querySelector('.notification');
      expect(notification).toBeTruthy();

      const title = notification.querySelector('.notification-title');
      const message = notification.querySelector('.notification-message');
      expect(title.textContent).toBe('Test Title');
      expect(message.textContent).toBe('Test Message');
    });

    it('should render global loading overlay when loading', () => {
      feedbackService.globalLoading.mockReturnValue({
        isLoading: true,
        message: 'Loading...',
        progress: 50,
        stage: 'Processing',
      });
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector(
        '.global-loading-overlay',
      );
      expect(overlay).toBeTruthy();
    });

    it('should not render global loading overlay when not loading', () => {
      feedbackService.globalLoading.mockReturnValue({
        isLoading: false,
        message: '',
      });
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector(
        '.global-loading-overlay',
      );
      expect(overlay).toBeFalsy();
    });
  });

  describe('Input/Output Tests', () => {
    it('should expose notifications from service', () => {
      const mockNotifications = [
        {
          id: '1',
          type: 'info',
          title: 'Test',
          message: 'Test',
          persistent: false,
        },
      ];
      feedbackService.notifications.mockReturnValue(mockNotifications);
      fixture.detectChanges();

      expect(component.notifications()).toEqual(mockNotifications);
    });

    it('should expose global loading state from service', () => {
      const mockLoading = {
        isLoading: true,
        message: 'Loading',
        progress: 75,
        stage: 'Step 2',
      };
      feedbackService.globalLoading.mockReturnValue(mockLoading);
      fixture.detectChanges();

      expect(component.globalLoading()).toEqual(mockLoading);
    });

    it('should return true from hasNotifications when notifications exist', () => {
      feedbackService.notifications.mockReturnValue([
        {
          id: '1',
          type: 'info',
          title: 'Test',
          message: 'Test',
          persistent: false,
        },
      ]);
      fixture.detectChanges();

      expect(component.hasNotifications()).toBe(true);
    });

    it('should return false from hasNotifications when no notifications', () => {
      feedbackService.notifications.mockReturnValue([]);
      fixture.detectChanges();

      expect(component.hasNotifications()).toBe(false);
    });
  });

  describe('Event Trigger Tests', () => {
    it('should call removeNotification when close button clicked', () => {
      const notification = {
        id: '1',
        type: 'info',
        title: 'Test',
        message: 'Test',
        persistent: false,
      };
      feedbackService.notifications.mockReturnValue([notification]);
      fixture.detectChanges();

      const closeBtn = fixture.nativeElement.querySelector(
        '.notification-close',
      );
      closeBtn.click();

      expect(feedbackService.removeNotification).toHaveBeenCalledWith('1');
    });

    it('should call closeNotification method', () => {
      const closeSpy = jest.spyOn(component, 'closeNotification');
      component.closeNotification('test-id');

      expect(closeSpy).toHaveBeenCalledWith('test-id');
      expect(feedbackService.removeNotification).toHaveBeenCalledWith(
        'test-id',
      );
    });

    it('should handle action when action button clicked', () => {
      const actionHandler = jest.fn();
      const notification = {
        id: '1',
        type: 'info',
        title: 'Test',
        message: 'Test',
        persistent: false,
        action: {
          label: 'Action',
          handler: actionHandler,
        },
      };
      feedbackService.notifications.mockReturnValue([notification]);
      fixture.detectChanges();

      const actionBtn = fixture.nativeElement.querySelector(
        '.notification-action',
      );
      actionBtn.click();

      expect(actionHandler).toHaveBeenCalled();
    });
  });

  describe('Service Integration Tests', () => {
    it('should initialize notification timers on init', () => {
      feedbackService.notifications.mockReturnValue([
        {
          id: '1',
          type: 'info',
          title: 'Test',
          message: 'Test',
          persistent: false,
          duration: 3000,
        },
      ]);

      fixture.detectChanges();

      expect(component['notificationTimers'].size).toBeGreaterThan(0);
    });

    it('should clear timers on destroy', () => {
      component['notificationTimers'].set('1', 123);
      const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');

      fixture.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalledWith(123);
    });

    it('should clear existing timers when setting up new ones', () => {
      const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');

      feedbackService.notifications.mockReturnValue([
        {
          id: '1',
          type: 'info',
          title: 'Test',
          message: 'Test',
          persistent: false,
          duration: 3000,
        },
      ]);

      fixture.detectChanges();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('Helper Method Tests', () => {
    it('should get correct notification classes', () => {
      const notification = {
        id: '1',
        type: 'success',
        title: 'Test',
        message: 'Test',
        persistent: true,
        action: { label: 'Action', handler: jest.fn() },
      };

      const classes = component.getNotificationClasses(notification);

      expect(classes).toContain('notification');
      expect(classes).toContain('notification-success');
      expect(classes).toContain('notification-persistent');
      expect(classes).toContain('notification-with-action');
    });

    it('should return correct icons for notification types', () => {
      expect(component.getNotificationIcon('info')).toBe('🔵');
      expect(component.getNotificationIcon('success')).toBe('✅');
      expect(component.getNotificationIcon('warning')).toBe('⚠️');
      expect(component.getNotificationIcon('error')).toBe('❌');
    });

    it('should return default icon for unknown type', () => {
      expect(component.getNotificationIcon('unknown')).toBe('🔵');
    });

    it('should track by notification id', () => {
      const notification = {
        id: 'test-id',
        type: 'info',
        title: 'Test',
        message: 'Test',
        persistent: false,
      };

      const result = component.trackByNotificationId(0, notification);
      expect(result).toBe('test-id');
    });
  });

  describe('Progress Bar Tests', () => {
    it('should render progress bar for non-persistent notifications with duration', () => {
      feedbackService.notifications.mockReturnValue([
        {
          id: '1',
          type: 'info',
          title: 'Test',
          message: 'Test',
          persistent: false,
          duration: 5000,
        },
      ]);
      fixture.detectChanges();

      const progressBar = fixture.nativeElement.querySelector(
        '.notification-progress',
      );
      expect(progressBar).toBeTruthy();
    });

    it('should not render progress bar for persistent notifications', () => {
      feedbackService.notifications.mockReturnValue([
        {
          id: '1',
          type: 'info',
          title: 'Test',
          message: 'Test',
          persistent: true,
          duration: 5000,
        },
      ]);
      fixture.detectChanges();

      const progressBar = fixture.nativeElement.querySelector(
        '.notification-progress',
      );
      expect(progressBar).toBeFalsy();
    });
  });

  describe('Global Loading Tests', () => {
    it('should display loading message', () => {
      feedbackService.globalLoading.mockReturnValue({
        isLoading: true,
        message: 'Processing data...',
        progress: undefined,
        stage: undefined,
      });
      fixture.detectChanges();

      const message = fixture.nativeElement.querySelector('.loading-message');
      expect(message.textContent).toBe('Processing data...');
    });

    it('should display progress bar when progress is provided', () => {
      feedbackService.globalLoading.mockReturnValue({
        isLoading: true,
        message: 'Loading',
        progress: 50,
        stage: undefined,
      });
      fixture.detectChanges();

      const progressBar =
        fixture.nativeElement.querySelector('.loading-progress');
      expect(progressBar).toBeTruthy();

      const progressFill = progressBar.querySelector('.progress-fill');
      expect(progressFill.style.width).toBe('50%');
    });

    it('should display stage when provided', () => {
      feedbackService.globalLoading.mockReturnValue({
        isLoading: true,
        message: 'Loading',
        progress: 50,
        stage: 'Step 3 of 5',
      });
      fixture.detectChanges();

      const stage = fixture.nativeElement.querySelector('.loading-stage');
      expect(stage.textContent).toBe('Step 3 of 5');
    });
  });

  describe('Lifecycle Tests', () => {
    it('should complete destroy$ on destroy', () => {
      const nextSpy = jest.spyOn(component['destroy$'], 'next');
      const completeSpy = jest.spyOn(component['destroy$'], 'complete');

      fixture.destroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should setup notification timers on init', () => {
      const setupTimersSpy = jest.spyOn(
        component as any,
        'setupNotificationTimers',
      );

      feedbackService.notifications.mockReturnValue([
        {
          id: '1',
          type: 'info',
          title: 'Test',
          message: 'Test',
          persistent: false,
          duration: 1000,
        },
      ]);
      fixture.detectChanges();

      expect(setupTimersSpy).toHaveBeenCalled();
    });
  });

  describe('Accessibility Tests', () => {
    it('should have aria-label on close button', () => {
      feedbackService.notifications.mockReturnValue([
        {
          id: '1',
          type: 'info',
          title: 'Test',
          message: 'Test',
          persistent: false,
        },
      ]);
      fixture.detectChanges();

      const closeBtn = fixture.nativeElement.querySelector(
        '.notification-close',
      );
      expect(closeBtn.getAttribute('aria-label')).toBe('关闭通知');
    });

    it('should have button type on action buttons', () => {
      feedbackService.notifications.mockReturnValue([
        {
          id: '1',
          type: 'info',
          title: 'Test',
          message: 'Test',
          persistent: false,
          action: { label: 'Action', handler: jest.fn() },
        },
      ]);
      fixture.detectChanges();

      const actionBtn = fixture.nativeElement.querySelector(
        '.notification-action',
      );
      expect(actionBtn.getAttribute('type')).toBe('button');
    });

    it('should have button type on close buttons', () => {
      feedbackService.notifications.mockReturnValue([
        {
          id: '1',
          type: 'info',
          title: 'Test',
          message: 'Test',
          persistent: false,
        },
      ]);
      fixture.detectChanges();

      const closeBtn = fixture.nativeElement.querySelector(
        '.notification-close',
      );
      expect(closeBtn.getAttribute('type')).toBe('button');
    });
  });
});
