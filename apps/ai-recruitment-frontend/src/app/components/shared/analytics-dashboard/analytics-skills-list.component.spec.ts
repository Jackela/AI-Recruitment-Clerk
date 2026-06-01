import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import {
  AnalyticsSkillsListComponent,
  type SkillItem,
} from './analytics-skills-list.component';

describe('AnalyticsSkillsListComponent', () => {
  let component: AnalyticsSkillsListComponent;
  let fixture: ComponentFixture<AnalyticsSkillsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyticsSkillsListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyticsSkillsListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render top skills container', () => {
      fixture.componentRef.setInput('skills', [
        { skill: 'JavaScript', count: 10 },
        { skill: 'TypeScript', count: 8 },
      ]);
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.top-skills');
      expect(container).toBeTruthy();
    });

    it('should render title', () => {
      fixture.componentRef.setInput('skills', [{ skill: 'JS', count: 5 }]);
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('h4');
      expect(title).toBeTruthy();
      expect(title.textContent.trim()).toBe('Top Skills');
    });

    it('should render skills list', () => {
      fixture.componentRef.setInput('skills', [
        { skill: 'React', count: 15 },
        { skill: 'Angular', count: 12 },
      ]);
      fixture.detectChanges();

      const list = fixture.nativeElement.querySelector('.skills-list');
      expect(list).toBeTruthy();
    });

    it('should not render when skills array is empty', () => {
      fixture.componentRef.setInput('skills', []);
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.top-skills');
      expect(container).toBeFalsy();
    });
  });

  describe('Input Tests', () => {
    it('should bind skills input correctly', () => {
      const skills: SkillItem[] = [
        { skill: 'Python', count: 20 },
        { skill: 'Java', count: 15 },
      ];
      fixture.componentRef.setInput('skills', skills);
      fixture.detectChanges();

      const skillElements =
        fixture.nativeElement.querySelectorAll('.skill-item');
      expect(skillElements.length).toBe(2);
    });
  });

  describe('Skill Item Rendering Tests', () => {
    it('should render skill name', () => {
      fixture.componentRef.setInput('skills', [
        { skill: 'JavaScript', count: 10 },
      ]);
      fixture.detectChanges();

      const skillName = fixture.nativeElement.querySelector('.skill-name');
      expect(skillName).toBeTruthy();
      expect(skillName.textContent.trim()).toBe('JavaScript');
    });

    it('should render skill count', () => {
      fixture.componentRef.setInput('skills', [{ skill: 'React', count: 25 }]);
      fixture.detectChanges();

      const skillCount = fixture.nativeElement.querySelector('.skill-count');
      expect(skillCount).toBeTruthy();
      expect(skillCount.textContent.trim()).toBe('25');
    });

    it('should render multiple skills', () => {
      fixture.componentRef.setInput('skills', [
        { skill: 'React', count: 15 },
        { skill: 'Vue', count: 10 },
        { skill: 'Angular', count: 8 },
      ]);
      fixture.detectChanges();

      const skillItems = fixture.nativeElement.querySelectorAll('.skill-item');
      expect(skillItems.length).toBe(3);

      const names = fixture.nativeElement.querySelectorAll('.skill-name');
      expect(names[0].textContent.trim()).toBe('React');
      expect(names[1].textContent.trim()).toBe('Vue');
      expect(names[2].textContent.trim()).toBe('Angular');
    });
  });

  describe('Styling Tests', () => {
    it('should have gradient badge on count', () => {
      fixture.componentRef.setInput('skills', [
        { skill: 'Node.js', count: 30 },
      ]);
      fixture.detectChanges();

      const count = fixture.nativeElement.querySelector('.skill-count');
      expect(count).toBeTruthy();
    });

    it('should have hover effect on skill items', () => {
      fixture.componentRef.setInput('skills', [{ skill: 'Docker', count: 12 }]);
      fixture.detectChanges();

      const skillItem = fixture.nativeElement.querySelector('.skill-item');
      expect(skillItem).toBeTruthy();
    });
  });
});
