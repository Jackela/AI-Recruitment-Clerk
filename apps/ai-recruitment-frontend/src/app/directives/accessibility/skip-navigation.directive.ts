import type { OnInit} from '@angular/core';
import { Directive, inject } from '@angular/core';
import { AccessibilityService } from '../../services/accessibility/accessibility.service';

/**
 * Represents the skip navigation directive.
 */
@Directive({
  selector: '[arcSkipNavigation]',
  standalone: true,
})
export class SkipNavigationDirective implements OnInit {
  private accessibilityService = inject(AccessibilityService);

  /**
   * Performs the ng on init operation.
   */
  ngOnInit(): void {
    this.createSkipLinks();
  }

  private createSkipLinks(): void {
    const skipContainer = document.createElement('div');
    skipContainer.className = 'skip-navigation';
    skipContainer.setAttribute('role', 'navigation');
    skipContainer.setAttribute('aria-label', 'Skip navigation links');

    // Main content skip link
    const skipToMain = this.createSkipLink(
      'Skip to main content',
      '#main-content, main, [role="main"]',
      'main-content-skip',
    );

    // Navigation skip link
    const skipToNav = this.createSkipLink(
      'Skip to navigation',
      'nav, [role="navigation"], .app-navigation',
      'navigation-skip',
    );

    // Search skip link (if exists)
    const skipToSearch = this.createSkipLink(
      'Skip to search',
      '[role="search"], .search-container, input[type="search"]',
      'search-skip',
    );

    // Footer skip link
    const skipToFooter = this.createSkipLink(
      'Skip to footer',
      'footer, [role="contentinfo"], .app-footer',
      'footer-skip',
    );

    // Add links to container
    skipContainer.appendChild(skipToMain);
    skipContainer.appendChild(skipToNav);

    // Only add search link if search element exists
    if (
      document.querySelector(
        '[role="search"], .search-container, input[type="search"]',
      )
    ) {
      skipContainer.appendChild(skipToSearch);
    }

    skipContainer.appendChild(skipToFooter);

    // Insert at the beginning of the body
    document.body.insertBefore(skipContainer, document.body.firstChild);

    // Register keyboard shortcuts
    this.registerSkipShortcuts();
  }

  private createSkipLink(
    text: string,
    selector: string,
    id: string,
  ): HTMLAnchorElement {
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = text;
    link.className = 'skip-link';
    link.id = id;

    link.setAttribute('role', 'button');
    link.setAttribute('aria-label', text);

    link.addEventListener('click', (event) => {
      event.preventDefault();
      this.skipToTarget(selector, text);
    });

    link.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.skipToTarget(selector, text);
      }
    });

    return link;
  }

  private skipToTarget(selector: string, description: string): void {
    const targets = selector.split(', ');
    let targetElement: HTMLElement | null = null;

    // Find the first matching element
    for (const target of targets) {
      targetElement = document.querySelector(target) as HTMLElement;
      if (targetElement) break;
    }

    if (targetElement) {
      // Ensure element is focusable
      if (!targetElement.hasAttribute('tabindex')) {
        targetElement.setAttribute('tabindex', '-1');
      }

      // Set focus and announce
      this.accessibilityService.setFocus(targetElement, 'navigation');
      this.accessibilityService.announce(
        `Skipped to ${description}`,
        'assertive',
      );

      // Scroll into view
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    } else {
      // Announce that target was not found
      this.accessibilityService.announce(
        `${description} not found on this page`,
        'assertive',
      );
    }
  }

  private registerSkipShortcuts(): void {
    // Alt+1: Skip to main content
    this.accessibilityService.registerShortcut({
      key: '1',
      altKey: true,
      description: 'Skip to main content',
      action: () =>
        this.skipToTarget('#main-content, main, [role="main"]', 'main content'),
    });

    // Alt+2: Skip to navigation
    this.accessibilityService.registerShortcut({
      key: '2',
      altKey: true,
      description: 'Skip to navigation',
      action: () =>
        this.skipToTarget(
          'nav, [role="navigation"], .app-navigation',
          'navigation',
        ),
    });

    // Alt+3: Skip to search (if exists)
    if (
      document.querySelector(
        '[role="search"], .search-container, input[type="search"]',
      )
    ) {
      this.accessibilityService.registerShortcut({
        key: '3',
        altKey: true,
        description: 'Skip to search',
        action: () =>
          this.skipToTarget(
            '[role="search"], .search-container, input[type="search"]',
            'search',
          ),
      });
    }

    // Alt+F: Skip to footer
    this.accessibilityService.registerShortcut({
      key: 'f',
      altKey: true,
      description: 'Skip to footer',
      action: () =>
        this.skipToTarget(
          'footer, [role="contentinfo"], .app-footer',
          'footer',
        ),
    });
  }
}
