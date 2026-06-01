import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { DebugElement } from '@angular/core';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { SkipNavigationDirective } from './skip-navigation.directive';
import { AccessibilityService } from '../../services/accessibility/accessibility.service';

// Test host component
@Component({
  template: `<div arcSkipNavigation></div>`,
  standalone: true,
  imports: [SkipNavigationDirective],
})
class TestHostComponent {}

describe('SkipNavigationDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let directiveElement: DebugElement;
  let accessibilityService: jest.Mocked<AccessibilityService>;

  const mockAccessibilityService = {
    setFocus: jest.fn(),
    announce: jest.fn(),
    registerShortcut: jest.fn(),
  };

  beforeEach(async () => {
    // Clean up any existing skip navigation from previous tests
    const existingSkipNav = document.querySelector('.skip-navigation');
    if (existingSkipNav) {
      existingSkipNav.remove();
    }

    await TestBed.configureTestingModule({
      imports: [TestHostComponent, SkipNavigationDirective],
      providers: [
        {
          provide: AccessibilityService,
          useValue: mockAccessibilityService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    accessibilityService = TestBed.inject(
      AccessibilityService,
    ) as jest.Mocked<AccessibilityService>;

    // Add required elements to the DOM for skip navigation
    const mainContent = document.createElement('main');
    mainContent.id = 'main-content';
    document.body.appendChild(mainContent);

    const nav = document.createElement('nav');
    document.body.appendChild(nav);

    const footer = document.createElement('footer');
    document.body.appendChild(footer);

    fixture.detectChanges();
    directiveElement = fixture.debugElement.query(
      By.directive(SkipNavigationDirective),
    );
  });

  afterEach(() => {
    // Clean up
    const skipNav = document.querySelector('.skip-navigation');
    if (skipNav) {
      skipNav.remove();
    }

    // Clean up created elements
    const mainContent = document.querySelector('#main-content');
    if (mainContent) mainContent.remove();

    const nav = document.querySelector('nav');
    if (nav) nav.remove();

    const footer = document.querySelector('footer');
    if (footer) footer.remove();

    jest.clearAllMocks();
  });

  it('should create the directive', () => {
    expect(directiveElement).toBeTruthy();
  });

  it('should create skip navigation container on init', () => {
    const skipContainer = document.querySelector('.skip-navigation');
    expect(skipContainer).toBeTruthy();
    expect(skipContainer?.getAttribute('role')).toBe('navigation');
    expect(skipContainer?.getAttribute('aria-label')).toBe(
      'Skip navigation links',
    );
  });

  it('should create skip links for main content, navigation, and footer', () => {
    const skipLinks = document.querySelectorAll('.skip-link');
    expect(skipLinks.length).toBeGreaterThanOrEqual(3);

    const linkTexts = Array.from(skipLinks).map((link) => link.textContent);
    expect(linkTexts).toContain('Skip to main content');
    expect(linkTexts).toContain('Skip to navigation');
    expect(linkTexts).toContain('Skip to footer');
  });

  it('should skip to main content when main content link is clicked', () => {
    const mainContentLink = Array.from(
      document.querySelectorAll('.skip-link'),
    ).find(
      (link) => link.textContent === 'Skip to main content',
    ) as HTMLElement;

    expect(mainContentLink).toBeTruthy();

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    mainContentLink.dispatchEvent(clickEvent);

    expect(accessibilityService.setFocus).toHaveBeenCalled();
    expect(accessibilityService.announce).toHaveBeenCalledWith(
      'Skipped to Skip to main content',
      'assertive',
    );
  });

  it('should skip to navigation when navigation link is clicked', () => {
    const navLink = Array.from(document.querySelectorAll('.skip-link')).find(
      (link) => link.textContent === 'Skip to navigation',
    ) as HTMLElement;

    expect(navLink).toBeTruthy();

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    navLink.dispatchEvent(clickEvent);

    expect(accessibilityService.setFocus).toHaveBeenCalled();
  });

  it('should handle keyboard events on skip links', () => {
    const mainContentLink = Array.from(
      document.querySelectorAll('.skip-link'),
    ).find(
      (link) => link.textContent === 'Skip to main content',
    ) as HTMLElement;

    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
    });
    mainContentLink.dispatchEvent(enterEvent);

    expect(accessibilityService.setFocus).toHaveBeenCalled();
  });

  it('should handle space key on skip links', () => {
    const mainContentLink = Array.from(
      document.querySelectorAll('.skip-link'),
    ).find(
      (link) => link.textContent === 'Skip to main content',
    ) as HTMLElement;

    const spaceEvent = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
    });
    mainContentLink.dispatchEvent(spaceEvent);

    expect(accessibilityService.setFocus).toHaveBeenCalled();
  });

  it('should register keyboard shortcuts', () => {
    expect(accessibilityService.registerShortcut).toHaveBeenCalled();

    const calls = accessibilityService.registerShortcut.mock.calls;
    const shortcuts = calls.map((call) => call[0]);

    // Check for Alt+1 shortcut
    const alt1Shortcut = shortcuts.find((s) => s.key === '1' && s.altKey);
    expect(alt1Shortcut).toBeTruthy();
    expect(alt1Shortcut?.description).toBe('Skip to main content');

    // Check for Alt+2 shortcut
    const alt2Shortcut = shortcuts.find((s) => s.key === '2' && s.altKey);
    expect(alt2Shortcut).toBeTruthy();
    expect(alt2Shortcut?.description).toBe('Skip to navigation');

    // Check for Alt+F shortcut
    const altFShortcut = shortcuts.find((s) => s.key === 'f' && s.altKey);
    expect(altFShortcut).toBeTruthy();
    expect(altFShortcut?.description).toBe('Skip to footer');
  });

  it('should set tabindex on target element when skipping', () => {
    const mainContentLink = Array.from(
      document.querySelectorAll('.skip-link'),
    ).find(
      (link) => link.textContent === 'Skip to main content',
    ) as HTMLElement;

    const mainContent = document.querySelector('#main-content');
    expect(mainContent).toBeTruthy();

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    mainContentLink.dispatchEvent(clickEvent);

    // After skip, element should have tabindex
    expect(mainContent?.hasAttribute('tabindex')).toBe(true);
    expect(mainContent?.getAttribute('tabindex')).toBe('-1');
  });

  it('should announce when target is not found', () => {
    // Remove main content
    const mainContent = document.querySelector('#main-content');
    if (mainContent) mainContent.remove();

    const mainContentLink = Array.from(
      document.querySelectorAll('.skip-link'),
    ).find(
      (link) => link.textContent === 'Skip to main content',
    ) as HTMLElement;

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    mainContentLink.dispatchEvent(clickEvent);

    expect(accessibilityService.announce).toHaveBeenCalledWith(
      'Skip to main content not found on this page',
      'assertive',
    );
  });

  it('should add search skip link if search element exists', () => {
    // Add a search element
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    document.body.appendChild(searchInput);

    // Re-create the directive to pick up the search element
    const skipContainer = document.querySelector('.skip-navigation');
    if (skipContainer) skipContainer.remove();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const skipLinks = document.querySelectorAll('.skip-link');
    const linkTexts = Array.from(skipLinks).map((link) => link.textContent);

    expect(linkTexts).toContain('Skip to search');

    // Clean up
    searchInput.remove();
  });

  it('should register Alt+3 shortcut for search when search element exists', () => {
    // Add a search element
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    document.body.appendChild(searchInput);

    // Re-create the directive to pick up the search element
    const skipContainer = document.querySelector('.skip-navigation');
    if (skipContainer) skipContainer.remove();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const calls = accessibilityService.registerShortcut.mock.calls;
    const shortcuts = calls.map((call) => call[0]);
    const alt3Shortcut = shortcuts.find((s) => s.key === '3' && s.altKey);

    expect(alt3Shortcut).toBeTruthy();
    expect(alt3Shortcut?.description).toBe('Skip to search');

    // Clean up
    searchInput.remove();
  });

  it('should give skip links proper ARIA attributes', () => {
    const skipLinks = document.querySelectorAll('.skip-link');

    skipLinks.forEach((link) => {
      expect(link.getAttribute('role')).toBe('button');
      expect(link.getAttribute('aria-label')).toBeTruthy();
      expect(link.id).toBeTruthy();
    });
  });

  it('should have skip link with href="#"', () => {
    const skipLinks = document.querySelectorAll('.skip-link');

    skipLinks.forEach((link) => {
      expect((link as HTMLAnchorElement).getAttribute('href')).toBe('#');
    });
  });
});
