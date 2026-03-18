import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ProgressLogComponent } from './progress-log.component';
import type { ProgressMessage } from './progress-tracker.types';

describe('ProgressLogComponent', () => {
  let component: ProgressLogComponent;
  let fixture: ComponentFixture<ProgressLogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressLogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressLogComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render message log container', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.message-log');
      expect(container).toBeTruthy();
    });

    it('should render log header', () => {
      fixture.detectChanges();

      const header = fixture.nativeElement.querySelector('h4');
      expect(header).toBeTruthy();
      expect(header.textContent).toBe('实时日志');
    });

    it('should render log container', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.log-container');
      expect(container).toBeTruthy();
    });

    it('should render log entries for each message', () => {
      component.messages = [
        { type: 'info', message: 'Test 1', timestamp: new Date() },
        { type: 'success', message: 'Test 2', timestamp: new Date() },
      ];
      fixture.detectChanges();

      const entries = fixture.nativeElement.querySelectorAll('.log-entry');
      expect(entries.length).toBe(2);
    });
  });

  describe('Input/Output Tests', () => {
    it('should have default empty messages array', () => {
      expect(component.messages).toEqual([]);
    });

    it('should have default maxMessages value', () => {
      expect(component.maxMessages).toBe(20);
    });

    it('should bind messages input correctly', () => {
      const messages: ProgressMessage[] = [
        { type: 'info', message: 'Test', timestamp: new Date() },
      ];
      component.messages = messages;
      fixture.detectChanges();

      expect(component.messages).toEqual(messages);
    });

    it('should bind maxMessages input correctly', () => {
      component.maxMessages = 10;
      fixture.detectChanges();

      expect(component.maxMessages).toBe(10);
    });
  });

  describe('Display Messages Tests', () => {
    it('should return all messages when under maxMessages', () => {
      component.messages = [
        { type: 'info', message: '1', timestamp: new Date() },
        { type: 'info', message: '2', timestamp: new Date() },
        { type: 'info', message: '3', timestamp: new Date() },
      ];
      component.maxMessages = 5;

      expect(component.displayMessages.length).toBe(3);
    });

    it('should limit messages to maxMessages', () => {
      component.messages = Array(25)
        .fill(null)
        .map((_, i) => ({
          type: 'info' as const,
          message: `Message ${i}`,
          timestamp: new Date(),
        }));
      component.maxMessages = 20;

      expect(component.displayMessages.length).toBe(20);
    });

    it('should show most recent messages', () => {
      const dates = Array(5)
        .fill(null)
        .map((_, i) => new Date(2024, 0, 1, 0, 0, i));
      component.messages = dates.map((date, i) => ({
        type: 'info' as const,
        message: `Message ${i}`,
        timestamp: date,
      }));
      component.maxMessages = 3;

      const display = component.displayMessages;
      expect(display.length).toBe(3);
      expect(display[0].message).toBe('Message 2');
      expect(display[2].message).toBe('Message 4');
    });
  });

  describe('Timestamp Formatting Tests', () => {
    it('should format timestamp correctly', () => {
      const date = new Date(2024, 0, 1, 14, 30, 45);
      const formatted = component.formatTimestamp(date);

      expect(formatted).toBe('14:30:45');
    });

    it('should pad single digits', () => {
      const date = new Date(2024, 0, 1, 9, 5, 3);
      const formatted = component.formatTimestamp(date);

      expect(formatted).toBe('09:05:03');
    });

    it('should use 24-hour format', () => {
      const date = new Date(2024, 0, 1, 23, 59, 59);
      const formatted = component.formatTimestamp(date);

      expect(formatted).toBe('23:59:59');
    });
  });

  describe('Message Type Styling Tests', () => {
    it('should apply error class to error messages', () => {
      component.messages = [
        { type: 'error', message: 'Error occurred', timestamp: new Date() },
      ];
      fixture.detectChanges();

      const entry = fixture.nativeElement.querySelector('.log-entry');
      expect(entry.classList.contains('error')).toBe(true);
    });

    it('should apply progress class to progress messages', () => {
      component.messages = [
        { type: 'progress', message: '50% complete', timestamp: new Date() },
      ];
      fixture.detectChanges();

      const entry = fixture.nativeElement.querySelector('.log-entry');
      expect(entry.classList.contains('progress')).toBe(true);
    });

    it('should apply info class to info messages', () => {
      component.messages = [
        { type: 'info', message: 'Info message', timestamp: new Date() },
      ];
      fixture.detectChanges();

      const entry = fixture.nativeElement.querySelector('.log-entry');
      expect(entry.classList.contains('info')).toBe(true);
    });
  });

  describe('Log Entry Structure Tests', () => {
    it('should render timestamp in log entry', () => {
      const timestamp = new Date(2024, 0, 1, 12, 0, 0);
      component.messages = [{ type: 'info', message: 'Test', timestamp }];
      fixture.detectChanges();

      const timestampEl = fixture.nativeElement.querySelector('.timestamp');
      expect(timestampEl).toBeTruthy();
      expect(timestampEl.textContent).toBe('12:00:00');
    });

    it('should render message text in log entry', () => {
      component.messages = [
        { type: 'info', message: 'Test message', timestamp: new Date() },
      ];
      fixture.detectChanges();

      const messageEl = fixture.nativeElement.querySelector('.message');
      expect(messageEl).toBeTruthy();
      expect(messageEl.textContent).toBe('Test message');
    });
  });

  describe('TrackBy Tests', () => {
    it('should track messages by timestamp and index', () => {
      const timestamp = new Date(2024, 0, 1, 12, 0, 0);
      const message: ProgressMessage = {
        type: 'info',
        message: 'Test',
        timestamp,
      };

      const result = component.trackByMessage(5, message);
      expect(result).toBe(`${timestamp.getTime()}_5`);
    });
  });
});
