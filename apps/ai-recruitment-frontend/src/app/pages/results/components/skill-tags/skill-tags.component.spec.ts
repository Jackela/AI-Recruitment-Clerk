import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { SkillTagsComponent } from './skill-tags.component';

describe('SkillTagsComponent', () => {
  let component: SkillTagsComponent;
  let fixture: ComponentFixture<SkillTagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkillTagsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SkillTagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty skills', () => {
      expect(component.skills).toEqual([]);
    });
  });

  describe('输入属性测试', () => {
    it('should accept skills input', () => {
      const mockSkills = ['JavaScript', 'TypeScript', 'Angular'];
      component.skills = mockSkills;
      expect(component.skills).toEqual(mockSkills);
    });
  });

  describe('渲染测试', () => {
    it('should render skill tags', () => {
      component.skills = ['JavaScript', 'TypeScript', 'React'];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('JavaScript');
      expect(compiled.textContent).toContain('TypeScript');
      expect(compiled.textContent).toContain('React');
    });

    it('should show empty state when no skills', () => {
      component.skills = [];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('暂无技能');
    });

    it('should render correct number of skill tags', () => {
      component.skills = ['技能1', '技能2', '技能3', '技能4'];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const tags = compiled.querySelectorAll('.skill-tag');
      expect(tags.length).toBe(4);
    });
  });
});
