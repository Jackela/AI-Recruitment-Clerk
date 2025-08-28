/**
 * Predictive Analytics System
 * AI-powered predictive analysis for system capacity planning and failure prediction
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface PredictionModel {
  id: string;
  name: string;
  type: 'capacity_planning' | 'failure_prediction' | 'performance_forecast' | 'anomaly_detection' | 'trend_analysis';
  description: string;
  metrics: string[];
  timeHorizon: number; // hours
  accuracy: number; // 0-100%
  lastTrained: Date;
  version: string;
  config: {
    algorithm: 'linear_regression' | 'polynomial' | 'moving_average' | 'exponential_smoothing' | 'arima';
    parameters: Record<string, any>;
    features: string[];
    targetMetric: string;
  };
  status: 'active' | 'training' | 'inactive' | 'error';
}

export interface Prediction {
  id: string;
  modelId: string;
  timestamp: Date;
  targetMetric: string;
  predictions: Array<{
    timestamp: Date;
    value: number;
    confidence: number; // 0-100%
    range: { min: number; max: number };
  }>;
  insights: {
    trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
    riskFactors: Array<{
      factor: string;
      impact: number; // 0-100%
      probability: number; // 0-100%
    }>;
  };
  metadata: {
    dataPoints: number;
    timeRange: string;
    accuracy: number;
    modelVersion: string;
  };
}

export interface CapacityForecast {
  metric: string;
  currentUsage: number;
  forecastedUsage: number;
  timeToLimit: number; // hours until reaching capacity
  recommendedActions: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    timeframe: string;
    impact: string;
  }>;
  scalingRecommendations: {
    cpu: { current: number; recommended: number; timing: string };
    memory: { current: number; recommended: number; timing: string };
    storage: { current: number; recommended: number; timing: string };
    network: { current: number; recommended: number; timing: string };
  };
}

export interface AnomalyDetection {
  timestamp: Date;
  metric: string;
  value: number;
  expectedValue: number;
  deviationPercent: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  context: {
    historicalPattern: string;
    possibleCauses: string[];
    relatedMetrics: Array<{
      metric: string;
      correlation: number;
      isAnomaly: boolean;
    }>;
  };
}

@Injectable()
export class PredictiveAnalyticsService {
  private readonly logger = new Logger(PredictiveAnalyticsService.name);
  
  private models = new Map<string, PredictionModel>();
  private predictions = new Map<string, Prediction>();
  private historicalData = new Map<string, Array<{ timestamp: Date; value: number }>>();
  private anomalies: AnomalyDetection[] = [];
  
  // Time series data storage (in production, use proper time series database)
  private readonly dataRetentionDays = 90;
  private readonly predictionHorizonHours = 24;

  constructor() {
    this.initializePredictionModels();
    this.logger.log('🔮 Predictive Analytics System initialized');
  }

  /**
   * Record metric data for analysis
   */
  recordMetric(metric: string, value: number, timestamp?: Date): void {
    const data = this.historicalData.get(metric) || [];
    data.push({
      timestamp: timestamp || new Date(),
      value,
    });
    
    // Keep only recent data
    const cutoffTime = Date.now() - (this.dataRetentionDays * 24 * 60 * 60 * 1000);
    const filteredData = data.filter(point => point.timestamp.getTime() > cutoffTime);
    
    this.historicalData.set(metric, filteredData);
    
    // Check for anomalies in real-time
    this.detectAnomaly(metric, value, timestamp || new Date());
  }

  /**
   * Generate predictions for all active models
   */
  async generatePredictions(): Promise<Prediction[]> {
    const activeModels = Array.from(this.models.values()).filter(m => m.status === 'active');
    const predictions: Prediction[] = [];
    
    for (const model of activeModels) {
      try {
        const prediction = await this.generatePrediction(model);
        if (prediction) {
          predictions.push(prediction);
          this.predictions.set(prediction.id, prediction);
        }
      } catch (error) {
        this.logger.error(`Failed to generate prediction for model ${model.id}:`, error);
      }
    }
    
    return predictions;
  }

  /**
   * Get capacity forecast
   */
  getCapacityForecast(): CapacityForecast {
    const systemMetrics = {
      cpu: this.getLatestValue('system.cpu.usage'),
      memory: this.getLatestValue('system.memory.usage'),
      disk: this.getLatestValue('system.disk.usage'),
      network: this.getLatestValue('system.network.usage'),
    };

    // Generate forecasts for each metric
    const cpuForecast = this.forecastCapacity('system.cpu.usage', 80); // 80% threshold
    const memoryForecast = this.forecastCapacity('system.memory.usage', 85); // 85% threshold
    const diskForecast = this.forecastCapacity('system.disk.usage', 90); // 90% threshold
    
    // Find most critical metric
    const forecasts = [cpuForecast, memoryForecast, diskForecast];
    const criticalForecast = forecasts.reduce((min, forecast) => 
      forecast.timeToLimit < min.timeToLimit ? forecast : min
    );

    return {
      metric: criticalForecast.metric,
      currentUsage: criticalForecast.currentUsage,
      forecastedUsage: criticalForecast.forecastedUsage,
      timeToLimit: criticalForecast.timeToLimit,
      recommendedActions: this.generateCapacityRecommendations(forecasts),
      scalingRecommendations: {
        cpu: {
          current: systemMetrics.cpu,
          recommended: this.calculateRecommendedCapacity('cpu', systemMetrics.cpu, cpuForecast.timeToLimit),
          timing: this.getScalingTiming(cpuForecast.timeToLimit),
        },
        memory: {
          current: systemMetrics.memory,
          recommended: this.calculateRecommendedCapacity('memory', systemMetrics.memory, memoryForecast.timeToLimit),
          timing: this.getScalingTiming(memoryForecast.timeToLimit),
        },
        storage: {
          current: systemMetrics.disk,
          recommended: this.calculateRecommendedCapacity('storage', systemMetrics.disk, diskForecast.timeToLimit),
          timing: this.getScalingTiming(diskForecast.timeToLimit),
        },
        network: {
          current: systemMetrics.network || 50,
          recommended: this.calculateRecommendedCapacity('network', systemMetrics.network || 50, 72),
          timing: 'within_month',
        },
      },
    };
  }

  /**
   * Get recent anomalies
   */
  getAnomalies(hours: number = 24): AnomalyDetection[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.anomalies
      .filter(anomaly => anomaly.timestamp.getTime() > cutoffTime)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get prediction by model ID
   */
  getPrediction(modelId: string): Prediction | null {
    return Array.from(this.predictions.values()).find(p => p.modelId === modelId) || null;
  }

  /**
   * Get trend analysis for metric
   */
  getTrendAnalysis(metric: string, hours: number = 24): {
    trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    changePercent: number;
    confidence: number;
    volatility: number;
  } {
    const data = this.getMetricData(metric, hours);
    if (data.length < 10) {
      return { trend: 'stable', changePercent: 0, confidence: 0, volatility: 0 };
    }

    // Calculate linear regression
    const regression = this.calculateLinearRegression(data);
    const changePercent = (regression.slope * hours) / (data[0]?.value || 1) * 100;
    
    // Calculate volatility (standard deviation)
    const values = data.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const volatility = Math.sqrt(variance) / mean * 100;

    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    if (volatility > 20) {
      trend = 'volatile';
    } else if (Math.abs(changePercent) < 5) {
      trend = 'stable';
    } else if (changePercent > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    return {
      trend,
      changePercent,
      confidence: regression.correlation,
      volatility,
    };
  }

  /**
   * Periodic prediction generation
   */
  @Cron(CronExpression.EVERY_HOUR)
  async performPredictiveAnalysis(): Promise<void> {
    try {
      const predictions = await this.generatePredictions();
      this.logger.log(`🔮 Generated ${predictions.length} predictions`);
      
      // Check for critical predictions
      const criticalPredictions = predictions.filter(p => p.insights.severity === 'critical');
      if (criticalPredictions.length > 0) {
        this.logger.warn(`⚠️ ${criticalPredictions.length} critical predictions detected`);
        // Emit events for alerting system
      }

    } catch (error) {
      this.logger.error('Failed to perform predictive analysis:', error);
    }
  }

  /**
   * Cleanup old data and predictions
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  cleanupOldData(): void {
    const cutoffTime = Date.now() - (this.dataRetentionDays * 24 * 60 * 60 * 1000);
    
    // Cleanup historical data
    for (const [metric, data] of this.historicalData.entries()) {
      const filteredData = data.filter(point => point.timestamp.getTime() > cutoffTime);
      this.historicalData.set(metric, filteredData);
    }
    
    // Cleanup old predictions
    for (const [id, prediction] of this.predictions.entries()) {
      if (prediction.timestamp.getTime() < cutoffTime) {
        this.predictions.delete(id);
      }
    }
    
    // Cleanup old anomalies
    this.anomalies = this.anomalies.filter(anomaly => anomaly.timestamp.getTime() > cutoffTime);
    
    this.logger.debug('🧹 Cleaned up old predictive data');
  }

  /**
   * Private helper methods
   */
  private async generatePrediction(model: PredictionModel): Promise<Prediction | null> {
    const targetData = this.getMetricData(model.config.targetMetric, 168); // 7 days of data
    
    if (targetData.length < 24) { // Need at least 24 data points
      this.logger.warn(`Insufficient data for model ${model.id}: ${targetData.length} points`);
      return null;
    }

    // Generate prediction based on algorithm
    const predictions = this.predict(targetData, model);
    const insights = this.generateInsights(predictions, model);
    
    return {
      id: this.generateId('prediction'),
      modelId: model.id,
      timestamp: new Date(),
      targetMetric: model.config.targetMetric,
      predictions,
      insights,
      metadata: {
        dataPoints: targetData.length,
        timeRange: '7d',
        accuracy: model.accuracy,
        modelVersion: model.version,
      },
    };
  }

  private predict(data: Array<{ timestamp: Date; value: number }>, model: PredictionModel): Prediction['predictions'] {
    const predictions: Prediction['predictions'] = [];
    
    // Simple prediction algorithms (in production, use proper ML models)
    switch (model.config.algorithm) {
      case 'linear_regression':
        return this.predictLinearRegression(data, model.timeHorizon);
      case 'moving_average':
        return this.predictMovingAverage(data, model.timeHorizon);
      case 'exponential_smoothing':
        return this.predictExponentialSmoothing(data, model.timeHorizon);
      default:
        return this.predictMovingAverage(data, model.timeHorizon);
    }
  }

  private predictLinearRegression(data: Array<{ timestamp: Date; value: number }>, hours: number): Prediction['predictions'] {
    const regression = this.calculateLinearRegression(data);
    const predictions: Prediction['predictions'] = [];
    
    const startTime = data[data.length - 1].timestamp.getTime();
    const hourMs = 60 * 60 * 1000;
    
    for (let i = 1; i <= hours; i++) {
      const futureTime = new Date(startTime + (i * hourMs));
      const predictedValue = regression.intercept + (regression.slope * i);
      const confidence = Math.max(0, Math.min(100, regression.correlation * 100));
      
      predictions.push({
        timestamp: futureTime,
        value: Math.max(0, predictedValue),
        confidence,
        range: {
          min: Math.max(0, predictedValue * 0.9),
          max: predictedValue * 1.1,
        },
      });
    }
    
    return predictions;
  }

  private predictMovingAverage(data: Array<{ timestamp: Date; value: number }>, hours: number): Prediction['predictions'] {
    const windowSize = Math.min(24, data.length); // 24-hour window
    const recentData = data.slice(-windowSize);
    const average = recentData.reduce((sum, point) => sum + point.value, 0) / recentData.length;
    
    const predictions: Prediction['predictions'] = [];
    const startTime = data[data.length - 1].timestamp.getTime();
    const hourMs = 60 * 60 * 1000;
    
    for (let i = 1; i <= hours; i++) {
      const futureTime = new Date(startTime + (i * hourMs));
      
      predictions.push({
        timestamp: futureTime,
        value: average,
        confidence: 70,
        range: {
          min: average * 0.85,
          max: average * 1.15,
        },
      });
    }
    
    return predictions;
  }

  private predictExponentialSmoothing(data: Array<{ timestamp: Date; value: number }>, hours: number): Prediction['predictions'] {
    const alpha = 0.3; // Smoothing factor
    let smoothedValue = data[0].value;
    
    // Calculate smoothed values
    for (let i = 1; i < data.length; i++) {
      smoothedValue = alpha * data[i].value + (1 - alpha) * smoothedValue;
    }
    
    const predictions: Prediction['predictions'] = [];
    const startTime = data[data.length - 1].timestamp.getTime();
    const hourMs = 60 * 60 * 1000;
    
    for (let i = 1; i <= hours; i++) {
      const futureTime = new Date(startTime + (i * hourMs));
      
      predictions.push({
        timestamp: futureTime,
        value: smoothedValue,
        confidence: 75,
        range: {
          min: smoothedValue * 0.9,
          max: smoothedValue * 1.1,
        },
      });
    }
    
    return predictions;
  }

  private generateInsights(predictions: Prediction['predictions'], model: PredictionModel): Prediction['insights'] {
    if (predictions.length === 0) {
      return {
        trend: 'stable',
        severity: 'low',
        recommendations: [],
        riskFactors: [],
      };
    }

    const firstValue = predictions[0].value;
    const lastValue = predictions[predictions.length - 1].value;
    const changePercent = ((lastValue - firstValue) / firstValue) * 100;
    
    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    if (Math.abs(changePercent) < 5) {
      trend = 'stable';
    } else if (changePercent > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }
    
    // Check for volatility
    const values = predictions.map(p => p.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const volatility = Math.sqrt(variance) / mean * 100;
    
    if (volatility > 20) {
      trend = 'volatile';
    }

    // Determine severity
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (model.config.targetMetric.includes('cpu') && lastValue > 90) severity = 'critical';
    else if (model.config.targetMetric.includes('memory') && lastValue > 85) severity = 'critical';
    else if (model.config.targetMetric.includes('disk') && lastValue > 90) severity = 'critical';
    else if (changePercent > 50) severity = 'high';
    else if (changePercent > 25) severity = 'medium';

    // Generate recommendations
    const recommendations = this.generateRecommendations(model.config.targetMetric, trend, severity, changePercent);
    
    // Generate risk factors
    const riskFactors = this.generateRiskFactors(model.config.targetMetric, predictions);

    return {
      trend,
      severity,
      recommendations,
      riskFactors,
    };
  }

  private generateRecommendations(metric: string, trend: string, severity: string, changePercent: number): string[] {
    const recommendations: string[] = [];
    
    if (severity === 'critical') {
      recommendations.push('Immediate action required - system approaching critical limits');
    }
    
    if (trend === 'increasing' && changePercent > 25) {
      if (metric.includes('cpu')) {
        recommendations.push('Consider CPU scaling or optimization');
        recommendations.push('Review high CPU consuming processes');
      } else if (metric.includes('memory')) {
        recommendations.push('Consider memory scaling or optimization');
        recommendations.push('Check for memory leaks');
      } else if (metric.includes('disk')) {
        recommendations.push('Consider storage scaling or cleanup');
        recommendations.push('Implement log rotation and cleanup policies');
      }
    }
    
    if (trend === 'volatile') {
      recommendations.push('Investigate cause of high volatility');
      recommendations.push('Consider implementing smoothing or caching');
    }
    
    return recommendations;
  }

  private generateRiskFactors(metric: string, predictions: Prediction['predictions']): Array<{ factor: string; impact: number; probability: number }> {
    const riskFactors: Array<{ factor: string; impact: number; probability: number }> = [];
    
    // Analyze prediction trends for risk factors
    const maxValue = Math.max(...predictions.map(p => p.value));
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
    
    if (maxValue > 80) {
      riskFactors.push({
        factor: 'Resource exhaustion',
        impact: 90,
        probability: 70,
      });
    }
    
    if (avgConfidence < 60) {
      riskFactors.push({
        factor: 'Prediction uncertainty',
        impact: 50,
        probability: 80,
      });
    }
    
    return riskFactors;
  }

  private detectAnomaly(metric: string, value: number, timestamp: Date): void {
    const recentData = this.getMetricData(metric, 24); // Last 24 hours
    
    if (recentData.length < 10) return; // Need sufficient data
    
    const values = recentData.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
    
    // Z-score anomaly detection
    const zScore = Math.abs((value - mean) / stdDev);
    
    if (zScore > 2) { // Threshold for anomaly
      const deviationPercent = ((value - mean) / mean) * 100;
      let severity: 'low' | 'medium' | 'high' | 'critical';
      
      if (zScore > 4) severity = 'critical';
      else if (zScore > 3) severity = 'high';
      else if (zScore > 2.5) severity = 'medium';
      else severity = 'low';
      
      const anomaly: AnomalyDetection = {
        timestamp,
        metric,
        value,
        expectedValue: mean,
        deviationPercent,
        severity,
        confidence: Math.min(100, zScore * 25), // Convert z-score to confidence %
        context: {
          historicalPattern: this.getHistoricalPattern(metric),
          possibleCauses: this.getPossibleCauses(metric, deviationPercent),
          relatedMetrics: this.getRelatedMetrics(metric, timestamp),
        },
      };
      
      this.anomalies.push(anomaly);
      this.logger.warn(`🚨 Anomaly detected: ${metric} = ${value} (expected: ${mean.toFixed(2)}, deviation: ${deviationPercent.toFixed(1)}%)`);
    }
  }

  private getHistoricalPattern(metric: string): string {
    const data = this.getMetricData(metric, 168); // 7 days
    const trend = this.getTrendAnalysis(metric, 168);
    
    return `${trend.trend} trend with ${trend.volatility.toFixed(1)}% volatility`;
  }

  private getPossibleCauses(metric: string, deviationPercent: number): string[] {
    const causes: string[] = [];
    
    if (metric.includes('cpu')) {
      causes.push('High load processes', 'Resource contention', 'Inefficient algorithms');
    } else if (metric.includes('memory')) {
      causes.push('Memory leaks', 'Large data processing', 'Cache buildup');
    } else if (metric.includes('disk')) {
      causes.push('Large file operations', 'Log accumulation', 'Database growth');
    } else if (metric.includes('network')) {
      causes.push('High traffic', 'Network congestion', 'DDoS attack');
    }
    
    if (Math.abs(deviationPercent) > 100) {
      causes.push('System malfunction', 'Data corruption', 'External interference');
    }
    
    return causes;
  }

  private getRelatedMetrics(metric: string, timestamp: Date): Array<{ metric: string; correlation: number; isAnomaly: boolean }> {
    // Simplified correlation analysis
    const relatedMetrics: Array<{ metric: string; correlation: number; isAnomaly: boolean }> = [];
    
    // In production, implement proper correlation analysis
    return relatedMetrics;
  }

  private forecastCapacity(metric: string, threshold: number): {
    metric: string;
    currentUsage: number;
    forecastedUsage: number;
    timeToLimit: number;
  } {
    const currentUsage = this.getLatestValue(metric);
    const trend = this.getTrendAnalysis(metric, 24);
    
    // Calculate time to reach threshold
    let timeToLimit = Infinity;
    if (trend.trend === 'increasing' && trend.changePercent > 0) {
      const remainingCapacity = threshold - currentUsage;
      const hourlyGrowthRate = (currentUsage * trend.changePercent / 100) / 24;
      
      if (hourlyGrowthRate > 0) {
        timeToLimit = remainingCapacity / hourlyGrowthRate;
      }
    }
    
    const forecastedUsage = currentUsage + (currentUsage * trend.changePercent / 100);
    
    return {
      metric,
      currentUsage,
      forecastedUsage,
      timeToLimit: Math.max(0, timeToLimit),
    };
  }

  private generateCapacityRecommendations(forecasts: Array<{ timeToLimit: number; metric: string }>): Array<{
    action: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    timeframe: string;
    impact: string;
  }> {
    const recommendations: Array<{
      action: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      timeframe: string;
      impact: string;
    }> = [];
    
    const urgentForecasts = forecasts.filter(f => f.timeToLimit < 24);
    const criticalForecasts = forecasts.filter(f => f.timeToLimit < 72);
    
    if (urgentForecasts.length > 0) {
      recommendations.push({
        action: 'Immediate scaling required',
        priority: 'urgent',
        timeframe: 'within_hours',
        impact: 'Prevent system outage',
      });
    }
    
    if (criticalForecasts.length > 0) {
      recommendations.push({
        action: 'Plan capacity scaling',
        priority: 'high',
        timeframe: 'within_days',
        impact: 'Maintain system performance',
      });
    }
    
    return recommendations;
  }

  private calculateRecommendedCapacity(resource: string, current: number, timeToLimit: number): number {
    if (timeToLimit < 24) {
      return current * 2; // Double capacity for urgent cases
    } else if (timeToLimit < 72) {
      return current * 1.5; // 50% increase for high priority
    } else if (timeToLimit < 168) {
      return current * 1.25; // 25% increase for medium priority
    } else {
      return current * 1.1; // 10% increase for low priority
    }
  }

  private getScalingTiming(timeToLimit: number): string {
    if (timeToLimit < 24) return 'immediately';
    if (timeToLimit < 72) return 'within_week';
    if (timeToLimit < 168) return 'within_month';
    return 'within_quarter';
  }

  private getMetricData(metric: string, hours: number): Array<{ timestamp: Date; value: number }> {
    const data = this.historicalData.get(metric) || [];
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    
    return data
      .filter(point => point.timestamp.getTime() > cutoffTime)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private getLatestValue(metric: string): number {
    const data = this.historicalData.get(metric) || [];
    return data.length > 0 ? data[data.length - 1].value : 0;
  }

  private calculateLinearRegression(data: Array<{ timestamp: Date; value: number }>): {
    slope: number;
    intercept: number;
    correlation: number;
  } {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: 0, correlation: 0 };
    
    const x = data.map((_, i) => i);
    const y = data.map(d => d.value);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate correlation coefficient
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    const correlation = denominator !== 0 ? Math.abs(numerator / denominator) : 0;
    
    return { slope, intercept, correlation };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializePredictionModels(): void {
    const defaultModels: Omit<PredictionModel, 'id'>[] = [
      {
        name: 'CPU Usage Prediction',
        type: 'capacity_planning',
        description: 'Predicts CPU usage trends for capacity planning',
        metrics: ['system.cpu.usage'],
        timeHorizon: 24,
        accuracy: 85,
        lastTrained: new Date(),
        version: '1.0',
        config: {
          algorithm: 'linear_regression',
          parameters: { lookback: 168 },
          features: ['system.cpu.usage', 'system.load.average'],
          targetMetric: 'system.cpu.usage',
        },
        status: 'active',
      },
      {
        name: 'Memory Usage Forecast',
        type: 'capacity_planning',
        description: 'Forecasts memory usage for scaling decisions',
        metrics: ['system.memory.usage'],
        timeHorizon: 24,
        accuracy: 80,
        lastTrained: new Date(),
        version: '1.0',
        config: {
          algorithm: 'exponential_smoothing',
          parameters: { alpha: 0.3 },
          features: ['system.memory.usage', 'application.active.users'],
          targetMetric: 'system.memory.usage',
        },
        status: 'active',
      },
      {
        name: 'Disk Usage Predictor',
        type: 'capacity_planning',
        description: 'Predicts disk usage growth patterns',
        metrics: ['system.disk.usage'],
        timeHorizon: 168, // 7 days
        accuracy: 90,
        lastTrained: new Date(),
        version: '1.0',
        config: {
          algorithm: 'linear_regression',
          parameters: { lookback: 336 },
          features: ['system.disk.usage', 'business.total.resumes'],
          targetMetric: 'system.disk.usage',
        },
        status: 'active',
      },
      {
        name: 'Performance Anomaly Detector',
        type: 'anomaly_detection',
        description: 'Detects performance anomalies in real-time',
        metrics: ['application.response.time', 'application.error.rate'],
        timeHorizon: 1,
        accuracy: 75,
        lastTrained: new Date(),
        version: '1.0',
        config: {
          algorithm: 'moving_average',
          parameters: { window: 24, threshold: 2 },
          features: ['application.response.time', 'application.throughput'],
          targetMetric: 'application.response.time',
        },
        status: 'active',
      },
    ];

    defaultModels.forEach(modelData => {
      const model: PredictionModel = {
        id: this.generateId('model'),
        ...modelData,
      };
      this.models.set(model.id, model);
    });

    this.logger.log(`✅ Initialized ${this.models.size} prediction models`);
  }
}