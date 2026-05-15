import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { BentoCardHeaderComponent } from './bento-card-header.component';

describe('BentoCardHeaderComponent', () => {
  let component: BentoCardHeaderComponent;
  let fixture: ComponentFixture<BentoCardHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BentoCardHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BentoCardHeaderComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render card header when content provided', () => {
      component.title = 'Test Title';
      fixture.detectChanges();

      const header = fixture.nativeElement.querySelector('.card-header');
      expect(header).toBeTruthy();
    });

    it('should not render when no content provided', () => {
      component.title = '';
      component.icon = undefined;
      component.badge = '';
      fixture.detectChanges();

      const header = fixture.nativeElement.querySelector('.card-header');
      expect(header).toBeFalsy();
    });

    it('should render title', () => {
      component.title = 'Card Title';
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.card-title');
      expect(title).toBeTruthy();
      expect(title.textContent.trim()).toBe('Card Title');
    });

    it('should render subtitle when provided', () => {
      component.title = 'Title';
      component.subtitle = 'Card Subtitle';
      fixture.detectChanges();

      const subtitle = fixture.nativeElement.querySelector('.card-subtitle');
      expect(subtitle).toBeTruthy();
      expect(subtitle.textContent.trim()).toBe('Card Subtitle');
    });

    it('should render icon when provided', () => {
      component.icon = 'users';
      fixture.detectChanges();

      const iconContainer = fixture.nativeElement.querySelector('.card-icon');
      expect(iconContainer).toBeTruthy();
    });

    it('should render badge when provided', () => {
      component.badge = 'NEW';
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.card-badge');
      expect(badge).toBeTruthy();
      expect(badge.textContent.trim()).toBe('NEW');
    });
  });

  describe('Input/Output Tests', () => {
    it('should have default values', () => {
      expect(component.title).toBe('');
      expect(component.subtitle).toBe('');
      expect(component.icon).toBeUndefined();
      expect(component.badge).toBe('');
      expect(component.status).toBeUndefined();
    });

    it('should bind title input correctly', () => {
      component.title = 'New Title';
      fixture.detectChanges();

      expect(component.title).toBe('New Title');
    });

    it('should bind subtitle input correctly', () => {
      component.subtitle = 'New Subtitle';
      fixture.detectChanges();

      expect(component.subtitle).toBe('New Subtitle');
    });

    it('should bind badge input correctly', () => {
      component.badge = 'Updated';
      fixture.detectChanges();

      expect(component.badge).toBe('Updated');
    });
  });

  describe('Status Badge Tests', () => {
    it('should apply active status class', () => {
      component.badge = 'Active';
      component.status = 'active';
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.card-badge');
      expect(badge.classList.contains('badge-active')).toBe(true);
    });

    it('should apply inactive status class', () => {
      component.badge = 'Inactive';
      component.status = 'inactive';
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.card-badge');
      expect(badge.classList.contains('badge-inactive')).toBe(true);
    });

    it('should apply warning status class', () => {
      component.badge = 'Warning';
      component.status = 'warning';
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.card-badge');
      expect(badge.classList.contains('badge-warning')).toBe(true);
    });

    it('should apply error status class', () => {
      component.badge = 'Error';
      component.status = 'error';
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.card-badge');
      expect(badge.classList.contains('badge-error')).toBe(true);
    });

    it('should apply success status class', () => {
      component.badge = 'Success';
      component.status = 'success';
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.card-badge');
      expect(badge.classList.contains('badge-success')).toBe(true);
    });

    it('should apply default status class when no status provided', () => {
      component.badge = 'Default';
      component.status = undefined;
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.card-badge');
      expect(badge.classList.contains('badge-default')).toBe(true);
    });
  });

  describe('Icon Tests', () => {
    it('should render bento-icon component', () => {
      component.icon = 'users';
      fixture.detectChanges();

      const bentoIcon = fixture.nativeElement.querySelector('arc-bento-icon');
      expect(bentoIcon).toBeTruthy();
    });

    it('should pass icon name to bento-icon', () => {
      component.icon = 'chart';
      fixture.detectChanges();

      const bentoIcon = fixture.nativeElement.querySelector('arc-bento-icon');
      expect(bentoIcon.getAttribute('ng-reflect-icon')).toBe('chart');
    });

    it('should set icon size to 24', () => {
      component.icon = 'users';
      fixture.detectChanges();

      const bentoIcon = fixture.nativeElement.querySelector('arc-bento-icon');
      expect(bentoIcon.getAttribute('ng-reflect-size')).toBe('24');
    });

    it('should have aria-hidden on icon', () => {
      component.icon = 'users';
      fixture.detectChanges();

      const iconContainer = fixture.nativeElement.querySelector('.card-icon');
      expect(iconContainer.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Layout Tests', () => {
    it('should render header-left section', () => {
      component.title = 'Title';
      fixture.detectChanges();

      const headerLeft = fixture.nativeElement.querySelector('.header-left');
      expect(headerLeft).toBeTruthy();
    });

    it('should render header-text section when title provided', () => {
      component.title = 'Title';
      fixture.detectChanges();

      const headerText = fixture.nativeElement.querySelector('.header-text');
      expect(headerText).toBeTruthy();
    });

    it('should position badge on right side', () => {
      component.title = 'Title';
      component.badge = 'Badge';
      fixture.detectChanges();

      const header = fixture.nativeElement.querySelector('.card-header');
      const badge = header.querySelector('.card-badge');
      expect(badge).toBeTruthy();
    });
  });

  describe('Conditional Rendering Tests', () => {
    it('should not render icon when not provided', () => {
      component.icon = undefined;
      fixture.detectChanges();

      const iconContainer = fixture.nativeElement.querySelector('.card-icon');
      expect(iconContainer).toBeFalsy();
    });

    it('should not render subtitle when not provided', () => {
      component.title = 'Title';
      component.subtitle = '';
      fixture.detectChanges();

      const subtitle = fixture.nativeElement.querySelector('.card-subtitle');
      expect(subtitle).toBeFalsy();
    });

    it('should not render badge when not provided', () => {
      component.badge = '';
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.card-badge');
      expect(badge).toBeFalsy();
    });
  });
});
