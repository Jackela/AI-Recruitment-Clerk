import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  MobileResultsDisplayComponent,
  CandidateResult,
} from './mobile-results-display.component';

describe('MobileResultsDisplayComponent', () => {
  let component: MobileResultsDisplayComponent;
  let fixture: ComponentFixture<MobileResultsDisplayComponent>;

  const mockCandidates: CandidateResult[] = [
    {
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
    },
    {
      id: '2',
      name: 'Jane Smith',
      title: 'Product Manager',
      experience: '3 years',
      location: 'San Francisco, CA',
      score: 72,
      match: 'good',
      status: 'new',
      skills: ['Product Strategy', 'Agile', 'Analytics'],
      summary: 'Product manager with startup experience',
      education: 'MBA',
      lastUpdated: '1 day ago',
      tags: ['leadership'],
      strengths: ['Leadership', 'Analytics'],
      weaknesses: ['Technical depth'],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileResultsDisplayComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileResultsDisplayComponent);
    component = fixture.componentInstance;
    component.candidates = mockCandidates;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Properties', () => {
    it('should accept candidates input', () => {
      expect(component.candidates).toBe(mockCandidates);
    });

    it('should accept isLoading input', () => {
      component.isLoading = true;
      expect(component.isLoading).toBe(true);
    });

    it('should accept viewMode input', () => {
      component.viewMode = 'detailed';
      expect(component.viewMode).toBe('detailed');
    });

    it('should accept selectedCandidates input', () => {
      component.selectedCandidates = [mockCandidates[0]];
      expect(component.selectedCandidates).toContain(mockCandidates[0]);
    });

    it('should have default viewMode of card', () => {
      const newComponent = TestBed.createComponent(
        MobileResultsDisplayComponent,
      );
      expect(newComponent.componentInstance.viewMode).toBe('card');
    });

    it('should have default empty arrays', () => {
      const newComponent = TestBed.createComponent(
        MobileResultsDisplayComponent,
      );
      expect(newComponent.componentInstance.candidates).toEqual([]);
      expect(newComponent.componentInstance.selectedCandidates).toEqual([]);
    });
  });

  describe('Output Events', () => {
    it('should emit candidateSelected event', () => {
      const emitSpy = jest.spyOn(component.candidateSelected, 'emit');
      component.onCandidateSelected(mockCandidates[0]);
      expect(emitSpy).toHaveBeenCalledWith(mockCandidates[0]);
    });

    it('should emit candidateAction event', () => {
      const emitSpy = jest.spyOn(component.candidateAction, 'emit');
      const payload = { action: 'view', candidate: mockCandidates[0] };
      component.onCandidateAction(payload);
      expect(emitSpy).toHaveBeenCalledWith(payload);
    });

    it('should emit selectionToggled event', () => {
      const emitSpy = jest.spyOn(component.selectionToggled, 'emit');
      const event = new Event('change');
      component.onSelectionToggled(mockCandidates[0], event);
      expect(emitSpy).toHaveBeenCalledWith({
        candidate: mockCandidates[0],
        event,
      });
    });

    it('should emit clearFilters event', () => {
      const emitSpy = jest.spyOn(component.clearFilters, 'emit');
      component.onClearFilters();
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('Methods', () => {
    it('should check if candidate is selected', () => {
      component.selectedCandidates = [mockCandidates[0]];
      expect(component.isSelected(mockCandidates[0])).toBe(true);
      expect(component.isSelected(mockCandidates[1])).toBe(false);
    });

    it('should emit candidate on selection', () => {
      const emitSpy = jest.spyOn(component.candidateSelected, 'emit');
      component.onCandidateSelected(mockCandidates[0]);
      expect(emitSpy).toHaveBeenCalledWith(mockCandidates[0]);
    });

    it('should emit action event', () => {
      const emitSpy = jest.spyOn(component.candidateAction, 'emit');
      const payload = { action: 'shortlist', candidate: mockCandidates[0] };
      component.onCandidateAction(payload);
      expect(emitSpy).toHaveBeenCalledWith(payload);
    });

    it('should track by candidate ID', () => {
      const id = component.trackByCandidate(0, mockCandidates[0]);
      expect(id).toBe('1');
    });
  });

  describe('Template Rendering', () => {
    it('should render results list', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.results-list')).toBeTruthy();
    });

    it('should render result items', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const items = compiled.querySelectorAll('.result-item-wrapper');
      expect(items.length).toBe(2);
    });

    it('should apply view mode class', () => {
      component.viewMode = 'detailed';
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const list = compiled.querySelector('.results-list');
      expect(list?.classList.contains('view-detailed')).toBe(true);
    });

    it('should render empty state when no candidates', () => {
      component.candidates = [];
      component.isLoading = false;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('arc-mobile-results-empty')).toBeTruthy();
    });

    it('should render loading state', () => {
      component.candidates = [];
      component.isLoading = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('arc-mobile-results-loading')).toBeTruthy();
    });
  });
});
