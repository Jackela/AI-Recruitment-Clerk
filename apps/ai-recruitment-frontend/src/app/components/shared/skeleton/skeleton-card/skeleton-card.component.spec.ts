import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { SkeletonCardComponent } from './skeleton-card.component';

describe('SkeletonCardComponent', () => {
  let component: SkeletonCardComponent;
  let fixture: ComponentFixture<SkeletonCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SkeletonCardComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render skeleton card container', () => {
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.skeleton-card');
      expect(card).toBeTruthy();
    });

    it('should have role status attribute', () => {
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.skeleton-card');
      expect(card.getAttribute('role')).toBe('status');
    });

    it('should render header by default', () => {
      fixture.detectChanges();

      const header = fixture.nativeElement.querySelector('.skeleton-header');
      expect(header).toBeTruthy();
    });

    it('should render content area', () => {
      fixture.detectChanges();

      const content = fixture.nativeElement.querySelector('.skeleton-content');
      expect(content).toBeTruthy();
    });

    it('should not render actions by default', () => {
      fixture.detectChanges();

      const actions = fixture.nativeElement.querySelector('.skeleton-actions');
      expect(actions).toBeFalsy();
    });
  });

  describe('Input/Output Tests', () => {
    it('should have default input values', () => {
      expect(component.hasHeader).toBe(true);
      expect(component.hasAvatar).toBe(false);
      expect(component.lines).toBe(3);
      expect(component.hasActions).toBe(false);
      expect(component.avatarSize).toBe(48);
      expect(component.actionButtonCount).toBe(2);
      expect(component.actionButtonWidth).toBe('80px');
      expect(component.actionButtonHeight).toBe('36px');
    });

    it('should bind hasHeader input correctly', () => {
      component.hasHeader = false;
      fixture.detectChanges();

      const header = fixture.nativeElement.querySelector('.skeleton-header');
      expect(header).toBeFalsy();
    });

    it('should bind hasAvatar input correctly', () => {
      component.hasHeader = true;
      component.hasAvatar = true;
      fixture.detectChanges();

      const avatar = fixture.nativeElement.querySelector('.skeleton-avatar');
      expect(avatar).toBeTruthy();
    });

    it('should bind lines input correctly', () => {
      component.lines = 5;
      fixture.detectChanges();

      expect(component.lines).toBe(5);
    });

    it('should bind hasActions input correctly', () => {
      component.hasActions = true;
      fixture.detectChanges();

      const actions = fixture.nativeElement.querySelector('.skeleton-actions');
      expect(actions).toBeTruthy();
    });

    it('should bind avatarSize input correctly', () => {
      component.hasAvatar = true;
      component.avatarSize = 64;
      fixture.detectChanges();

      const avatar = fixture.nativeElement.querySelector('.skeleton-avatar');
      expect(avatar.style.width).toBe('64px');
      expect(avatar.style.height).toBe('64px');
    });

    it('should bind actionButtonCount input correctly', () => {
      component.hasActions = true;
      component.actionButtonCount = 3;
      fixture.detectChanges();

      const buttons =
        fixture.nativeElement.querySelectorAll('.skeleton-button');
      expect(buttons.length).toBe(3);
    });

    it('should bind actionButtonWidth input correctly', () => {
      component.hasActions = true;
      component.actionButtonWidth = '120px';
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.skeleton-button');
      expect(button.style.width).toBe('120px');
    });

    it('should bind actionButtonHeight input correctly', () => {
      component.hasActions = true;
      component.actionButtonHeight = '48px';
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.skeleton-button');
      expect(button.style.height).toBe('48px');
    });
  });

  describe('Action Buttons Array Tests', () => {
    it('should generate correct action buttons array', () => {
      component.actionButtonCount = 3;

      const array = component.actionButtonsArray;
      expect(array).toEqual([0, 1, 2]);
    });

    it('should update array when count changes', () => {
      component.actionButtonCount = 5;

      const array = component.actionButtonsArray;
      expect(array.length).toBe(5);
      expect(array).toEqual([0, 1, 2, 3, 4]);
    });

    it('should handle zero action buttons', () => {
      component.actionButtonCount = 0;

      const array = component.actionButtonsArray;
      expect(array).toEqual([]);
    });
  });

  describe('Shimmer Effect Tests', () => {
    it('should apply shimmer class to avatar', () => {
      component.hasAvatar = true;
      fixture.detectChanges();

      const avatar = fixture.nativeElement.querySelector('.skeleton-avatar');
      expect(avatar.classList.contains('shimmer')).toBe(true);
    });

    it('should apply shimmer class to action buttons', () => {
      component.hasActions = true;
      fixture.detectChanges();

      const buttons =
        fixture.nativeElement.querySelectorAll('.skeleton-button');
      buttons.forEach((btn: HTMLElement) => {
        expect(btn.classList.contains('shimmer')).toBe(true);
      });
    });
  });

  describe('Accessibility Tests', () => {
    it('should have aria-label attribute', () => {
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.skeleton-card');
      expect(card.getAttribute('aria-label')).toContain('Loading');
    });

    it('should have role status for screen readers', () => {
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.skeleton-card');
      expect(card.getAttribute('role')).toBe('status');
    });
  });

  describe('Responsive Design Tests', () => {
    it('should render correctly with all features enabled', () => {
      component.hasHeader = true;
      component.hasAvatar = true;
      component.hasActions = true;
      component.lines = 4;
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.skeleton-card');
      const header = card.querySelector('.skeleton-header');
      const avatar = card.querySelector('.skeleton-avatar');
      const content = card.querySelector('.skeleton-content');
      const actions = card.querySelector('.skeleton-actions');

      expect(header).toBeTruthy();
      expect(avatar).toBeTruthy();
      expect(content).toBeTruthy();
      expect(actions).toBeTruthy();
    });

    it('should render minimal skeleton when all optional features disabled', () => {
      component.hasHeader = false;
      component.hasAvatar = false;
      component.hasActions = false;
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.skeleton-card');
      const header = card.querySelector('.skeleton-header');
      const actions = card.querySelector('.skeleton-actions');

      expect(header).toBeFalsy();
      expect(actions).toBeFalsy();
      expect(card.querySelector('.skeleton-content')).toBeTruthy();
    });
  });
});
