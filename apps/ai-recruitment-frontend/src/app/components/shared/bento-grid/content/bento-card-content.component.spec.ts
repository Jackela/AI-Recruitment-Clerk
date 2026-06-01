import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { BentoCardContentComponent } from './bento-card-content.component';

describe('BentoCardContentComponent', () => {
  let component: BentoCardContentComponent;
  let fixture: ComponentFixture<BentoCardContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BentoCardContentComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BentoCardContentComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render card content container', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.card-content');
      expect(container).toBeTruthy();
    });
  });

  describe('Input/Output Tests', () => {
    it('should accept content input', () => {
      component.content = 'Test content';
      fixture.detectChanges();

      expect(component.content).toBe('Test content');
    });

    it('should accept html content input', () => {
      component.htmlContent = '<strong>Bold</strong>';
      fixture.detectChanges();

      expect(component.htmlContent).toBe('<strong>Bold</strong>');
    });
  });

  describe('Content Rendering Tests', () => {
    it('should render plain text content', () => {
      component.content = 'Plain text content';
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.card-content');
      expect(container.textContent).toContain('Plain text content');
    });

    it('should render HTML content when provided', () => {
      component.htmlContent = '<span class="custom">Custom</span>';
      fixture.detectChanges();

      const customSpan = fixture.nativeElement.querySelector('.custom');
      expect(customSpan).toBeTruthy();
    });
  });
});
