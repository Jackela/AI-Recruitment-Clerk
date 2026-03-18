import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { EducationCardComponent } from './education-card.component';

describe('EducationCardComponent', () => {
  let component: EducationCardComponent;
  let fixture: ComponentFixture<EducationCardComponent>;

  const mockEducation = {
    degree: '计算机科学学士',
    school: '北京大学',
    year: '2018-2022',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EducationCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EducationCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty education data', () => {
      expect(component.education).toEqual([]);
    });
  });

  describe('输入属性测试', () => {
    it('should accept education input', () => {
      component.education = [mockEducation];
      expect(component.education).toEqual([mockEducation]);
    });
  });

  describe('渲染测试', () => {
    it('should render education list', () => {
      component.education = [mockEducation];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('计算机科学学士');
      expect(compiled.textContent).toContain('北京大学');
    });

    it('should show empty state when no education', () => {
      component.education = [];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('暂无教育背景');
    });
  });
});
