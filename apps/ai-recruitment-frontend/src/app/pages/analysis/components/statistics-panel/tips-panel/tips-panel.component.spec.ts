import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { TipsPanelComponent } from './tips-panel.component';

describe('TipsPanelComponent', () => {
  let component: TipsPanelComponent;
  let fixture: ComponentFixture<TipsPanelComponent>;

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
  });

  describe('输入属性测试', () => {
    it('should accept tips input', () => {
      const mockTips = [
        '使用PDF格式上传',
        '确保文件清晰可读',
        '简历内容真实完整',
      ];
      component.tips = mockTips;
      expect(component.tips).toEqual(mockTips);
    });
  });

  describe('渲染测试', () => {
    it('should render tips list', () => {
      component.tips = ['提示1', '提示2', '提示3'];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('提示1');
      expect(compiled.textContent).toContain('提示2');
      expect(compiled.textContent).toContain('提示3');
    });

    it('should show empty message when no tips', () => {
      component.tips = [];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('暂无提示');
    });
  });
});
