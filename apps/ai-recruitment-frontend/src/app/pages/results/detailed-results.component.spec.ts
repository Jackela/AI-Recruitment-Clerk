import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { DetailedResultsComponent } from './detailed-results.component';
import { GuestApiService } from '../../services/guest/guest-api.service';

describe('DetailedResultsComponent', () => {
  let component: DetailedResultsComponent;
  let fixture: ComponentFixture<DetailedResultsComponent>;
  let mockActivatedRoute: jasmine.SpyObj<ActivatedRoute>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockGuestApiService: jasmine.SpyObj<GuestApiService>;

  const mockAnalysisResult = {
    sessionId: 'test-session-123',
    candidateName: '张三',
    candidateEmail: 'zhangsan@example.com',
    targetPosition: '前端开发工程师',
    analysisTime: '2024-01-15T10:30:00Z',
    score: 85,
    summary: '该候选人具有优秀的前端开发技能',
    keySkills: ['JavaScript', 'TypeScript', 'Angular', 'React', 'Vue.js'],
    experience: '5年前端开发经验',
    education: '计算机科学学士学位',
    recommendations: [
      '技术栈匹配度高，适合高级前端开发岗位',
      '建议进行技术面试验证实际能力',
      '可以考虑架构设计相关的技术考察'
    ],
    skillAnalysis: {
      technical: 90,
      communication: 75,
      problemSolving: 88,
      teamwork: 82,
      leadership: 70
    },
    experienceDetails: [
      {
        company: 'ABC科技公司',
        position: '高级前端工程师',
        duration: '2021-2024',
        description: '负责企业级Web应用开发'
      },
      {
        company: 'XYZ创业公司',
        position: '前端工程师',
        duration: '2019-2021',
        description: '参与产品从0到1的开发过程'
      }
    ],
    educationDetails: {
      degree: '学士',
      major: '计算机科学与技术',
      university: '清华大学',
      graduationYear: '2019'
    },
    strengths: [
      '技术栈覆盖面广，掌握多种前端框架',
      '有丰富的项目实战经验',
      '学习能力强，能快速适应新技术'
    ],
    improvements: [
      '可以加强团队领导能力的培养',
      '建议深入学习后端技术，成为全栈开发者',
      '可以参与开源项目，提升技术影响力'
    ],
    reportUrl: 'http://localhost:3000/api/reports/test-session-123'
  };

  beforeEach(async () => {
    const routeSpy = jasmine.createSpyObj('ActivatedRoute', [], {
      paramMap: of(new Map([['sessionId', 'test-session-123']]))
    });
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const apiSpy = jasmine.createSpyObj('GuestApiService', ['getDetailedResults']);

    await TestBed.configureTestingModule({
      imports: [DetailedResultsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: routeSpy },
        { provide: Router, useValue: routerSpy },
        { provide: GuestApiService, useValue: apiSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DetailedResultsComponent);
    component = fixture.componentInstance;
    mockActivatedRoute = TestBed.inject(ActivatedRoute) as jasmine.SpyObj<ActivatedRoute>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockGuestApiService = TestBed.inject(GuestApiService) as jasmine.SpyObj<GuestApiService>;
  });

  describe('组件初始化', () => {
    it('应该成功创建组件', () => {
      expect(component).toBeTruthy();
    });

    it('应该初始化必要的状态', () => {
      expect(component.sessionId()).toBe('');
      expect(component.isLoading()).toBe(false);
      expect(component.hasError()).toBe(false);
      expect(component.analysisResult()).toBeNull();
    });

    it('应该从路由参数中获取sessionId', () => {
      // 模拟路由参数
      mockActivatedRoute.paramMap = of(new Map([['sessionId', 'test-session-123']]));
      mockGuestApiService.getDetailedResults.and.returnValue(of(mockAnalysisResult));

      component.ngOnInit();

      expect(component.sessionId()).toBe('test-session-123');
      expect(mockGuestApiService.getDetailedResults).toHaveBeenCalledWith('test-session-123');
    });

    it('应该处理缺失的sessionId', () => {
      mockActivatedRoute.paramMap = of(new Map());

      component.ngOnInit();

      expect(component.sessionId()).toBe('');
      expect(component.hasError()).toBe(true);
      expect(component.errorMessage()).toContain('无效的会话ID');
    });
  });

  describe('数据加载', () => {
    it('应该成功加载详细结果', () => {
      mockGuestApiService.getDetailedResults.and.returnValue(of(mockAnalysisResult));

      component.loadDetailedResults('test-session-123');

      expect(component.isLoading()).toBe(false);
      expect(component.hasError()).toBe(false);
      expect(component.analysisResult()).toEqual(mockAnalysisResult);
    });

    it('应该显示加载状态', () => {
      // 创建一个延迟的Observable来测试加载状态
      const delayedResult = new Promise(resolve => 
        setTimeout(() => resolve(mockAnalysisResult), 100)
      );
      mockGuestApiService.getDetailedResults.and.returnValue(of(mockAnalysisResult));

      component.loadDetailedResults('test-session-123');

      expect(component.isLoading()).toBe(true);
    });

    it('应该处理加载错误', () => {
      const errorResponse = { message: '服务器错误' };
      mockGuestApiService.getDetailedResults.and.returnValue(throwError(() => errorResponse));

      component.loadDetailedResults('test-session-123');

      expect(component.isLoading()).toBe(false);
      expect(component.hasError()).toBe(true);
      expect(component.errorMessage()).toContain('加载失败');
    });

    it('应该处理网络错误', () => {
      mockGuestApiService.getDetailedResults.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      component.loadDetailedResults('test-session-123');

      expect(component.hasError()).toBe(true);
      expect(component.errorMessage()).toContain('网络连接');
    });
  });

  describe('用户交互', () => {
    beforeEach(() => {
      component.analysisResult.set(mockAnalysisResult);
    });

    it('应该支持返回导航', () => {
      component.goBack();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/analysis']);
    });

    it('应该支持重新加载', () => {
      mockGuestApiService.getDetailedResults.and.returnValue(of(mockAnalysisResult));
      component.sessionId.set('test-session-123');

      component.retryLoad();

      expect(component.hasError()).toBe(false);
      expect(mockGuestApiService.getDetailedResults).toHaveBeenCalledWith('test-session-123');
    });

    it('应该支持技能展开/收起', () => {
      expect(component.isSkillsExpanded()).toBe(false);

      component.toggleSkillsExpanded();
      expect(component.isSkillsExpanded()).toBe(true);

      component.toggleSkillsExpanded();
      expect(component.isSkillsExpanded()).toBe(false);
    });

    it('应该支持PDF导出', () => {
      spyOn(window, 'open');
      
      component.exportToPdf();

      expect(window.open).toHaveBeenCalledWith(
        'http://localhost:3000/api/reports/test-session-123/pdf',
        '_blank'
      );
    });

    it('应该支持Excel导出', () => {
      spyOn(window, 'open');
      
      component.exportToExcel();

      expect(window.open).toHaveBeenCalledWith(
        'http://localhost:3000/api/reports/test-session-123/excel',
        '_blank'
      );
    });

    it('应该支持分享链接', async () => {
      // 模拟现代浏览器的navigator.share API
      const mockShare = jasmine.createSpy('share').and.returnValue(Promise.resolve());
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        writable: true
      });

      await component.shareReport();

      expect(mockShare).toHaveBeenCalledWith({
        title: '简历分析报告 - 张三',
        text: '查看详细的AI简历分析报告',
        url: jasmine.any(String)
      });
    });

    it('应该回退到复制链接当不支持分享API时', async () => {
      // 移除navigator.share API
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        writable: true
      });

      spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());

      await component.shareReport();

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  describe('数据计算', () => {
    beforeEach(() => {
      component.analysisResult.set(mockAnalysisResult);
    });

    it('应该正确计算技能雷达图数据', () => {
      const radarData = component.getRadarChartData();

      expect(radarData).toEqual([
        { skill: '技术能力', value: 90 },
        { skill: '沟通能力', value: 75 },
        { skill: '问题解决', value: 88 },
        { skill: '团队协作', value: 82 },
        { skill: '领导能力', value: 70 }
      ]);
    });

    it('应该正确计算整体匹配度', () => {
      const overallMatch = component.getOverallMatch();

      expect(overallMatch).toBe(81); // (90+75+88+82+70)/5 = 81
    });

    it('应该正确格式化分析时间', () => {
      const formattedTime = component.getFormattedAnalysisTime();

      expect(formattedTime).toBe('2024年1月15日 18:30');
    });

    it('应该正确计算经验年限', () => {
      const experienceYears = component.getExperienceYears();

      expect(experienceYears).toBe(5);
    });

    it('应该正确生成技能标签样式', () => {
      const style = component.getSkillTagStyle('JavaScript');

      expect(style).toEqual({
        'background-color': jasmine.any(String),
        'color': 'white'
      });
    });
  });

  describe('响应式设计支持', () => {
    it('应该检测移动端设备', () => {
      // 模拟移动端视口
      spyOnProperty(window, 'innerWidth', 'get').and.returnValue(375);
      
      const isMobile = component.isMobileDevice();

      expect(isMobile).toBe(true);
    });

    it('应该检测桌面端设备', () => {
      spyOnProperty(window, 'innerWidth', 'get').and.returnValue(1200);
      
      const isMobile = component.isMobileDevice();

      expect(isMobile).toBe(false);
    });

    it('应该根据设备调整布局', () => {
      spyOnProperty(window, 'innerWidth', 'get').and.returnValue(375);
      
      const layoutClass = component.getLayoutClass();

      expect(layoutClass).toContain('mobile-layout');
    });
  });

  describe('错误处理', () => {
    it('应该处理API超时错误', () => {
      const timeoutError = { name: 'TimeoutError', message: 'Request timeout' };
      mockGuestApiService.getDetailedResults.and.returnValue(throwError(() => timeoutError));

      component.loadDetailedResults('test-session-123');

      expect(component.errorMessage()).toContain('请求超时');
    });

    it('应该处理404错误', () => {
      const notFoundError = { status: 404, message: 'Not found' };
      mockGuestApiService.getDetailedResults.and.returnValue(throwError(() => notFoundError));

      component.loadDetailedResults('test-session-123');

      expect(component.errorMessage()).toContain('未找到分析结果');
    });

    it('应该处理服务器错误', () => {
      const serverError = { status: 500, message: 'Internal server error' };
      mockGuestApiService.getDetailedResults.and.returnValue(throwError(() => serverError));

      component.loadDetailedResults('test-session-123');

      expect(component.errorMessage()).toContain('服务器错误');
    });
  });

  describe('性能优化', () => {
    it('应该防止重复加载相同数据', () => {
      mockGuestApiService.getDetailedResults.and.returnValue(of(mockAnalysisResult));
      
      // 首次加载
      component.loadDetailedResults('test-session-123');
      expect(mockGuestApiService.getDetailedResults).toHaveBeenCalledTimes(1);
      
      // 相同sessionId不应该重复加载
      component.loadDetailedResults('test-session-123');
      expect(mockGuestApiService.getDetailedResults).toHaveBeenCalledTimes(1);
    });

    it('应该正确清理订阅', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });
});