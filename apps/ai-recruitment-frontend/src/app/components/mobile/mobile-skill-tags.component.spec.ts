import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MobileSkillTagsComponent } from './mobile-skill-tags.component';

describe('MobileSkillTagsComponent', () => {
  let component: MobileSkillTagsComponent;
  let fixture: ComponentFixture<MobileSkillTagsComponent>;

  const mockSkills = [
    'JavaScript',
    'TypeScript',
    'Angular',
    'Node.js',
    'React',
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileSkillTagsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileSkillTagsComponent);
    component = fixture.componentInstance;
    component.skills = mockSkills;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Properties', () => {
    it('should accept skills input', () => {
      expect(component.skills).toBe(mockSkills);
    });

    it('should accept maxVisible input', () => {
      component.maxVisible = 2;
      expect(component.maxVisible).toBe(2);
    });

    it('should have default maxVisible value of 3', () => {
      const newComponent = TestBed.createComponent(MobileSkillTagsComponent);
      expect(newComponent.componentInstance.maxVisible).toBe(3);
    });

    it('should have default empty skills array', () => {
      const newComponent = TestBed.createComponent(MobileSkillTagsComponent);
      expect(newComponent.componentInstance.skills).toEqual([]);
    });
  });

  describe('Computed Properties', () => {
    it('should return visible skills', () => {
      const visible = component.visibleSkills;
      expect(visible.length).toBe(3);
      expect(visible).toEqual(['JavaScript', 'TypeScript', 'Angular']);
    });

    it('should return all skills when less than maxVisible', () => {
      component.skills = ['JavaScript', 'TypeScript'];
      component.maxVisible = 5;
      expect(component.visibleSkills.length).toBe(2);
    });

    it('should detect has more skills', () => {
      expect(component.hasMoreSkills).toBe(true);
    });

    it('should not have more skills when count equals maxVisible', () => {
      component.skills = ['JavaScript', 'TypeScript', 'Angular'];
      expect(component.hasMoreSkills).toBe(false);
    });

    it('should not have more skills when less than maxVisible', () => {
      component.skills = ['JavaScript', 'TypeScript'];
      expect(component.hasMoreSkills).toBe(false);
    });

    it('should calculate remaining count correctly', () => {
      expect(component.remainingCount).toBe(2);
    });

    it('should return 0 remaining when no more skills', () => {
      component.skills = ['JavaScript'];
      component.maxVisible = 3;
      expect(component.remainingCount).toBe(0);
    });
  });

  describe('Template Rendering', () => {
    it('should render skills container', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.skills-container')).toBeTruthy();
    });

    it('should not render when skills is empty', () => {
      component.skills = [];
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.skills-container')).toBeFalsy();
    });

    it('should render skill tags', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const tags = compiled.querySelectorAll('.skill-tag');
      expect(tags.length).toBe(3);
    });

    it('should render skill names', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const tags = compiled.querySelectorAll('.skill-tag');
      expect(tags[0].textContent).toContain('JavaScript');
      expect(tags[1].textContent).toContain('TypeScript');
      expect(tags[2].textContent).toContain('Angular');
    });

    it('should render more indicator when there are more skills', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const more = compiled.querySelector('.skill-more');
      expect(more).toBeTruthy();
      expect(more?.textContent).toContain('+2');
    });

    it('should not render more indicator when all skills visible', () => {
      component.skills = ['JavaScript', 'TypeScript'];
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const more = compiled.querySelector('.skill-more');
      expect(more).toBeFalsy();
    });

    it('should respect custom maxVisible', () => {
      component.maxVisible = 2;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const tags = compiled.querySelectorAll('.skill-tag');
      expect(tags.length).toBe(2);
      const more = compiled.querySelector('.skill-more');
      expect(more?.textContent).toContain('+3');
    });
  });
});
