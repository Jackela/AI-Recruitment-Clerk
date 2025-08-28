import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CacheService } from '../cache/cache.service';

/**
 * 自学习优化模型 - 基于反馈和结果的自适应学习系统
 * 实现持续学习、模型自优化和智能参数调整
 */

export interface LearningConfiguration {
  learningRate: number;
  batchSize: number;
  epochs: number;
  validationSplit: number;
  earlyStoppingPatience: number;
  regularization: {
    l1: number;
    l2: number;
    dropout: number;
  };
  optimizationStrategy: 'sgd' | 'adam' | 'rmsprop' | 'adagrad';
  autoTuning: boolean;
  adaptiveRates: boolean;
}

export interface LearningMetrics {
  epoch: number;
  trainingLoss: number;
  validationLoss: number;
  trainingAccuracy: number;
  validationAccuracy: number;
  learningRate: number;
  gradientNorm: number;
  timestamp: Date;
  processingTime: number;
}

export interface ModelEvolution {
  generation: number;
  parentModels: string[];
  mutations: string[];
  fitness: number;
  accuracy: number;
  complexity: number;
  efficiency: number;
  timestamp: Date;
  isElite: boolean;
}

export interface OptimizationObjective {
  name: string;
  weight: number;
  target: 'maximize' | 'minimize';
  currentValue: number;
  targetValue: number;
  importance: 'low' | 'medium' | 'high' | 'critical';
}

export interface AdaptiveLearningState {
  currentPhase: 'exploration' | 'exploitation' | 'refinement' | 'stabilization';
  explorationRate: number;
  convergenceThreshold: number;
  performanceWindow: number[];
  adaptationTriggers: {
    performanceDrop: boolean;
    dataDistributionShift: boolean;
    userFeedbackChange: boolean;
    environmentChange: boolean;
  };
  learningSchedule: {
    nextOptimization: Date;
    frequency: number;
    priority: 'low' | 'medium' | 'high';
  };
}

@Injectable()
export class SelfLearningOptimizerService {
  private readonly logger = new Logger(SelfLearningOptimizerService.name);
  private learningConfig: LearningConfiguration;
  private learningHistory: LearningMetrics[] = [];
  private evolutionHistory: ModelEvolution[] = [];
  private optimizationObjectives = new Map<string, OptimizationObjective>();
  private adaptiveState: AdaptiveLearningState;
  
  private readonly PERFORMANCE_WINDOW_SIZE = 100;
  private readonly EVOLUTION_POOL_SIZE = 10;
  private readonly LEARNING_PATIENCE = 10;
  private readonly MIN_LEARNING_RATE = 0.0001;
  private readonly MAX_LEARNING_RATE = 0.1;
  
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService
  ) {
    this.logger.log('🧬 自学习优化器初始化');
    this.initializeLearningConfiguration();
    this.initializeAdaptiveState();
    this.initializeObjectives();
    this.startLearningCycle();
  }

  /**
   * 自适应学习 - 基于性能反馈调整学习策略
   */
  async adaptiveLearning(
    performanceMetrics: Record<string, number>,
    feedback: { accuracy: number; userSatisfaction: number; businessImpact: number }
  ): Promise<{
    learningAdjustments: Record<string, any>;
    predictedImprovement: number;
    recommendedActions: string[];
    confidence: number;
  }> {
    try {
      // 分析性能趋势
      const performanceTrend = this.analyzePerformanceTrend(performanceMetrics);
      
      // 检测数据分布变化
      const distributionShift = await this.detectDistributionShift(performanceMetrics);
      
      // 评估学习效果
      const learningEffectiveness = this.evaluateLearningEffectiveness(feedback);
      
      // 自适应调整学习参数
      const adjustments = this.calculateLearningAdjustments(
        performanceTrend,
        distributionShift,
        learningEffectiveness
      );
      
      // 应用调整
      await this.applyLearningAdjustments(adjustments);
      
      // 预测改进效果
      const predictedImprovement = this.predictImprovementImpact(adjustments);
      
      // 生成推荐行动
      const recommendedActions = this.generateLearningRecommendations(adjustments);
      
      // 更新自适应状态
      this.updateAdaptiveState(performanceTrend, distributionShift, learningEffectiveness);
      
      const result = {
        learningAdjustments: adjustments,
        predictedImprovement,
        recommendedActions,
        confidence: this.calculateLearningConfidence(adjustments)
      };
      
      this.eventEmitter.emit('learning.adapted', {
        adjustments,
        improvement: predictedImprovement,
        phase: this.adaptiveState.currentPhase
      });
      
      this.logger.log(`🎯 自适应学习完成: 预期改进 ${(predictedImprovement * 100).toFixed(1)}%`);
      
      return result;
      
    } catch (error) {
      this.logger.error(`❌ 自适应学习失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 模型进化 - 遗传算法优化模型架构
   */
  async evolveModels(): Promise<{
    newGeneration: ModelEvolution[];
    bestPerformer: ModelEvolution;
    evolutionStats: {
      averageFitness: number;
      diversityIndex: number;
      convergenceRate: number;
    };
    mutations: string[];
  }> {
    try {
      this.logger.log('🧬 开始模型进化过程');
      
      // 评估当前模型群体
      const currentGeneration = await this.evaluateCurrentGeneration();
      
      // 选择精英个体
      const elites = this.selectElites(currentGeneration);
      
      // 交叉繁殖
      const offspring = await this.crossoverBreeding(elites);
      
      // 变异操作
      const mutated = await this.performMutations(offspring);
      
      // 环境选择
      const newGeneration = this.environmentalSelection([...elites, ...mutated]);
      
      // 评估新一代性能
      const evaluatedGeneration = await this.evaluateGeneration(newGeneration);
      
      // 计算进化统计
      const evolutionStats = this.calculateEvolutionStats(evaluatedGeneration);
      
      // 找出最佳执行者
      const bestPerformer = evaluatedGeneration.reduce((best, current) =>
        current.fitness > best.fitness ? current : best
      );
      
      // 更新进化历史
      this.evolutionHistory.push(...evaluatedGeneration);
      this.pruneEvolutionHistory();
      
      const mutations = mutated.map(m => m.mutations).flat();
      
      this.eventEmitter.emit('models.evolved', {
        generation: bestPerformer.generation,
        fitness: bestPerformer.fitness,
        improvements: evolutionStats.averageFitness
      });
      
      this.logger.log(`✨ 模型进化完成: 第${bestPerformer.generation}代，适应度 ${bestPerformer.fitness.toFixed(3)}`);
      
      return {
        newGeneration: evaluatedGeneration,
        bestPerformer,
        evolutionStats,
        mutations
      };
      
    } catch (error) {
      this.logger.error(`❌ 模型进化失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 超参数自动调优
   */
  async autoTuneHyperparameters(
    targetMetrics: Record<string, number>
  ): Promise<{
    optimizedParameters: Record<string, any>;
    improvementScore: number;
    tuningHistory: Array<{
      parameters: Record<string, any>;
      performance: number;
      timestamp: Date;
    }>;
    recommendations: string[];
  }> {
    try {
      this.logger.log('🎛️ 开始超参数自动调优');
      
      // 定义搜索空间
      const searchSpace = this.defineHyperparameterSearchSpace();
      
      // 贝叶斯优化搜索
      const optimizationResults = await this.bayesianOptimization(searchSpace, targetMetrics);
      
      // 网格搜索验证
      const gridSearchResults = await this.gridSearchValidation(
        optimizationResults.candidates, 
        targetMetrics
      );
      
      // 随机搜索探索
      const randomSearchResults = await this.randomSearchExploration(
        searchSpace, 
        targetMetrics
      );
      
      // 集成优化结果
      const bestParameters = this.integrateOptimizationResults([
        optimizationResults,
        gridSearchResults,
        randomSearchResults
      ]);
      
      // 验证优化效果
      const validationResults = await this.validateTuningResults(bestParameters, targetMetrics);
      
      // 应用最优参数
      await this.applyOptimizedParameters(bestParameters);
      
      // 计算改进分数
      const improvementScore = this.calculateImprovementScore(
        validationResults.beforeMetrics,
        validationResults.afterMetrics
      );
      
      // 生成调优建议
      const recommendations = this.generateTuningRecommendations(
        bestParameters,
        improvementScore,
        validationResults
      );
      
      const result = {
        optimizedParameters: bestParameters,
        improvementScore,
        tuningHistory: [...optimizationResults.history, ...gridSearchResults.history, ...randomSearchResults.history],
        recommendations
      };
      
      this.eventEmitter.emit('hyperparameters.tuned', {
        parameters: bestParameters,
        improvement: improvementScore
      });
      
      this.logger.log(`⚡ 超参数调优完成: 性能提升 ${(improvementScore * 100).toFixed(1)}%`);
      
      return result;
      
    } catch (error) {
      this.logger.error(`❌ 超参数调优失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取学习状态报告
   */
  getLearningStatus(): {
    currentPhase: string;
    learningProgress: {
      accuracy: number;
      loss: number;
      epoch: number;
      improvementRate: number;
    };
    adaptiveState: AdaptiveLearningState;
    evolutionStatus: {
      generation: number;
      averageFitness: number;
      bestFitness: number;
      diversityIndex: number;
    };
    optimizationObjectives: Array<OptimizationObjective & { progress: number }>;
    recommendations: string[];
  } {
    const recentMetrics = this.learningHistory.slice(-10);
    const recentEvolution = this.evolutionHistory.slice(-this.EVOLUTION_POOL_SIZE);
    
    // 计算学习进度
    const latestMetrics = recentMetrics[recentMetrics.length - 1];
    const improvementRate = recentMetrics.length > 1
      ? (latestMetrics?.trainingAccuracy || 0) - (recentMetrics[0]?.trainingAccuracy || 0)
      : 0;
    
    // 计算进化状态
    const averageFitness = recentEvolution.length > 0
      ? recentEvolution.reduce((sum, evo) => sum + evo.fitness, 0) / recentEvolution.length
      : 0;
    
    const bestFitness = recentEvolution.length > 0
      ? Math.max(...recentEvolution.map(evo => evo.fitness))
      : 0;
    
    const diversityIndex = this.calculateDiversityIndex(recentEvolution);
    
    // 计算目标进度
    const objectivesWithProgress = Array.from(this.optimizationObjectives.values()).map(obj => ({
      ...obj,
      progress: obj.targetValue !== 0 ? obj.currentValue / obj.targetValue : 0
    }));
    
    // 生成当前建议
    const recommendations = this.generateCurrentRecommendations();
    
    return {
      currentPhase: this.adaptiveState.currentPhase,
      learningProgress: {
        accuracy: latestMetrics?.trainingAccuracy || 0,
        loss: latestMetrics?.trainingLoss || 0,
        epoch: latestMetrics?.epoch || 0,
        improvementRate
      },
      adaptiveState: this.adaptiveState,
      evolutionStatus: {
        generation: recentEvolution[recentEvolution.length - 1]?.generation || 0,
        averageFitness,
        bestFitness,
        diversityIndex
      },
      optimizationObjectives: objectivesWithProgress,
      recommendations
    };
  }

  // ========== 私有方法实现 ==========

  private initializeLearningConfiguration(): void {
    this.learningConfig = {
      learningRate: 0.01,
      batchSize: 32,
      epochs: 100,
      validationSplit: 0.2,
      earlyStoppingPatience: 10,
      regularization: {
        l1: 0.01,
        l2: 0.01,
        dropout: 0.2
      },
      optimizationStrategy: 'adam',
      autoTuning: true,
      adaptiveRates: true
    };
  }

  private initializeAdaptiveState(): void {
    this.adaptiveState = {
      currentPhase: 'exploration',
      explorationRate: 0.3,
      convergenceThreshold: 0.001,
      performanceWindow: [],
      adaptationTriggers: {
        performanceDrop: false,
        dataDistributionShift: false,
        userFeedbackChange: false,
        environmentChange: false
      },
      learningSchedule: {
        nextOptimization: new Date(Date.now() + 60 * 60 * 1000), // 1小时后
        frequency: 60, // 分钟
        priority: 'medium'
      }
    };
  }

  private initializeObjectives(): void {
    const objectives: Array<[string, OptimizationObjective]> = [
      ['accuracy', {
        name: 'Model Accuracy',
        weight: 0.4,
        target: 'maximize',
        currentValue: 0.85,
        targetValue: 0.95,
        importance: 'critical'
      }],
      ['response_time', {
        name: 'Response Time',
        weight: 0.3,
        target: 'minimize',
        currentValue: 200,
        targetValue: 100,
        importance: 'high'
      }],
      ['memory_usage', {
        name: 'Memory Usage',
        weight: 0.2,
        target: 'minimize',
        currentValue: 512,
        targetValue: 256,
        importance: 'medium'
      }],
      ['user_satisfaction', {
        name: 'User Satisfaction',
        weight: 0.1,
        target: 'maximize',
        currentValue: 0.7,
        targetValue: 0.9,
        importance: 'high'
      }]
    ];
    
    objectives.forEach(([name, obj]) => {
      this.optimizationObjectives.set(name, obj);
    });
  }

  private startLearningCycle(): void {
    // 每30分钟进行自适应学习检查
    setInterval(async () => {
      await this.performRoutineLearningCheck();
    }, 30 * 60 * 1000);
    
    // 每2小时进行模型进化
    setInterval(async () => {
      await this.performEvolutionCycle();
    }, 2 * 60 * 60 * 1000);
    
    // 每天进行超参数调优
    setInterval(async () => {
      await this.performHyperparameterTuning();
    }, 24 * 60 * 60 * 1000);
  }

  private async performRoutineLearningCheck(): Promise<void> {
    try {
      // 获取当前性能指标
      const currentMetrics = await this.getCurrentPerformanceMetrics();
      
      // 模拟用户反馈
      const feedback = {
        accuracy: currentMetrics.accuracy || 0.8,
        userSatisfaction: 0.75 + Math.random() * 0.2,
        businessImpact: 0.7 + Math.random() * 0.2
      };
      
      // 执行自适应学习
      await this.adaptiveLearning(currentMetrics, feedback);
      
    } catch (error) {
      this.logger.error('定期学习检查失败:', error);
    }
  }

  private async performEvolutionCycle(): Promise<void> {
    try {
      if (this.adaptiveState.currentPhase === 'exploration' || 
          this.adaptiveState.currentPhase === 'refinement') {
        await this.evolveModels();
      }
    } catch (error) {
      this.logger.error('进化周期失败:', error);
    }
  }

  private async performHyperparameterTuning(): Promise<void> {
    try {
      const targetMetrics = {
        accuracy: 0.95,
        response_time: 100,
        memory_usage: 256
      };
      
      await this.autoTuneHyperparameters(targetMetrics);
      
    } catch (error) {
      this.logger.error('超参数调优失败:', error);
    }
  }

  private analyzePerformanceTrend(metrics: Record<string, number>): 'improving' | 'declining' | 'stable' | 'volatile' {
    // 更新性能窗口
    this.adaptiveState.performanceWindow.push(metrics.accuracy || 0);
    if (this.adaptiveState.performanceWindow.length > this.PERFORMANCE_WINDOW_SIZE) {
      this.adaptiveState.performanceWindow.shift();
    }
    
    if (this.adaptiveState.performanceWindow.length < 10) {
      return 'stable';
    }
    
    const recent = this.adaptiveState.performanceWindow.slice(-10);
    const older = this.adaptiveState.performanceWindow.slice(-20, -10);
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((sum, val) => sum + val, 0) / older.length : recentAvg;
    
    const change = recentAvg - olderAvg;
    const volatility = this.calculateVolatility(recent);
    
    if (volatility > 0.1) return 'volatile';
    if (change > 0.02) return 'improving';
    if (change < -0.02) return 'declining';
    return 'stable';
  }

  private async detectDistributionShift(metrics: Record<string, number>): Promise<boolean> {
    // 简化的数据分布变化检测
    const historicalMean = this.adaptiveState.performanceWindow.length > 0
      ? this.adaptiveState.performanceWindow.reduce((sum, val) => sum + val, 0) / this.adaptiveState.performanceWindow.length
      : 0.5;
    
    const currentValue = metrics.accuracy || 0.5;
    const deviation = Math.abs(currentValue - historicalMean);
    
    return deviation > 0.1; // 如果偏差超过10%认为是分布变化
  }

  private evaluateLearningEffectiveness(feedback: { accuracy: number; userSatisfaction: number; businessImpact: number }): number {
    // 综合评估学习效果
    const accuracyScore = feedback.accuracy;
    const satisfactionScore = feedback.userSatisfaction;
    const impactScore = feedback.businessImpact;
    
    return (accuracyScore * 0.5 + satisfactionScore * 0.3 + impactScore * 0.2);
  }

  private calculateLearningAdjustments(
    trend: 'improving' | 'declining' | 'stable' | 'volatile',
    distributionShift: boolean,
    effectiveness: number
  ): Record<string, any> {
    const adjustments: Record<string, any> = {};
    
    // 基于趋势调整学习率
    switch (trend) {
      case 'improving':
        adjustments.learningRate = Math.min(this.learningConfig.learningRate * 1.1, this.MAX_LEARNING_RATE);
        adjustments.explorationRate = Math.max(this.adaptiveState.explorationRate * 0.9, 0.1);
        break;
      case 'declining':
        adjustments.learningRate = Math.max(this.learningConfig.learningRate * 0.8, this.MIN_LEARNING_RATE);
        adjustments.explorationRate = Math.min(this.adaptiveState.explorationRate * 1.2, 0.5);
        break;
      case 'volatile':
        adjustments.learningRate = Math.max(this.learningConfig.learningRate * 0.5, this.MIN_LEARNING_RATE);
        adjustments.regularizationL2 = Math.min(this.learningConfig.regularization.l2 * 1.5, 0.1);
        break;
      case 'stable':
        // 保持当前参数
        break;
    }
    
    // 基于分布变化调整
    if (distributionShift) {
      adjustments.adaptiveLearning = true;
      adjustments.retrainingRequired = true;
      adjustments.dataAugmentation = true;
    }
    
    // 基于效果调整批次大小
    if (effectiveness < 0.6) {
      adjustments.batchSize = Math.max(this.learningConfig.batchSize / 2, 8);
      adjustments.validationFrequency = 'high';
    } else if (effectiveness > 0.8) {
      adjustments.batchSize = Math.min(this.learningConfig.batchSize * 1.5, 128);
      adjustments.validationFrequency = 'normal';
    }
    
    return adjustments;
  }

  private async applyLearningAdjustments(adjustments: Record<string, any>): Promise<void> {
    // 应用学习率调整
    if (adjustments.learningRate) {
      this.learningConfig.learningRate = adjustments.learningRate;
    }
    
    // 应用探索率调整
    if (adjustments.explorationRate) {
      this.adaptiveState.explorationRate = adjustments.explorationRate;
    }
    
    // 应用正则化调整
    if (adjustments.regularizationL2) {
      this.learningConfig.regularization.l2 = adjustments.regularizationL2;
    }
    
    // 应用批次大小调整
    if (adjustments.batchSize) {
      this.learningConfig.batchSize = adjustments.batchSize;
    }
    
    // 更新学习阶段
    this.updateLearningPhase(adjustments);
    
    this.logger.debug('学习参数调整已应用', adjustments);
  }

  private predictImprovementImpact(adjustments: Record<string, any>): number {
    // 预测调整对性能的影响
    let predictedImprovement = 0;
    
    if (adjustments.learningRate) {
      const lrChange = adjustments.learningRate / this.learningConfig.learningRate;
      predictedImprovement += Math.log(lrChange) * 0.1;
    }
    
    if (adjustments.explorationRate) {
      const exploreChange = adjustments.explorationRate / this.adaptiveState.explorationRate;
      predictedImprovement += (exploreChange - 1) * 0.05;
    }
    
    if (adjustments.batchSize) {
      const batchChange = adjustments.batchSize / this.learningConfig.batchSize;
      predictedImprovement += Math.log(batchChange) * 0.03;
    }
    
    return Math.max(0, Math.min(1, predictedImprovement + 0.05)); // 5%基础改进
  }

  private generateLearningRecommendations(adjustments: Record<string, any>): string[] {
    const recommendations: string[] = [];
    
    if (adjustments.learningRate) {
      const change = adjustments.learningRate / this.learningConfig.learningRate;
      if (change > 1.05) {
        recommendations.push('学习率已提高以加快收敛');
      } else if (change < 0.95) {
        recommendations.push('学习率已降低以提高稳定性');
      }
    }
    
    if (adjustments.explorationRate) {
      const change = adjustments.explorationRate / this.adaptiveState.explorationRate;
      if (change > 1.05) {
        recommendations.push('增加探索以寻找更好的解决方案');
      } else if (change < 0.95) {
        recommendations.push('减少探索以专注于已知良好解决方案');
      }
    }
    
    if (adjustments.retrainingRequired) {
      recommendations.push('检测到数据分布变化，建议重新训练模型');
    }
    
    if (adjustments.dataAugmentation) {
      recommendations.push('建议启用数据增强以提高泛化能力');
    }
    
    return recommendations;
  }

  private updateAdaptiveState(
    trend: 'improving' | 'declining' | 'stable' | 'volatile',
    distributionShift: boolean,
    effectiveness: number
  ): void {
    // 更新适应触发器
    this.adaptiveState.adaptationTriggers.performanceDrop = trend === 'declining';
    this.adaptiveState.adaptationTriggers.dataDistributionShift = distributionShift;
    this.adaptiveState.adaptationTriggers.userFeedbackChange = effectiveness < 0.6;
    
    // 更新学习阶段
    if (trend === 'declining' || distributionShift) {
      this.adaptiveState.currentPhase = 'exploration';
    } else if (trend === 'improving' && effectiveness > 0.8) {
      this.adaptiveState.currentPhase = 'exploitation';
    } else if (trend === 'stable' && effectiveness > 0.7) {
      this.adaptiveState.currentPhase = 'refinement';
    } else if (trend === 'volatile') {
      this.adaptiveState.currentPhase = 'stabilization';
    }
  }

  private calculateLearningConfidence(adjustments: Record<string, any>): number {
    const adjustmentCount = Object.keys(adjustments).length;
    const significantAdjustments = Object.values(adjustments).filter(val => 
      typeof val === 'number' && Math.abs(val - 1) > 0.1
    ).length;
    
    // 基于调整的数量和幅度计算置信度
    const confidenceBase = 0.7;
    const adjustmentFactor = Math.min(adjustmentCount / 5, 0.2);
    const significanceFactor = Math.min(significantAdjustments / 3, 0.1);
    
    return confidenceBase + adjustmentFactor + significanceFactor;
  }

  // 进化相关方法
  private async evaluateCurrentGeneration(): Promise<ModelEvolution[]> {
    // 模拟当前模型群体评估
    const currentModels: ModelEvolution[] = [];
    
    for (let i = 0; i < this.EVOLUTION_POOL_SIZE; i++) {
      currentModels.push({
        generation: this.getCurrentGeneration(),
        parentModels: [`model_${i}`],
        mutations: [],
        fitness: 0.7 + Math.random() * 0.2,
        accuracy: 0.8 + Math.random() * 0.15,
        complexity: Math.random(),
        efficiency: Math.random(),
        timestamp: new Date(),
        isElite: false
      });
    }
    
    return currentModels;
  }

  private selectElites(generation: ModelEvolution[]): ModelEvolution[] {
    const sortedByFitness = generation.sort((a, b) => b.fitness - a.fitness);
    const eliteCount = Math.ceil(generation.length * 0.3); // 30%精英
    
    return sortedByFitness.slice(0, eliteCount).map(model => ({
      ...model,
      isElite: true
    }));
  }

  private async crossoverBreeding(elites: ModelEvolution[]): Promise<ModelEvolution[]> {
    const offspring: ModelEvolution[] = [];
    const targetOffspringCount = Math.floor(this.EVOLUTION_POOL_SIZE * 0.5);
    
    for (let i = 0; i < targetOffspringCount; i++) {
      const parent1 = elites[Math.floor(Math.random() * elites.length)];
      const parent2 = elites[Math.floor(Math.random() * elites.length)];
      
      const child: ModelEvolution = {
        generation: this.getCurrentGeneration() + 1,
        parentModels: [parent1.parentModels[0], parent2.parentModels[0]],
        mutations: [],
        fitness: (parent1.fitness + parent2.fitness) / 2 + (Math.random() - 0.5) * 0.1,
        accuracy: (parent1.accuracy + parent2.accuracy) / 2 + (Math.random() - 0.5) * 0.05,
        complexity: (parent1.complexity + parent2.complexity) / 2,
        efficiency: (parent1.efficiency + parent2.efficiency) / 2,
        timestamp: new Date(),
        isElite: false
      };
      
      offspring.push(child);
    }
    
    return offspring;
  }

  private async performMutations(individuals: ModelEvolution[]): Promise<ModelEvolution[]> {
    const mutationRate = 0.1;
    const mutated: ModelEvolution[] = [];
    
    for (const individual of individuals) {
      if (Math.random() < mutationRate) {
        const mutatedIndividual: ModelEvolution = {
          ...individual,
          mutations: this.generateMutations(),
          fitness: individual.fitness + (Math.random() - 0.5) * 0.2,
          accuracy: Math.max(0, Math.min(1, individual.accuracy + (Math.random() - 0.5) * 0.1)),
          timestamp: new Date()
        };
        
        mutated.push(mutatedIndividual);
      } else {
        mutated.push(individual);
      }
    }
    
    return mutated;
  }

  private environmentalSelection(population: ModelEvolution[]): ModelEvolution[] {
    // 多目标选择：适应度、准确性、效率
    const scored = population.map(individual => ({
      individual,
      score: individual.fitness * 0.5 + individual.accuracy * 0.3 + individual.efficiency * 0.2
    }));
    
    scored.sort((a, b) => b.score - a.score);
    
    return scored.slice(0, this.EVOLUTION_POOL_SIZE).map(item => item.individual);
  }

  private async evaluateGeneration(generation: ModelEvolution[]): Promise<ModelEvolution[]> {
    // 重新评估个体适应度
    return generation.map(individual => ({
      ...individual,
      fitness: this.calculateFitness(individual),
      timestamp: new Date()
    }));
  }

  private calculateEvolutionStats(generation: ModelEvolution[]): {
    averageFitness: number;
    diversityIndex: number;
    convergenceRate: number;
  } {
    const averageFitness = generation.reduce((sum, ind) => sum + ind.fitness, 0) / generation.length;
    const diversityIndex = this.calculateDiversityIndex(generation);
    const convergenceRate = this.calculateConvergenceRate(generation);
    
    return { averageFitness, diversityIndex, convergenceRate };
  }

  private getCurrentGeneration(): number {
    return this.evolutionHistory.length > 0
      ? Math.max(...this.evolutionHistory.map(evo => evo.generation))
      : 0;
  }

  private generateMutations(): string[] {
    const possibleMutations = [
      'learning_rate_adjustment',
      'layer_size_modification',
      'activation_function_change',
      'regularization_adjustment',
      'dropout_modification',
      'batch_norm_addition',
      'skip_connection_addition'
    ];
    
    const mutationCount = 1 + Math.floor(Math.random() * 3);
    const mutations: string[] = [];
    
    for (let i = 0; i < mutationCount; i++) {
      const mutation = possibleMutations[Math.floor(Math.random() * possibleMutations.length)];
      if (!mutations.includes(mutation)) {
        mutations.push(mutation);
      }
    }
    
    return mutations;
  }

  private calculateFitness(individual: ModelEvolution): number {
    // 多目标适应度计算
    const accuracyWeight = 0.4;
    const efficiencyWeight = 0.3;
    const complexityPenalty = 0.2;
    const diversityBonus = 0.1;
    
    let fitness = individual.accuracy * accuracyWeight + 
                 individual.efficiency * efficiencyWeight - 
                 individual.complexity * complexityPenalty;
    
    // 多样性奖励
    const diversityFactor = 1 - (individual.parentModels.length > 1 ? 0 : 0.1);
    fitness += diversityFactor * diversityBonus;
    
    return Math.max(0, Math.min(1, fitness));
  }

  private calculateDiversityIndex(population: ModelEvolution[]): number {
    if (population.length < 2) return 0;
    
    let totalDistance = 0;
    let pairCount = 0;
    
    for (let i = 0; i < population.length; i++) {
      for (let j = i + 1; j < population.length; j++) {
        const distance = Math.sqrt(
          Math.pow(population[i].fitness - population[j].fitness, 2) +
          Math.pow(population[i].accuracy - population[j].accuracy, 2) +
          Math.pow(population[i].complexity - population[j].complexity, 2)
        );
        totalDistance += distance;
        pairCount++;
      }
    }
    
    return pairCount > 0 ? totalDistance / pairCount : 0;
  }

  private calculateConvergenceRate(generation: ModelEvolution[]): number {
    if (this.evolutionHistory.length < 10) return 0;
    
    const recentHistory = this.evolutionHistory.slice(-10);
    const fitnessValues = recentHistory.map(evo => evo.fitness);
    
    const firstHalf = fitnessValues.slice(0, 5);
    const secondHalf = fitnessValues.slice(5);
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    return Math.abs(secondAvg - firstAvg) / Math.max(firstAvg, 0.001);
  }

  private pruneEvolutionHistory(): void {
    if (this.evolutionHistory.length > 1000) {
      this.evolutionHistory = this.evolutionHistory.slice(-500);
    }
  }

  // 超参数调优相关方法
  private defineHyperparameterSearchSpace(): Record<string, any> {
    return {
      learningRate: { type: 'log', min: 0.0001, max: 0.1 },
      batchSize: { type: 'choice', values: [8, 16, 32, 64, 128] },
      l1Regularization: { type: 'uniform', min: 0, max: 0.1 },
      l2Regularization: { type: 'uniform', min: 0, max: 0.1 },
      dropout: { type: 'uniform', min: 0.1, max: 0.5 },
      epochs: { type: 'int', min: 50, max: 200 }
    };
  }

  private async bayesianOptimization(searchSpace: Record<string, any>, targetMetrics: Record<string, number>): Promise<any> {
    // 简化的贝叶斯优化实现
    const iterations = 20;
    const results: Array<{ parameters: any; performance: number; timestamp: Date }> = [];
    
    for (let i = 0; i < iterations; i++) {
      const parameters = this.sampleFromSearchSpace(searchSpace);
      const performance = await this.evaluateParameters(parameters, targetMetrics);
      
      results.push({
        parameters,
        performance,
        timestamp: new Date()
      });
    }
    
    const bestResult = results.reduce((best, current) => 
      current.performance > best.performance ? current : best
    );
    
    return {
      candidates: [bestResult.parameters],
      history: results
    };
  }

  private async gridSearchValidation(candidates: any[], targetMetrics: Record<string, number>): Promise<any> {
    const results: Array<{ parameters: any; performance: number; timestamp: Date }> = [];
    
    for (const candidate of candidates) {
      // 在候选参数周围进行网格搜索
      const variations = this.generateParameterVariations(candidate);
      
      for (const variation of variations) {
        const performance = await this.evaluateParameters(variation, targetMetrics);
        results.push({
          parameters: variation,
          performance,
          timestamp: new Date()
        });
      }
    }
    
    return { history: results };
  }

  private async randomSearchExploration(searchSpace: Record<string, any>, targetMetrics: Record<string, number>): Promise<any> {
    const iterations = 10;
    const results: Array<{ parameters: any; performance: number; timestamp: Date }> = [];
    
    for (let i = 0; i < iterations; i++) {
      const parameters = this.sampleFromSearchSpace(searchSpace);
      const performance = await this.evaluateParameters(parameters, targetMetrics);
      
      results.push({
        parameters,
        performance,
        timestamp: new Date()
      });
    }
    
    return { history: results };
  }

  private integrateOptimizationResults(results: any[]): Record<string, any> {
    // 整合所有优化结果，选择最佳参数组合
    const allResults = results.flatMap(r => r.history || []);
    
    if (allResults.length === 0) {
      return this.learningConfig;
    }
    
    const bestResult = allResults.reduce((best, current) => 
      current.performance > best.performance ? current : best
    );
    
    return bestResult.parameters;
  }

  private async validateTuningResults(parameters: Record<string, any>, targetMetrics: Record<string, number>): Promise<any> {
    const beforeMetrics = await this.getCurrentPerformanceMetrics();
    
    // 暂时应用参数进行测试
    const originalConfig = { ...this.learningConfig };
    Object.assign(this.learningConfig, parameters);
    
    const afterMetrics = await this.evaluateParameters(parameters, targetMetrics);
    
    // 恢复原配置用于比较
    this.learningConfig = originalConfig;
    
    return {
      beforeMetrics,
      afterMetrics,
      improvement: afterMetrics - (beforeMetrics.accuracy || 0.5)
    };
  }

  private async applyOptimizedParameters(parameters: Record<string, any>): Promise<void> {
    Object.assign(this.learningConfig, parameters);
    
    this.eventEmitter.emit('hyperparameters.applied', {
      parameters,
      timestamp: new Date()
    });
    
    this.logger.log('最优超参数已应用');
  }

  private calculateImprovementScore(beforeMetrics: any, afterMetrics: any): number {
    const before = beforeMetrics.accuracy || 0.5;
    const after = afterMetrics || 0.5;
    
    return Math.max(0, (after - before) / Math.max(before, 0.001));
  }

  private generateTuningRecommendations(
    parameters: Record<string, any>, 
    improvement: number, 
    validation: any
  ): string[] {
    const recommendations: string[] = [];
    
    if (improvement > 0.1) {
      recommendations.push('超参数调优显著提升了模型性能');
    } else if (improvement > 0.05) {
      recommendations.push('超参数调优带来了适度的性能提升');
    } else {
      recommendations.push('当前超参数已接近最优，建议关注数据质量和特征工程');
    }
    
    if (parameters.learningRate && parameters.learningRate < 0.001) {
      recommendations.push('学习率较低，训练时间可能较长但更稳定');
    }
    
    if (parameters.dropout && parameters.dropout > 0.3) {
      recommendations.push('较高的Dropout率有助于防止过拟合');
    }
    
    return recommendations;
  }

  // 工具方法
  private sampleFromSearchSpace(searchSpace: Record<string, any>): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    for (const [param, config] of Object.entries(searchSpace)) {
      switch (config.type) {
        case 'log':
          parameters[param] = Math.exp(Math.random() * (Math.log(config.max) - Math.log(config.min)) + Math.log(config.min));
          break;
        case 'uniform':
          parameters[param] = Math.random() * (config.max - config.min) + config.min;
          break;
        case 'int':
          parameters[param] = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
          break;
        case 'choice':
          parameters[param] = config.values[Math.floor(Math.random() * config.values.length)];
          break;
      }
    }
    
    return parameters;
  }

  private generateParameterVariations(baseParameters: Record<string, any>): Record<string, any>[] {
    const variations: Record<string, any>[] = [];
    
    // 为每个参数生成小范围变化
    for (const [param, value] of Object.entries(baseParameters)) {
      if (typeof value === 'number') {
        const variation1 = { ...baseParameters };
        const variation2 = { ...baseParameters };
        
        variation1[param] = value * 1.1;
        variation2[param] = value * 0.9;
        
        variations.push(variation1, variation2);
      }
    }
    
    return variations.slice(0, 6); // 限制变化数量
  }

  private async evaluateParameters(parameters: Record<string, any>, targetMetrics: Record<string, number>): Promise<number> {
    // 模拟参数评估 - 实际项目中应该运行真实的训练和验证
    let score = 0.5; // 基础分数
    
    // 学习率影响
    if (parameters.learningRate) {
      const optimalLR = 0.01;
      const lrFactor = 1 - Math.abs(Math.log10(parameters.learningRate / optimalLR)) / 2;
      score += lrFactor * 0.2;
    }
    
    // 批次大小影响
    if (parameters.batchSize) {
      const optimalBatch = 32;
      const batchFactor = 1 - Math.abs(parameters.batchSize - optimalBatch) / optimalBatch;
      score += batchFactor * 0.1;
    }
    
    // 正则化影响
    if (parameters.l2Regularization) {
      const regFactor = 1 - Math.abs(parameters.l2Regularization - 0.01) / 0.01;
      score += regFactor * 0.1;
    }
    
    // 添加噪音模拟现实的不确定性
    score += (Math.random() - 0.5) * 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  private async getCurrentPerformanceMetrics(): Promise<Record<string, number>> {
    // 模拟获取当前性能指标
    return {
      accuracy: 0.85 + Math.random() * 0.1,
      loss: 0.2 + Math.random() * 0.1,
      precision: 0.83 + Math.random() * 0.1,
      recall: 0.87 + Math.random() * 0.1,
      f1Score: 0.85 + Math.random() * 0.1
    };
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private updateLearningPhase(adjustments: Record<string, any>): void {
    if (adjustments.retrainingRequired) {
      this.adaptiveState.currentPhase = 'exploration';
    } else if (adjustments.learningRate && adjustments.learningRate > this.learningConfig.learningRate) {
      this.adaptiveState.currentPhase = 'exploitation';
    } else if (adjustments.regularizationL2) {
      this.adaptiveState.currentPhase = 'stabilization';
    }
  }

  private generateCurrentRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // 基于当前阶段生成建议
    switch (this.adaptiveState.currentPhase) {
      case 'exploration':
        recommendations.push('当前处于探索阶段，建议尝试更多样化的参数设置');
        break;
      case 'exploitation':
        recommendations.push('模型表现良好，建议专注于当前最优策略');
        break;
      case 'refinement':
        recommendations.push('进入精调阶段，建议微调关键参数');
        break;
      case 'stabilization':
        recommendations.push('模型需要稳定化，建议增强正则化');
        break;
    }
    
    // 基于性能窗口生成建议
    if (this.adaptiveState.performanceWindow.length > 0) {
      const recentPerformance = this.adaptiveState.performanceWindow.slice(-5);
      const avgPerformance = recentPerformance.reduce((sum, val) => sum + val, 0) / recentPerformance.length;
      
      if (avgPerformance < 0.7) {
        recommendations.push('近期性能下降，建议检查数据质量和模型配置');
      } else if (avgPerformance > 0.9) {
        recommendations.push('性能优秀，建议保持当前配置或考虑更具挑战性的任务');
      }
    }
    
    return recommendations;
  }

  /**
   * 定时任务 - 定期性能检查和优化
   */
  @Cron(CronExpression.EVERY_HOUR)
  async performScheduledOptimization(): Promise<void> {
    try {
      const currentTime = new Date();
      
      if (currentTime >= this.adaptiveState.learningSchedule.nextOptimization) {
        this.logger.log('🔄 执行定时学习优化');
        
        await this.performRoutineLearningCheck();
        
        // 更新下次优化时间
        this.adaptiveState.learningSchedule.nextOptimization = new Date(
          currentTime.getTime() + this.adaptiveState.learningSchedule.frequency * 60 * 1000
        );
      }
    } catch (error) {
      this.logger.error('定时优化失败:', error);
    }
  }
}