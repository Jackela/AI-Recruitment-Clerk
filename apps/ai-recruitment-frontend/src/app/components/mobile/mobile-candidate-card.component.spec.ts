import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MobileCandidateCardComponent,
  CandidateCardData,
} from './mobile-candidate-card.component';

describe('MobileCandidateCardComponent', () => {
  let component: MobileCandidateCardComponent;
  let fixture: ComponentFixture<MobileCandidateCardComponent>;

  const mockCandidate: CandidateCardData = {
    name: 'John Doe',
    title: 'Senior Software Engineer',
    experience: '5 years',
    location: 'New York, NY',
    score: 85,
    match: 'excellent',
    avatar: 'https://example.com/avatar.jpg',
    status: 'shortlisted',
  };

  const mockCandidateNoAvatar: CandidateCardData = {
    name: 'Jane Smith',
    title: 'Product Manager',
    experience: '3 years',
    location: 'San Francisco, CA',
    score: 72,
    match: 'good',
    status: 'new',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileCandidateCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileCandidateCardComponent);
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

    it('should update candidate input', () => {
      component.candidate = mockCandidateNoAvatar;
      expect(component.candidate).toBe(mockCandidateNoAvatar);
    });
  });

  describe('Template Rendering - With Avatar', () => {
    it('should render candidate avatar image when available', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const img = compiled.querySelector('.avatar-image');
      expect(img).toBeTruthy();
      expect(img?.getAttribute('src')).toBe(mockCandidate.avatar);
    });

    it('should render candidate name', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const name = compiled.querySelector('.candidate-name');
      expect(name?.textContent).toContain('John Doe');
    });

    it('should render candidate title', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const title = compiled.querySelector('.candidate-title');
      expect(title?.textContent).toContain('Senior Software Engineer');
    });

    it('should render candidate experience and location', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const experience = compiled.querySelector('.candidate-experience');
      expect(experience?.textContent).toContain('5 years');
      expect(experience?.textContent).toContain('New York, NY');
    });

    it('should render score badge with correct score', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const badge = compiled.querySelector('.score-badge');
      expect(badge?.textContent).toContain('85%');
    });

    it('should apply correct match class to score badge', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const badge = compiled.querySelector('.score-badge');
      expect(badge?.classList.contains('score-excellent')).toBe(true);
    });

    it('should render status indicator', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const indicator = compiled.querySelector('.status-indicator');
      expect(indicator).toBeTruthy();
    });

    it('should apply correct status class', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const indicator = compiled.querySelector('.status-indicator');
      expect(indicator?.classList.contains('status-shortlisted')).toBe(true);
    });
  });

  describe('Template Rendering - Without Avatar', () => {
    beforeEach(() => {
      component.candidate = mockCandidateNoAvatar;
      fixture.detectChanges();
    });

    it('should render avatar placeholder when no avatar', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const placeholder = compiled.querySelector('.avatar-placeholder');
      expect(placeholder).toBeTruthy();
    });

    it('should display first letter of name in placeholder', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const placeholder = compiled.querySelector('.avatar-placeholder');
      expect(placeholder?.textContent).toContain('J');
    });

    it('should not render avatar image when no avatar', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const img = compiled.querySelector('.avatar-image');
      expect(img).toBeFalsy();
    });
  });

  describe('All Status Types', () => {
    const statuses: Array<CandidateCardData['status']> = [
      'new',
      'reviewed',
      'shortlisted',
      'interviewed',
      'hired',
      'rejected',
    ];

    statuses.forEach((status) => {
      it(`should apply correct class for status: ${status}`, () => {
        component.candidate = { ...mockCandidate, status };
        fixture.detectChanges();
        const compiled = fixture.nativeElement as HTMLElement;
        const indicator = compiled.querySelector('.status-indicator');
        expect(indicator?.classList.contains(`status-${status}`)).toBe(true);
      });
    });
  });

  describe('All Match Types', () => {
    const matches: Array<CandidateCardData['match']> = [
      'excellent',
      'good',
      'fair',
      'poor',
    ];

    matches.forEach((match) => {
      it(`should apply correct class for match: ${match}`, () => {
        component.candidate = { ...mockCandidate, match };
        fixture.detectChanges();
        const compiled = fixture.nativeElement as HTMLElement;
        const badge = compiled.querySelector('.score-badge');
        expect(badge?.classList.contains(`score-${match}`)).toBe(true);
      });
    });
  });
});
