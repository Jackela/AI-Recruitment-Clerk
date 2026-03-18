import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  MobileResultsItemComponent,
  CandidateResult,
} from './mobile-results-item.component';

describe('MobileResultsItemComponent', () => {
  let component: MobileResultsItemComponent;
  let fixture: ComponentFixture<MobileResultsItemComponent>;

  const mockCandidate: CandidateResult = {
    id: '1',
    name: 'John Doe',
    title: 'Senior Developer',
    experience: '5 years',
    location: 'New York, NY',
    score: 85,
    match: 'excellent',
    status: 'shortlisted',
    skills: ['JavaScript', 'TypeScript', 'Angular'],
    summary: 'Experienced developer with strong Angular skills',
    education: 'BS Computer Science',
    lastUpdated: '2 hours ago',
    tags: ['urgent', 'remote'],
    strengths: ['Problem solving', 'Communication'],
    weaknesses: ['Public speaking'],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, MobileResultsItemComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileResultsItemComponent);
    component = fixture.componentInstance;
    component.candidate = mockCandidate;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Properties', () => {
    it('should accept candidate input', () => {
      expect(component.candidate).toBe(mockCandidate);
    });

    it('should accept isSelected input', () => {
      component.isSelected = true;
      expect(component.isSelected).toBe(true);
    });

    it('should accept showDetailed input', () => {
      component.showDetailed = true;
      expect(component.showDetailed).toBe(true);
    });

    it('should have default isSelected value of false', () => {
      const newComponent = TestBed.createComponent(MobileResultsItemComponent);
      expect(newComponent.componentInstance.isSelected).toBe(false);
    });

    it('should have default showDetailed value of false', () => {
      const newComponent = TestBed.createComponent(MobileResultsItemComponent);
      expect(newComponent.componentInstance.showDetailed).toBe(false);
    });
  });

  describe('Output Events', () => {
    it('should emit candidateSelected event', () => {
      const emitSpy = jest.spyOn(component.candidateSelected, 'emit');
      component.onCandidateClick();
      expect(emitSpy).toHaveBeenCalledWith(mockCandidate);
    });

    it('should emit candidateAction event on swipe', () => {
      const emitSpy = jest.spyOn(component.candidateAction, 'emit');
      const swipeEvent = {
        action: {
          id: 'view',
          label: 'View',
          color: 'primary' as const,
          icon: '',
          width: 80,
        },
        item: mockCandidate,
      };
      component.onSwipeAction(swipeEvent);
      expect(emitSpy).toHaveBeenCalledWith({
        action: 'view',
        candidate: mockCandidate,
      });
    });

    it('should emit selectionToggled event', () => {
      const emitSpy = jest.spyOn(component.selectionToggled, 'emit');
      const event = new Event('change');
      component.onToggleSelection(event);
      expect(emitSpy).toHaveBeenCalledWith(event);
    });
  });

  describe('Methods', () => {
    it('should emit candidate on click', () => {
      const emitSpy = jest.spyOn(component.candidateSelected, 'emit');
      component.onCandidateClick();
      expect(emitSpy).toHaveBeenCalledWith(mockCandidate);
    });

    it('should show quick actions on long press', () => {
      component.onCandidateLongPress();
      expect(component.showQuickActions).toBe(true);
    });

    it('should emit action and hide menu on quick action', () => {
      const emitSpy = jest.spyOn(component.candidateAction, 'emit');
      component.showQuickActions = true;
      component.onQuickAction({
        id: 'view',
        label: 'View',
        icon: '',
        color: 'primary',
      });
      expect(emitSpy).toHaveBeenCalledWith({
        action: 'view',
        candidate: mockCandidate,
      });
      expect(component.showQuickActions).toBe(false);
    });

    it('should get swipe actions', () => {
      const actions = component.getSwipeActions();
      expect(actions.length).toBe(3);
      expect(actions[0].id).toBe('view');
      expect(actions[1].id).toBe('shortlist');
      expect(actions[2].id).toBe('reject');
    });
  });

  describe('Quick Actions', () => {
    it('should have quick actions defined', () => {
      expect(component.quickActions.length).toBeGreaterThan(0);
    });

    it('should include view action', () => {
      expect(component.quickActions.some((a) => a.id === 'view')).toBe(true);
    });

    it('should include contact action', () => {
      expect(component.quickActions.some((a) => a.id === 'contact')).toBe(true);
    });
  });

  describe('Template Rendering', () => {
    it('should render result item', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.result-item')).toBeTruthy();
    });

    it('should render candidate card', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('arc-mobile-candidate-card')).toBeTruthy();
    });

    it('should render skill tags', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('arc-mobile-skill-tags')).toBeTruthy();
    });

    it('should apply selected class when isSelected is true', () => {
      component.isSelected = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(
        compiled.querySelector('.result-item')?.classList.contains('selected'),
      ).toBe(true);
    });

    it('should apply match class', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(
        compiled
          .querySelector('.result-item')
          ?.classList.contains('match-excellent'),
      ).toBe(true);
    });

    it('should render selection checkbox', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.selection-checkbox')).toBeTruthy();
    });

    it('should render quick actions menu', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(
        compiled.querySelector('arc-mobile-quick-actions-menu'),
      ).toBeTruthy();
    });

    it('should render candidate meta info', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.candidate-meta')).toBeTruthy();
    });
  });
});
