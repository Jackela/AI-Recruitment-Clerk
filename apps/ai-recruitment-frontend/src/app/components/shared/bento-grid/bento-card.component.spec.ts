import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { BentoCardComponent, type BentoCardData } from './index';

describe('BentoCardComponent', () => {
  let component: BentoCardComponent;
  let fixture: ComponentFixture<BentoCardComponent>;

  const mockCardData: BentoCardData = {
    title: '测试卡片',
    subtitle: '卡片副标题',
    value: 1234,
    icon: 'stats',
    badge: 'NEW',
    status: 'active',
    progress: {
      value: 75,
      max: 100,
      label: '进度',
    },
    metrics: [
      {
        label: '指标1',
        value: 100,
        trend: { type: 'up', value: '10%' },
      },
      {
        label: '指标2',
        value: 50,
        trend: { type: 'down', value: '5%' },
      },
      {
        label: '指标3',
        value: 75,
        trend: { type: 'neutral', value: '0%' },
      },
    ],
    actions: [
      {
        label: '查看',
        icon: 'eye',
        primary: true,
        onClick: jest.fn(),
      },
      {
        label: '编辑',
        icon: 'edit',
        primary: false,
        onClick: jest.fn(),
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BentoCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BentoCardComponent);
    component = fixture.componentInstance;
  });

  describe('组件渲染测试', () => {
    it('should create', () => {
      component.data = mockCardData;
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should render card title', () => {
      component.data = mockCardData;
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('测试卡片');
    });

    it('should render card subtitle when provided', () => {
      component.data = mockCardData;
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('卡片副标题');
    });

    it('should render value when provided', () => {
      component.data = mockCardData;
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('1.2K');
    });

    it('should render badge when provided', () => {
      component.data = mockCardData;
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('NEW');
    });
  });

  describe('输入输出测试', () => {
    it('should accept data input', () => {
      component.data = mockCardData;
      expect(component.data).toEqual(mockCardData);
    });

    it('should emit actionClick event when action is clicked', () => {
      component.data = mockCardData;
      const emitSpy = jest.spyOn(component.actionClick, 'emit');
      const action = mockCardData.actions![0];

      component.onActionClick(action);

      expect(emitSpy).toHaveBeenCalledWith([action]);
      expect(action.onClick).toHaveBeenCalled();
    });

    it('should call action onClick when available', () => {
      component.data = mockCardData;
      const action = mockCardData.actions![0];

      component.onActionClick(action);

      expect(action.onClick).toHaveBeenCalled();
    });
  });

  describe('卡片类名测试', () => {
    it('should return bento-card class', () => {
      component.data = { title: 'Test' };
      expect(component.getCardClasses()).toContain('bento-card');
    });

    it('should include status class when status is provided', () => {
      component.data = { title: 'Test', status: 'active' };
      expect(component.getCardClasses()).toContain('status-active');
    });

    it('should handle all status types', () => {
      const statuses: Array<
        'active' | 'inactive' | 'warning' | 'error' | 'success'
      > = ['active', 'inactive', 'warning', 'error', 'success'];

      statuses.forEach((status) => {
        component.data = { title: 'Test', status };
        expect(component.getCardClasses()).toContain(`status-${status}`);
      });
    });
  });

  describe('数值格式化测试', () => {
    it('should format numeric value with K suffix', () => {
      component.data = { title: 'Test', value: 1500 };
      expect(component.formatValue(1500)).toBe('1.5K');
    });

    it('should format numeric value with M suffix', () => {
      component.data = { title: 'Test', value: 1500000 };
      expect(component.formatValue(1500000)).toBe('1.5M');
    });

    it('should return string value as is', () => {
      component.data = { title: 'Test' };
      expect(component.formatValue('test string')).toBe('test string');
    });

    it('should return small number without suffix', () => {
      component.data = { title: 'Test', value: 999 };
      expect(component.formatValue(999)).toBe('999');
    });
  });

  describe('进度条测试', () => {
    it('should calculate progress percentage correctly', () => {
      component.data = mockCardData;
      expect(component.getProgressPercentage()).toBe(75);
    });

    it('should return 0 when progress is not defined', () => {
      component.data = { title: 'Test' };
      expect(component.getProgressPercentage()).toBe(0);
    });

    it('should cap progress at 100%', () => {
      component.data = {
        title: 'Test',
        progress: { value: 150, max: 100 },
      };
      expect(component.getProgressPercentage()).toBe(100);
    });

    it('should generate correct progress label', () => {
      component.data = mockCardData;
      const label = component.getProgressLabel();
      expect(label).toContain('75%');
      expect(label).toContain('75 of 100');
    });

    it('should return empty string when no progress', () => {
      component.data = { title: 'Test' };
      expect(component.getProgressLabel()).toBe('');
    });
  });

  describe('指标测试', () => {
    it('should generate correct aria label for metric with trend', () => {
      component.data = mockCardData;
      const metric = mockCardData.metrics![0];
      const label = component.getMetricAriaLabel(metric);
      expect(label).toContain('指标1: 100');
      expect(label).toContain('increased');
    });

    it('should generate correct aria label for metric without trend', () => {
      component.data = mockCardData;
      const metric = { label: '测试', value: 50 };
      const label = component.getMetricAriaLabel(metric);
      expect(label).toBe('测试: 50');
    });

    it('should generate correct aria label for down trend', () => {
      component.data = mockCardData;
      const metric = mockCardData.metrics![1];
      const label = component.getMetricAriaLabel(metric);
      expect(label).toContain('decreased');
    });

    it('should generate correct aria label for neutral trend', () => {
      component.data = mockCardData;
      const metric = mockCardData.metrics![2];
      const label = component.getMetricAriaLabel(metric);
      expect(label).toContain('unchanged');
    });

    it('should generate trend aria label', () => {
      component.data = mockCardData;
      const trend = mockCardData.metrics![0].trend!;
      const label = component.getTrendAriaLabel(trend);
      expect(label).toBe('Trend: increased by 10%');
    });
  });

  describe('trackBy 函数测试', () => {
    it('should track metrics by label', () => {
      const metric = { label: '测试指标', value: 100 };
      expect(component.trackByMetricLabel(0, metric)).toBe('测试指标');
    });

    it('should track actions by label', () => {
      const action = { label: '测试动作', onClick: jest.fn() };
      expect(component.trackByActionLabel(0, action)).toBe('测试动作');
    });
  });

  describe('图标渲染测试', () => {
    it('should handle stats icon', () => {
      component.data = { title: 'Test', icon: 'stats' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.card-icon')).toBeTruthy();
    });

    it('should handle users icon', () => {
      component.data = { title: 'Test', icon: 'users' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.card-icon')).toBeTruthy();
    });

    it('should handle clock icon', () => {
      component.data = { title: 'Test', icon: 'clock' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.card-icon')).toBeTruthy();
    });

    it('should handle target icon', () => {
      component.data = { title: 'Test', icon: 'target' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.card-icon')).toBeTruthy();
    });

    it('should handle trend-up icon', () => {
      component.data = { title: 'Test', icon: 'trend-up' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.card-icon')).toBeTruthy();
    });

    it('should handle default icon', () => {
      component.data = { title: 'Test', icon: 'unknown' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.card-icon')).toBeTruthy();
    });
  });

  describe('动作按钮测试', () => {
    it('should render action buttons when provided', () => {
      component.data = mockCardData;
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const buttons = compiled.querySelectorAll('.card-action-btn');
      expect(buttons.length).toBe(2);
    });

    it('should apply primary class to primary actions', () => {
      component.data = mockCardData;
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const buttons = compiled.querySelectorAll('.card-action-btn');
      expect(buttons[0].classList.contains('primary')).toBe(true);
    });
  });
});
