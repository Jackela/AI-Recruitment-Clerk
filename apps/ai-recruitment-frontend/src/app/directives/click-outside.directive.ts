import type { OnDestroy, OnInit } from '@angular/core';
import { Directive, ElementRef, inject, output } from '@angular/core';

/**
 * Click outside directive for detecting clicks outside an element.
 * Usage: <div (arcClickOutside)="onClickOutside()">Content</div>
 */
@Directive({
  selector: '[arcClickOutside]',
  standalone: true,
})
export class ClickOutsideDirective implements OnInit, OnDestroy {
  private elementRef = inject(ElementRef);

  /**
   * Emitted when a click occurs outside the element.
   */
  public readonly arcClickOutside = output<void>();

  private clickHandler: ((event: MouseEvent) => void) | null = null;

  /**
   * Performs the ng on init operation.
   */
  public ngOnInit(): void {
    this.clickHandler = (event: MouseEvent) => {
      const clickedInside = this.elementRef.nativeElement.contains(
        event.target,
      );
      if (!clickedInside) {
        this.arcClickOutside.emit();
      }
    };

    document.addEventListener('click', this.clickHandler, true);
  }

  /**
   * Performs the ng on destroy operation.
   */
  public ngOnDestroy(): void {
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler, true);
    }
  }
}
