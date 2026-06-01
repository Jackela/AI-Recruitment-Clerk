import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ProgressTimelineComponent } from './progress-timeline.component';
import type { ProgressStep } from './progress-tracker.types';

describe('ProgressTimelineComponent', () => {
  let component: ProgressTimelineComponent;
  let fixture: ComponentFixture<ProgressTimelineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressTimelineComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressTimelineComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render steps container', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.steps-container');
      expect(container).toBeTruthy();
    });

    it('should render progress milestones for each step', () => {
      component.steps = [
        { id: '1', label: 'Step 1', status: 'completed' },
        { id: '2', label: 'Step 2', status: 'active' },
        { id: '3', label: 'Step 3', status: 'pending' },
      ];
      fixture.detectChanges();

      const milestones = fixture.nativeElement.querySelectorAll(
        'arc-progress-milestone',
      );
      expect(milestones.length).toBe(3);
    });

    it('should render no milestones when steps is empty', () => {
      component.steps = [];
      fixture.detectChanges();

      const milestones = fixture.nativeElement.querySelectorAll(
        'arc-progress-milestone',
      );
      expect(milestones.length).toBe(0);
    });
  });

  describe('Input/Output Tests', () => {
    it('should have default empty steps array', () => {
      expect(component.steps).toEqual([]);
    });

    it('should bind steps input correctly', () => {
      const steps: ProgressStep[] = [
        { id: '1', label: 'Upload', status: 'completed' },
        { id: '2', label: 'Process', status: 'active' },
      ];
      component.steps = steps;
      fixture.detectChanges();

      expect(component.steps).toEqual(steps);
    });
  });

  describe('Helper Method Tests', () => {
    it('should calculate correct step number', () => {
      component.steps = [
        { id: 'upload', label: 'Upload', status: 'completed' },
        { id: 'parse', label: 'Parse', status: 'active' },
        { id: 'analyze', label: 'Analyze', status: 'pending' },
      ];

      expect(component.getStepNumber('upload')).toBe(1);
      expect(component.getStepNumber('parse')).toBe(2);
      expect(component.getStepNumber('analyze')).toBe(3);
    });

    it('should return 0 for non-existent step id', () => {
      component.steps = [{ id: '1', label: 'Step 1', status: 'completed' }];

      expect(component.getStepNumber('nonexistent')).toBe(0);
    });

    it('should track by step id', () => {
      const step: ProgressStep = {
        id: 'test-id',
        label: 'Test',
        status: 'pending',
      };

      const result = component.trackByStepId(0, step);
      expect(result).toBe('test-id');
    });
  });

  describe('Integration Tests', () => {
    it('should pass step data to milestone components', () => {
      component.steps = [{ id: '1', label: 'Step 1', status: 'completed' }];
      fixture.detectChanges();

      const milestone = fixture.nativeElement.querySelector(
        'arc-progress-milestone',
      );
      expect(milestone).toBeTruthy();
    });

    it('should pass correct step number to milestones', () => {
      component.steps = [
        { id: '1', label: 'Step 1', status: 'completed' },
        { id: '2', label: 'Step 2', status: 'pending' },
      ];
      fixture.detectChanges();

      const milestones = fixture.nativeElement.querySelectorAll(
        'arc-progress-milestone',
      );
      expect(milestones[0].getAttribute('ng-reflect-step-number')).toBe('1');
      expect(milestones[1].getAttribute('ng-reflect-step-number')).toBe('2');
    });
  });
});
