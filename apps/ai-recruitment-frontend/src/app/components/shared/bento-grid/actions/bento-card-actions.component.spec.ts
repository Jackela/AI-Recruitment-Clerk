import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { BentoCardActionsComponent } from './bento-card-actions.component';
import type { BentoCardAction } from '../types/bento-card.types';

describe('BentoCardActionsComponent', () => {
  let component: BentoCardActionsComponent;
  let fixture: ComponentFixture<BentoCardActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BentoCardActionsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BentoCardActionsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render actions container when actions provided', () => {
      component.actions = [{ label: 'View', action: 'view' }];
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.card-actions');
      expect(container).toBeTruthy();
    });

    it('should not render when no actions', () => {
      component.actions = [];
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.card-actions');
      expect(container).toBeFalsy();
    });

    it('should render action buttons', () => {
      component.actions = [
        { label: 'View', action: 'view' },
        { label: 'Edit', action: 'edit' },
      ];
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('.action-btn');
      expect(buttons.length).toBe(2);
    });
  });

  describe('Input/Output Tests', () => {
    it('should bind actions input correctly', () => {
      const actions: BentoCardAction[] = [
        { label: 'View', action: 'view' },
        { label: 'Delete', action: 'delete', variant: 'danger' },
      ];
      component.actions = actions;
      fixture.detectChanges();

      expect(component.actions).toEqual(actions);
    });
  });

  describe('Event Trigger Tests', () => {
    it('should emit actionClick when button clicked', () => {
      const action: BentoCardAction = { label: 'View', action: 'view' };
      component.actions = [action];
      fixture.detectChanges();

      const emitSpy = jest.spyOn(component.actionClick, 'emit');
      const button = fixture.nativeElement.querySelector('.action-btn');
      button.click();

      expect(emitSpy).toHaveBeenCalledWith(action);
    });
  });

  describe('Button Variant Tests', () => {
    it('should apply primary variant class', () => {
      component.actions = [
        { label: 'View', action: 'view', variant: 'primary' },
      ];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.action-btn');
      expect(button.classList.contains('btn-primary')).toBe(true);
    });

    it('should apply secondary variant class', () => {
      component.actions = [
        { label: 'Cancel', action: 'cancel', variant: 'secondary' },
      ];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.action-btn');
      expect(button.classList.contains('btn-secondary')).toBe(true);
    });

    it('should apply danger variant class', () => {
      component.actions = [
        { label: 'Delete', action: 'delete', variant: 'danger' },
      ];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.action-btn');
      expect(button.classList.contains('btn-danger')).toBe(true);
    });

    it('should default to primary variant', () => {
      component.actions = [{ label: 'View', action: 'view' }];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.action-btn');
      expect(button.classList.contains('btn-primary')).toBe(true);
    });
  });

  describe('Accessibility Tests', () => {
    it('should have button type on all buttons', () => {
      component.actions = [{ label: 'View', action: 'view' }];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.action-btn');
      expect(button.getAttribute('type')).toBe('button');
    });
  });
});
