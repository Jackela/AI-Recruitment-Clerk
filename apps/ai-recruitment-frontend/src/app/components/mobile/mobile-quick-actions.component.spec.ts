import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MobileQuickActionsComponent } from './mobile-quick-actions.component';
import type { QuickAction } from '../../services/mobile/mobile-dashboard.service';

describe('MobileQuickActionsComponent', () => {
  let component: MobileQuickActionsComponent;
  let fixture: ComponentFixture<MobileQuickActionsComponent>;

  const mockQuickActions: QuickAction[] = [
    {
      id: 'upload',
      label: 'Upload',
      icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z',
      route: '/upload',
      color: 'primary',
    },
    {
      id: 'jobs',
      label: 'Jobs',
      icon: 'M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22S19,14.25 19,9A7,7 0 0,0 12,2Z',
      route: '/jobs',
      color: 'success',
    },
    {
      id: 'candidates',
      label: 'Candidates',
      icon: 'M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z',
      route: '/candidates',
      color: 'warning',
      badge: 5,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: 'M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V4C4,2.89 4.89,2 6,2M15,18V16H6V18H15M18,14V12H6V14H18Z',
      route: '/reports',
      color: 'danger',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileQuickActionsComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileQuickActionsComponent);
    component = fixture.componentInstance;
    component.quickActions = mockQuickActions;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Properties', () => {
    it('should accept quickActions input', () => {
      expect(component.quickActions).toBe(mockQuickActions);
    });

    it('should handle empty quickActions array', () => {
      component.quickActions = [];
      fixture.detectChanges();
      expect(component.quickActions.length).toBe(0);
    });
  });

  describe('Template Rendering', () => {
    it('should render quick actions bar', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.quick-actions-bar')).toBeTruthy();
    });

    it('should not render when quickActions is empty', () => {
      component.quickActions = [];
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.quick-actions-bar')).toBeFalsy();
    });

    it('should render action buttons', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll('.quick-action');
      expect(buttons.length).toBe(4);
    });

    it('should render action labels', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const labels = compiled.querySelectorAll('.action-label');
      expect(labels.length).toBe(4);
      expect(labels[0].textContent).toContain('Upload');
      expect(labels[1].textContent).toContain('Jobs');
    });

    it('should render action icons', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const icons = compiled.querySelectorAll('.action-icon');
      expect(icons.length).toBe(4);
    });

    it('should render badges when present', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const badges = compiled.querySelectorAll('.action-badge');
      expect(badges.length).toBe(1);
      expect(badges[0].textContent).toContain('5');
    });

    it('should apply correct color classes', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll('.quick-action');
      expect(buttons[0].classList.contains('quick-action--primary')).toBe(true);
      expect(buttons[1].classList.contains('quick-action--success')).toBe(true);
      expect(buttons[2].classList.contains('quick-action--warning')).toBe(true);
      expect(buttons[3].classList.contains('quick-action--danger')).toBe(true);
    });

    it('should have routerLink on buttons', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll('.quick-action');
      expect(buttons[0].getAttribute('ng-reflect-router-link')).toBe('/upload');
    });

    it('should have aria-label on buttons', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll('.quick-action');
      expect(buttons[0].getAttribute('aria-label')).toBe('Upload');
    });
  });
});
