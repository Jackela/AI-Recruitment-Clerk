import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { MobileNavigationComponent, MobileNavItem } from './mobile-navigation.component';

describe('MobileNavigationComponent', () => {
  let fixture: ComponentFixture<MobileNavigationComponent>;
  let component: MobileNavigationComponent;
  let router: Router;
  let location: Location;

  const navItems: MobileNavItem[] = [
    { id: 'home', label: 'Home', icon: 'M0 0', route: '/home' },
    { id: 'jobs', label: 'Jobs', icon: 'M0 0', route: '/jobs' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MobileNavigationComponent,
        RouterTestingModule.withRoutes([
          { path: 'home', component: MobileNavigationComponent },
          { path: 'jobs', component: MobileNavigationComponent },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileNavigationComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);

    component.pageTitle = 'Dashboard';
    component.navItems = navItems;
    component.menuItems = navItems;
    fixture.detectChanges();
  });

  it('should toggle the mobile menu when menu button is clicked', () => {
    const button = fixture.nativeElement.querySelector('.header-menu') as HTMLButtonElement;
    expect(component.isMenuOpen).toBe(false);

    button.click();
    fixture.detectChanges();
    expect(component.isMenuOpen).toBe(true);

    // clicking overlay should close menu
    const overlay = fixture.nativeElement.querySelector('.mobile-menu-overlay') as HTMLElement;
    overlay.dispatchEvent(new Event('click'));
    fixture.detectChanges();
    expect(component.isMenuOpen).toBe(false);
  });

  it('should emit menu action clicks and close the menu', () => {
    const actionSpy = jest.fn();
    component.menuItems = [
      { id: 'profile', label: 'Profile', icon: 'M0 0', route: '/home' },
    ];
    component.actionClick.subscribe(actionSpy);
    fixture.detectChanges();

    component.toggleMenu();
    fixture.detectChanges();
    const item = fixture.nativeElement.querySelector('.menu-item') as HTMLAnchorElement;
    item.click();
    fixture.detectChanges();

    expect(component.isMenuOpen).toBe(false);
    expect(actionSpy).not.toHaveBeenCalled(); // menu item does not emit actionClick
  });

  it('should update currentRoute on navigation end', async () => {
    await router.navigate(['/jobs']);
    fixture.detectChanges();

    expect(location.path()).toBe('/jobs');
    expect(component.currentRoute).toBe('/jobs');
    const activeLink = fixture.nativeElement.querySelector('.nav-item.active') as HTMLElement;
    expect(activeLink?.getAttribute('aria-current')).toBe('page');
  });
});
