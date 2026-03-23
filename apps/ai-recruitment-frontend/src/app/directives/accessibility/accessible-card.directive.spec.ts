import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { DebugElement } from '@angular/core';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { AccessibleCardDirective } from './accessible-card.directive';
import { AccessibilityService } from '../../services/accessibility/accessibility.service';

// Test host component
@Component({
  template: `
    <div
      arcAccessibleCard
      [cardTitle]="title"
      [cardDescription]="description"
      [cardValue]="value"
      [cardType]="type"
      [cardState]="state"
      [cardClickable]="clickable"
      [cardShortcuts]="shortcuts"
      [cardInstructions]="instructions"
    >
      Card Content
    </div>
  `,
  standalone: true,
  imports: [AccessibleCardDirective],
})
class TestHostComponent {
  title = 'Test Card';
  description = 'Test Description';
  value = '100';
  type = 'info';
  state = 'active';
  clickable = false;
  shortcuts: string[] = [];
  instructions = '';
}

describe('AccessibleCardDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;
  let directiveElement: DebugElement;
  let accessibilityService: jest.Mocked<AccessibilityService>;

  const mockAccessibilityService = {
    generateAriaLabel: jest.fn((config) => {
      const parts: string[] = [];
      if (config.title) parts.push(config.title);
      if (config.value !== undefined) parts.push(`value ${config.value}`);
      if (config.description) parts.push(config.description);
      if (config.state) parts.push(`state ${config.state}`);
      if (config.type) parts.push(`${config.type} element`);
      return parts.join(', ');
    }),
    generateAriaDescription: jest.fn((config) => {
      const parts: string[] = [];
      if (config.instructions) parts.push(config.instructions);
      if (config.shortcuts?.length) {
        parts.push(`Keyboard shortcuts: ${config.shortcuts.join(', ')}`);
      }
      if (config.context) parts.push(config.context);
      return parts.join('. ');
    }),
    announce: jest.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, AccessibleCardDirective],
      providers: [
        {
          provide: AccessibilityService,
          useValue: mockAccessibilityService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    accessibilityService = TestBed.inject(
      AccessibilityService,
    ) as jest.Mocked<AccessibilityService>;

    fixture.detectChanges();
    directiveElement = fixture.debugElement.query(
      By.directive(AccessibleCardDirective),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create the directive', () => {
    expect(directiveElement).toBeTruthy();
  });

  it('should set role to article for non-clickable cards', () => {
    component.clickable = false;
    fixture.detectChanges();

    const element = directiveElement.nativeElement;
    expect(element.getAttribute('role')).toBe('article');
  });

  it('should set role to button for clickable cards', () => {
    component.clickable = true;
    fixture.detectChanges();

    const element = directiveElement.nativeElement;
    expect(element.getAttribute('role')).toBe('button');
  });

  it('should set aria-label with card information', () => {
    fixture.detectChanges();

    const element = directiveElement.nativeElement;
    const ariaLabel = element.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toContain('Test Card');
    expect(ariaLabel).toContain('value 100');
  });

  it('should call generateAriaLabel with correct config', () => {
    fixture.detectChanges();

    expect(accessibilityService.generateAriaLabel).toHaveBeenCalledWith({
      type: 'info',
      title: 'Test Card',
      description: 'Test Description',
      value: '100',
      state: 'active',
    });
  });

  it('should add accessible-card class', () => {
    const element = directiveElement.nativeElement;
    expect(element.classList.contains('accessible-card')).toBe(true);
  });

  it('should set tabindex to 0 for clickable cards', () => {
    component.clickable = true;
    fixture.detectChanges();

    const element = directiveElement.nativeElement;
    expect(element.getAttribute('tabindex')).toBe('0');
  });

  it('should not set tabindex for non-clickable cards', () => {
    component.clickable = false;
    fixture.detectChanges();

    const element = directiveElement.nativeElement;
    // tabindex should not be set for non-clickable cards
    expect(element.getAttribute('tabindex')).toBeNull();
  });

  it('should set aria-live to polite when cardValue is defined', () => {
    component.value = '100';
    fixture.detectChanges();

    const element = directiveElement.nativeElement;
    expect(element.getAttribute('aria-live')).toBe('polite');
  });

  it('should not set aria-live when cardValue is undefined', () => {
    component.value = undefined as unknown as string;
    fixture.detectChanges();

    const element = directiveElement.nativeElement;
    // aria-live might not be set or could be null
    const ariaLive = element.getAttribute('aria-live');
    expect(ariaLive).toBeFalsy();
  });

  it('should create aria-describedby element when instructions are provided', () => {
    component.instructions = 'Press Enter to activate';
    fixture.detectChanges();

    const element = directiveElement.nativeElement;
    const describedById = element.getAttribute('aria-describedby');
    expect(describedById).toBeTruthy();

    const descElement = document.getElementById(describedById);
    expect(descElement).toBeTruthy();
    expect(descElement?.classList.contains('sr-only')).toBe(true);
  });

  it('should create aria-describedby element when shortcuts are provided', () => {
    component.shortcuts = ['Ctrl+A', 'Ctrl+B'];
    fixture.detectChanges();

    const element = directiveElement.nativeElement;
    const describedById = element.getAttribute('aria-describedby');
    expect(describedById).toBeTruthy();
  });

  it('should handle keyboard events for clickable cards', () => {
    component.clickable = true;
    fixture.detectChanges();

    const element = directiveElement.nativeElement;
    const clickSpy = jest.fn();
    element.addEventListener('click', clickSpy);

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    element.dispatchEvent(enterEvent);

    expect(clickSpy).toHaveBeenCalled();
    expect(accessibilityService.announce).toHaveBeenCalledWith(
      'Activated Test Card',
      'polite',
    );
  });

  it('should handle space key for clickable cards', () => {
    component.clickable = true;
    fixture.detectChanges();

    const element = directiveElement.nativeElement;
    const clickSpy = jest.fn();
    element.addEventListener('click', clickSpy);

    const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
    element.dispatchEvent(spaceEvent);

    expect(clickSpy).toHaveBeenCalled();
  });

  it('should prevent default on Enter and Space keys for clickable cards', () => {
    component.clickable = true;
    fixture.detectChanges();

    const element = directiveElement.nativeElement;

    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      cancelable: true,
    });
    const prevented = !element.dispatchEvent(enterEvent);

    expect(prevented).toBe(true);
  });

  it('should generate unique aria-describedby IDs', () => {
    component.instructions = 'Test instructions';
    fixture.detectChanges();

    const element = directiveElement.nativeElement;
    const describedById = element.getAttribute('aria-describedby');

    expect(describedById).toMatch(/^card-desc-/);
    expect(describedById?.length).toBeGreaterThan(10); // Should have random suffix
  });

  it('should pass correct config to generateAriaDescription', () => {
    component.instructions = 'Test instructions';
    component.shortcuts = ['Ctrl+A'];
    component.clickable = true;
    fixture.detectChanges();

    expect(accessibilityService.generateAriaDescription).toHaveBeenCalledWith({
      instructions: 'Test instructions',
      shortcuts: ['Ctrl+A'],
      context: 'Activate with Enter or Space',
    });
  });

  it('should update when inputs change', () => {
    component.title = 'Updated Title';
    fixture.detectChanges();

    expect(accessibilityService.generateAriaLabel).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Updated Title',
      }),
    );
  });

  it('should handle empty inputs gracefully', () => {
    component.title = '';
    component.description = '';
    component.value = undefined as unknown as string;
    component.state = '';
    component.type = '';
    fixture.detectChanges();

    const element = directiveElement.nativeElement;
    const ariaLabel = element.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });

  it('should not add keyboard listeners for non-clickable cards', () => {
    component.clickable = false;
    fixture.detectChanges();

    const element = directiveElement.nativeElement;
    const clickSpy = jest.fn();
    element.addEventListener('click', clickSpy);

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    element.dispatchEvent(enterEvent);

    // Should not trigger click for non-clickable cards
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('should handle numeric values correctly', () => {
    component.value = 42;
    fixture.detectChanges();

    expect(accessibilityService.generateAriaLabel).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 42,
      }),
    );
  });
});
