# Agent-3: Questionnaire领域实体任务规范

## 🎯 任务目标
设计问卷系统的完整领域建模，包括问卷模板、用户提交、数据验证、质量评估的完整领域逻辑。

## 📋 输入依赖
- 无外部依赖
- 基于需求: 问卷收集、质量奖励、用户反馈分析

## 📦 交付物

### 1. 问卷领域模型
**文件**: `libs/shared-dtos/src/domains/questionnaire.dto.ts`

```typescript
// 问卷聚合根
export class Questionnaire {
  constructor(
    private readonly id: QuestionnaireId,
    private readonly template: QuestionnaireTemplate,
    private readonly submission: QuestionnaireSubmission,
    private readonly quality: SubmissionQuality,
    private readonly metadata: SubmissionMetadata,
    private status: QuestionnaireStatus
  ) {}

  // 工厂方法
  static create(
    templateId: string,
    submission: RawSubmissionData,
    metadata: SubmissionMetadata
  ): Questionnaire;
  
  static restore(data: QuestionnaireData): Questionnaire;

  // 核心业务方法
  validateSubmission(): ValidationResult;
  calculateQualityScore(): QualityScore;
  isEligibleForBonus(): boolean;
  getSubmissionSummary(): SubmissionSummary;
  
  // 状态转换
  markAsProcessed(): void;
  markAsRewarded(): void;
  flagAsLowQuality(): void;
  
  // 查询方法
  getAnswerByQuestionId(questionId: string): Answer | null;
  getQualityMetrics(): QualityMetrics;
  getTotalTextLength(): number;
  hasDetailedFeedback(): boolean;
  
  // 领域事件
  getUncommittedEvents(): DomainEvent[];
}

// 问卷模板值对象
export class QuestionnaireTemplate extends ValueObject<{
  id: string;
  version: string;
  sections: QuestionSection[];
  requiredQuestions: string[];
  qualityThresholds: QualityThreshold[];
}> {}

// 提交内容聚合
export class QuestionnaireSubmission extends ValueObject<{
  userProfile: UserProfile;
  userExperience: UserExperience;
  businessValue: BusinessValue;
  featureNeeds: FeatureNeeds;
  optional: OptionalInfo;
  submittedAt: Date;
}> {}

// 质量评估值对象
export class SubmissionQuality extends ValueObject<{
  totalTextLength: number;
  detailedAnswers: number;
  completionRate: number;
  qualityScore: number;
  bonusEligible: boolean;
  qualityReasons: string[];
}> {}

// 问卷相关值对象
export class UserProfile extends ValueObject<{
  role: UserRole;
  industry: string;
  companySize: CompanySize;
  location: string;
}> {}

export class UserExperience extends ValueObject<{
  overallSatisfaction: Rating;
  accuracyRating: Rating;
  speedRating: Rating;
  uiRating: Rating;
  mostUsefulFeature: string;
  mainPainPoint?: string;
  improvementSuggestion?: string;
}> {}

export class BusinessValue extends ValueObject<{
  currentScreeningMethod: ScreeningMethod;
  timeSpentPerResume: number;
  resumesPerWeek: number;
  timeSavingPercentage: number;
  willingnessToPayMonthly: number;
  recommendLikelihood: Rating;
}> {}
```

### 2. 问卷业务规则
**文件**: `libs/shared-dtos/src/domains/questionnaire.rules.ts`

```typescript
export class QuestionnaireRules {
  // 质量评估规则
  static readonly MIN_TEXT_LENGTH_FOR_BONUS = 50;
  static readonly MIN_COMPLETION_RATE = 0.8;
  static readonly MIN_DETAILED_ANSWERS = 3;
  static readonly QUALITY_SCORE_THRESHOLD = 70;
  
  // 验证规则
  static readonly REQUIRED_FIELDS = [
    'userProfile.role',
    'userProfile.industry', 
    'userExperience.overallSatisfaction',
    'businessValue.currentScreeningMethod',
    'businessValue.willingnessToPayMonthly'
  ];

  // 业务规则方法
  static isHighQualitySubmission(submission: QuestionnaireSubmission): boolean {
    const textLength = this.calculateTotalTextLength(submission);
    const detailedAnswers = this.countDetailedAnswers(submission);
    const completionRate = this.calculateCompletionRate(submission);
    
    return textLength >= this.MIN_TEXT_LENGTH_FOR_BONUS &&
           detailedAnswers >= this.MIN_DETAILED_ANSWERS &&
           completionRate >= this.MIN_COMPLETION_RATE;
  }

  static calculateQualityScore(submission: QuestionnaireSubmission): number {
    let score = 0;
    
    // 完成度评分 (40分)
    score += this.calculateCompletionRate(submission) * 40;
    
    // 文本质量评分 (30分)  
    score += this.calculateTextQualityScore(submission);
    
    // 数据价值评分 (30分)
    score += this.calculateBusinessValueScore(submission);
    
    return Math.min(100, Math.round(score));
  }

  static isValidSubmission(submission: QuestionnaireSubmission): ValidationResult {
    const errors: string[] = [];
    
    // 检查必填字段
    for (const field of this.REQUIRED_FIELDS) {
      if (!this.hasValue(submission, field)) {
        errors.push(`Required field missing: ${field}`);
      }
    }
    
    // 检查数值范围
    if (!this.isValidRating(submission.userExperience.overallSatisfaction)) {
      errors.push('Overall satisfaction must be 1-5');
    }
    
    if (submission.businessValue.timeSavingPercentage < 0 || 
        submission.businessValue.timeSavingPercentage > 100) {
      errors.push('Time saving percentage must be 0-100');
    }
    
    return new ValidationResult(errors.length === 0, errors);
  }

  private static calculateTotalTextLength(submission: QuestionnaireSubmission): number {
    const textFields = [
      submission.userProfile.industry,
      submission.userProfile.location,
      submission.userExperience.mostUsefulFeature,
      submission.userExperience.mainPainPoint || '',
      submission.userExperience.improvementSuggestion || '',
      submission.optional.additionalFeedback || ''
    ];
    
    return textFields.join(' ').length;
  }

  private static countDetailedAnswers(submission: QuestionnaireSubmission): number {
    let count = 0;
    
    if ((submission.userExperience.mainPainPoint || '').length > 20) count++;
    if ((submission.userExperience.improvementSuggestion || '').length > 20) count++;
    if ((submission.optional.additionalFeedback || '').length > 30) count++;
    
    return count;
  }
}
```

### 3. 问卷领域服务
**文件**: `libs/shared-dtos/src/domains/questionnaire.service.ts`

```typescript
export class QuestionnaireDomainService {
  constructor(
    private readonly repository: IQuestionnaireRepository,
    private readonly templateService: IQuestionnaireTemplateService,
    private readonly eventBus: IDomainEventBus
  ) {}

  async submitQuestionnaire(
    rawData: RawSubmissionData,
    metadata: SubmissionMetadata
  ): Promise<QuestionnaireSubmissionResult> {
    // 获取当前问卷模板
    const template = await this.templateService.getCurrentTemplate();
    
    // 创建问卷聚合
    const questionnaire = Questionnaire.create(template.id, rawData, metadata);
    
    // 验证提交数据
    const validationResult = questionnaire.validateSubmission();
    if (!validationResult.isValid) {
      await this.publishValidationFailedEvent(questionnaire, validationResult);
      return QuestionnaireSubmissionResult.failed(validationResult.errors);
    }
    
    // 计算质量分数
    const qualityScore = questionnaire.calculateQualityScore();
    
    // 检查奖励资格
    const bonusEligible = questionnaire.isEligibleForBonus();
    
    // 保存问卷
    await this.repository.save(questionnaire);
    
    // 发布领域事件
    await this.publishQuestionnaireSubmittedEvent(questionnaire, qualityScore, bonusEligible);
    
    return QuestionnaireSubmissionResult.success({
      questionnaireId: questionnaire.getId().value,
      qualityScore: qualityScore.value,
      bonusEligible,
      summary: questionnaire.getSubmissionSummary()
    });
  }

  async analyzeSubmissionTrends(): Promise<SubmissionTrendsAnalysis> {
    const recentSubmissions = await this.repository.findRecent(30); // 最近30天
    
    return SubmissionTrendsAnalysis.create({
      totalSubmissions: recentSubmissions.length,
      averageQualityScore: this.calculateAverageQuality(recentSubmissions),
      bonusEligibilityRate: this.calculateBonusEligibilityRate(recentSubmissions),
      topPainPoints: this.extractTopPainPoints(recentSubmissions),
      averageWillingnessToPay: this.calculateAverageWTP(recentSubmissions),
      userSegmentation: this.segmentUsers(recentSubmissions)
    });
  }

  async validateIPSubmissionLimit(ip: string): Promise<IPSubmissionCheckResult> {
    const today = new Date();
    const todaySubmissions = await this.repository.findByIPAndDate(ip, today);
    
    const maxSubmissionsPerDay = 1; // 每IP每天最多1份问卷
    
    if (todaySubmissions.length >= maxSubmissionsPerDay) {
      return IPSubmissionCheckResult.blocked(
        `IP ${ip} has already submitted ${todaySubmissions.length} questionnaire(s) today`
      );
    }
    
    return IPSubmissionCheckResult.allowed();
  }

  private async publishQuestionnaireSubmittedEvent(
    questionnaire: Questionnaire,
    qualityScore: QualityScore,
    bonusEligible: boolean
  ): Promise<void> {
    const event = new QuestionnaireSubmittedEvent(
      questionnaire.getId().value,
      questionnaire.getSubmitterIP(),
      qualityScore.value,
      bonusEligible,
      new Date()
    );
    
    await this.eventBus.publish(event);
  }
}
```

### 4. 契约定义
**文件**: `libs/shared-dtos/src/contracts/questionnaire.contracts.ts`

```typescript
import { Requires, Ensures, Invariant } from '../contracts/dbc.decorators';

export class QuestionnaireContracts {
  
  @Requires(
    (rawData: RawSubmissionData, metadata: SubmissionMetadata) =>
      rawData && rawData.userProfile && rawData.userExperience && 
      rawData.businessValue && metadata && metadata.ip,
    'Submission must include required sections and metadata with IP'
  )
  @Ensures(
    (result: QuestionnaireSubmissionResult) =>
      result.success ? result.data.qualityScore >= 0 && result.data.qualityScore <= 100 : 
                      result.errors.length > 0,
    'Successful submission must have valid quality score, failed submission must have errors'
  )
  async submitQuestionnaire(
    rawData: RawSubmissionData,
    metadata: SubmissionMetadata
  ): Promise<QuestionnaireSubmissionResult> {
    // Contract-protected implementation
  }

  @Requires(
    (ip: string) => ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip),
    'IP address must be valid IPv4 format'
  )
  @Ensures(
    (result: IPSubmissionCheckResult) =>
      result.allowed || (result.blocked && result.reason.length > 0),
    'Result must be either allowed or blocked with reason'
  )
  async validateIPSubmissionLimit(ip: string): Promise<IPSubmissionCheckResult> {
    // Contract-protected implementation
  }
}
```

### 5. 领域事件
**文件**: `libs/shared-dtos/src/events/questionnaire-events.dto.ts`

```typescript
export class QuestionnaireSubmittedEvent implements DomainEvent {
  constructor(
    public readonly questionnaireId: string,
    public readonly submitterIP: string,
    public readonly qualityScore: number,
    public readonly bonusEligible: boolean,
    public readonly submissionData: SubmissionSummary,
    public readonly occurredAt: Date
  ) {}
}

export class HighQualitySubmissionEvent implements DomainEvent {
  constructor(
    public readonly questionnaireId: string,
    public readonly submitterIP: string,
    public readonly qualityScore: number,
    public readonly qualityReasons: string[],
    public readonly occurredAt: Date
  ) {}
}

export class QuestionnaireValidationFailedEvent implements DomainEvent {
  constructor(
    public readonly submitterIP: string,
    public readonly validationErrors: string[],
    public readonly submissionData: Partial<RawSubmissionData>,
    public readonly occurredAt: Date
  ) {}
}
```

## 🧪 测试规范

### 测试文件位置
`libs/shared-dtos/src/domains/__tests__/questionnaire.test.ts`

### 必需测试用例 (18个)

#### 问卷创建与验证 (8个)
1. **问卷创建测试**
   - 有效数据创建问卷成功
   - 缺少必填字段创建失败
   - 数据格式错误创建失败

2. **质量评估测试**
   - 高质量提交计算正确分数
   - 低质量提交计算正确分数
   - 奖励资格判断正确

#### 业务规则测试 (6个)
3. **验证规则测试**
   - 必填字段验证规则
   - 数值范围验证规则
   - 评分有效性验证规则

4. **质量规则测试**
   - 文本长度质量评分
   - 完成度质量评分
   - 商业价值质量评分

#### 领域服务测试 (4个)
5. **提交处理测试**
   - 有效提交处理成功
   - 无效提交处理失败
   - IP限制验证正确

6. **趋势分析测试**
   - 提交趋势分析正确
   - 用户画像分析准确

### 测试结构模板

```typescript
describe('Questionnaire Domain', () => {
  describe('Questionnaire Creation', () => {
    it('should create questionnaire with valid submission data', () => {
      // Given: complete valid submission data
      const rawData = createValidSubmissionData();
      const metadata = createValidMetadata();
      
      // When: creating questionnaire
      const questionnaire = Questionnaire.create('template-v1', rawData, metadata);
      
      // Then: questionnaire should be created successfully
      expect(questionnaire.getId()).toBeDefined();
      expect(questionnaire.validateSubmission().isValid).toBe(true);
    });

    it('should fail creation with missing required fields', () => {
      // Given: incomplete submission data
      const incompleteData = createIncompleteSubmissionData();
      const metadata = createValidMetadata();
      
      // When: creating questionnaire
      const questionnaire = Questionnaire.create('template-v1', incompleteData, metadata);
      
      // Then: validation should fail
      const validation = questionnaire.validateSubmission();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    // ... 16 more test cases
  });

  describe('Quality Assessment', () => {
    it('should calculate high quality score for detailed submission', () => {
      const questionnaire = createHighQualityQuestionnaire();
      
      const qualityScore = questionnaire.calculateQualityScore();
      
      expect(qualityScore.value).toBeGreaterThanOrEqual(70);
      expect(questionnaire.isEligibleForBonus()).toBe(true);
    });

    it('should calculate low quality score for minimal submission', () => {
      const questionnaire = createMinimalQuestionnaire();
      
      const qualityScore = questionnaire.calculateQualityScore();
      
      expect(qualityScore.value).toBeLessThan(70);
      expect(questionnaire.isEligibleForBonus()).toBe(false);
    });
  });

  describe('Business Rules', () => {
    it('should validate required fields correctly', () => {
      const incompleteSubmission = createSubmissionMissingRole();
      
      const result = QuestionnaireRules.isValidSubmission(incompleteSubmission);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Required field missing: userProfile.role');
    });
  });

  describe('Domain Service', () => {
    it('should submit questionnaire and calculate quality bonus', async () => {
      const service = new QuestionnaireDomainService(mockRepo, mockTemplate, mockBus);
      const rawData = createValidSubmissionData();
      const metadata = createValidMetadata();
      
      const result = await service.submitQuestionnaire(rawData, metadata);
      
      expect(result.success).toBe(true);
      expect(result.data.qualityScore).toBeGreaterThanOrEqual(0);
      expect(typeof result.data.bonusEligible).toBe('boolean');
    });
  });
});
```

## ✅ 验收标准

### 功能验收
- [ ] 问卷创建和验证逻辑正确
- [ ] 质量评估算法准确
- [ ] 奖励资格判断正确
- [ ] IP提交限制生效

### 质量验收
- [ ] 18个测试用例全部通过
- [ ] 代码覆盖率 ≥ 95%
- [ ] 业务规则正确封装
- [ ] 契约验证全部生效

### DDD原则验收
- [ ] 聚合边界清晰合理
- [ ] 值对象不可变性保证
- [ ] 领域服务职责单一
- [ ] 领域事件正确发布

## 🔗 接口定义 (为其他Agent提供)

```typescript
export interface IQuestionnaireDomainService {
  submitQuestionnaire(rawData: RawSubmissionData, metadata: SubmissionMetadata): Promise<QuestionnaireSubmissionResult>;
  validateIPSubmissionLimit(ip: string): Promise<IPSubmissionCheckResult>;
  analyzeSubmissionTrends(): Promise<SubmissionTrendsAnalysis>;
}

export interface IQuestionnaireRepository {
  save(questionnaire: Questionnaire): Promise<void>;
  findById(id: string): Promise<Questionnaire | null>;
  findByIPAndDate(ip: string, date: Date): Promise<Questionnaire[]>;
  findRecent(days: number): Promise<Questionnaire[]>;
}
```

## 🚀 完成信号
```
Agent-3 Questionnaire Domain Completed ✅
- Domain aggregates: 1 implemented
- Value objects: 6 implemented  
- Business rules: 8 rules implemented
- Domain events: 3 events implemented
- Contracts: 2 methods with validation
- Tests: 18/18 passing (97% coverage)
```