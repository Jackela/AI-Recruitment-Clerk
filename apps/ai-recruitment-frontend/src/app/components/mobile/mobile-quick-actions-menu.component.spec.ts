import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type {
  QuickActionMenuItem} from './mobile-quick-actions-menu.component';
import {
  MobileQuickActionsMenuComponent
} from './mobile-quick-actions-menu.component';

describe('MobileQuickActionsMenuComponent', () => {
  let component: MobileQuickActionsMenuComponent;
  let fixture: ComponentFixture<MobileQuickActionsMenuComponent>;

  const mockActions: QuickActionMenuItem[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: 'M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17Z',
      color: 'primary',
    },
    {
      id: 'contact',
      label: 'Contact',
      icon: 'M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z',
      color: 'success',
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'M19,6.41L17.59,5 12,10.59 6.41,5 5,6.41 10.59,12 5,17.59 6.41,19 12,13.41 17.59,19 19,17.59 13.41,12Z',
      color: 'danger',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileQuickActionsMenuComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileQuickActionsMenuComponent);
    component = fixture.componentInstance;
    component.actions = mockActions;
    component.visible = true;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Properties', () => {
    it('should accept visible input', () => {
      expect(component.visible).toBe(true);
      component.visible = false;
      expect(component.visible).toBe(false);
    });

    it('should accept actions input', () => {
      expect(component.actions).toBe(mockActions);
    });

    it('should have default visible value of false', () => {
      const newComponent = TestBed.createComponent(
        MobileQuickActionsMenuComponent,
      );
      expect(newComponent.componentInstance.visible).toBe(false);
    });

    it('should have default empty actions array', () => {
      const newComponent = TestBed.createComponent(
        MobileQuickActionsMenuComponent,
      );
      expect(newComponent.componentInstance.actions).toEqual([]);
    });
  });

  describe('Output Events', () => {
    it('should emit actionClick event', () => {
      const emitSpy = jest.spyOn(component.actionClick, 'emit');
      const action = mockActions[0];
      component.onActionClick(action, new MouseEvent('click'));
      expect(emitSpy).toHaveBeenCalledWith(action);
    });
  });

  describe('Methods', () => {
    it('should emit action on click and stop propagation', () => {
      const emitSpy = jest.spyOn(component.actionClick, 'emit');
      const event = new MouseEvent('click');
      const stopSpy = jest.spyOn(event, 'stopPropagation');
      component.onActionClick(mockActions[0], event);
      expect(stopSpy).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith(mockActions[0]);
    });
  });

  describe('Template Rendering', () => {
    it('should render menu when visible', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.quick-actions-menu')).toBeTruthy();
    });

    it('should not render menu when not visible', () => {
      component.visible = false;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.quick-actions-menu')).toBeFalsy();
    });

    it('should render action buttons', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll('.quick-action-btn');
      expect(buttons.length).toBe(3);
    });

    it('should render action labels', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll('.quick-action-btn');
      expect(buttons[0].textContent).toContain('View Details');
      expect(buttons[1].textContent).toContain('Contact');
      expect(buttons[2].textContent).toContain('Delete');
    });

    it('should apply correct color classes', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll('.quick-action-btn');
      expect(buttons[0].classList.contains('action-primary')).toBe(true);
      expect(buttons[1].classList.contains('action-success')).toBe(true);
      expect(buttons[2].classList.contains('action-danger')).toBe(true);
    });
  });
});
