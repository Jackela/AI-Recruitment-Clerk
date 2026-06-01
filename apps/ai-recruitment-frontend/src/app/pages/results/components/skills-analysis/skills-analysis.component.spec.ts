import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { SkillsAnalysisComponent } from './skills-analysis.component';
import type { RadarChartData } from '../../../../interfaces/detailed-analysis.interface';

describe('SkillsAnalysisComponent', () => {
  let component: SkillsAnalysisComponent;
  let fixture: ComponentFixture<SkillsAnalysisComponent>;

  const mockSkills = ['JavaScript', 'TypeScript', 'Angular', 'React'];
  const mockRadarData: RadarChartData[] = [
    { skill: 'JavaScript', value: 90 },
    { skill: 'TypeScript', value: 85 },
    { skill: 'Angular', value: 80 },
    { skill: 'React', value: 75 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkillsAnalysisComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SkillsAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.skills).toEqual([]);
      expect(component.radarData).toEqual([]);
      expect(component.overallMatch).toBeNull();
      expect(component.isExpanded).toBe(false);
    });
  });

  describe('输入属性测试', () => {
    it('should accept skills input', () => {
      component.skills = mockSkills;
      expect(component.skills).toEqual(mockSkills);
    });

    it('should accept radarData input', () => {
      component.radarData = mockRadarData;
      expect(component.radarData).toEqual(mockRadarData);
    });

    it('should accept overallMatch input', () => {
      component.overallMatch = 85;
      expect(component.overallMatch).toBe(85);
    });

    it('should accept isExpanded input', () => {
      component.isExpanded = true;
      expect(component.isExpanded).toBe(true);
    });
  });

  describe('展开功能测试', () => {
    it('should emit toggleExpand event', () => {
      const emitSpy = jest.spyOn(component.toggleExpand, 'emit');
      component.onToggleExpand();
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('渲染测试', () => {
    it('should render skills card title', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('技能分析');
    });

    it('should render skill tags component', () => {
      component.skills = mockSkills;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('arc-skill-tags')).toBeTruthy();
    });

    it('should render overall match when provided', () => {
      component.overallMatch = 88;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('技能匹配度: 88%');
    });

    it('should render radar data heatmap', () => {
      component.radarData = mockRadarData;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.skills-heatmap')).toBeTruthy();
      expect(compiled.textContent).toContain('JavaScript');
      expect(compiled.textContent).toContain('90%');
    });

    it('should show expand button', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.expand-btn')).toBeTruthy();
    });

    it('should show expanded content when isExpanded is true', () => {
      component.isExpanded = true;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.skills-detailed')).toBeTruthy();
      expect(compiled.textContent).toContain('扩展视图');
    });
  });
});
