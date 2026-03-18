import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import {
  AnalysisResultsComponent,
  type AnalysisResult,
} from './analysis-results.component';

describe('AnalysisResultsComponent', () => {
  let component: AnalysisResultsComponent;
  let fixture: ComponentFixture<AnalysisResultsComponent>;

  const mockResult: AnalysisResult = {
    score: 85,
    summary: '候选人具有优秀的前端开发经验',
    keySkills: ['JavaScript', 'TypeScript', 'Angular', 'React', 'Vue'],
    experience: '5年软件开发经验，3年前端开发经验',
    education: '计算机科学学士学位',
    recommendations: ['深入学习微前端架构', '提高团队协作技能', '关注性能优化'],
    reportUrl: 'http://example.com/report.pdf',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysisResultsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalysisResultsComponent);
    component = fixture.componentInstance;
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with null result', () => {
      expect(component.result).toBeNull();
    });

    it('should have default values', () => {
      expect(component.showDetailedSummary).toBe(false);
      expect(component.totalRequiredSkills).toBe(10);
      expect(component.isProcessing).toBe(false);
    });
  });

  describe('输入属性测试', () => {
    it('should accept result input', () => {
      component.result = mockResult;
      expect(component.result).toEqual(mockResult);
    });

    it('should accept showDetailedSummary input', () => {
      component.showDetailedSummary = true;
      expect(component.showDetailedSummary).toBe(true);
    });

    it('should accept totalRequiredSkills input', () => {
      component.totalRequiredSkills = 15;
      expect(component.totalRequiredSkills).toBe(15);
    });

    it('should accept isProcessing input', () => {
      component.isProcessing = true;
      expect(component.isProcessing).toBe(true);
    });
  });

  describe('getter方法测试', () => {
    it('should return key skills', () => {
      component.result = mockResult;
      expect(component.keySkills).toEqual(mockResult.keySkills);
    });

    it('should return empty array when keySkills is not array', () => {
      component.result = {
        ...mockResult,
        keySkills: undefined as unknown as string[],
      };
      expect(component.keySkills).toEqual([]);
    });

    it('should filter empty skills', () => {
      component.result = {
        ...mockResult,
        keySkills: ['JavaScript', '', '  ', 'TypeScript'],
      };
      expect(component.keySkills).toEqual(['JavaScript', 'TypeScript']);
    });

    it('should return recommendations', () => {
      component.result = mockResult;
      expect(component.recommendations).toEqual(mockResult.recommendations);
    });

    it('should return experience text', () => {
      component.result = mockResult;
      expect(component.experienceText).toBe(mockResult.experience);
    });

    it('should return education text', () => {
      component.result = mockResult;
      expect(component.educationText).toBe(mockResult.education);
    });

    it('should return summary text', () => {
      component.result = mockResult;
      expect(component.summaryText).toBe(mockResult.summary);
    });

    it('should return default summary when empty', () => {
      component.result = { ...mockResult, summary: '' };
      expect(component.summaryText).toBe('暂无摘要');
    });

    it('should return score value', () => {
      component.result = mockResult;
      expect(component.scoreValue).toBe(85);
    });

    it('should clamp score to 0-100 range', () => {
      component.result = { ...mockResult, score: 150 };
      expect(component.scoreValue).toBe(100);

      component.result = { ...mockResult, score: -10 };
      expect(component.scoreValue).toBe(0);
    });

    it('should return hasReport based on reportUrl', () => {
      component.result = mockResult;
      expect(component.hasReport).toBe(true);

      component.result = { ...mockResult, reportUrl: '' };
      expect(component.hasReport).toBe(false);
    });
  });

  describe('技能展开测试', () => {
    it('should show initial skill count', () => {
      component.result = mockResult;
      expect(component.visibleSkills.length).toBeLessThanOrEqual(
        component.initialSkillCount,
      );
    });

    it('should toggle skills expanded', () => {
      component.result = mockResult;
      expect(component.skillsExpanded).toBe(false);

      component.toggleSkillsExpanded();
      expect(component.skillsExpanded).toBe(true);
      expect(component.visibleSkills).toEqual(mockResult.keySkills);

      component.toggleSkillsExpanded();
      expect(component.skillsExpanded).toBe(false);
    });
  });

  describe('评分等级测试', () => {
    it('should return correct score category', () => {
      component.result = { ...mockResult, score: 85 };
      expect(component.getScoreCategory()).toBe('优秀');

      component.result = { ...mockResult, score: 70 };
      expect(component.getScoreCategory()).toBe('良好');

      component.result = { ...mockResult, score: 50 };
      expect(component.getScoreCategory()).toBe('待提升');

      component.result = null;
      expect(component.getScoreCategory()).toBe('未知');
    });

    it('should return correct score class', () => {
      component.result = { ...mockResult, score: 85 };
      expect(component.getScoreClass()).toBe('high');

      component.result = { ...mockResult, score: 70 };
      expect(component.getScoreClass()).toBe('medium');

      component.result = { ...mockResult, score: 50 };
      expect(component.getScoreClass()).toBe('low');
    });

    it('should return correct priority', () => {
      component.result = { ...mockResult, score: 90 };
      expect(component.getPriority()).toBe('高优先级');

      component.result = { ...mockResult, score: 75 };
      expect(component.getPriority()).toBe('中优先级');

      component.result = { ...mockResult, score: 60 };
      expect(component.getPriority()).toBe('低优先级');

      component.result = { ...mockResult, score: 40 };
      expect(component.getPriority()).toBe('待考虑');
    });

    it('should return correct priority class', () => {
      component.result = { ...mockResult, score: 90 };
      expect(component.getPriorityClass()).toBe('high');

      component.result = { ...mockResult, score: 75 };
      expect(component.getPriorityClass()).toBe('medium');

      component.result = { ...mockResult, score: 40 };
      expect(component.getPriorityClass()).toBe('low');
    });
  });

  describe('操作事件测试', () => {
    it('should emit view-detailed action', () => {
      const emitSpy = jest.spyOn(component.actionRequested, 'emit');
      component.onAction('view-detailed');
      expect(emitSpy).toHaveBeenCalledWith({ type: 'view-detailed' });
    });

    it('should emit download-report action', () => {
      const emitSpy = jest.spyOn(component.actionRequested, 'emit');
      component.onAction('download-report');
      expect(emitSpy).toHaveBeenCalledWith({ type: 'download-report' });
    });

    it('should emit start-new action', () => {
      const emitSpy = jest.spyOn(component.actionRequested, 'emit');
      component.onAction('start-new');
      expect(compileSpy).toHaveBeenCalledWith({ type: 'start-new' });
    });
  });

  describe('trackBy方法测试', () => {
    it('should track skills by value', () => {
      expect(component.trackBySkill(0, 'JavaScript')).toBe('JavaScript');
    });

    it('should track recommendations with index', () => {
      expect(component.trackByRecommendation(0, '推荐1')).toBe('0-推荐1');
    });
  });
});
