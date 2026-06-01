import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AriaLiveComponent, type LiveMessage } from './aria-live.component';
import { AccessibilityService } from '../../../services/accessibility/accessibility.service';

describe('AriaLiveComponent', () => {
  let component: AriaLiveComponent;
  let fixture: ComponentFixture<AriaLiveComponent>;
  let accessibilityService: jest.Mocked<AccessibilityService>;

  beforeEach(async () => {
    const mockAccessibilityService = {
      accessibilityState: jest.fn().mockReturnValue({
        liveMessages: [],
      }),
    };

    await TestBed.configureTestingModule({
      imports: [AriaLiveComponent],
      providers: [
        { provide: AccessibilityService, useValue: mockAccessibilityService },
      ],
    }).compileComponents();

    accessibilityService = TestBed.inject(
      AccessibilityService,
    ) as jest.Mocked<AccessibilityService>;

    fixture = TestBed.createComponent(AriaLiveComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render aria-live container', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector(
        '.aria-live-container',
      );
      expect(container).toBeTruthy();
    });

    it('should render polite region', () => {
      fixture.detectChanges();

      const politeRegion =
        fixture.nativeElement.querySelector('.aria-live-polite');
      expect(politeRegion).toBeTruthy();
      expect(politeRegion.getAttribute('aria-live')).toBe('polite');
      expect(politeRegion.getAttribute('aria-atomic')).toBe('true');
    });

    it('should render assertive region', () => {
      fixture.detectChanges();

      const assertiveRegion = fixture.nativeElement.querySelector(
        '.aria-live-assertive',
      );
      expect(assertiveRegion).toBeTruthy();
      expect(assertiveRegion.getAttribute('aria-live')).toBe('assertive');
      expect(assertiveRegion.getAttribute('aria-atomic')).toBe('true');
    });

    it('should render status region', () => {
      fixture.detectChanges();

      const statusRegion =
        fixture.nativeElement.querySelector('.aria-live-status');
      expect(statusRegion).toBeTruthy();
      expect(statusRegion.getAttribute('role')).toBe('status');
    });

    it('should render alert region', () => {
      fixture.detectChanges();

      const alertRegion =
        fixture.nativeElement.querySelector('.aria-live-alert');
      expect(alertRegion).toBeTruthy();
      expect(alertRegion.getAttribute('role')).toBe('alert');
    });
  });

  describe('Input/Output Tests', () => {
    it('should initialize with empty message arrays', () => {
      expect(component.politeMessages).toEqual([]);
      expect(component.assertiveMessages).toEqual([]);
      expect(component.currentStatus).toBe('');
      expect(component.currentAlert).toBe('');
    });

    it('should update messages from service', () => {
      const mockMessages: LiveMessage[] = [
        {
          id: '1',
          message: 'Test polite message',
          priority: 'polite',
          timestamp: Date.now(),
        },
        {
          id: '2',
          message: 'Test assertive message',
          priority: 'assertive',
          timestamp: Date.now(),
        },
      ];

      accessibilityService.accessibilityState.mockReturnValue({
        liveMessages: mockMessages,
      });

      fixture.detectChanges();

      expect(component.politeMessages.length).toBe(1);
      expect(component.assertiveMessages.length).toBe(1);
      expect(component.politeMessages[0].message).toBe('Test polite message');
      expect(component.assertiveMessages[0].message).toBe(
        'Test assertive message',
      );
    });

    it('should filter messages by priority correctly', () => {
      const mockMessages: LiveMessage[] = [
        { id: '1', message: 'Polite 1', priority: 'polite', timestamp: 1000 },
        { id: '2', message: 'Polite 2', priority: 'polite', timestamp: 2000 },
        {
          id: '3',
          message: 'Assertive 1',
          priority: 'assertive',
          timestamp: 3000,
        },
      ];

      accessibilityService.accessibilityState.mockReturnValue({
        liveMessages: mockMessages,
      });

      fixture.detectChanges();

      expect(component.politeMessages.length).toBe(2);
      expect(component.assertiveMessages.length).toBe(1);
    });
  });

  describe('Service Integration Tests', () => {
    it('should call accessibilityState on init', () => {
      fixture.detectChanges();

      expect(accessibilityService.accessibilityState).toHaveBeenCalled();
    });

    it('should update currentStatus with latest polite message', () => {
      const now = Date.now();
      const mockMessages: LiveMessage[] = [
        {
          id: '1',
          message: 'Status update',
          priority: 'polite',
          timestamp: now,
        },
      ];

      accessibilityService.accessibilityState.mockReturnValue({
        liveMessages: mockMessages,
      });

      fixture.detectChanges();

      expect(component.currentStatus).toBe('Status update');
    });

    it('should clear status when message is older than 5 seconds', () => {
      const oldTimestamp = Date.now() - 6000;
      const mockMessages: LiveMessage[] = [
        {
          id: '1',
          message: 'Old message',
          priority: 'polite',
          timestamp: oldTimestamp,
        },
      ];

      accessibilityService.accessibilityState.mockReturnValue({
        liveMessages: mockMessages,
      });

      fixture.detectChanges();

      expect(component.currentStatus).toBe('');
    });
  });

  describe('Accessibility Tests', () => {
    it('should have aria-relevant attribute set to all', () => {
      fixture.detectChanges();

      const politeRegion =
        fixture.nativeElement.querySelector('.aria-live-polite');
      expect(politeRegion.getAttribute('aria-relevant')).toBe('all');
    });

    it('should hide container from visual view', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector(
        '.aria-live-container',
      );
      const styles = window.getComputedStyle(container);
      expect(styles.position).toBe('absolute');
    });
  });

  describe('TrackBy Tests', () => {
    it('should track messages by id', () => {
      const message: LiveMessage = {
        id: 'test-id',
        message: 'Test',
        priority: 'polite',
        timestamp: Date.now(),
      };

      const result = component.trackByMessageId(0, message);
      expect(result).toBe('test-id');
    });
  });

  describe('Lifecycle Tests', () => {
    it('should unsubscribe on destroy', () => {
      const unsubscribeSpy = jest.spyOn(
        component['subscription'],
        'unsubscribe',
      );

      fixture.destroy();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });
  });
});
