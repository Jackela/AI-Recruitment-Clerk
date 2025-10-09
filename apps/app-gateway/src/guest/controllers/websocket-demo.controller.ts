import { Controller, Post, Body, Logger } from '@nestjs/common';
import { WebSocketGateway } from '../../websocket/websocket.gateway';

/**
 * Exposes endpoints for web socket demo.
 */
@Controller('api/guest/websocket')
export class WebSocketDemoController {
  private readonly logger = new Logger(WebSocketDemoController.name);

  /**
   * Initializes a new instance of the Web Socket Demo Controller.
   * @param webSocketGateway - The web socket gateway.
   */
  constructor(private readonly webSocketGateway: WebSocketGateway) {}

  /**
   * Performs the simulate progress operation.
   * @param body - The body.
   * @returns A promise that resolves to { message: string }.
   */
  @Post('demo-progress')
  async simulateProgress(
    @Body() body: { sessionId: string },
  ): Promise<{ message: string }> {
    const { sessionId } = body;

    if (!sessionId) {
      throw new Error('SessionId is required');
    }

    this.logger.log(
      `Starting demo progress simulation for session: ${sessionId}`,
    );

    // 模拟分析进度
    this.simulateAnalysisProgress(sessionId);

    return { message: 'Progress simulation started' };
  }

  private async simulateAnalysisProgress(sessionId: string): Promise<void> {
    const steps = [
      { step: '上传文件', progress: 10, delay: 1000 },
      { step: '解析简历', progress: 25, delay: 2000 },
      { step: '提取关键信息', progress: 50, delay: 2500 },
      { step: '智能分析', progress: 75, delay: 3000 },
      { step: '生成报告', progress: 90, delay: 2000 },
      { step: '完成分析', progress: 100, delay: 1000 },
    ];

    // 发送开始通知
    this.webSocketGateway.sendStepChange(
      sessionId,
      '开始分析',
      '正在初始化分析流程...',
    );

    for (const stepData of steps) {
      await this.delay(stepData.delay);

      // 发送步骤变更
      this.webSocketGateway.sendStepChange(
        sessionId,
        stepData.step,
        `正在执行: ${stepData.step}...`,
      );

      // 发送进度更新
      this.webSocketGateway.sendProgressUpdate(sessionId, {
        sessionId,
        progress: stepData.progress,
        currentStep: stepData.step,
        message: `${stepData.step}进度: ${stepData.progress}%`,
        estimatedTimeRemaining: this.calculateETA(stepData.progress),
      });

      this.logger.log(
        `Session ${sessionId}: ${stepData.step} - ${stepData.progress}%`,
      );
    }

    // 发送完成通知
    await this.delay(500);
    this.webSocketGateway.sendCompletion(sessionId, {
      sessionId,
      analysisId: sessionId,
      result: {
        score: 85,
        summary: '该候选人具有良好的技能匹配度',
        reportUrl: `http://localhost:3000/api/reports/${sessionId}`,
        details: {
          skills: ['JavaScript', 'TypeScript', 'Angular', 'Node.js'],
          experience: '3-5年软件开发经验',
          education: '计算机科学学士学位',
          recommendations: [
            '技术栈匹配度高，适合前端开发岗位',
            '建议进行技术面试验证实际能力',
            '可以考虑安排项目经验分享环节',
          ],
        },
      },
      processingTime: 15000,
    });

    this.logger.log(`Session ${sessionId}: Analysis completed successfully`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private calculateETA(currentProgress: number): number {
    // 简单的ETA计算：假设总时间15秒
    const totalTime = 15; // 秒
    const remainingProgress = 100 - currentProgress;
    return Math.round((remainingProgress / 100) * totalTime);
  }

  /**
   * Performs the simulate error operation.
   * @param body - The body.
   * @returns A promise that resolves to { message: string }.
   */
  @Post('demo-error')
  async simulateError(
    @Body() body: { sessionId: string },
  ): Promise<{ message: string }> {
    const { sessionId } = body;

    if (!sessionId) {
      throw new Error('SessionId is required');
    }

    this.logger.log(`Simulating error for session: ${sessionId}`);

    // 模拟一些进度然后出错
    setTimeout(() => {
      this.webSocketGateway.sendProgressUpdate(sessionId, {
        sessionId,
        progress: 30,
        currentStep: '解析文件',
        message: '正在解析PDF文件...',
      });
    }, 1000);

    setTimeout(() => {
      this.webSocketGateway.sendError(
        sessionId,
        '文件格式不支持或文件已损坏，请检查文件完整性',
        'INVALID_FILE_FORMAT',
      );
    }, 3000);

    return { message: 'Error simulation started' };
  }
}
