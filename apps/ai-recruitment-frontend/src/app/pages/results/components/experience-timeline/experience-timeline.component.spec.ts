import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ExperienceTimelineComponent } from './experience-timeline.component';

describe('ExperienceTimelineComponent', () => {
  let component: ExperienceTimelineComponent;
  let fixture: ComponentFixture<ExperienceTimelineComponent>;

  const mockExperience = {
    company: '阿里巴巴',
    position: '高级前端工程师',
    duration: '2020-2023',
    description: '负责前端架构设计和开发',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExperienceTimelineComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExperienceTimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty experience data', () => {
      expect(component.experiences).toEqual([]);
    });
  });

  describe('输入属性测试', () => {
    it('should accept experiences input', () => {
      component.experiences = [mockExperience];
      expect(component.experiences).toEqual([mockExperience]);
    });
  });

  describe('渲染测试', () => {
    it('should render experience timeline', () => {
      component.experiences = [mockExperience];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('阿里巴巴');
      expect(compiled.textContent).toContain('高级前端工程师');
      expect(compiled.textContent).toContain('2020-2023');
    });

    it('should show empty state when no experiences', () => {
      component.experiences = [];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('暂无工作经验');
    });

    it('should render timeline items in order', () => {
      const experiences = [
        {
          company: '公司A',
          position: '职位A',
          duration: '2022-2024',
          description: '',
        },
        {
          company: '公司B',
          position: '职位B',
          duration: '2020-2022',
          description: '',
        },
      ];
      component.experiences = experiences;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const items = compiled.querySelectorAll('.timeline-item');
      expect(items.length).toBe(2);
    });
  });
});
