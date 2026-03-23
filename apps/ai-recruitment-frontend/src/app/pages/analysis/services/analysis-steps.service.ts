/**
 * Analysis Steps Service
 * Manages analysis step definitions and navigation
 */

import { Injectable, signal } from '@angular/core';
import type { AnalysisStep, StepConfig } from '../types/analysis.types';

@Injectable({
  providedIn: 'root',
})
export class AnalysisStepsService {
  // Default step configurations
  private readonly defaultStepConfigs: StepConfig[] = [
    {
      id: 'upload',
      title: '文件上传',
      description: '上传并验证简历文件',
      order: 0,
    },
    {
      id: 'parse',
      title: '解析简历',
      description: '提取文本和结构化信息',
      order: 1,
    },
    {
      id: 'extract',
      title: '信息提取',
      description: '识别关键技能和经验',
      order: 2,
    },
    {
      id: 'analyze',
      title: '智能分析',
      description: 'AI算法分析和评估',
      order: 3,
    },
    {
      id: 'report',
      title: '生成报告',
      description: '创建详细分析报告',
      order: 4,
    },
  ];

  // Steps signal
  public analysisSteps = signal<AnalysisStep[]>(this.createDefaultSteps());

  /**
   * Creates default analysis steps
   */
  private createDefaultSteps(): AnalysisStep[] {
    return this.defaultStepConfigs.map((config) => ({
      id: config.id,
      title: config.title,
      description: config.description,
      status: 'pending',
      progress: 0,
    }));
  }

  /**
   * Resets all steps to pending state
   */
  public resetSteps(): void {
    this.analysisSteps.set(this.createDefaultSteps());
  }

  /**
   * Updates a specific step's status
   */
  public updateStepStatus(
    stepId: string,
    status: AnalysisStep['status'],
  ): void {
    const steps = this.analysisSteps();
    const updatedSteps = steps.map((step) => {
      if (step.id === stepId) {
        return {
          ...step,
          status,
          progress: status === 'completed' ? 100 : step.progress,
        };
      }
      return step;
    });
    this.analysisSteps.set(updatedSteps);
  }

  /**
   * Updates a specific step's progress
   */
  public updateStepProgress(stepId: string, progress: number): void {
    const steps = this.analysisSteps();
    const updatedSteps = steps.map((step) => {
      if (step.id === stepId) {
        return { ...step, progress, status: 'active' as const };
      }
      return step;
    });
    this.analysisSteps.set(updatedSteps);
  }

  /**
   * Updates step progression based on current step name
   * Marks previous steps as completed, current as active
   */
  public updateStepProgression(currentStepName: string): void {
    const stepMap: Record<string, string> = {
      上传文件: 'upload',
      解析简历: 'parse',
      提取关键信息: 'extract',
      智能分析: 'analyze',
      生成报告: 'report',
    };

    const currentStepId =
      stepMap[currentStepName] || currentStepName.toLowerCase();
    const steps = this.analysisSteps();
    const currentIndex = steps.findIndex((step) => step.id === currentStepId);

    const updatedSteps = steps.map((step, index) => {
      if (index < currentIndex) {
        return { ...step, status: 'completed' as const, progress: 100 };
      } else if (index === currentIndex) {
        return { ...step, status: 'active' as const, progress: 0 };
      }
      return step;
    });

    this.analysisSteps.set(updatedSteps);
  }

  /**
   * Updates step progress from a progress update event
   */
  public updateAnalysisProgress(stepName: string, progress: number): void {
    const stepMap: Record<string, string> = {
      上传文件: 'upload',
      解析简历: 'parse',
      提取关键信息: 'extract',
      智能分析: 'analyze',
      生成报告: 'report',
    };

    const stepId = stepMap[stepName] || stepName.toLowerCase();
    this.updateStepProgress(stepId, progress);
  }

  /**
   * Marks all steps as completed
   */
  public markAllCompleted(): void {
    const steps = this.analysisSteps();
    const completedSteps = steps.map((step) => ({
      ...step,
      status: 'completed' as const,
      progress: 100,
    }));
    this.analysisSteps.set(completedSteps);
  }

  /**
   * Marks the current active step as error
   */
  public markCurrentStepError(): void {
    const steps = this.analysisSteps();
    const updatedSteps = steps.map((step) => {
      if (step.status === 'active') {
        return { ...step, status: 'error' as const };
      }
      return step;
    });
    this.analysisSteps.set(updatedSteps);
  }

  /**
   * Gets the current active step
   */
  public getActiveStep(): AnalysisStep | undefined {
    return this.analysisSteps().find((step) => step.status === 'active');
  }

  /**
   * Gets step by ID
   */
  public getStepById(stepId: string): AnalysisStep | undefined {
    return this.analysisSteps().find((step) => step.id === stepId);
  }
}
