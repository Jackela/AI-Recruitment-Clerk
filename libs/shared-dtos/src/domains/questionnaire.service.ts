import type {
  RawSubmissionData,
  SubmissionMetadata} from './questionnaire.dto';
import {
  Questionnaire,
  QuestionnaireValidationFailedEvent,
} from './questionnaire.dto';

/**
 * Provides questionnaire domain functionality.
 */
export class QuestionnaireDomainService {
  /**
   * Initializes a new instance of the Questionnaire Domain Service.
   * @param repository - The repository.
   * @param templateService - The template service.
   * @param eventBus - The event bus.
   */
  constructor(
    private readonly repository: IQuestionnaireRepository,
    private readonly templateService: IQuestionnaireTemplateService,
    private readonly eventBus: IDomainEventBus,
  ) {}

  /**
   * Performs the submit questionnaire operation.
   * @param rawData - The raw data.
   * @param metadata - The metadata.
   * @returns A promise that resolves to QuestionnaireSubmissionResult.
   */
  public async submitQuestionnaire(
    rawData: RawSubmissionData,
    metadata: SubmissionMetadata,
  ): Promise<QuestionnaireSubmissionResult> {
    try {
      // 获取当前问卷模板
      const template = await this.templateService.getCurrentTemplate();

      // 创建问卷聚合
      const questionnaire = Questionnaire.create(
        template.id,
        rawData,
        metadata,
      );

      // 验证提交数据
      const validationResult = questionnaire.validateSubmission();
      if (!validationResult.isValid) {
        await this.publishValidationFailedEvent(
          questionnaire,
          validationResult,
          rawData,
          metadata,
        );
        return QuestionnaireSubmissionResult.failed(validationResult.errors);
      }

      // 计算质量分数
      const qualityScore = questionnaire.calculateQualityScore();

      // 检查奖励资格
      const bonusEligible = questionnaire.isEligibleForBonus();

      // 保存问卷
      await this.repository.save(questionnaire);

      // 发布领域事件（事件已在聚合根中创建）
      const events = questionnaire.getUncommittedEvents();
      for (const event of events) {
        await this.eventBus.publish(event);
      }
      questionnaire.markEventsAsCommitted();

      return QuestionnaireSubmissionResult.success({
        questionnaireId: questionnaire.getId().getValue(),
        qualityScore: qualityScore.value,
        bonusEligible,
        summary: questionnaire.getSubmissionSummary(),
      });
    } catch (error) {
      console.error('Error submitting questionnaire:', error);
      return QuestionnaireSubmissionResult.failed(['Internal error occurred']);
    }
  }

  /**
   * Performs the analyze submission trends operation.
   * @returns A promise that resolves to SubmissionTrendsAnalysis.
   */
  public async analyzeSubmissionTrends(): Promise<SubmissionTrendsAnalysis> {
    const recentSubmissions = await this.repository.findRecent(30); // 最近30天

    if (recentSubmissions.length === 0) {
      return SubmissionTrendsAnalysis.empty();
    }

    return SubmissionTrendsAnalysis.create({
      totalSubmissions: recentSubmissions.length,
      averageQualityScore: this.calculateAverageQuality(recentSubmissions),
      bonusEligibilityRate:
        this.calculateBonusEligibilityRate(recentSubmissions),
      topPainPoints: this.extractTopPainPoints(recentSubmissions),
      averageWillingnessToPay: this.calculateAverageWTP(recentSubmissions),
      userSegmentation: this.segmentUsers(recentSubmissions),
    });
  }

  /**
   * Validates ip submission limit.
   * @param ip - The ip.
   * @returns A promise that resolves to IPSubmissionCheckResult.
   */
  public async validateIPSubmissionLimit(
    ip: string,
  ): Promise<IPSubmissionCheckResult> {
    const today = new Date();
    const todaySubmissions = await this.repository.findByIPAndDate(ip, today);

    const maxSubmissionsPerDay = 1; // 每IP每天最多1份问卷

    if (todaySubmissions.length >= maxSubmissionsPerDay) {
      return IPSubmissionCheckResult.blocked(
        `IP ${ip} has already submitted ${todaySubmissions.length} questionnaire(s) today`,
      );
    }

    return IPSubmissionCheckResult.allowed();
  }

  private async publishValidationFailedEvent(
    _questionnaire: Questionnaire,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validationResult: any,
    rawData: RawSubmissionData,
    metadata: SubmissionMetadata,
  ): Promise<void> {
    const event = new QuestionnaireValidationFailedEvent(
      metadata.ip,
      validationResult.errors,
      rawData,
      new Date(),
    );

    await this.eventBus.publish(event);
  }

  private calculateAverageQuality(submissions: Questionnaire[]): number {
    if (submissions.length === 0) return 0;

    const totalQuality = submissions.reduce((sum, q) => {
      return sum + q.calculateQualityScore().value;
    }, 0);

    return Math.round((totalQuality / submissions.length) * 100) / 100;
  }

  private calculateBonusEligibilityRate(submissions: Questionnaire[]): number {
    if (submissions.length === 0) return 0;

    const eligibleCount = submissions.filter((q) =>
      q.isEligibleForBonus(),
    ).length;
    return Math.round((eligibleCount / submissions.length) * 10000) / 100; // 百分比，保疙2位小数
  }

  private extractTopPainPoints(_submissions: Questionnaire[]): string[] {
    // const painPoints: { [key: string]: number } = {};

    // submissions.forEach((q) => {
    //   const experience = q.getSubmissionSummary();
    //   // 简化实现，实际应该从提交数据中提取痛点
    //   // 这里返回模拟数据
    // });

    // 返回模拟的高频痛点
    return [
      'Manual screening is time-consuming',
      'Difficulty finding qualified candidates',
      'High interview dropout rate',
    ];
  }

  private calculateAverageWTP(submissions: Questionnaire[]): number {
    if (submissions.length === 0) return 0;

    const totalWTP = submissions.reduce((sum, q) => {
      return sum + q.getSubmissionSummary().willingnessToPayMonthly;
    }, 0);

    return Math.round((totalWTP / submissions.length) * 100) / 100;
  }

  private segmentUsers(submissions: Questionnaire[]): UserSegmentation {
    const segments = {
      byRole: {} as { [key: string]: number },
      byIndustry: {} as { [key: string]: number },
      bySatisfaction: { high: 0, medium: 0, low: 0 },
    };

    submissions.forEach((q) => {
      const summary = q.getSubmissionSummary();

      // 角色分段
      segments.byRole[summary.role] = (segments.byRole[summary.role] || 0) + 1;

      // 行业分段
      segments.byIndustry[summary.industry] =
        (segments.byIndustry[summary.industry] || 0) + 1;

      // 满意度分段
      if (summary.overallSatisfaction >= 4) {
        segments.bySatisfaction.high++;
      } else if (summary.overallSatisfaction >= 3) {
        segments.bySatisfaction.medium++;
      } else {
        segments.bySatisfaction.low++;
      }
    });

    return new UserSegmentation(segments);
  }
}

// 结果类
/**
 * Represents the questionnaire submission result.
 */
export class QuestionnaireSubmissionResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      questionnaireId: string;
      qualityScore: number;
      bonusEligible: boolean;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      summary: any;
    },
    public readonly errors?: string[],
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The QuestionnaireSubmissionResult.
   */
  public static success(data: {
    questionnaireId: string;
    qualityScore: number;
    bonusEligible: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    summary: any;
  }): QuestionnaireSubmissionResult {
    return new QuestionnaireSubmissionResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The QuestionnaireSubmissionResult.
   */
  public static failed(errors: string[]): QuestionnaireSubmissionResult {
    return new QuestionnaireSubmissionResult(false, undefined, errors);
  }
}

/**
 * Represents the submission trends analysis.
 */
export class SubmissionTrendsAnalysis {
  /**
   * Initializes a new instance of the Submission Trends Analysis.
   * @param totalSubmissions - The total submissions.
   * @param averageQualityScore - The average quality score.
   * @param bonusEligibilityRate - The bonus eligibility rate.
   * @param topPainPoints - The top pain points.
   * @param averageWillingnessToPay - The average willingness to pay.
   * @param userSegmentation - The user segmentation.
   */
  constructor(
    public readonly totalSubmissions: number,
    public readonly averageQualityScore: number,
    public readonly bonusEligibilityRate: number,
    public readonly topPainPoints: string[],
    public readonly averageWillingnessToPay: number,
    public readonly userSegmentation: UserSegmentation,
  ) {}

  /**
   * Creates the entity.
   * @param data - The data.
   * @returns The SubmissionTrendsAnalysis.
   */
  public static create(data: {
    totalSubmissions: number;
    averageQualityScore: number;
    bonusEligibilityRate: number;
    topPainPoints: string[];
    averageWillingnessToPay: number;
    userSegmentation: UserSegmentation;
  }): SubmissionTrendsAnalysis {
    return new SubmissionTrendsAnalysis(
      data.totalSubmissions,
      data.averageQualityScore,
      data.bonusEligibilityRate,
      data.topPainPoints,
      data.averageWillingnessToPay,
      data.userSegmentation,
    );
  }

  /**
   * Performs the empty operation.
   * @returns The SubmissionTrendsAnalysis.
   */
  public static empty(): SubmissionTrendsAnalysis {
    return new SubmissionTrendsAnalysis(
      0,
      0,
      0,
      [],
      0,
      new UserSegmentation({
        byRole: {},
        byIndustry: {},
        bySatisfaction: { high: 0, medium: 0, low: 0 },
      }),
    );
  }
}

/**
 * Represents the ip submission check result.
 */
export class IPSubmissionCheckResult {
  private constructor(
    public readonly allowed: boolean,
    public readonly blocked: boolean,
    public readonly reason?: string,
  ) {}

  /**
   * Performs the allowed operation.
   * @returns The IPSubmissionCheckResult.
   */
  public static allowed(): IPSubmissionCheckResult {
    return new IPSubmissionCheckResult(true, false);
  }

  /**
   * Performs the blocked operation.
   * @param reason - The reason.
   * @returns The IPSubmissionCheckResult.
   */
  public static blocked(reason: string): IPSubmissionCheckResult {
    return new IPSubmissionCheckResult(false, true, reason);
  }
}

/**
 * Represents the user segmentation.
 */
export class UserSegmentation {
  /**
   * Initializes a new instance of the User Segmentation.
   * @param data - The data.
   */
  constructor(
    public readonly data: {
      byRole: { [key: string]: number };
      byIndustry: { [key: string]: number };
      bySatisfaction: { high: number; medium: number; low: number };
    },
  ) {}
}

// 接口定义
/**
 * Defines the shape of the i questionnaire repository.
 */
export interface IQuestionnaireRepository {
  save(questionnaire: Questionnaire): Promise<void>;
  findById(id: string): Promise<Questionnaire | null>;
  findByIPAndDate(ip: string, date: Date): Promise<Questionnaire[]>;
  findRecent(days: number): Promise<Questionnaire[]>;
}

/**
 * Defines the shape of the i questionnaire template service.
 */
export interface IQuestionnaireTemplateService {
  getCurrentTemplate(): Promise<{ id: string; version: string }>;
}

/**
 * Defines the shape of the i domain event bus.
 */
export interface IDomainEventBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publish(event: any): Promise<void>;
}
