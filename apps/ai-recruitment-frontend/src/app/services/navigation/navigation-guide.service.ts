import { Injectable, signal, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

/**
 * Defines the shape of the guide step.
 */
export interface GuideStep {
  id: string;
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'input' | 'wait';
  nextStep?: string;
}

/**
 * Defines the shape of the onboarding flow.
 */
export interface OnboardingFlow {
  id: string;
  name: string;
  description: string;
  steps: GuideStep[];
  completedKey: string;
}

/**
 * Provides navigation guide functionality.
 */
@Injectable({
  providedIn: 'root',
})
export class NavigationGuideService {
  // State management
  public isGuideActive = signal(false);
  public currentStep = signal<GuideStep | null>(null);
  public currentFlow = signal<OnboardingFlow | null>(null);
  public stepIndex = signal(0);
  public isFirstTimeUser = signal(false);

  // Available flows
  private readonly flows: Record<string, OnboardingFlow> = {
    firstTimeUser: {
      id: 'firstTimeUser',
      name: '首次使用引导',
      description: '欢迎使用AI招聘助手！让我们快速了解系统功能',
      completedKey: 'onboarding_first_time_completed',
      steps: [
        {
          id: 'welcome',
          target: '.dashboard-container',
          title: '🎉 欢迎使用AI招聘助手',
          content: '这是您的控制面板，可以查看系统统计和快速访问功能',
          position: 'bottom',
        },
        {
          id: 'upload-section',
          target: '.quick-actions',
          title: '📁 开始分析简历',
          content: '点击这里上传简历文件，支持PDF、Word等格式',
          position: 'top',
          action: 'click',
        },
        {
          id: 'statistics',
          target: '.stats-grid',
          title: '📊 查看分析统计',
          content: '这里显示系统的实时分析统计数据',
          position: 'bottom',
        },
        {
          id: 'navigation',
          target: '.nav-menu',
          title: '🧭 导航菜单',
          content: '使用导航菜单在不同页面间切换',
          position: 'right',
        },
      ],
    },
    uploadGuide: {
      id: 'uploadGuide',
      name: '文件上传引导',
      description: '学习如何上传和分析简历文件',
      completedKey: 'onboarding_upload_completed',
      steps: [
        {
          id: 'drag-drop',
          target: '.upload-zone',
          title: '📤 拖拽上传',
          content: '将简历文件拖拽到这个区域，或点击选择文件',
          position: 'top',
          action: 'input',
        },
        {
          id: 'file-info',
          target: '.candidate-info',
          title: '👤 候选人信息',
          content: '填写候选人基本信息有助于更准确的分析',
          position: 'left',
          action: 'input',
        },
        {
          id: 'start-analysis',
          target: '.start-analysis-btn',
          title: '🚀 开始分析',
          content: '点击开始分析按钮启动AI简历分析',
          position: 'top',
          action: 'click',
        },
        {
          id: 'progress-tracking',
          target: '.progress-section',
          title: '⏱️ 实时进度',
          content: '分析过程中可以实时查看处理进度',
          position: 'bottom',
        },
      ],
    },
    resultsGuide: {
      id: 'resultsGuide',
      name: '结果查看引导',
      description: '了解如何查看和解读分析结果',
      completedKey: 'onboarding_results_completed',
      steps: [
        {
          id: 'overview-card',
          target: '.overview-card',
          title: '📋 分析概览',
          content: '这里显示候选人的整体评分和基本信息',
          position: 'bottom',
        },
        {
          id: 'skills-analysis',
          target: '.skills-card',
          title: '🎯 技能分析',
          content: '查看技能匹配度和详细的技能评估',
          position: 'top',
        },
        {
          id: 'export-options',
          target: '.export-actions',
          title: '📊 导出功能',
          content: '可以将分析结果导出为PDF或Excel格式',
          position: 'top',
        },
      ],
    },
  };

  private router = inject(Router);

  /**
   * Initializes a new instance of the Navigation Guide Service.
   */
  constructor() {
    this.initializeFirstTimeCheck();
    this.trackRouteChanges();
  }

  private initializeFirstTimeCheck(): void {
    const hasCompletedOnboarding = localStorage.getItem(
      'onboarding_first_time_completed',
    );
    if (!hasCompletedOnboarding) {
      this.isFirstTimeUser.set(true);
      setTimeout(() => this.startFlow('firstTimeUser'), 2000);
    }
  }

  private trackRouteChanges(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.handleRouteChange(event.url);
      });
  }

  private handleRouteChange(url: string): void {
    // Auto-start contextual guides based on route
    if (url.includes('/analysis') && !this.hasCompletedFlow('uploadGuide')) {
      setTimeout(() => this.startFlow('uploadGuide'), 1000);
    } else if (
      url.includes('/results') &&
      !this.hasCompletedFlow('resultsGuide')
    ) {
      setTimeout(() => this.startFlow('resultsGuide'), 1500);
    }
  }

  /**
   * Performs the start flow operation.
   * @param flowId - The flow id.
   */
  public startFlow(flowId: string): void {
    const flow = this.flows[flowId];
    if (!flow || this.hasCompletedFlow(flowId)) return;

    this.currentFlow.set(flow);
    this.stepIndex.set(0);
    this.isGuideActive.set(true);
    this.showCurrentStep();
  }

  /**
   * Performs the next step operation.
   */
  public nextStep(): void {
    const flow = this.currentFlow();
    if (!flow) return;

    const currentIndex = this.stepIndex();
    if (currentIndex < flow.steps.length - 1) {
      this.stepIndex.set(currentIndex + 1);
      this.showCurrentStep();
    } else {
      this.completeFlow();
    }
  }

  /**
   * Performs the previous step operation.
   */
  public previousStep(): void {
    const currentIndex = this.stepIndex();
    if (currentIndex > 0) {
      this.stepIndex.set(currentIndex - 1);
      this.showCurrentStep();
    }
  }

  /**
   * Performs the skip flow operation.
   */
  public skipFlow(): void {
    this.completeFlow();
  }

  private showCurrentStep(): void {
    const flow = this.currentFlow();
    if (!flow) return;

    const step = flow.steps[this.stepIndex()];
    this.currentStep.set(step);

    // Scroll to target element if needed
    setTimeout(() => {
      const element = document.querySelector(step.target);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        this.highlightElement(element);
      }
    }, 100);
  }

  private highlightElement(element: Element): void {
    // Remove existing highlights
    document.querySelectorAll('.guide-highlight').forEach((el) => {
      el.classList.remove('guide-highlight');
    });

    // Add highlight to current element
    element.classList.add('guide-highlight');
  }

  private completeFlow(): void {
    const flow = this.currentFlow();
    if (flow) {
      localStorage.setItem(flow.completedKey, 'true');
    }

    this.isGuideActive.set(false);
    this.currentStep.set(null);
    this.currentFlow.set(null);
    this.stepIndex.set(0);

    // Remove highlights
    document.querySelectorAll('.guide-highlight').forEach((el) => {
      el.classList.remove('guide-highlight');
    });
  }

  private hasCompletedFlow(flowId: string): boolean {
    const flow = this.flows[flowId];
    return flow ? !!localStorage.getItem(flow.completedKey) : false;
  }

  // Public methods for component interaction
  /**
   * Performs the show contextual help operation.
   * @param target - The target.
   * @param content - The content.
   */
  public showContextualHelp(target: string, content: string): void {
    const helpStep: GuideStep = {
      id: 'contextual-help',
      target,
      title: '💡 帮助信息',
      content,
      position: 'top',
    };

    this.currentStep.set(helpStep);
    this.isGuideActive.set(true);

    setTimeout(() => {
      const element = document.querySelector(target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.highlightElement(element);
      }
    }, 100);
  }

  /**
   * Performs the hide contextual help operation.
   */
  public hideContextualHelp(): void {
    this.isGuideActive.set(false);
    this.currentStep.set(null);
    document.querySelectorAll('.guide-highlight').forEach((el) => {
      el.classList.remove('guide-highlight');
    });
  }

  // Reset onboarding for testing
  /**
   * Performs the reset onboarding operation.
   */
  public resetOnboarding(): void {
    Object.values(this.flows).forEach((flow) => {
      localStorage.removeItem(flow.completedKey);
    });
    this.isFirstTimeUser.set(true);
  }

  // Get available flows for manual triggering
  /**
   * Retrieves available flows.
   * @returns The an array of OnboardingFlow.
   */
  public getAvailableFlows(): OnboardingFlow[] {
    return Object.values(this.flows);
  }

  // Check if user has completed all onboarding
  /**
   * Performs the has completed all onboarding operation.
   * @returns The boolean value.
   */
  public hasCompletedAllOnboarding(): boolean {
    return Object.values(this.flows).every((flow) =>
      this.hasCompletedFlow(flow.id),
    );
  }
}
