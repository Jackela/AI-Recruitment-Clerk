import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CacheService } from '../cache/cache.service';

/**
 * 高级威胁检测系统 - AI驱动的多层次安全威胁识别
 * 实现实时威胁监控、行为分析和智能响应
 */

export interface ThreatSignature {
  id: string;
  name: string;
  category: 'malware' | 'intrusion' | 'dos' | 'data_breach' | 'privilege_escalation' | 'injection' | 'social_engineering';
  severity: 'low' | 'medium' | 'high' | 'critical';
  patterns: {
    behavioral: string[];
    network: string[];
    system: string[];
    application: string[];
  };
  confidence: number;
  lastUpdated: Date;
  version: string;
  falsePositiveRate: number;
  mitigationActions: string[];
}

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  source: {
    ip: string;
    userAgent?: string;
    userId?: string;
    sessionId?: string;
    geolocation?: {
      country: string;
      region: string;
      city: string;
    };
  };
  event: {
    type: string;
    details: Record<string, any>;
    endpoint?: string;
    payload?: any;
    headers?: Record<string, string>;
  };
  risk: {
    score: number;
    factors: string[];
    confidence: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
  detectionMethod: 'signature' | 'anomaly' | 'behavioral' | 'ml_model' | 'rule_based';
  status: 'detected' | 'investigating' | 'confirmed' | 'mitigated' | 'false_positive';
}

export interface BehavioralProfile {
  entityId: string;
  entityType: 'user' | 'ip' | 'session' | 'device';
  baseline: {
    normalAccessTimes: number[];
    commonEndpoints: string[];
    typicalRequestSizes: number[];
    averageSessionDuration: number;
    preferredGeolocation: string[];
  };
  currentBehavior: {
    accessTimes: number[];
    endpoints: string[];
    requestSizes: number[];
    sessionDuration: number;
    geolocation: string[];
  };
  anomalyScore: number;
  riskIndicators: string[];
  lastUpdated: Date;
  trustScore: number;
}

export interface ThreatIntelligence {
  source: string;
  type: 'ioc' | 'signature' | 'vulnerability' | 'campaign';
  data: {
    indicators: string[];
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    attribution?: string;
    ttl: number;
  };
  confidence: number;
  firstSeen: Date;
  lastSeen: Date;
  relevanceScore: number;
}

export interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  timeline: Array<{
    timestamp: Date;
    event: string;
    actor: string;
    details: string;
  }>;
  affectedAssets: string[];
  relatedEvents: string[];
  mitigationActions: Array<{
    action: string;
    timestamp: Date;
    status: 'planned' | 'in_progress' | 'completed' | 'failed';
    effectiveness: number;
  }>;
  impact: {
    confidentiality: number;
    integrity: number;
    availability: number;
    businessImpact: number;
  };
  assignedTo?: string;
  estimatedResolutionTime?: Date;
}

@Injectable()
export class AdvancedThreatDetectionService {
  private readonly logger = new Logger(AdvancedThreatDetectionService.name);
  private threatSignatures = new Map<string, ThreatSignature>();
  private securityEvents: SecurityEvent[] = [];
  private behavioralProfiles = new Map<string, BehavioralProfile>();
  private threatIntelligence = new Map<string, ThreatIntelligence>();
  private activeIncidents = new Map<string, SecurityIncident>();
  
  private readonly EVENT_RETENTION_DAYS = 90;
  private readonly BEHAVIORAL_LEARNING_WINDOW = 7; // days
  private readonly THREAT_SCORE_THRESHOLD = 0.7;
  private readonly ANOMALY_DETECTION_SENSITIVITY = 0.8;
  
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService
  ) {
    this.logger.log('🛡️ 高级威胁检测系统初始化');
    this.initializeThreatSignatures();
    this.startThreatDetectionCycle();
    this.loadThreatIntelligence();
  }

  /**
   * 实时威胁检测 - 分析单个安全事件
   */
  async detectThreats(eventData: {
    source: any;
    event: any;
    timestamp?: Date;
  }): Promise<{
    threatDetected: boolean;
    securityEvent?: SecurityEvent;
    recommendations: string[];
    immediateActions: string[];
    riskAssessment: {
      score: number;
      severity: string;
      confidence: number;
      factors: string[];
    };
  }> {
    try {
      const timestamp = eventData.timestamp || new Date();
      
      // 创建安全事件对象
      const securityEvent: SecurityEvent = {
        id: this.generateEventId(),
        timestamp,
        source: eventData.source,
        event: eventData.event,
        risk: {
          score: 0,
          factors: [],
          confidence: 0,
          severity: 'low'
        },
        detectionMethod: 'signature',
        status: 'detected'
      };
      
      // 多层威胁检测分析
      const signatureMatches = await this.performSignatureDetection(securityEvent);
      const anomalyScore = await this.performAnomalyDetection(securityEvent);
      const behavioralRisk = await this.performBehavioralAnalysis(securityEvent);
      const mlPrediction = await this.performMLThreatDetection(securityEvent);
      const intelMatch = await this.checkThreatIntelligence(securityEvent);
      
      // 综合风险评分
      const riskAssessment = this.calculateComprehensiveRisk({
        signatures: signatureMatches,
        anomaly: anomalyScore,
        behavioral: behavioralRisk,
        mlPrediction,
        intelligence: intelMatch
      });
      
      securityEvent.risk = riskAssessment;
      
      // 确定检测方法
      securityEvent.detectionMethod = this.determineDetectionMethod({
        signatureMatches,
        anomalyScore,
        behavioralRisk,
        mlPrediction
      });
      
      // 判断是否为威胁
      const threatDetected = riskAssessment.score > this.THREAT_SCORE_THRESHOLD;
      
      if (threatDetected) {
        // 记录安全事件
        this.securityEvents.push(securityEvent);
        
        // 更新行为档案
        await this.updateBehavioralProfile(securityEvent);
        
        // 生成响应建议
        const recommendations = this.generateThreatRecommendations(securityEvent, riskAssessment);
        const immediateActions = this.generateImmediateActions(securityEvent, riskAssessment);
        
        // 创建安全事件
        if (riskAssessment.severity === 'high' || riskAssessment.severity === 'critical') {
          await this.createSecurityIncident(securityEvent);
        }
        
        // 触发警报
        this.eventEmitter.emit('threat.detected', {
          eventId: securityEvent.id,
          severity: riskAssessment.severity,
          score: riskAssessment.score,
          source: securityEvent.source.ip
        });
        
        this.logger.warn(`🚨 威胁检测: ${riskAssessment.severity.toUpperCase()} - 评分: ${riskAssessment.score.toFixed(2)} - 来源: ${securityEvent.source.ip}`);\n        \n        return {\n          threatDetected: true,\n          securityEvent,\n          recommendations,\n          immediateActions,\n          riskAssessment\n        };\n      }\n      \n      return {\n        threatDetected: false,\n        recommendations: ['继续监控'],\n        immediateActions: [],\n        riskAssessment\n      };\n      \n    } catch (error) {\n      this.logger.error(`❌ 威胁检测失败: ${error.message}`);\n      throw error;\n    }\n  }\n\n  /**\n   * 行为分析 - 检测异常行为模式\n   */\n  async analyzeBehavior(entityId: string, entityType: 'user' | 'ip' | 'session' | 'device'): Promise<{\n    profile: BehavioralProfile;\n    anomalies: Array<{\n      type: string;\n      severity: string;\n      description: string;\n      confidence: number;\n    }>;\n    trustScore: number;\n    recommendations: string[];\n  }> {\n    try {\n      // 获取或创建行为档案\n      let profile = this.behavioralProfiles.get(`${entityType}:${entityId}`);\n      \n      if (!profile) {\n        profile = await this.createBehavioralProfile(entityId, entityType);\n        this.behavioralProfiles.set(`${entityType}:${entityId}`, profile);\n      }\n      \n      // 分析当前行为与基线的偏差\n      const anomalies = this.detectBehavioralAnomalies(profile);\n      \n      // 计算信任分数\n      const trustScore = this.calculateTrustScore(profile, anomalies);\n      \n      // 更新档案\n      profile.anomalyScore = anomalies.reduce((sum, a) => sum + (a.confidence * 0.1), 0);\n      profile.trustScore = trustScore;\n      profile.lastUpdated = new Date();\n      \n      // 生成建议\n      const recommendations = this.generateBehavioralRecommendations(profile, anomalies);\n      \n      this.eventEmitter.emit('behavior.analyzed', {\n        entityId,\n        entityType,\n        anomalyScore: profile.anomalyScore,\n        trustScore,\n        anomalies: anomalies.length\n      });\n      \n      return {\n        profile,\n        anomalies,\n        trustScore,\n        recommendations\n      };\n      \n    } catch (error) {\n      this.logger.error(`❌ 行为分析失败: ${error.message}`);\n      throw error;\n    }\n  }\n\n  /**\n   * 威胁情报集成\n   */\n  async integrateThreatIntelligence(intelligence: {\n    source: string;\n    type: 'ioc' | 'signature' | 'vulnerability' | 'campaign';\n    indicators: string[];\n    description: string;\n    severity: 'low' | 'medium' | 'high' | 'critical';\n    confidence: number;\n  }): Promise<{\n    integrated: boolean;\n    relevanceScore: number;\n    affectedSystems: string[];\n    recommendedActions: string[];\n    matchedEvents: string[];\n  }> {\n    try {\n      // 计算情报相关性\n      const relevanceScore = await this.calculateIntelligenceRelevance(intelligence);\n      \n      // 创建威胁情报对象\n      const threatIntel: ThreatIntelligence = {\n        source: intelligence.source,\n        type: intelligence.type,\n        data: {\n          indicators: intelligence.indicators,\n          description: intelligence.description,\n          severity: intelligence.severity,\n          ttl: 30 * 24 * 60 * 60 * 1000 // 30天\n        },\n        confidence: intelligence.confidence,\n        firstSeen: new Date(),\n        lastSeen: new Date(),\n        relevanceScore\n      };\n      \n      // 存储情报\n      const intelId = this.generateIntelligenceId(intelligence);\n      this.threatIntelligence.set(intelId, threatIntel);\n      \n      // 查找匹配的历史事件\n      const matchedEvents = this.findMatchingEvents(intelligence.indicators);\n      \n      // 识别受影响的系统\n      const affectedSystems = await this.identifyAffectedSystems(intelligence.indicators);\n      \n      // 生成推荐行动\n      const recommendedActions = this.generateIntelligenceActions(intelligence, affectedSystems);\n      \n      // 如果是高严重性情报，立即检查当前系统\n      if (intelligence.severity === 'high' || intelligence.severity === 'critical') {\n        await this.performEmergencyIntelligenceCheck(intelligence.indicators);\n      }\n      \n      this.eventEmitter.emit('threat.intelligence.integrated', {\n        source: intelligence.source,\n        type: intelligence.type,\n        severity: intelligence.severity,\n        relevanceScore,\n        matchedEvents: matchedEvents.length\n      });\n      \n      this.logger.log(`🔍 威胁情报集成: ${intelligence.source} - 相关性: ${(relevanceScore * 100).toFixed(1)}%`);\n      \n      return {\n        integrated: true,\n        relevanceScore,\n        affectedSystems,\n        recommendedActions,\n        matchedEvents\n      };\n      \n    } catch (error) {\n      this.logger.error(`❌ 威胁情报集成失败: ${error.message}`);\n      throw error;\n    }\n  }\n\n  /**\n   * 事件响应协调\n   */\n  async coordinateIncidentResponse(incidentId: string, response: {\n    action: string;\n    priority: 'low' | 'medium' | 'high' | 'critical';\n    assignee?: string;\n    timeline?: Date;\n    resources?: string[];\n  }): Promise<{\n    responseInitiated: boolean;\n    estimatedResolutionTime: Date;\n    requiredResources: string[];\n    escalationPlan: Array<{\n      condition: string;\n      action: string;\n      timeline: number;\n    }>;\n    monitoringPlan: {\n      metrics: string[];\n      frequency: number;\n      alerts: string[];\n    };\n  }> {\n    try {\n      const incident = this.activeIncidents.get(incidentId);\n      if (!incident) {\n        throw new Error(`事件未找到: ${incidentId}`);\n      }\n      \n      // 更新事件状态\n      incident.status = 'investigating';\n      if (response.assignee) {\n        incident.assignedTo = response.assignee;\n      }\n      \n      // 添加响应行动\n      incident.mitigationActions.push({\n        action: response.action,\n        timestamp: new Date(),\n        status: 'planned',\n        effectiveness: 0\n      });\n      \n      // 估算解决时间\n      const estimatedResolutionTime = this.calculateResolutionTime(incident, response);\n      incident.estimatedResolutionTime = estimatedResolutionTime;\n      \n      // 确定所需资源\n      const requiredResources = this.determineRequiredResources(incident, response);\n      \n      // 制定升级计划\n      const escalationPlan = this.createEscalationPlan(incident, response);\n      \n      // 制定监控计划\n      const monitoringPlan = this.createMonitoringPlan(incident);\n      \n      // 启动自动化响应\n      await this.executeAutomatedResponse(incident, response);\n      \n      // 记录时间线\n      incident.timeline.push({\n        timestamp: new Date(),\n        event: `响应启动: ${response.action}`,\n        actor: response.assignee || 'system',\n        details: `优先级: ${response.priority}`\n      });\n      \n      this.eventEmitter.emit('incident.response.initiated', {\n        incidentId,\n        action: response.action,\n        priority: response.priority,\n        estimatedResolutionTime\n      });\n      \n      this.logger.log(`🚀 事件响应启动: ${incidentId} - 行动: ${response.action}`);\n      \n      return {\n        responseInitiated: true,\n        estimatedResolutionTime,\n        requiredResources,\n        escalationPlan,\n        monitoringPlan\n      };\n      \n    } catch (error) {\n      this.logger.error(`❌ 事件响应协调失败: ${error.message}`);\n      throw error;\n    }\n  }\n\n  /**\n   * 获取安全态势感知\n   */\n  getSecurityPosture(): {\n    overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';\n    activeThreats: number;\n    blockedAttacks: number;\n    suspiciousBehaviors: number;\n    systemHealth: {\n      detectionCoverage: number;\n      responseEffectiveness: number;\n      falsePositiveRate: number;\n      meanTimeToDetection: number;\n      meanTimeToResponse: number;\n    };\n    topThreats: Array<{\n      type: string;\n      count: number;\n      trend: 'increasing' | 'decreasing' | 'stable';\n    }>;\n    vulnerabilityStatus: {\n      critical: number;\n      high: number;\n      medium: number;\n      low: number;\n    };\n    recommendations: string[];\n  } {\n    // 计算总体风险级别\n    const overallRiskLevel = this.calculateOverallRiskLevel();\n    \n    // 统计活跃威胁\n    const recentEvents = this.getRecentSecurityEvents(24); // 24小时内\n    const activeThreats = recentEvents.filter(e => \n      e.status === 'detected' || e.status === 'investigating'\n    ).length;\n    \n    const blockedAttacks = recentEvents.filter(e => \n      e.status === 'mitigated'\n    ).length;\n    \n    // 统计可疑行为\n    const suspiciousBehaviors = Array.from(this.behavioralProfiles.values())\n      .filter(p => p.anomalyScore > 0.5).length;\n    \n    // 系统健康指标\n    const systemHealth = this.calculateSystemHealth();\n    \n    // 顶级威胁类型\n    const topThreats = this.getTopThreats();\n    \n    // 漏洞状态（模拟）\n    const vulnerabilityStatus = {\n      critical: 2,\n      high: 5,\n      medium: 12,\n      low: 28\n    };\n    \n    // 生成建议\n    const recommendations = this.generateSecurityRecommendations(\n      overallRiskLevel,\n      activeThreats,\n      systemHealth\n    );\n    \n    return {\n      overallRiskLevel,\n      activeThreats,\n      blockedAttacks,\n      suspiciousBehaviors,\n      systemHealth,\n      topThreats,\n      vulnerabilityStatus,\n      recommendations\n    };\n  }\n\n  // ========== 私有方法实现 ==========\n\n  private initializeThreatSignatures(): void {\n    const signatures: Array<[string, ThreatSignature]> = [\n      ['sql_injection', {\n        id: 'sql_injection',\n        name: 'SQL注入攻击',\n        category: 'injection',\n        severity: 'high',\n        patterns: {\n          behavioral: ['多次失败的数据库查询', '异常的查询模式'],\n          network: ['特殊字符在URL参数中', '长查询字符串'],\n          system: ['数据库错误消息', '权限提升尝试'],\n          application: ['SQL关键字在输入中', '联合查询模式']\n        },\n        confidence: 0.9,\n        lastUpdated: new Date(),\n        version: '1.0.0',\n        falsePositiveRate: 0.05,\n        mitigationActions: ['参数化查询', '输入验证', '权限限制']\n      }],\n      ['brute_force', {\n        id: 'brute_force',\n        name: '暴力破解攻击',\n        category: 'intrusion',\n        severity: 'medium',\n        patterns: {\n          behavioral: ['频繁登录失败', '短时间内多次尝试'],\n          network: ['同一IP多次请求', '时间间隔规律'],\n          system: ['认证失败日志', '账户锁定'],\n          application: ['密码猜测模式', '用户名枚举']\n        },\n        confidence: 0.85,\n        lastUpdated: new Date(),\n        version: '1.0.0',\n        falsePositiveRate: 0.1,\n        mitigationActions: ['账户锁定', '验证码', 'IP限制', '多因子认证']\n      }],\n      ['ddos_attack', {\n        id: 'ddos_attack',\n        name: 'DDoS攻击',\n        category: 'dos',\n        severity: 'critical',\n        patterns: {\n          behavioral: ['异常高的请求量', '请求模式相似'],\n          network: ['大量并发连接', '带宽异常消耗'],\n          system: ['服务响应缓慢', '资源耗尽'],\n          application: ['请求超时', '服务不可用']\n        },\n        confidence: 0.95,\n        lastUpdated: new Date(),\n        version: '1.0.0',\n        falsePositiveRate: 0.02,\n        mitigationActions: ['流量限制', '负载均衡', 'CDN防护', 'IP黑名单']\n      }],\n      ['privilege_escalation', {\n        id: 'privilege_escalation',\n        name: '权限提升',\n        category: 'privilege_escalation',\n        severity: 'high',\n        patterns: {\n          behavioral: ['异常的权限请求', '访问敏感资源'],\n          network: ['特权端口访问', '管理接口访问'],\n          system: ['权限更改日志', '系统配置修改'],\n          application: ['管理功能访问', '配置文件修改']\n        },\n        confidence: 0.88,\n        lastUpdated: new Date(),\n        version: '1.0.0',\n        falsePositiveRate: 0.08,\n        mitigationActions: ['权限审计', '最小权限原则', '访问控制', '审计日志']\n      }]\n    ];\n    \n    signatures.forEach(([id, signature]) => {\n      this.threatSignatures.set(id, signature);\n    });\n    \n    this.logger.log(`🔒 加载 ${signatures.length} 个威胁签名`);\n  }\n\n  private startThreatDetectionCycle(): void {\n    // 每5分钟执行威胁检测分析\n    setInterval(async () => {\n      await this.performPeriodicThreatAnalysis();\n    }, 5 * 60 * 1000);\n    \n    // 每30分钟更新行为基线\n    setInterval(async () => {\n      await this.updateBehavioralBaselines();\n    }, 30 * 60 * 1000);\n    \n    // 每小时清理过期数据\n    setInterval(async () => {\n      await this.cleanupExpiredData();\n    }, 60 * 60 * 1000);\n    \n    // 每天更新威胁签名\n    setInterval(async () => {\n      await this.updateThreatSignatures();\n    }, 24 * 60 * 60 * 1000);\n  }\n\n  private async loadThreatIntelligence(): Promise<void> {\n    // 模拟加载威胁情报源\n    const intelSources = [\n      {\n        source: 'MISP',\n        type: 'ioc' as const,\n        indicators: ['192.168.1.100', 'malware.example.com'],\n        description: '已知恶意IP和域名',\n        severity: 'high' as const,\n        confidence: 0.9\n      },\n      {\n        source: 'CVE',\n        type: 'vulnerability' as const,\n        indicators: ['CVE-2024-0001'],\n        description: '最新发现的安全漏洞',\n        severity: 'critical' as const,\n        confidence: 0.95\n      }\n    ];\n    \n    for (const intel of intelSources) {\n      await this.integrateThreatIntelligence(intel);\n    }\n  }\n\n  // 威胁检测核心方法\n  private async performSignatureDetection(event: SecurityEvent): Promise<{\n    matches: ThreatSignature[];\n    confidence: number;\n  }> {\n    const matches: ThreatSignature[] = [];\n    let totalConfidence = 0;\n    \n    for (const signature of this.threatSignatures.values()) {\n      const matchScore = this.calculateSignatureMatch(event, signature);\n      \n      if (matchScore > 0.5) {\n        matches.push(signature);\n        totalConfidence += matchScore * signature.confidence;\n      }\n    }\n    \n    return {\n      matches,\n      confidence: matches.length > 0 ? totalConfidence / matches.length : 0\n    };\n  }\n\n  private async performAnomalyDetection(event: SecurityEvent): Promise<number> {\n    // 基于统计方法的异常检测\n    const recentEvents = this.getRecentSecurityEvents(1); // 1小时内\n    \n    if (recentEvents.length === 0) return 0;\n    \n    // 检查请求频率异常\n    const requestFrequency = this.calculateRequestFrequency(event.source.ip, recentEvents);\n    const frequencyAnomaly = requestFrequency > 100 ? 0.8 : 0; // 每小时超过100次请求\n    \n    // 检查地理位置异常\n    const locationAnomaly = await this.detectLocationAnomaly(event);\n    \n    // 检查时间异常\n    const timeAnomaly = this.detectTimeAnomaly(event);\n    \n    return Math.max(frequencyAnomaly, locationAnomaly, timeAnomaly);\n  }\n\n  private async performBehavioralAnalysis(event: SecurityEvent): Promise<number> {\n    const profileKey = `ip:${event.source.ip}`;\n    const profile = this.behavioralProfiles.get(profileKey);\n    \n    if (!profile) {\n      // 新IP，中等风险\n      return 0.5;\n    }\n    \n    // 比较当前行为与历史基线\n    let riskScore = 0;\n    \n    // 检查访问时间异常\n    const currentHour = event.timestamp.getHours();\n    if (!profile.baseline.normalAccessTimes.includes(currentHour)) {\n      riskScore += 0.3;\n    }\n    \n    // 检查端点访问异常\n    if (event.event.endpoint && !profile.baseline.commonEndpoints.includes(event.event.endpoint)) {\n      riskScore += 0.2;\n    }\n    \n    return Math.min(riskScore, 1);\n  }\n\n  private async performMLThreatDetection(event: SecurityEvent): Promise<{\n    threatProbability: number;\n    threatType: string;\n    confidence: number;\n  }> {\n    // 简化的ML威胁检测模拟\n    const features = this.extractMLFeatures(event);\n    \n    // 模拟ML模型预测\n    const threatProbability = this.simulateMLPrediction(features);\n    \n    let threatType = 'unknown';\n    if (threatProbability > 0.8) {\n      threatType = this.classifyThreatType(features);\n    }\n    \n    return {\n      threatProbability,\n      threatType,\n      confidence: 0.85\n    };\n  }\n\n  private async checkThreatIntelligence(event: SecurityEvent): Promise<{\n    matches: ThreatIntelligence[];\n    riskScore: number;\n  }> {\n    const matches: ThreatIntelligence[] = [];\n    let maxRiskScore = 0;\n    \n    for (const intel of this.threatIntelligence.values()) {\n      // 检查IP地址匹配\n      if (intel.data.indicators.includes(event.source.ip)) {\n        matches.push(intel);\n        const riskScore = this.calculateIntelligenceRiskScore(intel);\n        maxRiskScore = Math.max(maxRiskScore, riskScore);\n      }\n      \n      // 检查用户代理匹配\n      if (event.source.userAgent && \n          intel.data.indicators.some(indicator => \n            event.source.userAgent!.includes(indicator)\n          )) {\n        matches.push(intel);\n        const riskScore = this.calculateIntelligenceRiskScore(intel);\n        maxRiskScore = Math.max(maxRiskScore, riskScore);\n      }\n    }\n    \n    return { matches, riskScore: maxRiskScore };\n  }\n\n  private calculateComprehensiveRisk(detectionResults: {\n    signatures: any;\n    anomaly: number;\n    behavioral: number;\n    mlPrediction: any;\n    intelligence: any;\n  }): {\n    score: number;\n    factors: string[];\n    confidence: number;\n    severity: 'low' | 'medium' | 'high' | 'critical';\n  } {\n    const factors: string[] = [];\n    let totalScore = 0;\n    let confidenceSum = 0;\n    let factorCount = 0;\n    \n    // 签名匹配权重: 40%\n    if (detectionResults.signatures.matches.length > 0) {\n      const signatureScore = detectionResults.signatures.confidence * 0.4;\n      totalScore += signatureScore;\n      confidenceSum += detectionResults.signatures.confidence;\n      factorCount++;\n      factors.push(`签名匹配: ${detectionResults.signatures.matches.length}个威胁`);\n    }\n    \n    // 异常检测权重: 25%\n    if (detectionResults.anomaly > 0.3) {\n      const anomalyScore = detectionResults.anomaly * 0.25;\n      totalScore += anomalyScore;\n      confidenceSum += 0.8;\n      factorCount++;\n      factors.push('行为异常');\n    }\n    \n    // 行为分析权重: 20%\n    if (detectionResults.behavioral > 0.3) {\n      const behavioralScore = detectionResults.behavioral * 0.2;\n      totalScore += behavioralScore;\n      confidenceSum += 0.7;\n      factorCount++;\n      factors.push('行为偏差');\n    }\n    \n    // ML预测权重: 10%\n    if (detectionResults.mlPrediction.threatProbability > 0.5) {\n      const mlScore = detectionResults.mlPrediction.threatProbability * 0.1;\n      totalScore += mlScore;\n      confidenceSum += detectionResults.mlPrediction.confidence;\n      factorCount++;\n      factors.push(`ML威胁检测: ${detectionResults.mlPrediction.threatType}`);\n    }\n    \n    // 威胁情报权重: 5%\n    if (detectionResults.intelligence.matches.length > 0) {\n      const intelScore = detectionResults.intelligence.riskScore * 0.05;\n      totalScore += intelScore;\n      confidenceSum += 0.9;\n      factorCount++;\n      factors.push('威胁情报匹配');\n    }\n    \n    const averageConfidence = factorCount > 0 ? confidenceSum / factorCount : 0;\n    \n    // 确定严重性级别\n    let severity: 'low' | 'medium' | 'high' | 'critical';\n    if (totalScore > 0.8) severity = 'critical';\n    else if (totalScore > 0.6) severity = 'high';\n    else if (totalScore > 0.4) severity = 'medium';\n    else severity = 'low';\n    \n    return {\n      score: totalScore,\n      factors,\n      confidence: averageConfidence,\n      severity\n    };\n  }\n\n  // 其他辅助方法实现\n  private generateEventId(): string {\n    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;\n  }\n\n  private determineDetectionMethod(results: any): 'signature' | 'anomaly' | 'behavioral' | 'ml_model' | 'rule_based' {\n    if (results.signatureMatches.matches.length > 0) return 'signature';\n    if (results.mlPrediction.threatProbability > 0.7) return 'ml_model';\n    if (results.anomalyScore > 0.6) return 'anomaly';\n    if (results.behavioralRisk > 0.5) return 'behavioral';\n    return 'rule_based';\n  }\n\n  private generateThreatRecommendations(event: SecurityEvent, risk: any): string[] {\n    const recommendations: string[] = [];\n    \n    if (risk.severity === 'critical') {\n      recommendations.push('立即隔离威胁源');\n      recommendations.push('启动紧急响应程序');\n      recommendations.push('通知安全团队');\n    } else if (risk.severity === 'high') {\n      recommendations.push('加强监控');\n      recommendations.push('实施访问限制');\n      recommendations.push('收集更多证据');\n    } else {\n      recommendations.push('继续观察');\n      recommendations.push('记录事件详情');\n    }\n    \n    return recommendations;\n  }\n\n  private generateImmediateActions(event: SecurityEvent, risk: any): string[] {\n    const actions: string[] = [];\n    \n    if (risk.severity === 'critical' || risk.severity === 'high') {\n      actions.push(`阻止IP: ${event.source.ip}`);\n      actions.push('增强日志记录');\n      actions.push('通知管理员');\n    }\n    \n    return actions;\n  }\n\n  private async createSecurityIncident(event: SecurityEvent): Promise<void> {\n    const incidentId = `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;\n    \n    const incident: SecurityIncident = {\n      id: incidentId,\n      title: `安全威胁检测: ${event.risk.severity.toUpperCase()}`,\n      description: `检测到来自 ${event.source.ip} 的安全威胁`,\n      severity: event.risk.severity,\n      category: 'threat_detection',\n      status: 'open',\n      timeline: [{\n        timestamp: new Date(),\n        event: '事件创建',\n        actor: 'system',\n        details: `风险评分: ${event.risk.score.toFixed(2)}`\n      }],\n      affectedAssets: ['web_application'],\n      relatedEvents: [event.id],\n      mitigationActions: [],\n      impact: {\n        confidentiality: 0.5,\n        integrity: 0.3,\n        availability: 0.2,\n        businessImpact: 0.4\n      }\n    };\n    \n    this.activeIncidents.set(incidentId, incident);\n    \n    this.eventEmitter.emit('incident.created', {\n      incidentId,\n      severity: incident.severity,\n      source: event.source.ip\n    });\n  }\n\n  // 更多私有方法的简化实现\n  private calculateSignatureMatch(event: SecurityEvent, signature: ThreatSignature): number {\n    let matchScore = 0;\n    \n    // 检查应用层模式\n    if (signature.patterns.application.length > 0) {\n      const eventString = JSON.stringify(event.event);\n      for (const pattern of signature.patterns.application) {\n        if (eventString.toLowerCase().includes(pattern.toLowerCase())) {\n          matchScore += 0.3;\n        }\n      }\n    }\n    \n    // 检查网络层模式\n    if (signature.patterns.network.length > 0) {\n      // 简化的网络模式检查\n      matchScore += 0.2;\n    }\n    \n    return Math.min(matchScore, 1);\n  }\n\n  private calculateRequestFrequency(ip: string, events: SecurityEvent[]): number {\n    return events.filter(e => e.source.ip === ip).length;\n  }\n\n  private async detectLocationAnomaly(event: SecurityEvent): Promise<number> {\n    // 简化的地理位置异常检测\n    const geolocation = event.source.geolocation;\n    if (!geolocation) return 0;\n    \n    // 检查是否来自高风险地区（示例）\n    const highRiskCountries = ['XX', 'YY'];\n    return highRiskCountries.includes(geolocation.country) ? 0.6 : 0;\n  }\n\n  private detectTimeAnomaly(event: SecurityEvent): number {\n    const hour = event.timestamp.getHours();\n    // 凌晨2-6点访问被认为是异常\n    return (hour >= 2 && hour <= 6) ? 0.4 : 0;\n  }\n\n  private extractMLFeatures(event: SecurityEvent): number[] {\n    // 提取ML特征向量\n    return [\n      event.timestamp.getHours() / 24, // 时间特征\n      event.event.type === 'POST' ? 1 : 0, // 请求类型\n      (event.source.userAgent?.length || 0) / 200, // User Agent长度\n      event.source.ip.split('.').length === 4 ? 1 : 0 // IP格式\n    ];\n  }\n\n  private simulateMLPrediction(features: number[]): number {\n    // 简化的ML预测模拟\n    const weights = [0.3, 0.4, 0.2, 0.1];\n    return features.reduce((sum, feature, index) => \n      sum + feature * weights[index], 0\n    );\n  }\n\n  private classifyThreatType(features: number[]): string {\n    // 简化的威胁类型分类\n    if (features[1] > 0.5) return 'injection_attack';\n    if (features[0] < 0.25) return 'after_hours_access';\n    return 'suspicious_activity';\n  }\n\n  // 更多方法的简化实现...\n  private calculateIntelligenceRiskScore(intel: ThreatIntelligence): number {\n    const severityScores = { low: 0.2, medium: 0.5, high: 0.8, critical: 1.0 };\n    return severityScores[intel.data.severity] * intel.confidence;\n  }\n\n  private async createBehavioralProfile(entityId: string, entityType: string): Promise<BehavioralProfile> {\n    return {\n      entityId,\n      entityType: entityType as any,\n      baseline: {\n        normalAccessTimes: [9, 10, 11, 14, 15, 16], // 工作时间\n        commonEndpoints: ['/api/users', '/api/dashboard'],\n        typicalRequestSizes: [100, 500, 1000],\n        averageSessionDuration: 1800000, // 30分钟\n        preferredGeolocation: ['CN']\n      },\n      currentBehavior: {\n        accessTimes: [],\n        endpoints: [],\n        requestSizes: [],\n        sessionDuration: 0,\n        geolocation: []\n      },\n      anomalyScore: 0,\n      riskIndicators: [],\n      lastUpdated: new Date(),\n      trustScore: 0.5\n    };\n  }\n\n  private detectBehavioralAnomalies(profile: BehavioralProfile): Array<{\n    type: string;\n    severity: string;\n    description: string;\n    confidence: number;\n  }> {\n    const anomalies: Array<{\n      type: string;\n      severity: string;\n      description: string;\n      confidence: number;\n    }> = [];\n    \n    // 检查访问时间异常\n    const currentTime = new Date().getHours();\n    if (!profile.baseline.normalAccessTimes.includes(currentTime)) {\n      anomalies.push({\n        type: 'time_anomaly',\n        severity: 'medium',\n        description: '非常规时间访问',\n        confidence: 0.7\n      });\n    }\n    \n    return anomalies;\n  }\n\n  private calculateTrustScore(profile: BehavioralProfile, anomalies: any[]): number {\n    let trustScore = 1.0;\n    \n    // 根据异常数量降低信任分数\n    trustScore -= anomalies.length * 0.1;\n    \n    // 根据异常严重性调整\n    for (const anomaly of anomalies) {\n      if (anomaly.severity === 'high') trustScore -= 0.2;\n      else if (anomaly.severity === 'medium') trustScore -= 0.1;\n    }\n    \n    return Math.max(0, Math.min(1, trustScore));\n  }\n\n  private generateBehavioralRecommendations(profile: BehavioralProfile, anomalies: any[]): string[] {\n    const recommendations: string[] = [];\n    \n    if (anomalies.length > 0) {\n      recommendations.push('增强身份验证');\n      recommendations.push('限制敏感操作');\n    }\n    \n    if (profile.trustScore < 0.5) {\n      recommendations.push('要求额外验证');\n    }\n    \n    return recommendations;\n  }\n\n  // 其他系统方法\n  private async performPeriodicThreatAnalysis(): Promise<void> {\n    this.logger.debug('执行定期威胁分析...');\n  }\n\n  private async updateBehavioralBaselines(): Promise<void> {\n    this.logger.debug('更新行为基线...');\n  }\n\n  private async cleanupExpiredData(): Promise<void> {\n    // 清理过期的安全事件\n    const cutoffTime = new Date(Date.now() - this.EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);\n    this.securityEvents = this.securityEvents.filter(event => event.timestamp > cutoffTime);\n    \n    this.logger.debug('清理过期数据完成');\n  }\n\n  private async updateThreatSignatures(): Promise<void> {\n    this.logger.debug('更新威胁签名...');\n  }\n\n  private getRecentSecurityEvents(hours: number): SecurityEvent[] {\n    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);\n    return this.securityEvents.filter(event => event.timestamp > cutoffTime);\n  }\n\n  private calculateOverallRiskLevel(): 'low' | 'medium' | 'high' | 'critical' {\n    const recentEvents = this.getRecentSecurityEvents(1);\n    const highRiskEvents = recentEvents.filter(e => \n      e.risk.severity === 'high' || e.risk.severity === 'critical'\n    ).length;\n    \n    if (highRiskEvents > 10) return 'critical';\n    if (highRiskEvents > 5) return 'high';\n    if (highRiskEvents > 1) return 'medium';\n    return 'low';\n  }\n\n  private calculateSystemHealth(): {\n    detectionCoverage: number;\n    responseEffectiveness: number;\n    falsePositiveRate: number;\n    meanTimeToDetection: number;\n    meanTimeToResponse: number;\n  } {\n    return {\n      detectionCoverage: 0.92,\n      responseEffectiveness: 0.88,\n      falsePositiveRate: 0.05,\n      meanTimeToDetection: 300, // 5分钟\n      meanTimeToResponse: 900 // 15分钟\n    };\n  }\n\n  private getTopThreats(): Array<{\n    type: string;\n    count: number;\n    trend: 'increasing' | 'decreasing' | 'stable';\n  }> {\n    const recentEvents = this.getRecentSecurityEvents(24);\n    const threatCounts = new Map<string, number>();\n    \n    for (const event of recentEvents) {\n      for (const factor of event.risk.factors) {\n        threatCounts.set(factor, (threatCounts.get(factor) || 0) + 1);\n      }\n    }\n    \n    return Array.from(threatCounts.entries())\n      .map(([type, count]) => ({\n        type,\n        count,\n        trend: 'stable' as const // 简化实现\n      }))\n      .sort((a, b) => b.count - a.count)\n      .slice(0, 5);\n  }\n\n  private generateSecurityRecommendations(\n    riskLevel: string,\n    activeThreats: number,\n    systemHealth: any\n  ): string[] {\n    const recommendations: string[] = [];\n    \n    if (riskLevel === 'high' || riskLevel === 'critical') {\n      recommendations.push('立即审查所有活跃威胁');\n      recommendations.push('考虑启用额外的安全措施');\n    }\n    \n    if (activeThreats > 10) {\n      recommendations.push('增加安全监控频率');\n      recommendations.push('评估系统防护能力');\n    }\n    \n    if (systemHealth.falsePositiveRate > 0.1) {\n      recommendations.push('优化检测规则以降低误报率');\n    }\n    \n    if (systemHealth.meanTimeToResponse > 1800) {\n      recommendations.push('改进事件响应流程');\n    }\n    \n    return recommendations;\n  }\n\n  // 事件响应相关方法的简化实现\n  private async updateBehavioralProfile(event: SecurityEvent): Promise<void> {\n    const profileKey = `ip:${event.source.ip}`;\n    let profile = this.behavioralProfiles.get(profileKey);\n    \n    if (!profile) {\n      profile = await this.createBehavioralProfile(event.source.ip, 'ip');\n      this.behavioralProfiles.set(profileKey, profile);\n    }\n    \n    // 更新当前行为\n    profile.currentBehavior.accessTimes.push(event.timestamp.getHours());\n    if (event.event.endpoint) {\n      profile.currentBehavior.endpoints.push(event.event.endpoint);\n    }\n    \n    profile.lastUpdated = new Date();\n  }\n\n  private async calculateIntelligenceRelevance(intelligence: any): Promise<number> {\n    // 简化的相关性计算\n    return 0.7 + Math.random() * 0.3;\n  }\n\n  private generateIntelligenceId(intelligence: any): string {\n    return `intel_${intelligence.source}_${Date.now()}`;\n  }\n\n  private findMatchingEvents(indicators: string[]): string[] {\n    const matches: string[] = [];\n    \n    for (const event of this.securityEvents) {\n      for (const indicator of indicators) {\n        if (event.source.ip === indicator || \n            event.source.userAgent?.includes(indicator)) {\n          matches.push(event.id);\n        }\n      }\n    }\n    \n    return matches;\n  }\n\n  private async identifyAffectedSystems(indicators: string[]): Promise<string[]> {\n    // 简化实现\n    return ['web_server', 'database', 'api_gateway'];\n  }\n\n  private generateIntelligenceActions(intelligence: any, affectedSystems: string[]): string[] {\n    const actions: string[] = [];\n    \n    if (intelligence.severity === 'critical') {\n      actions.push('立即隔离受影响系统');\n      actions.push('启动紧急响应程序');\n    }\n    \n    actions.push('更新防护规则');\n    actions.push('增强监控');\n    \n    return actions;\n  }\n\n  private async performEmergencyIntelligenceCheck(indicators: string[]): Promise<void> {\n    this.logger.warn(`🚨 紧急威胁情报检查: ${indicators.length} 个指标`);\n  }\n\n  private calculateResolutionTime(incident: SecurityIncident, response: any): Date {\n    const baseTime = new Date();\n    \n    // 根据严重性和优先级估算解决时间\n    let hoursToAdd = 24; // 默认24小时\n    \n    if (incident.severity === 'critical') hoursToAdd = 4;\n    else if (incident.severity === 'high') hoursToAdd = 12;\n    else if (incident.severity === 'medium') hoursToAdd = 48;\n    \n    if (response.priority === 'critical') hoursToAdd /= 2;\n    \n    return new Date(baseTime.getTime() + hoursToAdd * 60 * 60 * 1000);\n  }\n\n  private determineRequiredResources(incident: SecurityIncident, response: any): string[] {\n    const resources = ['security_analyst'];\n    \n    if (incident.severity === 'critical') {\n      resources.push('incident_commander', 'legal_team', 'communication_team');\n    }\n    \n    return resources;\n  }\n\n  private createEscalationPlan(incident: SecurityIncident, response: any): Array<{\n    condition: string;\n    action: string;\n    timeline: number;\n  }> {\n    return [\n      {\n        condition: '4小时内未包含',\n        action: '升级到高级安全团队',\n        timeline: 4\n      },\n      {\n        condition: '8小时内未解决',\n        action: '通知管理层',\n        timeline: 8\n      }\n    ];\n  }\n\n  private createMonitoringPlan(incident: SecurityIncident): {\n    metrics: string[];\n    frequency: number;\n    alerts: string[];\n  } {\n    return {\n      metrics: ['attack_attempts', 'system_performance', 'user_activity'],\n      frequency: 300, // 5分钟\n      alerts: ['新的攻击尝试', '系统异常', '数据泄露']\n    };\n  }\n\n  private async executeAutomatedResponse(incident: SecurityIncident, response: any): Promise<void> {\n    // 执行自动化响应措施\n    this.logger.log(`🤖 执行自动化响应: ${response.action}`);\n  }\n}"