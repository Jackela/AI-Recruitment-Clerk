import type { OnDestroy, OnInit } from '@angular/core';
import { Directive, ElementRef, inject, input, Renderer2 } from '@angular/core';

/**
 * Tooltip directive for displaying tooltips on hover.
 * Usage: <button [arcTooltip]="'Tooltip text'">Click me</button>
 */
@Directive({
  selector: '[arcTooltip]',
  standalone: true,
})
export class TooltipDirective implements OnInit, OnDestroy {
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);

  /**
   * Tooltip text content.
   */
  public readonly arcTooltip = input.required<string>();

  /**
   * Tooltip position (top, bottom, left, right).
   */
  public readonly tooltipPosition = input<'top' | 'bottom' | 'left' | 'right'>(
    'top',
  );

  private tooltipElement: HTMLElement | null = null;

  /**
   * Performs the ng on init operation.
   */
  public ngOnInit(): void {
    this.setupEventListeners();
  }

  /**
   * Performs the ng on destroy operation.
   */
  public ngOnDestroy(): void {
    this.hideTooltip();
  }

  /**
   * Sets up mouse event listeners.
   */
  private setupEventListeners(): void {
    const element = this.elementRef.nativeElement;

    this.renderer.listen(element, 'mouseenter', () => this.showTooltip());
    this.renderer.listen(element, 'mouseleave', () => this.hideTooltip());
    this.renderer.listen(element, 'focus', () => this.showTooltip());
    this.renderer.listen(element, 'blur', () => this.hideTooltip());
  }

  /**
   * Shows the tooltip.
   */
  private showTooltip(): void {
    if (this.tooltipElement) {
      return;
    }

    this.tooltipElement = this.renderer.createElement('div');
    this.renderer.addClass(this.tooltipElement, 'tooltip');
    this.renderer.addClass(
      this.tooltipElement,
      `tooltip-${this.tooltipPosition()}`,
    );
    this.renderer.setProperty(
      this.tooltipElement,
      'textContent',
      this.arcTooltip(),
    );

    document.body.appendChild(this.tooltipElement);
    this.positionTooltip();
  }

  /**
   * Hides the tooltip.
   */
  private hideTooltip(): void {
    if (this.tooltipElement) {
      this.renderer.removeChild(document.body, this.tooltipElement);
      this.tooltipElement = null;
    }
  }

  /**
   * Positions the tooltip relative to the host element.
   */
  private positionTooltip(): void {
    if (!this.tooltipElement) {
      return;
    }

    const hostRect = this.elementRef.nativeElement.getBoundingClientRect();
    const tooltipRect = this.tooltipElement.getBoundingClientRect();
    const position = this.tooltipPosition();

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = hostRect.top - tooltipRect.height - 8;
        left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = hostRect.bottom + 8;
        left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = hostRect.top + (hostRect.height - tooltipRect.height) / 2;
        left = hostRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = hostRect.top + (hostRect.height - tooltipRect.height) / 2;
        left = hostRect.right + 8;
        break;
    }

    this.renderer.setStyle(this.tooltipElement, 'position', 'fixed');
    this.renderer.setStyle(this.tooltipElement, 'top', `${top}px`);
    this.renderer.setStyle(this.tooltipElement, 'left', `${left}px`);
  }
}
