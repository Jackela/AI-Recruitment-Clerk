import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 自适应决策协调器 - 智能冲突仲裁和优先级管理
 * 解决代理间决策冲突，实现动态优先级调整
 */

export interface DecisionRequest {
  id: string;
  agentId: string;
  type: 'resource_allocation' | 'task_priority' | 'cache_invalidation' | 'rate_limiting' | 'security_action';
  priority: number; // 1-10，10为最高优先级
  proposal: any;
  reasoning: string;
  timestamp: Date;
  dependencies?: string[];
  constraints?: any;
  expectedImpact: {
    performance: number; // -1 到 1
    resource: number;    // -1 到 1
    security: number;    // -1 到 1
    user_experience: number; // -1 到 1
  };
}

export interface ConflictResolution {
  conflictId: string;
  decisions: DecisionRequest[];
  resolution: 'accept' | 'reject' | 'merge' | 'defer';
  selectedDecision?: DecisionRequest;
  mergedDecision?: any;
  reasoning: string;
  confidence: number;
  resolvedAt: Date;
  arbitrator: 'priority_based' | 'consensus' | 'ai_weighted' | 'human_override';
}

export interface ConsensusResult {
  decision: DecisionRequest;
  supportingAgents: string[];
  opposingAgents: string[];
  neutralAgents: string[];
  consensusScore: number; // 0-1，1为完全一致
  confidence: number;
}

export interface PriorityAdjustment {
  agentId: string;
  originalPriority: number;
  adjustedPriority: number;
  reason: string;
  validUntil: Date;
  performanceImpact: number;
}

@Injectable()
export class AdaptiveDecisionArbitrator {
  private readonly logger = new Logger(AdaptiveDecisionArbitrator.name);
  private pendingDecisions = new Map<string, DecisionRequest>();
  private activeConflicts = new Map<string, DecisionRequest[]>();
  private resolutionHistory: ConflictResolution[] = [];
  private agentPriorities = new Map<string, number>();
  private consensusThreshold = 0.7; // 70%一致性才通过
  private aiWeights = {
    performance: 0.3,
    resource: 0.25,
    security: 0.25,
    user_experience: 0.2
  };

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.logger.log('🧠 AdaptiveDecisionArbitrator initialized');
    this.initializeAgentPriorities();
  }

  /**
   * 提交决策请求
   */
  async submitDecision(decision: DecisionRequest): Promise<string> {
    this.logger.log(`📥 Decision submitted: ${decision.id} by agent ${decision.agentId} (type: ${decision.type})`);
    
    decision.timestamp = new Date();
    this.pendingDecisions.set(decision.id, decision);

    // 检查是否存在冲突
    const conflicts = await this.detectConflicts(decision);
    
    if (conflicts.length > 0) {
      const conflictId = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.activeConflicts.set(conflictId, [decision, ...conflicts]);
      this.logger.log(`⚠️ Conflict detected: ${conflictId} with ${conflicts.length} conflicting decisions`);
      
      // 触发冲突解决流程
      const resolution = await this.resolveConflict(conflictId, [decision, ...conflicts]);
      this.eventEmitter.emit('conflict.resolved', resolution);
      
      return resolution.conflictId;
    } else {
      // 没有冲突，直接执行
      const result = await this.executeDecision(decision);
      this.eventEmitter.emit('decision.executed', { decision, result });
      return decision.id;
    }
  }

  /**
   * 检测决策冲突
   */
  private async detectConflicts(newDecision: DecisionRequest): Promise<DecisionRequest[]> {
    const conflicts: DecisionRequest[] = [];
    
    for (const [_, existingDecision] of this.pendingDecisions) {
      if (existingDecision.id === newDecision.id) continue;
      
      const conflictType = this.analyzeConflictType(newDecision, existingDecision);
      if (conflictType !== 'none') {
        conflicts.push(existingDecision);
        this.logger.debug(`Conflict detected: ${conflictType} between ${newDecision.id} and ${existingDecision.id}`);
      }
    }
    
    return conflicts;
  }

  /**
   * 分析冲突类型
   */
  private analyzeConflictType(decision1: DecisionRequest, decision2: DecisionRequest): string {
    // 资源冲突检测
    if (decision1.type === 'resource_allocation' && decision2.type === 'resource_allocation') {
      return this.detectResourceConflict(decision1, decision2);
    }
    
    // 优先级冲突检测
    if (decision1.type === 'task_priority' && decision2.type === 'task_priority') {
      return this.detectPriorityConflict(decision1, decision2);
    }
    
    // 缓存冲突检测
    if (decision1.type === 'cache_invalidation' && decision2.type === 'cache_invalidation') {
      return this.detectCacheConflict(decision1, decision2);
    }
    
    // 安全策略冲突检测
    if (decision1.type === 'security_action' && decision2.type === 'security_action') {
      return this.detectSecurityConflict(decision1, decision2);
    }
    
    // 跨类型影响检测
    return this.detectCrossTypeConflict(decision1, decision2);
  }

  /**
   * 资源冲突检测
   */
  private detectResourceConflict(decision1: DecisionRequest, decision2: DecisionRequest): string {
    const resource1 = decision1.proposal?.resource;
    const resource2 = decision2.proposal?.resource;
    
    if (resource1 && resource2) {
      if (resource1.type === resource2.type && resource1.id === resource2.id) {
        return 'resource_overlap';
      }
      
      if (this.calculateResourceDemand(decision1) + this.calculateResourceDemand(decision2) > 1.0) {
        return 'resource_exhaustion';
      }
    }
    
    return 'none';
  }

  /**
   * 优先级冲突检测
   */
  private detectPriorityConflict(decision1: DecisionRequest, decision2: DecisionRequest): string {
    const task1 = decision1.proposal?.taskId;
    const task2 = decision2.proposal?.taskId;
    
    if (task1 === task2) {
      return 'priority_override';
    }
    
    if (Math.abs(decision1.priority - decision2.priority) >= 5) {
      return 'priority_gap';
    }
    
    return 'none';
  }

  /**
   * 缓存冲突检测
   */
  private detectCacheConflict(decision1: DecisionRequest, decision2: DecisionRequest): string {
    const cache1 = decision1.proposal?.cacheKeys || [];
    const cache2 = decision2.proposal?.cacheKeys || [];
    
    const intersection = cache1.filter(key => cache2.includes(key));
    
    if (intersection.length > 0) {
      return 'cache_key_overlap';
    }
    
    return 'none';
  }

  /**
   * 安全冲突检测
   */
  private detectSecurityConflict(decision1: DecisionRequest, decision2: DecisionRequest): string {
    const action1 = decision1.proposal?.action;
    const action2 = decision2.proposal?.action;
    
    if (action1 === 'block' && action2 === 'allow') {
      return 'security_contradiction';
    }
    
    if (action1 === 'increase_security' && action2 === 'decrease_security') {
      return 'security_level_conflict';
    }
    
    return 'none';
  }

  /**
   * 跨类型冲突检测
   */
  private detectCrossTypeConflict(decision1: DecisionRequest, decision2: DecisionRequest): string {
    // 检查性能与安全的权衡
    if (decision1.expectedImpact.performance > 0.5 && decision2.expectedImpact.security > 0.5) {
      if (decision1.expectedImpact.security < -0.3 || decision2.expectedImpact.performance < -0.3) {
        return 'performance_security_tradeoff';
      }
    }
    
    // 检查资源使用冲突
    if (decision1.expectedImpact.resource > 0.6 && decision2.expectedImpact.resource > 0.6) {
      return 'resource_competition';
    }
    
    return 'none';
  }

  /**
   * 冲突解决主流程
   */
  private async resolveConflict(conflictId: string, decisions: DecisionRequest[]): Promise<ConflictResolution> {
    this.logger.log(`🔄 Resolving conflict: ${conflictId} with ${decisions.length} decisions`);
    
    // 1. 尝试优先级解决
    const priorityResolution = await this.resolveBySemtrieviorityy(decisions);
    if (priorityResolution.confidence > 0.8) {
      return this.finalizeResolution(conflictId, decisions, priorityResolution, 'priority_based');
    }
    
    // 2. 尝试共识解决
    const consensusResolution = await this.resolveByConsensus(decisions);
    if (consensusResolution.confidence > 0.7) {
      return this.finalizeResolution(conflictId, decisions, consensusResolution, 'consensus');
    }
    
    // 3. 使用AI权重解决
    const aiResolution = await this.resolveByAIWeighting(decisions);
    return this.finalizeResolution(conflictId, decisions, aiResolution, 'ai_weighted');
  }

  /**
   * 基于优先级的解决方案
   */
  private async resolveBySemtrieviorityy(decisions: DecisionRequest[]): Promise<any> {
    // 计算综合优先级分数
    const scoredDecisions = decisions.map(decision => {
      const agentPriorityWeight = this.agentPriorities.get(decision.agentId) || 5;
      const timePenalty = this.calculateTimePenalty(decision);
      const impactBonus = this.calculateImpactBonus(decision);
      
      const finalScore = (decision.priority * 0.5) + 
                        (agentPriorityWeight * 0.3) + 
                        (timePenalty * 0.1) + 
                        (impactBonus * 0.1);
      
      return { decision, score: finalScore };
    });

    const winner = scoredDecisions.sort((a, b) => b.score - a.score)[0];
    const confidence = this.calculatePriorityConfidence(scoredDecisions);
    
    return {
      selectedDecision: winner.decision,
      confidence,
      reasoning: `Selected highest priority decision (score: ${winner.score.toFixed(2)})`
    };
  }

  /**
   * 基于共识的解决方案
   */
  private async resolveByConsensus(decisions: DecisionRequest[]): Promise<any> {
    const consensusResults: ConsensusResult[] = [];
    
    for (const decision of decisions) {
      const consensus = await this.calculateConsensus(decision, decisions);
      consensusResults.push(consensus);
    }
    
    const bestConsensus = consensusResults.sort((a, b) => b.consensusScore - a.consensusScore)[0];
    
    if (bestConsensus.consensusScore >= this.consensusThreshold) {
      return {
        selectedDecision: bestConsensus.decision,
        confidence: bestConsensus.consensusScore,
        reasoning: `Consensus reached with ${bestConsensus.consensusScore.toFixed(2)} agreement`
      };
    }
    
    // 尝试合并决策
    const mergedDecision = await this.attemptDecisionMerge(decisions);
    if (mergedDecision) {
      return {
        mergedDecision,
        confidence: 0.6,
        reasoning: 'Merged conflicting decisions into compromise solution'
      };
    }
    
    return {
      selectedDecision: decisions[0],
      confidence: 0.3,
      reasoning: 'No consensus reached, defaulting to first decision'
    };
  }

  /**
   * 基于AI权重的解决方案
   */
  private async resolveByAIWeighting(decisions: DecisionRequest[]): Promise<any> {
    const weightedScores = decisions.map(decision => {
      const impactScore = this.calculateWeightedImpact(decision);
      const riskScore = this.calculateRiskScore(decision);
      const benefitScore = this.calculateBenefitScore(decision);
      
      const finalScore = (impactScore * 0.4) + (benefitScore * 0.4) - (riskScore * 0.2);
      
      return { decision, score: finalScore };
    });
    
    const winner = weightedScores.sort((a, b) => b.score - a.score)[0];
    const confidence = this.calculateAIConfidence(weightedScores);
    
    return {
      selectedDecision: winner.decision,
      confidence,
      reasoning: `AI-weighted selection (score: ${winner.score.toFixed(3)}, confidence: ${confidence.toFixed(3)})`
    };
  }

  /**
   * 计算加权影响分数
   */
  private calculateWeightedImpact(decision: DecisionRequest): number {
    const impact = decision.expectedImpact;
    return (impact.performance * this.aiWeights.performance) +
           (impact.resource * this.aiWeights.resource) +
           (impact.security * this.aiWeights.security) +
           (impact.user_experience * this.aiWeights.user_experience);
  }

  /**
   * 计算风险分数
   */
  private calculateRiskScore(decision: DecisionRequest): number {
    const impact = decision.expectedImpact;
    const negativeImpacts = [
      Math.min(0, impact.performance),
      Math.min(0, impact.resource),
      Math.min(0, impact.security),
      Math.min(0, impact.user_experience)
    ];
    
    return Math.abs(negativeImpacts.reduce((sum, val) => sum + val, 0)) / 4;
  }

  /**
   * 计算收益分数
   */
  private calculateBenefitScore(decision: DecisionRequest): number {
    const impact = decision.expectedImpact;
    const positiveImpacts = [
      Math.max(0, impact.performance),
      Math.max(0, impact.resource),
      Math.max(0, impact.security),
      Math.max(0, impact.user_experience)
    ];
    
    return positiveImpacts.reduce((sum, val) => sum + val, 0) / 4;
  }

  /**
   * 计算共识
   */
  private async calculateConsensus(targetDecision: DecisionRequest, allDecisions: DecisionRequest[]): Promise<ConsensusResult> {
    const supportingAgents: string[] = [];
    const opposingAgents: string[] = [];
    const neutralAgents: string[] = [];
    
    for (const decision of allDecisions) {
      if (decision.id === targetDecision.id) {
        supportingAgents.push(decision.agentId);
        continue;
      }
      
      const similarity = this.calculateDecisionSimilarity(targetDecision, decision);
      
      if (similarity > 0.7) {
        supportingAgents.push(decision.agentId);
      } else if (similarity < 0.3) {
        opposingAgents.push(decision.agentId);
      } else {
        neutralAgents.push(decision.agentId);
      }
    }
    
    const totalAgents = supportingAgents.length + opposingAgents.length + neutralAgents.length;
    const consensusScore = totalAgents > 0 ? supportingAgents.length / totalAgents : 0;
    
    return {
      decision: targetDecision,
      supportingAgents,
      opposingAgents,
      neutralAgents,
      consensusScore,
      confidence: this.calculateConsensusConfidence(consensusScore, totalAgents)
    };
  }

  /**
   * 计算决策相似度
   */
  private calculateDecisionSimilarity(decision1: DecisionRequest, decision2: DecisionRequest): number {
    // 类型相似度
    const typeSimilarity = decision1.type === decision2.type ? 1 : 0;
    
    // 优先级相似度
    const prioritySimilarity = 1 - Math.abs(decision1.priority - decision2.priority) / 10;
    
    // 影响相似度
    const impactSimilarity = this.calculateImpactSimilarity(decision1.expectedImpact, decision2.expectedImpact);
    
    return (typeSimilarity * 0.4) + (prioritySimilarity * 0.3) + (impactSimilarity * 0.3);
  }

  /**
   * 计算影响相似度
   */
  private calculateImpactSimilarity(impact1: any, impact2: any): number {
    const perfSim = 1 - Math.abs(impact1.performance - impact2.performance) / 2;
    const resSim = 1 - Math.abs(impact1.resource - impact2.resource) / 2;
    const secSim = 1 - Math.abs(impact1.security - impact2.security) / 2;
    const ueSim = 1 - Math.abs(impact1.user_experience - impact2.user_experience) / 2;
    
    return (perfSim + resSim + secSim + ueSim) / 4;
  }

  /**
   * 尝试决策合并
   */
  private async attemptDecisionMerge(decisions: DecisionRequest[]): Promise<any> {
    if (decisions.length !== 2) return null; // 目前只支持两个决策的合并
    
    const [decision1, decision2] = decisions;
    
    // 检查是否可以合并
    if (decision1.type !== decision2.type) return null;
    
    switch (decision1.type) {
      case 'resource_allocation':
        return this.mergeResourceAllocations(decision1, decision2);
      case 'task_priority':
        return this.mergePriorityAdjustments(decision1, decision2);
      case 'cache_invalidation':
        return this.mergeCacheInvalidations(decision1, decision2);
      default:
        return null;
    }
  }

  /**
   * 合并资源分配决策
   */
  private mergeResourceAllocations(decision1: DecisionRequest, decision2: DecisionRequest): any {
    const proposal1 = decision1.proposal;
    const proposal2 = decision2.proposal;
    
    return {
      type: 'resource_allocation',
      resources: [...(proposal1.resources || []), ...(proposal2.resources || [])],
      allocation: {
        ...proposal1.allocation,
        ...proposal2.allocation
      },
      priority: Math.max(decision1.priority, decision2.priority),
      reasoning: `Merged allocations from ${decision1.agentId} and ${decision2.agentId}`
    };
  }

  /**
   * 合并优先级调整决策
   */
  private mergePriorityAdjustments(decision1: DecisionRequest, decision2: DecisionRequest): any {
    const avg = (decision1.priority + decision2.priority) / 2;
    
    return {
      type: 'task_priority',
      taskId: decision1.proposal.taskId || decision2.proposal.taskId,
      priority: Math.round(avg),
      reasoning: `Averaged priorities from ${decision1.agentId} (${decision1.priority}) and ${decision2.agentId} (${decision2.priority})`
    };
  }

  /**
   * 合并缓存失效决策
   */
  private mergeCacheInvalidations(decision1: DecisionRequest, decision2: DecisionRequest): any {
    const keys1 = decision1.proposal.cacheKeys || [];
    const keys2 = decision2.proposal.cacheKeys || [];
    
    return {
      type: 'cache_invalidation',
      cacheKeys: [...new Set([...keys1, ...keys2])],
      strategy: 'merged',
      reasoning: `Combined cache invalidation from ${decision1.agentId} and ${decision2.agentId}`
    };
  }

  /**
   * 完成冲突解决
   */
  private finalizeResolution(
    conflictId: string,
    decisions: DecisionRequest[],
    resolution: any,
    arbitrator: string
  ): ConflictResolution {
    const conflictResolution: ConflictResolution = {
      conflictId,
      decisions,
      resolution: resolution.selectedDecision ? 'accept' : (resolution.mergedDecision ? 'merge' : 'defer'),
      selectedDecision: resolution.selectedDecision,
      mergedDecision: resolution.mergedDecision,
      reasoning: resolution.reasoning,
      confidence: resolution.confidence,
      resolvedAt: new Date(),
      arbitrator: arbitrator as any
    };
    
    this.resolutionHistory.push(conflictResolution);
    this.activeConflicts.delete(conflictId);
    
    // 清理已解决的决策
    for (const decision of decisions) {
      this.pendingDecisions.delete(decision.id);
    }
    
    this.logger.log(`✅ Conflict ${conflictId} resolved: ${conflictResolution.resolution} (confidence: ${conflictResolution.confidence.toFixed(3)})`);
    
    return conflictResolution;
  }

  /**
   * 执行决策
   */
  private async executeDecision(decision: DecisionRequest): Promise<any> {
    this.logger.log(`🚀 Executing decision: ${decision.id} (type: ${decision.type})`);
    
    try {
      const result = await this.performDecisionAction(decision);
      this.pendingDecisions.delete(decision.id);
      return { success: true, result };
    } catch (error) {
      this.logger.error(`❌ Failed to execute decision ${decision.id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 执行具体决策动作
   */
  private async performDecisionAction(decision: DecisionRequest): Promise<any> {
    switch (decision.type) {
      case 'resource_allocation':
        return this.handleResourceAllocation(decision);
      case 'task_priority':
        return this.handlePriorityAdjustment(decision);
      case 'cache_invalidation':
        return this.handleCacheInvalidation(decision);
      case 'rate_limiting':
        return this.handleRateLimiting(decision);
      case 'security_action':
        return this.handleSecurityAction(decision);
      default:
        throw new Error(`Unknown decision type: ${decision.type}`);
    }
  }

  /**
   * 处理资源分配
   */
  private async handleResourceAllocation(decision: DecisionRequest): Promise<any> {
    // 实现资源分配逻辑
    this.eventEmitter.emit('resource.allocated', decision.proposal);
    return { allocated: decision.proposal.resources };
  }

  /**
   * 处理优先级调整
   */
  private async handlePriorityAdjustment(decision: DecisionRequest): Promise<any> {
    const adjustment: PriorityAdjustment = {
      agentId: decision.agentId,
      originalPriority: this.agentPriorities.get(decision.agentId) || 5,
      adjustedPriority: decision.proposal.priority,
      reason: decision.reasoning,
      validUntil: new Date(Date.now() + 60 * 60 * 1000), // 1小时有效
      performanceImpact: decision.expectedImpact.performance
    };
    
    this.agentPriorities.set(decision.agentId, decision.proposal.priority);
    this.eventEmitter.emit('priority.adjusted', adjustment);
    
    return adjustment;
  }

  /**
   * 处理缓存失效
   */
  private async handleCacheInvalidation(decision: DecisionRequest): Promise<any> {
    this.eventEmitter.emit('cache.invalidate', decision.proposal);
    return { invalidated: decision.proposal.cacheKeys };
  }

  /**
   * 处理限流
   */
  private async handleRateLimiting(decision: DecisionRequest): Promise<any> {
    this.eventEmitter.emit('rate_limit.updated', decision.proposal);
    return { limits: decision.proposal.limits };
  }

  /**
   * 处理安全动作
   */
  private async handleSecurityAction(decision: DecisionRequest): Promise<any> {
    this.eventEmitter.emit('security.action', decision.proposal);
    return { action: decision.proposal.action };
  }

  // 辅助方法
  private initializeAgentPriorities(): void {
    // 初始化代理优先级
    this.agentPriorities.set('app-gateway', 8);
    this.agentPriorities.set('resume-parser', 6);
    this.agentPriorities.set('jd-extractor', 6);
    this.agentPriorities.set('scoring-engine', 7);
    this.agentPriorities.set('report-generator', 5);
    this.agentPriorities.set('websocket-gateway', 7);
  }

  private calculateTimePenalty(decision: DecisionRequest): number {
    const ageMs = Date.now() - decision.timestamp.getTime();
    return Math.max(0, 1 - ageMs / (5 * 60 * 1000)); // 5分钟后完全衰减
  }

  private calculateImpactBonus(decision: DecisionRequest): number {
    const impact = decision.expectedImpact;
    return (Math.max(0, impact.performance) + 
            Math.max(0, impact.resource) + 
            Math.max(0, impact.security) + 
            Math.max(0, impact.user_experience)) / 4;
  }

  private calculateResourceDemand(decision: DecisionRequest): number {
    return Math.abs(decision.expectedImpact.resource);
  }

  private calculatePriorityConfidence(scoredDecisions: any[]): number {
    if (scoredDecisions.length < 2) return 1;
    
    const scores = scoredDecisions.map(sd => sd.score);
    const maxScore = Math.max(...scores);
    const secondMaxScore = scores.sort((a, b) => b - a)[1];
    
    return maxScore > 0 ? (maxScore - secondMaxScore) / maxScore : 0;
  }

  private calculateConsensusConfidence(consensusScore: number, totalAgents: number): number {
    const baseConfidence = consensusScore;
    const sampleSizeBonus = Math.min(0.2, totalAgents / 10); // 更多代理参与提高置信度
    return Math.min(1, baseConfidence + sampleSizeBonus);
  }

  private calculateAIConfidence(weightedScores: any[]): number {
    if (weightedScores.length < 2) return 0.8;
    
    const scores = weightedScores.map(ws => ws.score);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const range = maxScore - minScore;
    
    return range > 0.1 ? 0.9 : 0.6; // 明显差异时置信度更高
  }

  /**
   * 获取决策状态
   */
  getDecisionStatus(): any {
    return {
      pendingDecisions: this.pendingDecisions.size,
      activeConflicts: this.activeConflicts.size,
      resolutionHistory: this.resolutionHistory.length,
      agentPriorities: Object.fromEntries(this.agentPriorities),
      consensusThreshold: this.consensusThreshold,
      recentResolutions: this.resolutionHistory.slice(-10).map(r => ({
        conflictId: r.conflictId,
        resolution: r.resolution,
        confidence: r.confidence,
        arbitrator: r.arbitrator,
        resolvedAt: r.resolvedAt
      }))
    };
  }
}