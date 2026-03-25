import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { TipsPanelComponent } from './tips-panel.component';
import type { UsageTip, TipCategory } from '../types/statistics.interface';

describe('TipsPanelComponent', () => {
  let component: TipsPanelComponent;
  let fixture: ComponentFixture<TipsPanelComponent>;

  const mockTips: UsageTip[] = [
    {
      icon: '📄',
      title: '使用PDF格式',
      description: 'PDF格式可以保持简历格式不变',
      category: 'file',
    },
    {
      icon: '✨',
      title: '确保文件清晰',
      description: '清晰的文件有助于提高解析准确度',
      category: 'accuracy',
    },
    {
      icon: '📝',
      title: '内容真实完整',
      description: '真实的简历内容可以获得更好的分析结果',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TipsPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TipsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty tips', () => {
      expect(component.tips).toEqual([]);
    });

    it('should initialize with default category', () => {
      expect(component.selectedCategory).toBe('general');
    });

    it('should initialize with showCategories as false', () => {
      expect(component.showCategories).toBe(false);
    });
  });

  describe('输入属性测试', () => {
    it('should accept tips input', () => {
      component.tips = mockTips;
      expect(component.tips).toEqual(mockTips);
    });

    it('should accept showCategories input', () => {
      component.showCategories = true;
      expect(component.showCategories).toBe(true);
    });

    it('should accept selectedCategory input', () => {
      const category: TipCategory = 'file';
      component.selectedCategory = category;
      expect(component.selectedCategory).toBe(category);
    });
  });

  describe('渲染测试', () => {
    it('should render tips list', () => {
      component.tips = mockTips;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('使用PDF格式');
      expect(compiled.textContent).toContain('确保文件清晰');
    });

    it('should render tip icons', () => {
      component.tips = [mockTips[0]];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('📄');
    });
  });

  describe('分类功能测试', () => {
    it('should filter tips by category', () => {
      component.tips = mockTips;
      component.showCategories = true;
      component.selectedCategory = 'file';

      const filtered = component.getFilteredTips();
      expect(filtered.length).toBe(1);
      expect(filtered[0].title).toBe('使用PDF格式');
    });

    it('should return all tips when showCategories is false', () => {
      component.tips = mockTips;
      component.showCategories = false;

      const filtered = component.getFilteredTips();
      expect(filtered).toEqual(mockTips);
    });

    it('should emit categoryChanged event', () => {
      const emitSpy = jest.spyOn(component.categoryChanged, 'emit');
      const category: TipCategory = 'accuracy';

      component.onSelectCategory(category);
      expect(emitSpy).toHaveBeenCalledWith(category);
    });
  });

  describe('查看更多功能测试', () => {
    it('should emit moreTipsRequested event', () => {
      const emitSpy = jest.spyOn(component.moreTipsRequested, 'emit');

      component.showMoreTips();
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('辅助方法测试', () => {
    it('should return correct category label', () => {
      expect(component.getCategoryLabel('general')).toBe('通用');
      expect(component.getCategoryLabel('file')).toBe('文件');
      expect(component.getCategoryLabel('accuracy')).toBe('准确性');
      expect(component.getCategoryLabel('analysis')).toBe('分析');
    });

    it('should track tips by unique key', () => {
      const tip: UsageTip = {
        icon: '🎯',
        title: '测试标题',
        description: '这是一个测试描述文本',
      };

      const key = component.trackByTip(0, tip);
      expect(key).toBe('测试标题-这是一个测试描述文本');
    });
  });
});
