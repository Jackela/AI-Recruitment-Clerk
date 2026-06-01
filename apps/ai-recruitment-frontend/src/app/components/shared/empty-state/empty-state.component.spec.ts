import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EmptyStateComponent } from './empty-state.component';
import type { EmptyStateAction, EmptyStateType } from './empty-state.types';

describe('EmptyStateComponent', () => {
  let component: EmptyStateComponent;
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render empty state container', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.empty-state');
      expect(container).toBeTruthy();
    });

    it('should have role status attribute', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.empty-state');
      expect(container.getAttribute('role')).toBe('status');
    });

    it('should have aria-live polite attribute', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.empty-state');
      expect(container.getAttribute('aria-live')).toBe('polite');
    });

    it('should render icon when provided', () => {
      component.icon = 'inbox';
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.empty-state__icon');
      expect(icon).toBeTruthy();
    });

    it('should render custom image when provided', () => {
      component.image = '/assets/empty.png';
      fixture.detectChanges();

      const image = fixture.nativeElement.querySelector('.empty-state__image');
      expect(image).toBeTruthy();
      expect(image.querySelector('img').src).toContain('/assets/empty.png');
    });

    it('should render title when provided', () => {
      component.title = 'empty.title';
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.empty-state__title');
      expect(title).toBeTruthy();
    });

    it('should render description when provided', () => {
      component.description = 'empty.description';
      fixture.detectChanges();

      const description = fixture.nativeElement.querySelector(
        '.empty-state__description',
      );
      expect(description).toBeTruthy();
    });
  });

  describe('Input/Output Tests', () => {
    it('should have default type as default', () => {
      expect(component.type).toBe('default');
    });

    it('should bind type input correctly', () => {
      const types: EmptyStateType[] = ['default', 'search', 'error', 'success'];

      types.forEach((type) => {
        component.type = type;
        fixture.detectChanges();

        const container = fixture.nativeElement.querySelector('.empty-state');
        expect(container.classList.contains(`empty-state--${type}`)).toBe(true);
      });
    });

    it('should bind icon input correctly', () => {
      component.icon = 'search';
      fixture.detectChanges();

      expect(component.icon).toBe('search');
    });

    it('should bind image input correctly', () => {
      component.image = '/path/to/image.png';
      fixture.detectChanges();

      expect(component.image).toBe('/path/to/image.png');
    });

    it('should bind title input correctly', () => {
      component.title = 'custom.title';
      fixture.detectChanges();

      expect(component.title).toBe('custom.title');
    });

    it('should bind description input correctly', () => {
      component.description = 'custom.description';
      fixture.detectChanges();

      expect(component.description).toBe('custom.description');
    });

    it('should bind actions input correctly', () => {
      const actions: EmptyStateAction[] = [
        { label: 'action.create', variant: 'primary' },
        { label: 'action.cancel', variant: 'secondary' },
      ];
      component.actions = actions;
      fixture.detectChanges();

      expect(component.actions).toEqual(actions);
    });
  });

  describe('Icon Tests', () => {
    it('should set default icon on init if no icon or image provided', () => {
      component.icon = undefined;
      component.image = undefined;
      component.ngOnInit();

      expect(component.icon).toBe('grid');
    });

    it('should not change icon if already provided', () => {
      component.icon = 'search';
      component.image = undefined;
      component.ngOnInit();

      expect(component.icon).toBe('search');
    });

    it('should not set default icon if image is provided', () => {
      component.icon = undefined;
      component.image = '/image.png';
      component.ngOnInit();

      expect(component.icon).toBeUndefined();
    });

    it('should render inbox icon', () => {
      component.icon = 'inbox';
      fixture.detectChanges();

      const iconContainer =
        fixture.nativeElement.querySelector('.empty-state__icon');
      expect(iconContainer).toBeTruthy();
    });

    it('should render search icon', () => {
      component.icon = 'search';
      fixture.detectChanges();

      const iconContainer =
        fixture.nativeElement.querySelector('.empty-state__icon');
      expect(iconContainer).toBeTruthy();
    });

    it('should render error icon', () => {
      component.icon = 'error';
      fixture.detectChanges();

      const iconContainer =
        fixture.nativeElement.querySelector('.empty-state__icon');
      expect(iconContainer).toBeTruthy();
    });

    it('should render success icon', () => {
      component.icon = 'success';
      fixture.detectChanges();

      const iconContainer =
        fixture.nativeElement.querySelector('.empty-state__icon');
      expect(iconContainer).toBeTruthy();
    });
  });

  describe('Action Tests', () => {
    it('should render action buttons', () => {
      component.actions = [
        { label: 'action.create', variant: 'primary' },
        { label: 'action.cancel', variant: 'secondary' },
      ];
      fixture.detectChanges();

      const actionsContainer = fixture.nativeElement.querySelector(
        '.empty-state__actions',
      );
      expect(actionsContainer).toBeTruthy();

      const buttons = actionsContainer.querySelectorAll('button');
      expect(buttons.length).toBe(2);
    });

    it('should emit actionClick when action is clicked', () => {
      const action: EmptyStateAction = {
        label: 'action.create',
        variant: 'primary',
      };
      component.actions = [action];
      fixture.detectChanges();

      const emitSpy = jest.spyOn(component.actionClick, 'emit');
      const button = fixture.nativeElement.querySelector('button');
      button.click();

      expect(emitSpy).toHaveBeenCalledWith(action);
    });

    it('should call action handler when provided', () => {
      const handler = jest.fn();
      const action: EmptyStateAction = {
        label: 'action.create',
        variant: 'primary',
        handler,
      };
      component.actions = [action];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      button.click();

      expect(handler).toHaveBeenCalled();
    });

    it('should apply correct button variant classes', () => {
      component.actions = [
        { label: 'primary', variant: 'primary' },
        { label: 'secondary', variant: 'secondary' },
        { label: 'outline', variant: 'outline' },
      ];
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons[0].classList.contains('btn-primary')).toBe(true);
      expect(buttons[1].classList.contains('btn-secondary')).toBe(true);
      expect(buttons[2].classList.contains('btn-outline')).toBe(true);
    });

    it('should render action icons when provided', () => {
      component.actions = [{ label: 'action.create', icon: 'plus' }];
      fixture.detectChanges();

      const svg = fixture.nativeElement.querySelector('.btn-icon');
      expect(svg).toBeTruthy();
    });
  });

  describe('Accessibility Tests', () => {
    it('should have button type on all action buttons', () => {
      component.actions = [{ label: 'action.create' }];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.getAttribute('type')).toBe('button');
    });

    it('should have aria-label on action buttons', () => {
      component.actions = [{ label: 'action.create' }];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.getAttribute('aria-label')).toBe('action.create');
    });

    it('should have aria-hidden on icons', () => {
      component.icon = 'inbox';
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector(
        '.empty-state__icon svg',
      );
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });

    it('should have alt text on images', () => {
      component.image = '/image.png';
      component.title = 'image.alt';
      fixture.detectChanges();

      const img = fixture.nativeElement.querySelector('img');
      expect(img.getAttribute('alt')).toBe('image.alt');
    });
  });

  describe('Conditional Rendering Tests', () => {
    it('should not render icon section when no icon or image', () => {
      component.icon = undefined;
      component.image = undefined;
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.empty-state__icon');
      const image = fixture.nativeElement.querySelector('.empty-state__image');
      expect(icon).toBeFalsy();
      expect(image).toBeFalsy();
    });

    it('should not render title when not provided', () => {
      component.title = undefined;
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.empty-state__title');
      expect(title).toBeFalsy();
    });

    it('should not render description when not provided', () => {
      component.description = undefined;
      fixture.detectChanges();

      const description = fixture.nativeElement.querySelector(
        '.empty-state__description',
      );
      expect(description).toBeFalsy();
    });

    it('should not render actions when not provided', () => {
      component.actions = undefined;
      fixture.detectChanges();

      const actions = fixture.nativeElement.querySelector(
        '.empty-state__actions',
      );
      expect(actions).toBeFalsy();
    });

    it('should not render actions when empty array', () => {
      component.actions = [];
      fixture.detectChanges();

      const actions = fixture.nativeElement.querySelector(
        '.empty-state__actions',
      );
      expect(actions).toBeFalsy();
    });
  });
});
