import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ExperienceTimelineComponent } from './experience-timeline.component';
import type { ExperienceDetail } from '../../../../interfaces/detailed-analysis.interface';

describe('ExperienceTimelineComponent', () => {
  let component: ExperienceTimelineComponent;
  let fixture: ComponentFixture<ExperienceTimelineComponent>;

  const mockExperience: ExperienceDetail = {
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

    it('should initialize with null experienceYears', () => {
      expect(component.experienceYears).toBeNull();
    });

    it('should initialize with null matchLevel', () => {
      expect(component.matchLevel).toBeNull();
    });
  });

  describe('输入属性测试', () => {
    it('should accept experiences input', () => {
      component.experiences = [mockExperience];
      expect(component.experiences).toEqual([mockExperience]);
    });

    it('should accept experienceYears input', () => {
      component.experienceYears = 5;
      expect(component.experienceYears).toBe(5);
    });

    it('should accept matchLevel input', () => {
      component.matchLevel = '高';
      expect(component.matchLevel).toBe('高');
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
      expect(compiled.textContent).toContain('暂无工作经验数据');
    });

    it('should render timeline items in order', () => {
      const experiences: ExperienceDetail[] = [
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

    it('should render experience years when provided', () => {
      component.experienceYears = 5;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('工作经验年限: 5年');
    });

    it('should render match level when provided', () => {
      component.matchLevel = '中';
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('职位匹配度: 中');
    });
  });
});
