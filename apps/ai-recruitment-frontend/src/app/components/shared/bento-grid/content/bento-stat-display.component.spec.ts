import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { BentoStatDisplayComponent } from './bento-stat-display.component';

describe('BentoStatDisplayComponent', () => {
  let component: BentoStatDisplayComponent;
  let fixture: ComponentFixture<BentoStatDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BentoStatDisplayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BentoStatDisplayComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render stat container', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.stat-display');
      expect(container).toBeTruthy();
    });

    it('should render value', () => {
      component.value = '100';
      fixture.detectChanges();

      const value = fixture.nativeElement.querySelector('.stat-value');
      expect(value).toBeTruthy();
      expect(value.textContent.trim()).toBe('100');
    });

    it('should render label when provided', () => {
      component.value = '100';
      component.label = 'Users';
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('.stat-label');
      expect(label).toBeTruthy();
      expect(label.textContent.trim()).toBe('Users');
    });
  });

  describe('Input/Output Tests', () => {
    it('should bind value input correctly', () => {
      component.value = '42';
      fixture.detectChanges();

      expect(component.value).toBe('42');
    });

    it('should bind label input correctly', () => {
      component.label = 'Test Label';
      fixture.detectChanges();

      expect(component.label).toBe('Test Label');
    });

    it('should handle number values', () => {
      component.value = 123;
      fixture.detectChanges();

      const value = fixture.nativeElement.querySelector('.stat-value');
      expect(value.textContent.trim()).toBe('123');
    });
  });

  describe('Conditional Rendering Tests', () => {
    it('should not render label when not provided', () => {
      component.value = '100';
      component.label = '';
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('.stat-label');
      expect(label).toBeFalsy();
    });
  });
});
