import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { AccessibilityService } from '../../services/accessibility/accessibility.service';

/**
 * Represents the accessible card directive.
 */
@Directive({
  selector: '[arcAccessibleCard]',
  standalone: true,
})
export class AccessibleCardDirective implements OnInit, OnDestroy {
  private elementRef = inject(ElementRef);
  private accessibilityService = inject(AccessibilityService);

  @Input() cardTitle?: string;
  @Input() cardDescription?: string;
  @Input() cardValue?: string | number;
  @Input() cardType?: string;
  @Input() cardState?: string;
  @Input() cardClickable = false;
  @Input() cardShortcuts?: string[];
  @Input() cardInstructions?: string;

  private element!: HTMLElement;

  /**
   * Performs the ng on init operation.
   */
  ngOnInit(): void {
    this.element = this.elementRef.nativeElement;
    this.setupAccessibility();
  }

  /**
   * Performs the ng on destroy operation.
   */
  ngOnDestroy(): void {
    // Cleanup any event listeners if needed
  }

  private setupAccessibility(): void {
    // Set basic ARIA attributes
    this.element.setAttribute(
      'role',
      this.cardClickable ? 'button' : 'article',
    );

    // Generate comprehensive ARIA label
    const ariaLabel = this.accessibilityService.generateAriaLabel({
      type: this.cardType || 'card',
      title: this.cardTitle,
      description: this.cardDescription,
      value: this.cardValue,
      state: this.cardState,
    });

    this.element.setAttribute('aria-label', ariaLabel);

    // Generate ARIA description for complex interactions
    if (this.cardInstructions || this.cardShortcuts) {
      const ariaDescription = this.accessibilityService.generateAriaDescription(
        {
          instructions: this.cardInstructions,
          shortcuts: this.cardShortcuts,
          context: this.cardClickable
            ? 'Activate with Enter or Space'
            : undefined,
        },
      );

      if (ariaDescription) {
        const descId = `card-desc-${Math.random().toString(36).substr(2, 9)}`;
        this.element.setAttribute('aria-describedby', descId);

        // Create hidden description element
        const descElement = document.createElement('div');
        descElement.id = descId;
        descElement.className = 'sr-only';
        descElement.textContent = ariaDescription;
        this.element.appendChild(descElement);
      }
    }

    // Set tabindex for keyboard navigation
    if (this.cardClickable) {
      this.element.setAttribute('tabindex', '0');

      // Add keyboard event listeners
      this.element.addEventListener('keydown', this.handleKeydown.bind(this));
    }

    // Add focus styles
    this.element.classList.add('accessible-card');

    // Set ARIA live region if value changes
    if (this.cardValue !== undefined) {
      this.element.setAttribute('aria-live', 'polite');
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();

      // Trigger click event
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      this.element.dispatchEvent(clickEvent);

      // Announce activation
      this.accessibilityService.announce(
        `Activated ${this.cardTitle || 'card'}`,
        'polite',
      );
    }
  }
}
