import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import {
  StatisticsPanelComponent,
  type UsageStatistics,
  type UsageTip,
} from './statistics-panel.component';

describe('StatisticsPanelComponent', () => {
  let component: StatisticsPanelComponent;
  let fixture: ComponentFixture<StatisticsPanelComponent>;

  const mockStatistics: UsageStatistics = {
    todayAnalyses: 42,
    totalAnalyses: 1247,
    averageScore: 76,
    monthlyAnalyses: 156,
    successRate: 95.2,
  };

  const mockTips: UsageTip[] = [
    {
      icon: '📄',
      title: '文件质量',
      description: '确保简历文件清晰完整',
      category: 'file',
    },
    {
      icon: '📝',
      title: '内容完整',
      description: '包含详细的工作经验',
      category: 'accuracy',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatisticsPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatisticsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件渲染测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should render statistics title', () => {
      component.statistics = mockStatistics;
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h3').textContent).toContain('使用统计');
    });

    it('should render tips title', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('使用提示');
    });

    it('should display correct number of stat items', () => {
      component.statistics = mockStatistics;
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const statItems = compiled.querySelectorAll('.stat-item');
      expect(statItems.length).toBeGreaterThan(0);
    });
  });

  describe('输入输出测试', () => {
    it('should accept input data', () => {
      component.statistics = mockStatistics;
      fixture.detectChanges();
      expect(component.statistics).toEqual(mockStatistics);
    });

    it('should emit event on category change', () => {
      const categorySpy = jest.spyOn(component.tipCategoryChanged, 'emit');
      component.selectCategory('file');
      expect(categorySpy).toHaveBeenCalledWith('file');
    });

    it('should emit event on more tips request', () => {
      const tipsSpy = jest.spyOn(component.moreTipsRequested, 'emit');
      component.showMoreTips();
      expect(tipsSpy).toHaveBeenCalled();
    });

    it('should have default statistics values', () => {
      expect(component.statistics.todayAnalyses).toBe(0);
      expect(component.statistics.totalAnalyses).toBe(0);
      expect(component.statistics.averageScore).toBe(0);
    });

    it('should handle showDailyLimit input', () => {
      component.showDailyLimit = true;
      component.statistics = mockStatistics;
      fixture.detectChanges();
      expect(component.showDailyLimit).toBe(true);
    });

    it('should handle showCategories input', () => {
      component.showCategories = true;
      fixture.detectChanges();
      expect(component.showCategories).toBe(true);
    });

    it('should handle showInsights input', () => {
      component.showInsights = true;
      fixture.detectChanges();
      expect(component.showInsights).toBe(true);
    });
  });

  describe('数据统计方法测试', () => {
    it('should format large numbers correctly', () => {
      expect(component.formatNumber(1500)).toBe('1.5K');
      expect(component.formatNumber(1500000)).toBe('1.5M');
      expect(component.formatNumber(42)).toBe('42');
    });

    it('should return correct score class', () => {
      component.statistics = { ...mockStatistics, averageScore: 85 };
      expect(component.getScoreClass()).toBe('high');

      component.statistics = { ...mockStatistics, averageScore: 70 };
      expect(component.getScoreClass()).toBe('medium');

      component.statistics = { ...mockStatistics, averageScore: 50 };
      expect(component.getScoreClass()).toBe('low');
    });

    it('should calculate daily progress percentage', () => {
      component.statistics = mockStatistics;
      component.dailyLimit = 50;
      const percentage = component.getDailyProgressPercentage();
      expect(percentage).toBe((42 / 50) * 100);
    });

    it('should cap daily progress at 100%', () => {
      component.statistics = { ...mockStatistics, todayAnalyses: 100 };
      component.dailyLimit = 50;
      expect(component.getDailyProgressPercentage()).toBe(100);
    });
  });

  describe('分类和提示方法测试', () => {
    it('should update selected category', () => {
      component.selectCategory('file');
      expect(component.selectedCategory).toBe('file');
    });

    it('should return correct category labels', () => {
      expect(component.getCategoryLabel('general')).toBe('通用');
      expect(component.getCategoryLabel('file')).toBe('文件');
      expect(component.getCategoryLabel('accuracy')).toBe('准确性');
      expect(component.getCategoryLabel('analysis')).toBe('分析');
      expect(component.getCategoryLabel('unknown')).toBe('unknown');
    });

    it('should filter tips by category', () => {
      component.usageTips = mockTips;
      component.selectedCategory = 'file';
      component.showCategories = true;

      const filtered = component.getFilteredTips();
      expect(filtered.length).toBe(1);
      expect(filtered[0].category).toBe('file');
    });

    it('should return all tips when showCategories is false', () => {
      component.usageTips = mockTips;
      component.showCategories = false;

      const filtered = component.getFilteredTips();
      expect(filtered).toEqual(mockTips);
    });

    it('should track tips by correct key', () => {
      const tip = mockTips[0];
      const key = component.trackByTip(0, tip);
      expect(key).toContain(tip.title);
    });

    it('should return false for hasMoreTips', () => {
      expect(component.hasMoreTips()).toBe(false);
    });
  });

  describe('异步操作测试', () => {
    it('should handle loading state when showing more tips', async () => {
      const tipsSpy = jest.spyOn(component.moreTipsRequested, 'emit');

      component.showMoreTips();
      expect(component.isLoadingTips).toBe(true);

      // Wait for setTimeout
      await new Promise((resolve) => setTimeout(resolve, 1100));
      expect(component.isLoadingTips).toBe(false);
      expect(tipsSpy).toHaveBeenCalled();
    });
  });

  describe('使用洞察测试', () => {
    it('should have performance insights', () => {
      expect(component.performanceInsights.length).toBeGreaterThan(0);
      expect(component.performanceInsights[0]).toHaveProperty('icon');
      expect(component.performanceInsights[0]).toHaveProperty('text');
    });
  });

  describe('默认提示测试', () => {
    it('should have default usage tips', () => {
      expect(component.usageTips.length).toBeGreaterThan(0);
      expect(component.tipCategories).toContain('general');
      expect(component.tipCategories).toContain('file');
      expect(component.tipCategories).toContain('accuracy');
      expect(component.tipCategories).toContain('analysis');
    });
  });
});
