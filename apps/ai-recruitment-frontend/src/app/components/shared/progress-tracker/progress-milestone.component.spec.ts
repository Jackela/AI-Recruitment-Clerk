import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ProgressMilestoneComponent } from './progress-milestone.component';
import type { ProgressStep } from './progress-tracker.types';

describe('ProgressMilestoneComponent', () => {
  let component: ProgressMilestoneComponent;
  let fixture: ComponentFixture<ProgressMilestoneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressMilestoneComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressMilestoneComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render step item', () => {
      component.step = { id: '1', label: 'Test', status: 'pending' };
      component.stepNumber = 1;
      fixture.detectChanges();

      const item = fixture.nativeElement.querySelector('.step-item');
      expect(item).toBeTruthy();
    });

    it('should render step icon container', () => {
      component.step = { id: '1', label: 'Test', status: 'pending' };
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.step-icon');
      expect(icon).toBeTruthy();
    });

    it('should render step content', () => {
      component.step = { id: '1', label: 'Test Step', status: 'pending' };
      fixture.detectChanges();

      const content = fixture.nativeElement.querySelector('.step-content');
      expect(content).toBeTruthy();
    });

    it('should render step label', () => {
      component.step = { id: '1', label: 'Test Label', status: 'pending' };
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('.step-label');
      expect(label).toBeTruthy();
      expect(label.textContent.trim()).toBe('Test Label');
    });
  });

  describe('Input/Output Tests', () => {
    it('should have default stepNumber value', () => {
      expect(component.stepNumber).toBe(0);
    });

    it('should bind step input correctly', () => {
      const step: ProgressStep = {
        id: '1',
        label: 'Test',
        status: 'completed',
      };
      component.step = step;
      fixture.detectChanges();

      expect(component.step).toEqual(step);
    });

    it('should bind stepNumber input correctly', () => {
      component.stepNumber = 3;
      fixture.detectChanges();

      expect(component.stepNumber).toBe(3);
    });
  });

  describe('Status Icon Tests', () => {
    it('should render completed icon for completed status', () => {
      component.step = { id: '1', label: 'Test', status: 'completed' };
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.icon-completed');
      expect(icon).toBeTruthy();
    });

    it('should render error icon for error status', () => {
      component.step = { id: '1', label: 'Test', status: 'error' };
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.icon-error');
      expect(icon).toBeTruthy();
    });

    it('should render spinner for active status', () => {
      component.step = { id: '1', label: 'Test', status: 'active' };
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('.spinner');
      expect(spinner).toBeTruthy();
    });

    it('should render step number for pending status', () => {
      component.step = { id: '1', label: 'Test', status: 'pending' };
      component.stepNumber = 5;
      fixture.detectChanges();

      const stepNum = fixture.nativeElement.querySelector('.step-number');
      expect(stepNum).toBeTruthy();
      expect(stepNum.textContent.trim()).toBe('5');
    });
  });

  describe('Status Class Tests', () => {
    it('should apply completed class', () => {
      component.step = { id: '1', label: 'Test', status: 'completed' };
      fixture.detectChanges();

      const item = fixture.nativeElement.querySelector('.step-item');
      expect(item.classList.contains('completed')).toBe(true);
    });

    it('should apply active class', () => {
      component.step = { id: '1', label: 'Test', status: 'active' };
      fixture.detectChanges();

      const item = fixture.nativeElement.querySelector('.step-item');
      expect(item.classList.contains('active')).toBe(true);
    });

    it('should apply error class', () => {
      component.step = { id: '1', label: 'Test', status: 'error' };
      fixture.detectChanges();

      const item = fixture.nativeElement.querySelector('.step-item');
      expect(item.classList.contains('error')).toBe(true);
    });
  });

  describe('Description Tests', () => {
    it('should render description when provided', () => {
      component.step = {
        id: '1',
        label: 'Test',
        status: 'pending',
        description: 'Step description',
      };
      fixture.detectChanges();

      const description =
        fixture.nativeElement.querySelector('.step-description');
      expect(description).toBeTruthy();
      expect(description.textContent.trim()).toBe('Step description');
    });

    it('should not render description when not provided', () => {
      component.step = { id: '1', label: 'Test', status: 'pending' };
      fixture.detectChanges();

      const description =
        fixture.nativeElement.querySelector('.step-description');
      expect(description).toBeFalsy();
    });
  });

  describe('Progress Bar Tests', () => {
    it('should render progress bar for active step with progress', () => {
      component.step = {
        id: '1',
        label: 'Test',
        status: 'active',
        progress: 50,
      };
      fixture.detectChanges();

      const progress = fixture.nativeElement.querySelector('.step-progress');
      expect(progress).toBeTruthy();
    });

    it('should set correct progress width', () => {
      component.step = {
        id: '1',
        label: 'Test',
        status: 'active',
        progress: 75,
      };
      fixture.detectChanges();

      const fill = fixture.nativeElement.querySelector('.mini-progress-fill');
      expect(fill.style.width).toBe('75%');
    });

    it('should display progress percentage', () => {
      component.step = {
        id: '1',
        label: 'Test',
        status: 'active',
        progress: 60,
      };
      fixture.detectChanges();

      const percentage =
        fixture.nativeElement.querySelector('.step-percentage');
      expect(percentage.textContent).toBe('60%');
    });

    it('should not render progress bar for non-active step', () => {
      component.step = {
        id: '1',
        label: 'Test',
        status: 'completed',
        progress: 100,
      };
      fixture.detectChanges();

      const progress = fixture.nativeElement.querySelector('.step-progress');
      expect(progress).toBeFalsy();
    });

    it('should not render progress bar when progress is undefined', () => {
      component.step = {
        id: '1',
        label: 'Test',
        status: 'active',
      };
      fixture.detectChanges();

      const progress = fixture.nativeElement.querySelector('.step-progress');
      expect(progress).toBeFalsy();
    });
  });
});
