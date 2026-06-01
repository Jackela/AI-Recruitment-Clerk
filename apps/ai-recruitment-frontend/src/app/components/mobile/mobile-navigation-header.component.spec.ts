import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type {
  HeaderAction} from './mobile-navigation-header.component';
import {
  MobileNavigationHeaderComponent
} from './mobile-navigation-header.component';

describe('MobileNavigationHeaderComponent', () => {
  let component: MobileNavigationHeaderComponent;
  let fixture: ComponentFixture<MobileNavigationHeaderComponent>;

  const mockActions: HeaderAction[] = [
    {
      id: 'notifications',
      label: 'Notifications',
      icon: 'M12,22A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7A7,7 0 0,1 20,14V16A1,1 0 0,0 21,17H22V19H2V17H3A1,1 0 0,0 4,16V14A7,7 0 0,1 11,7V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,21A1.5,1.5 0 0,0 9,19.5H15A1.5,1.5 0 0,0 16.5,21A1.5,1.5 0 0,0 15,22.5H9A1.5,1.5 0 0,0 7.5,21Z',
      badge: 3,
    },
    {
      id: 'search',
      label: 'Search',
      icon: 'M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileNavigationHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileNavigationHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Properties', () => {
    it('should accept pageTitle input', () => {
      component.pageTitle = 'Dashboard';
      expect(component.pageTitle).toBe('Dashboard');
    });

    it('should accept pageSubtitle input', () => {
      component.pageSubtitle = 'Overview';
      expect(component.pageSubtitle).toBe('Overview');
    });

    it('should accept showBackButton input', () => {
      component.showBackButton = true;
      expect(component.showBackButton).toBe(true);
    });

    it('should have default showBackButton value of false', () => {
      expect(component.showBackButton).toBe(false);
    });

    it('should accept isScrolled input', () => {
      component.isScrolled = true;
      expect(component.isScrolled).toBe(true);
    });

    it('should accept isMenuOpen input', () => {
      component.isMenuOpen = true;
      expect(component.isMenuOpen).toBe(true);
    });

    it('should accept headerActions input', () => {
      component.headerActions = mockActions;
      expect(component.headerActions).toBe(mockActions);
    });
  });

  describe('Output Events', () => {
    it('should emit backClick event', () => {
      const emitSpy = jest.spyOn(component.backClick, 'emit');
      component.onBackClick();
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should emit actionClick event with action', () => {
      const emitSpy = jest.spyOn(component.actionClick, 'emit');
      const action = mockActions[0];
      component.onActionClick(action);
      expect(emitSpy).toHaveBeenCalledWith(action);
    });

    it('should emit menuToggle event', () => {
      const emitSpy = jest.spyOn(component.menuToggle, 'emit');
      component.onMenuToggle();
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('Methods', () => {
    it('should emit backClick on back button click', () => {
      const emitSpy = jest.spyOn(component.backClick, 'emit');
      component.onBackClick();
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should emit actionClick on action button click', () => {
      const emitSpy = jest.spyOn(component.actionClick, 'emit');
      component.onActionClick(mockActions[0]);
      expect(emitSpy).toHaveBeenCalledWith(mockActions[0]);
    });

    it('should emit menuToggle on menu button click', () => {
      const emitSpy = jest.spyOn(component.menuToggle, 'emit');
      component.onMenuToggle();
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('Template Rendering', () => {
    beforeEach(() => {
      component.pageTitle = 'Test Page';
      component.pageSubtitle = 'Test Subtitle';
      component.headerActions = mockActions;
      fixture.detectChanges();
    });

    it('should render header', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.mobile-header')).toBeTruthy();
    });

    it('should render page title', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const title = compiled.querySelector('.header-title');
      expect(title?.textContent).toContain('Test Page');
    });

    it('should render page subtitle', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const subtitle = compiled.querySelector('.header-subtitle');
      expect(subtitle?.textContent).toContain('Test Subtitle');
    });

    it('should not render back button by default', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.header-back')).toBeFalsy();
    });

    it('should render back button when showBackButton is true', () => {
      component.showBackButton = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.header-back')).toBeTruthy();
    });

    it('should render header actions', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const actions = compiled.querySelectorAll('.header-action');
      expect(actions.length).toBe(2);
    });

    it('should render action badges', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const badges = compiled.querySelectorAll('.action-badge');
      expect(badges.length).toBe(1);
      expect(badges[0].textContent).toContain('3');
    });

    it('should render menu button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.header-menu')).toBeTruthy();
    });

    it('should apply scrolled class when isScrolled is true', () => {
      component.isScrolled = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(
        compiled
          .querySelector('.mobile-header')
          ?.classList.contains('scrolled'),
      ).toBe(true);
    });

    it('should have hamburger icon in menu button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const hamburger = compiled.querySelector('.hamburger');
      expect(hamburger).toBeTruthy();
    });

    it('should apply active class to hamburger when isMenuOpen is true', () => {
      component.isMenuOpen = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const hamburger = compiled.querySelector('.hamburger');
      expect(hamburger?.classList.contains('active')).toBe(true);
    });
  });
});
