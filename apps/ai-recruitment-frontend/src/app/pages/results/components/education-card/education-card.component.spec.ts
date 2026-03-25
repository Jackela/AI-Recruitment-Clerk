import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { EducationCardComponent } from './education-card.component';
import type { EducationDetail } from '../../../../interfaces/detailed-analysis.interface';

describe('EducationCardComponent', () => {
  let component: EducationCardComponent;
  let fixture: ComponentFixture<EducationCardComponent>;

  const mockEducation: EducationDetail = {
    degree: '计算机科学学士',
    major: '计算机科学',
    university: '北京大学',
    graduationYear: '2022',
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

    it('should initialize with null education data', () => {
      expect(component.education).toBeNull();
    });

    it('should initialize with null matchLevel', () => {
      expect(component.matchLevel).toBeNull();
    });
  });

  describe('输入属性测试', () => {
    it('should accept education input', () => {
      component.education = mockEducation;
      expect(component.education).toEqual(mockEducation);
    });

    it('should accept matchLevel input', () => {
      component.matchLevel = '高';
      expect(component.matchLevel).toBe('高');
    });
  });

  describe('渲染测试', () => {
    it('should render education details', () => {
      component.education = mockEducation;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('计算机科学学士');
      expect(compiled.textContent).toContain('北京大学');
      expect(compiled.textContent).toContain('计算机科学');
      expect(compiled.textContent).toContain('2022年毕业');
    });

    it('should show empty state when no education', () => {
      component.education = null;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('暂无教育背景数据');
    });

    it('should render match level when provided', () => {
      component.education = mockEducation;
      component.matchLevel = '中';
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('专业匹配度: 中');
    });
  });
});
