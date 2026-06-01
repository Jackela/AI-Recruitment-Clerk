import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ChartsComponent } from './charts.component';

describe('ChartsComponent', () => {
  let component: ChartsComponent;
  let fixture: ComponentFixture<ChartsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChartsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default data', () => {
      expect(component.chartData).toBeDefined();
    });
  });

  describe('图表数据测试', () => {
    it('should update chart data', () => {
      const newData = { labels: ['Jan', 'Feb'], values: [10, 20] };
      component.chartData = newData;
      expect(component.chartData).toEqual(newData);
    });
  });

  describe('渲染测试', () => {
    it('should render chart container', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.chart-container')).toBeTruthy();
    });
  });
});
