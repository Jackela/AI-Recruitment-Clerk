import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AriaLiveComponent, LiveMessage } from './aria-live.component';
import { AccessibilityService } from '../../../services/accessibility/accessibility.service';

class MockAccessibilityService {
  accessibilityState = signal({
    liveMessages: [] as LiveMessage[],
  });
}

const buildMessage = (
  id: string,
  message: string,
  priority: 'polite' | 'assertive',
  timestamp = Date.now(),
): LiveMessage => ({ id, message, priority, timestamp });

describe('AriaLiveComponent', () => {
  let fixture: ComponentFixture<AriaLiveComponent>;
  let component: AriaLiveComponent;
  let mockService: MockAccessibilityService;

  beforeEach(async () => {
    mockService = new MockAccessibilityService();

    await TestBed.configureTestingModule({
      imports: [AriaLiveComponent],
      providers: [
        { provide: AccessibilityService, useValue: mockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AriaLiveComponent);
    component = fixture.componentInstance;
  });

  it('renders polite and assertive messages with correct aria attributes', () => {
    const now = Date.now();
    mockService.accessibilityState.set({
      liveMessages: [
        buildMessage('1', 'Hello polite', 'polite', now),
        buildMessage('2', 'Hello assertive', 'assertive', now),
      ],
    });

    fixture.detectChanges();

    const politeRegion = fixture.nativeElement.querySelector('.aria-live-polite');
    const assertiveRegion = fixture.nativeElement.querySelector('.aria-live-assertive');
    expect(politeRegion.getAttribute('aria-live')).toBe('polite');
    expect(politeRegion.getAttribute('aria-relevant')).toBe('all');
    expect(assertiveRegion.getAttribute('aria-live')).toBe('assertive');
    expect(assertiveRegion.getAttribute('aria-relevant')).toBe('all');

    const politeMessages = politeRegion.querySelectorAll('.live-message');
    const assertiveMessages = assertiveRegion.querySelectorAll('.live-message');
    expect(politeMessages.length).toBe(1);
    expect(assertiveMessages.length).toBe(1);
  });

  it('updates status and alert regions from latest messages', () => {
    const recent = Date.now();
    mockService.accessibilityState.set({
      liveMessages: [
        buildMessage('p1', 'Status update', 'polite', recent),
        buildMessage('a1', 'Alert update', 'assertive', recent),
      ],
    });

    fixture.detectChanges();

    const statusRegion = fixture.nativeElement.querySelector('.aria-live-status .status-message');
    const alertRegion = fixture.nativeElement.querySelector('.aria-live-alert .alert-message');
    expect(statusRegion.textContent).toContain('Status update');
    expect(alertRegion.textContent).toContain('Alert update');
  });
});
