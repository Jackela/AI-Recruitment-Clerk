import type { OnInit } from '@angular/core';
import {
  Directive,
  inject,
  input,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

/**
 * Permission directive for showing/hiding elements based on user permissions.
 * Usage: <button *arcPermission="'admin'">Admin Only</button>
 */
@Directive({
  selector: '[arcPermission]',
  standalone: true,
})
export class PermissionDirective implements OnInit {
  private templateRef = inject(TemplateRef<unknown>);
  private viewContainer = inject(ViewContainerRef);

  /**
   * Required permission to show the element.
   */
  public readonly arcPermission = input.required<string>();

  /**
   * Current user's permissions.
   */
  public readonly userPermissions = input<string[]>([]);

  /**
   * Performs the ng on init operation.
   */
  public ngOnInit(): void {
    this.updateView();
  }

  /**
   * Updates the view based on permission check.
   */
  private updateView(): void {
    const requiredPermission = this.arcPermission();
    const hasPermission = this.userPermissions().includes(requiredPermission);

    if (hasPermission) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
