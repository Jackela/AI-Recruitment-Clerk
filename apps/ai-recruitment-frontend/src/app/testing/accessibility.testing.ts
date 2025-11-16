import { ComponentFixture } from '@angular/core/testing';

/**
 * Defines the shape of the accessibility test result.
 */
export interface AccessibilityTestResult {
  element: HTMLElement;
  issues: AccessibilityIssue[];
  score: number;
  passed: boolean;
}

/**
 * Defines the shape of the accessibility issue.
 */
export interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info';
  rule: string;
  description: string;
  element?: HTMLElement;
  suggestion?: string;
}

/**
 * Represents the accessibility tester.
 */
export class AccessibilityTester {
  /**
   * Run comprehensive accessibility tests on a component
   */
  static testComponent<T = unknown>(
    fixture: ComponentFixture<T>,
  ): AccessibilityTestResult {
    const element = fixture.nativeElement as HTMLElement;
    const issues: AccessibilityIssue[] = [];

    // Test for WCAG compliance
    issues.push(...this.testAriaAttributes(element));
    issues.push(...this.testKeyboardNavigation(element));
    issues.push(...this.testColorContrast(element));
    issues.push(...this.testHeadingStructure(element));
    issues.push(...this.testFormLabels(element));
    issues.push(...this.testImageAltText(element));
    issues.push(...this.testLandmarks(element));
    issues.push(...this.testFocusManagement(element));
    issues.push(...this.testLiveRegions(element));

    // Calculate accessibility score
    const errorCount = issues.filter((i) => i.type === 'error').length;
    const warningCount = issues.filter((i) => i.type === 'warning').length;
    const score = Math.max(0, 100 - errorCount * 10 - warningCount * 5);

    return {
      element,
      issues,
      score,
      passed: errorCount === 0 && score >= 80,
    };
  }

  /**
   * Test ARIA attributes and roles
   */
  private static testAriaAttributes(
    element: HTMLElement,
  ): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Test for missing ARIA labels on interactive elements
    const interactiveElements = element.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [role="link"]',
    );
    interactiveElements.forEach((el: Element) => {
      const htmlEl = el as HTMLElement;
      const hasLabel =
        htmlEl.hasAttribute('aria-label') ||
        htmlEl.hasAttribute('aria-labelledby') ||
        htmlEl.textContent?.trim() ||
        htmlEl.querySelector('img[alt]') ||
        (htmlEl.tagName === 'INPUT' &&
          htmlEl.getAttribute('type') === 'submit' &&
          htmlEl.hasAttribute('value'));

      if (!hasLabel) {
        issues.push({
          type: 'error',
          rule: 'ARIA_LABEL_MISSING',
          description: 'Interactive element missing accessible name',
          element: htmlEl,
          suggestion:
            'Add aria-label, aria-labelledby, or visible text content',
        });
      }
    });

    // Test for invalid ARIA attributes
    const elementsWithAria = element.querySelectorAll(
      '[aria-live], [aria-expanded], [aria-checked], [aria-selected]',
    );
    elementsWithAria.forEach((el: Element) => {
      const htmlEl = el as HTMLElement;

      // Check aria-live values
      if (htmlEl.hasAttribute('aria-live')) {
        const value = htmlEl.getAttribute('aria-live');
        if (!['polite', 'assertive', 'off'].includes(value || '')) {
          issues.push({
            type: 'error',
            rule: 'ARIA_INVALID_VALUE',
            description: `Invalid aria-live value: ${value}`,
            element: htmlEl,
            suggestion: 'Use "polite", "assertive", or "off"',
          });
        }
      }

      // Check boolean ARIA attributes
      ['aria-expanded', 'aria-checked', 'aria-selected'].forEach((attr) => {
        if (htmlEl.hasAttribute(attr)) {
          const value = htmlEl.getAttribute(attr);
          if (!['true', 'false'].includes(value || '')) {
            issues.push({
              type: 'error',
              rule: 'ARIA_INVALID_BOOLEAN',
              description: `Invalid ${attr} value: ${value}`,
              element: htmlEl,
              suggestion: 'Use "true" or "false"',
            });
          }
        }
      });
    });

    return issues;
  }

  /**
   * Test keyboard navigation support
   */
  private static testKeyboardNavigation(
    element: HTMLElement,
  ): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Test for focusable elements without proper tabindex
    const clickableElements = element.querySelectorAll(
      '[onclick], .clickable, [role="button"]:not(button)',
    );
    clickableElements.forEach((el: Element) => {
      const htmlEl = el as HTMLElement;
      if (
        htmlEl.tagName !== 'BUTTON' &&
        htmlEl.tagName !== 'A' &&
        !htmlEl.hasAttribute('tabindex')
      ) {
        issues.push({
          type: 'warning',
          rule: 'KEYBOARD_NAVIGATION',
          description: 'Clickable element not keyboard accessible',
          element: htmlEl,
          suggestion: 'Add tabindex="0" and keyboard event handlers',
        });
      }
    });

    // Test for skip links
    const skipLinks = element.querySelectorAll(
      '.skip-link, [href="#main-content"], [href="#main"]',
    );
    if (skipLinks.length === 0) {
      issues.push({
        type: 'warning',
        rule: 'SKIP_NAVIGATION',
        description: 'No skip navigation links found',
        suggestion: 'Add skip links for keyboard users',
      });
    }

    return issues;
  }

  /**
   * Test color contrast (simplified version)
   */
  private static testColorContrast(element: HTMLElement): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // This is a simplified test - in production, you'd use actual color contrast calculation
    const elementsWithColor = element.querySelectorAll('*');
    elementsWithColor.forEach((el: Element) => {
      const htmlEl = el as HTMLElement;
      const styles = window.getComputedStyle(htmlEl);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;

      // Check for common low-contrast combinations (simplified)
      if (
        color &&
        backgroundColor &&
        ((color.includes('rgb(128') && backgroundColor.includes('rgb(255')) ||
          (color.includes('rgb(192') && backgroundColor.includes('rgb(255')))
      ) {
        issues.push({
          type: 'warning',
          rule: 'COLOR_CONTRAST',
          description: 'Potentially low color contrast detected',
          element: htmlEl,
          suggestion: 'Verify color contrast meets WCAG AA standards (4.5:1)',
        });
      }
    });

    return issues;
  }

  /**
   * Test heading structure
   */
  private static testHeadingStructure(
    element: HTMLElement,
  ): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const levels: number[] = [];

    headings.forEach((heading: Element) => {
      const level = parseInt(heading.tagName.substring(1));
      levels.push(level);
    });

    // Check for proper heading hierarchy
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] > levels[i - 1] + 1) {
        issues.push({
          type: 'warning',
          rule: 'HEADING_HIERARCHY',
          description: `Heading level skipped from h${levels[i - 1]} to h${levels[i]}`,
          element: headings[i] as HTMLElement,
          suggestion: 'Use sequential heading levels',
        });
      }
    }

    // Check for multiple h1 elements
    const h1Elements = element.querySelectorAll('h1');
    if (h1Elements.length > 1) {
      issues.push({
        type: 'warning',
        rule: 'MULTIPLE_H1',
        description: 'Multiple h1 elements found',
        suggestion: 'Use only one h1 per page or section',
      });
    }

    return issues;
  }

  /**
   * Test form labels
   */
  private static testFormLabels(element: HTMLElement): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    const formControls = element.querySelectorAll(
      'input:not([type="hidden"]), select, textarea',
    );
    formControls.forEach((control: Element) => {
      const htmlControl = control as HTMLElement;
      const id = htmlControl.getAttribute('id');
      const hasLabel =
        htmlControl.hasAttribute('aria-label') ||
        htmlControl.hasAttribute('aria-labelledby') ||
        (id && element.querySelector(`label[for="${id}"]`)) ||
        htmlControl.closest('label');

      if (!hasLabel) {
        issues.push({
          type: 'error',
          rule: 'FORM_LABEL_MISSING',
          description: 'Form control missing accessible label',
          element: htmlControl,
          suggestion: 'Add label element, aria-label, or aria-labelledby',
        });
      }
    });

    return issues;
  }

  /**
   * Test image alt text
   */
  private static testImageAltText(element: HTMLElement): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    const images = element.querySelectorAll('img');
    images.forEach((img: Element) => {
      const htmlImg = img as HTMLImageElement;

      if (!htmlImg.hasAttribute('alt')) {
        issues.push({
          type: 'error',
          rule: 'IMAGE_ALT_MISSING',
          description: 'Image missing alt attribute',
          element: htmlImg,
          suggestion:
            'Add alt attribute with descriptive text or empty string for decorative images',
        });
      }
    });

    return issues;
  }

  /**
   * Test landmark roles
   */
  private static testLandmarks(element: HTMLElement): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    const landmarks = [
      { selector: 'main, [role="main"]', name: 'main' },
      { selector: 'nav, [role="navigation"]', name: 'navigation' },
      { selector: 'header, [role="banner"]', name: 'banner' },
      { selector: 'footer, [role="contentinfo"]', name: 'contentinfo' },
    ];

    landmarks.forEach((landmark) => {
      const elements = element.querySelectorAll(landmark.selector);
      if (elements.length === 0) {
        issues.push({
          type: 'info',
          rule: 'LANDMARK_MISSING',
          description: `No ${landmark.name} landmark found`,
          suggestion: `Consider adding a ${landmark.name} landmark for better navigation`,
        });
      }
    });

    return issues;
  }

  /**
   * Test focus management
   */
  private static testFocusManagement(
    element: HTMLElement,
  ): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Test for elements with tabindex values greater than 0
    const positiveTabindex = element.querySelectorAll(
      '[tabindex]:not([tabindex="0"]):not([tabindex="-1"])',
    );
    positiveTabindex.forEach((el: Element) => {
      const tabindex = el.getAttribute('tabindex');
      if (tabindex && parseInt(tabindex) > 0) {
        issues.push({
          type: 'warning',
          rule: 'POSITIVE_TABINDEX',
          description: `Positive tabindex value detected: ${tabindex}`,
          element: el as HTMLElement,
          suggestion: 'Use tabindex="0" or natural tab order instead',
        });
      }
    });

    return issues;
  }

  /**
   * Test ARIA live regions
   */
  private static testLiveRegions(element: HTMLElement): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Check for status/alert regions
    const statusElements = element.querySelectorAll(
      '[role="status"], [role="alert"], [aria-live]',
    );

    // This is more of an informational check
    if (statusElements.length === 0) {
      issues.push({
        type: 'info',
        rule: 'LIVE_REGION_MISSING',
        description: 'No ARIA live regions found',
        suggestion: 'Consider adding live regions for dynamic content updates',
      });
    }

    return issues;
  }

  /**
   * Generate accessibility report
   */
  static generateReport(result: AccessibilityTestResult): string {
    const { issues, score, passed } = result;

    let report = `\n=== ACCESSIBILITY TEST REPORT ===\n`;
    report += `Score: ${score}/100\n`;
    report += `Status: ${passed ? 'PASSED' : 'FAILED'}\n`;
    report += `Issues Found: ${issues.length}\n\n`;

    if (issues.length > 0) {
      report += `=== ISSUES ===\n`;

      const errors = issues.filter((i) => i.type === 'error');
      const warnings = issues.filter((i) => i.type === 'warning');
      const info = issues.filter((i) => i.type === 'info');

      if (errors.length > 0) {
        report += `\n🔴 ERRORS (${errors.length}):\n`;
        errors.forEach((issue, index) => {
          report += `${index + 1}. ${issue.rule}: ${issue.description}\n`;
          if (issue.suggestion) {
            report += `   💡 ${issue.suggestion}\n`;
          }
        });
      }

      if (warnings.length > 0) {
        report += `\n🟡 WARNINGS (${warnings.length}):\n`;
        warnings.forEach((issue, index) => {
          report += `${index + 1}. ${issue.rule}: ${issue.description}\n`;
          if (issue.suggestion) {
            report += `   💡 ${issue.suggestion}\n`;
          }
        });
      }

      if (info.length > 0) {
        report += `\n🔵 INFO (${info.length}):\n`;
        info.forEach((issue, index) => {
          report += `${index + 1}. ${issue.rule}: ${issue.description}\n`;
          if (issue.suggestion) {
            report += `   💡 ${issue.suggestion}\n`;
          }
        });
      }
    } else {
      report += `✅ No accessibility issues found!\n`;
    }

    return report;
  }

  /**
   * Test specific WCAG criteria
   */
  static testWCAG2_1_AA(element: HTMLElement): {
    principle1: boolean; // Perceivable
    principle2: boolean; // Operable
    principle3: boolean; // Understandable
    principle4: boolean; // Robust
    overallCompliance: boolean;
  } {
    const issues = this.testComponent({
      nativeElement: element,
    } as ComponentFixture<unknown>).issues;
    const errors = issues.filter((i) => i.type === 'error');

    // Simplified WCAG compliance check
    const principle1 = !errors.some((e) =>
      ['IMAGE_ALT_MISSING', 'COLOR_CONTRAST'].includes(e.rule),
    );

    const principle2 = !errors.some((e) =>
      ['KEYBOARD_NAVIGATION', 'SKIP_NAVIGATION', 'POSITIVE_TABINDEX'].includes(
        e.rule,
      ),
    );

    const principle3 = !errors.some((e) =>
      ['FORM_LABEL_MISSING', 'HEADING_HIERARCHY'].includes(e.rule),
    );

    const principle4 = !errors.some((e) =>
      [
        'ARIA_LABEL_MISSING',
        'ARIA_INVALID_VALUE',
        'ARIA_INVALID_BOOLEAN',
      ].includes(e.rule),
    );

    return {
      principle1,
      principle2,
      principle3,
      principle4,
      overallCompliance: principle1 && principle2 && principle3 && principle4,
    };
  }
}
