import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MobileNavigationMenuComponent } from './mobile-navigation-menu.component';
import type { MobileNavItem } from './mobile-navigation.component';

describe('MobileNavigationMenuComponent', () => {
  let component: MobileNavigationMenuComponent;
  let fixture: ComponentFixture<MobileNavigationMenuComponent>;

  const mockMenuItems: MobileNavItem[] = [
    {
      id: 'settings',
      label: 'Settings',
      icon: 'M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11.03L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11.03C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z',
      route: '/settings',
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: 'M11,18H13V16H11V18M12,6A4,4 0 0,0 8,10H10A2,2 0 0,1 12,8A2,2 0 0,1 14,10C14,12 11,11.75 11,15H13C13,12.75 16,12.5 16,10A4,4 0 0,0 12,6Z',
      route: '/help',
    },
  ];

  const mockMenuActions = [
    {
      id: 'logout',
      label: 'Logout',
      icon: 'M17,17.25V14H10V10H17V6.75L22.25,12L17,17.25M13,2A2,2 0 0,1 15,4V8H13V4H4V20H13V16H15V20A2,2 0 0,1 13,22H4A2,2 0 0,1 2,20V4A2,2 0 0,1 4,2H13Z',
      action: () => {},
      disabled: false,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileNavigationMenuComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileNavigationMenuComponent);
    component = fixture.componentInstance;
    component.menuItems = mockMenuItems;
    component.menuActions = mockMenuActions;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Properties', () => {
    it('should accept isOpen input', () => {
      component.isOpen = true;
      expect(component.isOpen).toBe(true);
    });

    it('should accept menuItems input', () => {
      expect(component.menuItems).toBe(mockMenuItems);
    });

    it('should accept menuActions input', () => {
      expect(component.menuActions).toBe(mockMenuActions);
    });

    it('should handle empty menu items', () => {
      component.menuItems = [];
      fixture.detectChanges();
      expect(component.menuItems.length).toBe(0);
    });
  });

  describe('Output Events', () => {
    it('should emit close event', () => {
      const emitSpy = jest.spyOn(component.close, 'emit');
      component.close.emit();
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should emit itemClick event', () => {
      const emitSpy = jest.spyOn(component.itemClick, 'emit');
      component.onItemClick(mockMenuItems[0]);
      expect(emitSpy).toHaveBeenCalledWith(mockMenuItems[0]);
    });

    it('should emit actionClick event', () => {
      const emitSpy = jest.spyOn(component.actionClick, 'emit');
      const action = { id: 'logout', label: 'Logout' };
      component.onActionClick(mockMenuActions[0]);
      expect(emitSpy).toHaveBeenCalledWith(action);
    });
  });

  describe('Methods', () => {
    it('should emit close after item click', () => {
      const closeSpy = jest.spyOn(component.close, 'emit');
      component.onItemClick(mockMenuItems[0]);
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should not emit itemClick for disabled items', () => {
      const itemSpy = jest.spyOn(component.itemClick, 'emit');
      const closeSpy = jest.spyOn(component.close, 'emit');
      const disabledItem = { ...mockMenuItems[0], disabled: true };
      component.onItemClick(disabledItem);
      expect(itemSpy).not.toHaveBeenCalled();
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should emit actionClick with action id and label', () => {
      const emitSpy = jest.spyOn(component.actionClick, 'emit');
      component.onActionClick(mockMenuActions[0]);
      expect(emitSpy).toHaveBeenCalledWith({ id: 'logout', label: 'Logout' });
    });

    it('should emit close after action click', () => {
      const closeSpy = jest.spyOn(component.close, 'emit');
      component.onActionClick(mockMenuActions[0]);
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('Template Rendering', () => {
    it('should render menu overlay when open', () => {
      component.isOpen = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const overlay = compiled.querySelector('.mobile-menu-overlay');
      expect(overlay).toBeTruthy();
      expect(overlay?.classList.contains('open')).toBe(true);
    });

    it('should not have open class when closed', () => {
      component.isOpen = false;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const overlay = compiled.querySelector('.mobile-menu-overlay');
      expect(overlay?.classList.contains('open')).toBe(false);
    });

    it('should render menu header', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const header = compiled.querySelector('.menu-header');
      expect(header).toBeTruthy();
      expect(header?.textContent).toContain('Menu');
    });

    it('should render menu items', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const items = compiled.querySelectorAll('.menu-item');
      expect(items.length).toBe(2);
    });

    it('should render menu item labels', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const labels = compiled.querySelectorAll('.menu-label');
      expect(labels[0].textContent).toContain('Settings');
      expect(labels[1].textContent).toContain('Help & Support');
    });

    it('should render menu badges', () => {
      component.menuItems = [{ ...mockMenuItems[0], badge: 5 }];
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const badges = compiled.querySelectorAll('.menu-badge');
      expect(badges.length).toBe(1);
      expect(badges[0].textContent).toContain('5');
    });

    it('should render menu footer actions', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const actions = compiled.querySelectorAll('.menu-action');
      expect(actions.length).toBe(1);
      expect(actions[0].textContent).toContain('Logout');
    });

    it('should close on overlay click', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const overlay = compiled.querySelector('.mobile-menu-overlay');
      const closeSpy = jest.spyOn(component.close, 'emit');
      overlay?.dispatchEvent(new Event('click'));
      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
