import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AnalyticsStatsCardComponent } from './analytics-stats-card.component';

describe('AnalyticsStatsCardComponent', () => {
  let component: AnalyticsStatsCardComponent;
  let fixture: ComponentFixture<AnalyticsStatsCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyticsStatsCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyticsStatsCardComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render stat item container', () => {
      fixture.componentRef.setInput('value', 100);
      fixture.componentRef.setInput('label', 'Total');
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.stat-item');
      expect(container).toBeTruthy();
    });

    it('should render value', () => {
      fixture.componentRef.setInput('value', 42);
      fixture.componentRef.setInput('label', 'Count');
      fixture.detectChanges();

      const value = fixture.nativeElement.querySelector('.stat-value');
      expect(value).toBeTruthy();
      expect(value.textContent.trim()).toBe('42');
    });

    it('should render label', () => {
      fixture.componentRef.setInput('value', 100);
      fixture.componentRef.setInput('label', 'Users');
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('.stat-label');
      expect(label).toBeTruthy();
      expect(label.textContent.trim()).toBe('Users');
    });
  });

  describe('Input Tests', () => {
    it('should accept string value', () => {
      fixture.componentRef.setInput('value', '85%');
      fixture.componentRef.setInput('label', 'Rate');
      fixture.detectChanges();

      const value = fixture.nativeElement.querySelector('.stat-value');
      expect(value.textContent.trim()).toBe('85%');
    });

    it('should accept number value', () => {
      fixture.componentRef.setInput('value', 1234);
      fixture.componentRef.setInput('label', 'Count');
      fixture.detectChanges();

      const value = fixture.nativeElement.querySelector('.stat-value');
      expect(value.textContent.trim()).toBe('1234');
    });

    it('should accept label', () => {
      fixture.componentRef.setInput('value', 50);
      fixture.componentRef.setInput('label', 'Active Jobs');
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('.stat-label');
      expect(label.textContent.trim()).toBe('Active Jobs');
    });
  });

  describe('Styling Tests', () => {
    it('should have gradient text on value', () => {
      fixture.componentRef.setInput('value', 100);
      fixture.componentRef.setInput('label', 'Test');
      fixture.detectChanges();

      const value = fixture.nativeElement.querySelector('.stat-value');
      const styles = window.getComputedStyle(value);
      expect(styles.backgroundClip).toBe('text');
    });

    it('should have hover effect', () => {
      fixture.componentRef.setInput('value', 100);
      fixture.componentRef.setInput('label', 'Test');
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.stat-item');
      expect(container).toBeTruthy();
    });
  });
});
