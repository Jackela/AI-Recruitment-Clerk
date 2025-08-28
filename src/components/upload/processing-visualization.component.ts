/**
 * Real-Time Processing Visualization Component
 * Interactive progress tracking with step-by-step breakdown and animations
 */

import { Component, Input, Output, EventEmitter, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate, keyframes, sequence } from '@angular/animations';
import { 
  ProcessingStep, 
  ProcessingStepResult, 
  UploadSession, 
  QueueItem, 
  PerformanceMetrics 
} from './upload-system-architecture';

interface ProcessingVisualizationConfig {
  showDetailedSteps: boolean;
  enableAnimations: boolean;
  showPerformanceMetrics: boolean;
  showTimeEstimates: boolean;
  autoScroll: boolean;
  showResourceUsage: boolean;
  compactMode: boolean;
}

interface StepVisualization extends ProcessingStepResult {
  icon: string;
  color: string;
  description: string;
  estimatedDuration: number;
  actualDuration?: number;
  subSteps?: SubStep[];
  insights?: ProcessingInsight[];
}

interface SubStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  details?: string;
}

interface ProcessingInsight {
  type: 'optimization' | 'quality' | 'security' | 'performance';
  message: string;
  severity: 'info' | 'warning' | 'error';
  actionable: boolean;
  action?: string;
}

interface AnimationState {
  pulseActive: boolean;
  glowActive: boolean;
  progressActive: boolean;
  completionBurst: boolean;
}

@Component({
  selector: 'arc-processing-visualization',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('stepAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition('pending => running', [
        sequence([
          animate('200ms ease-in', style({ transform: 'scale(1.05)' })),
          animate('200ms ease-out', style({ transform: 'scale(1)' }))
        ])
      ]),
      transition('running => completed', [
        sequence([
          animate('300ms ease-out', keyframes([
            style({ transform: 'scale(1)', opacity: 1, offset: 0 }),
            style({ transform: 'scale(1.1)', opacity: 0.8, offset: 0.5 }),
            style({ transform: 'scale(1)', opacity: 1, offset: 1 })
          ])),
          animate('200ms ease-in', style({ backgroundColor: '#10b981' }))
        ])
      ])
    ]),
    trigger('progressPulse', [
      state('active', style({ transform: 'scale(1.02)', boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)' })),
      state('inactive', style({ transform: 'scale(1)', boxShadow: 'none' })),
      transition('inactive => active', animate('600ms ease-in-out')),
      transition('active => inactive', animate('600ms ease-in-out'))
    ]),
    trigger('completionBurst', [
      transition(':enter', [
        style({ transform: 'scale(0) rotate(0deg)', opacity: 0 }),
        animate('500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)', 
          style({ transform: 'scale(1) rotate(360deg)', opacity: 1 }))
      ])
    ]),
    trigger('slideInOut', [
      transition(':enter', [
        style({ height: '0', opacity: 0 }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ height: '0', opacity: 0 }))
      ])
    ])
  ],
  template: `
    <div class="processing-visualization" 
         [class.compact]="config.compactMode"
         [class.detailed]="config.showDetailedSteps">
      
      <!-- Header with Overall Progress -->
      <div class="visualization-header">
        <div class="overall-progress">
          <div class="progress-info">
            <h3>{{ getOverallStatusText() }}</h3>
            <p class="progress-details">
              {{ getProgressDetails() }}
            </p>
          </div>
          
          <div class="progress-circle" 
               [@progressPulse]="animationState().progressActive ? 'active' : 'inactive'">
            <svg class="progress-ring" width="80" height="80">
              <circle class="progress-ring-background" 
                      cx="40" cy="40" r="36" 
                      stroke="#e5e7eb" 
                      stroke-width="4" 
                      fill="transparent"/>
              <circle class="progress-ring-progress" 
                      cx="40" cy="40" r="36" 
                      stroke="#3b82f6" 
                      stroke-width="4" 
                      fill="transparent"
                      [style.stroke-dasharray]="getCircumference()"
                      [style.stroke-dashoffset]="getProgressOffset()"
                      transform="rotate(-90 40 40)"/>
            </svg>
            <div class="progress-text">
              <span class="percentage">{{ Math.round(overallProgress()) }}%</span>
            </div>
          </div>
        </div>
        
        <!-- Time and Performance Info -->
        <div class="time-info" *ngIf="config.showTimeEstimates">
          <div class="time-item">
            <span class="time-label">已用时间</span>
            <span class="time-value">{{ formatDuration(elapsedTime()) }}</span>
          </div>
          <div class="time-item">
            <span class="time-label">预计剩余</span>
            <span class="time-value">{{ formatDuration(estimatedTimeRemaining()) }}</span>
          </div>
          <div class="time-item" *ngIf="config.showPerformanceMetrics">
            <span class="time-label">处理速度</span>
            <span class="time-value">{{ formatSpeed(processingSpeed()) }}</span>
          </div>
        </div>
      </div>
      
      <!-- Processing Steps -->
      <div class="processing-steps">
        <div class="steps-timeline">
          <div class="step-item" 
               *ngFor="let step of visualizationSteps(); trackBy: trackByStepId"
               [class]="getStepClasses(step)"
               [@stepAnimation]="step.status">
            
            <!-- Step Icon and Status -->
            <div class="step-icon">
              <div class="icon-container" [style.background-color]="step.color">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path [attr.d]="getStepIconPath(step.icon)"></path>
                </svg>
              </div>
              
              <!-- Connector Line -->
              <div class="step-connector" 
                   [class.active]="isStepCompleted(step)"
                   *ngIf="!isLastStep(step)"></div>
            </div>
            
            <!-- Step Content -->
            <div class="step-content">
              <div class="step-header">
                <h4 class="step-name">{{ step.name }}</h4>
                <div class="step-status">
                  <span class="status-badge" [class]="'status-' + step.status">
                    {{ getStatusText(step.status) }}
                  </span>
                  <span class="step-duration" *ngIf="step.actualDuration">
                    {{ formatDuration(step.actualDuration) }}
                  </span>
                </div>
              </div>
              
              <p class="step-description">{{ step.description }}</p>
              
              <!-- Step Progress Bar -->
              <div class="step-progress" *ngIf="step.status === 'running'">
                <div class="progress-bar">
                  <div class="progress-fill" 
                       [style.width.%]="step.progress"
                       [class.animated]="config.enableAnimations"></div>
                </div>
                <span class="progress-percentage">{{ Math.round(step.progress) }}%</span>
              </div>
              
              <!-- Sub Steps -->
              <div class="sub-steps" 
                   *ngIf="config.showDetailedSteps && step.subSteps && step.subSteps.length > 0"
                   [@slideInOut]>
                <div class="sub-step" 
                     *ngFor="let subStep of step.subSteps"
                     [class]="'sub-step-' + subStep.status">
                  <div class="sub-step-icon">
                    <div class="sub-step-dot" [class]="'dot-' + subStep.status"></div>
                  </div>
                  <div class="sub-step-content">
                    <span class="sub-step-name">{{ subStep.name }}</span>
                    <div class="sub-step-progress" *ngIf="subStep.status === 'running'">
                      <div class="mini-progress-bar">
                        <div class="mini-progress-fill" [style.width.%]="subStep.progress"></div>
                      </div>
                    </div>
                    <span class="sub-step-details" *ngIf="subStep.details">{{ subStep.details }}</span>
                  </div>
                </div>
              </div>
              
              <!-- Processing Insights -->
              <div class="step-insights" 
                   *ngIf="step.insights && step.insights.length > 0"
                   [@slideInOut]>
                <div class="insight" 
                     *ngFor="let insight of step.insights"
                     [class]="'insight-' + insight.type + ' insight-' + insight.severity">
                  <div class="insight-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path [attr.d]="getInsightIconPath(insight.type)"></path>
                    </svg>
                  </div>
                  <div class="insight-content">
                    <span class="insight-message">{{ insight.message }}</span>
                    <button class="insight-action" 
                            *ngIf="insight.actionable && insight.action"
                            (click)="executeInsightAction(insight)">
                      {{ insight.action }}
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Error Display -->
              <div class="step-error" 
                   *ngIf="step.status === 'failed' && step.error"
                   [@slideInOut]>
                <div class="error-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                  <span>处理失败</span>
                </div>
                <p class="error-message">{{ step.error }}</p>
                <button class="retry-button" (click)="retryStep(step.stepId)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23,4 23,10 17,10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                  重试
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Resource Usage Monitor -->
      <div class="resource-monitor" 
           *ngIf="config.showResourceUsage && resourceUsage()"
           [@slideInOut]>
        <h4>资源使用情况</h4>
        <div class="resource-meters">
          <div class="resource-meter">
            <span class="resource-label">CPU</span>
            <div class="meter-bar">
              <div class="meter-fill" 
                   [style.width.%]="resourceUsage()?.cpuUsage || 0"
                   [class]="getCpuUsageClass(resourceUsage()?.cpuUsage || 0)"></div>
            </div>
            <span class="resource-value">{{ Math.round(resourceUsage()?.cpuUsage || 0) }}%</span>
          </div>
          
          <div class="resource-meter">
            <span class="resource-label">内存</span>
            <div class="meter-bar">
              <div class="meter-fill" 
                   [style.width.%]="getMemoryUsagePercent()"
                   [class]="getMemoryUsageClass(getMemoryUsagePercent())"></div>
            </div>
            <span class="resource-value">{{ formatBytes(resourceUsage()?.memoryUsage || 0) }}</span>
          </div>
          
          <div class="resource-meter">
            <span class="resource-label">网络</span>
            <div class="meter-bar">
              <div class="meter-fill" 
                   [style.width.%]="getNetworkUsagePercent()"
                   class="meter-network"></div>
            </div>
            <span class="resource-value">{{ formatBandwidth(resourceUsage()?.networkBandwidth || 0) }}</span>
          </div>
        </div>
      </div>
      
      <!-- Performance Metrics -->
      <div class="performance-metrics" 
           *ngIf="config.showPerformanceMetrics && performanceMetrics()"
           [@slideInOut]>
        <h4>性能指标</h4>
        <div class="metrics-grid">
          <div class="metric-item">
            <span class="metric-label">上传速度</span>
            <span class="metric-value">{{ formatBandwidth(performanceMetrics()?.uploadSpeed || 0) }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">处理速度</span>
            <span class="metric-value">{{ performanceMetrics()?.processingSpeed.toFixed(1) || 0 }} 文件/分</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">错误率</span>
            <span class="metric-value" [class]="getErrorRateClass(performanceMetrics()?.errorRate || 0)">
              {{ ((performanceMetrics()?.errorRate || 0) * 100).toFixed(1) }}%
            </span>
          </div>
          <div class="metric-item">
            <span class="metric-label">质量得分</span>
            <span class="metric-value" [class]="getQualityScoreClass(performanceMetrics()?.averageQualityScore || 0)">
              {{ ((performanceMetrics()?.averageQualityScore || 0) * 100).toFixed(0) }}/100
            </span>
          </div>
        </div>
      </div>
      
      <!-- Completion Animation -->
      <div class="completion-animation" 
           *ngIf="isCompleted() && animationState().completionBurst"
           [@completionBurst]>
        <div class="success-burst">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22,4 12,14.01 9,11.01"></polyline>
          </svg>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .processing-visualization {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    .visualization-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1.5rem;
    }
    
    .overall-progress {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    
    .progress-info h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    
    .progress-details {
      opacity: 0.9;
      font-size: 0.875rem;
    }
    
    .progress-circle {
      position: relative;
      transition: all 0.3s ease;
    }
    
    .progress-ring {
      transform: rotate(-90deg);
    }
    
    .progress-ring-progress {
      transition: stroke-dashoffset 0.5s ease;
    }
    
    .progress-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }
    
    .percentage {
      font-size: 1.125rem;
      font-weight: 700;
    }
    
    .time-info {
      display: flex;
      gap: 2rem;
      flex-wrap: wrap;
    }
    
    .time-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .time-label {
      font-size: 0.75rem;
      opacity: 0.8;
      margin-bottom: 0.25rem;
    }
    
    .time-value {
      font-size: 1rem;
      font-weight: 600;
    }
    
    .processing-steps {
      padding: 1.5rem;
    }
    
    .steps-timeline {
      position: relative;
    }
    
    .step-item {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
      position: relative;
    }
    
    .step-item:last-child {
      margin-bottom: 0;
    }
    
    .step-icon {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;
    }
    
    .icon-container {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      transition: all 0.3s ease;
    }
    
    .step-connector {
      width: 2px;
      height: 2rem;
      background: #e5e7eb;
      margin-top: 0.5rem;
      transition: background-color 0.3s ease;
    }
    
    .step-connector.active {
      background: #10b981;
    }
    
    .step-content {
      flex: 1;
      min-width: 0;
    }
    
    .step-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5rem;
    }
    
    .step-name {
      font-size: 1rem;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }
    
    .step-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .status-pending {
      background: #f3f4f6;
      color: #6b7280;
    }
    
    .status-running {
      background: #dbeafe;
      color: #1d4ed8;
    }
    
    .status-completed {
      background: #d1fae5;
      color: #065f46;
    }
    
    .status-failed {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .step-duration {
      font-size: 0.75rem;
      color: #6b7280;
    }
    
    .step-description {
      color: #6b7280;
      font-size: 0.875rem;
      margin-bottom: 0.75rem;
    }
    
    .step-progress {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }
    
    .progress-bar {
      flex: 1;
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #1d4ed8);
      border-radius: 3px;
      transition: width 0.3s ease;
    }
    
    .progress-fill.animated {
      animation: progressFlow 2s linear infinite;
    }
    
    @keyframes progressFlow {
      0% { background-position: -100% 0; }
      100% { background-position: 100% 0; }
    }
    
    .progress-percentage {
      font-size: 0.75rem;
      font-weight: 600;
      color: #3b82f6;
      min-width: 2.5rem;
      text-align: right;
    }
    
    .sub-steps {
      margin-left: 1rem;
      border-left: 2px solid #e5e7eb;
      padding-left: 1rem;
      margin-top: 0.75rem;
    }
    
    .sub-step {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }
    
    .sub-step-icon {
      flex-shrink: 0;
    }
    
    .sub-step-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      transition: background-color 0.3s ease;
    }
    
    .dot-pending { background: #d1d5db; }
    .dot-running { background: #3b82f6; }
    .dot-completed { background: #10b981; }
    .dot-failed { background: #ef4444; }
    
    .sub-step-content {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .sub-step-name {
      color: #374151;
    }
    
    .sub-step-progress {
      flex: 1;
      max-width: 100px;
    }
    
    .mini-progress-bar {
      height: 4px;
      background: #e5e7eb;
      border-radius: 2px;
      overflow: hidden;
    }
    
    .mini-progress-fill {
      height: 100%;
      background: #3b82f6;
      transition: width 0.3s ease;
    }
    
    .sub-step-details {
      font-size: 0.75rem;
      color: #6b7280;
    }
    
    .step-insights {
      margin-top: 0.75rem;
    }
    
    .insight {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.75rem;
      border-radius: 6px;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }
    
    .insight-optimization {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
    }
    
    .insight-quality {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
    }
    
    .insight-security {
      background: #fef2f2;
      border: 1px solid #fecaca;
    }
    
    .insight-performance {
      background: #fffbeb;
      border: 1px solid #fed7aa;
    }
    
    .insight-icon {
      flex-shrink: 0;
      margin-top: 0.125rem;
    }
    
    .insight-content {
      flex: 1;
    }
    
    .insight-message {
      display: block;
      margin-bottom: 0.5rem;
    }
    
    .insight-action {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    
    .insight-action:hover {
      background: #2563eb;
    }
    
    .step-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      padding: 0.75rem;
      margin-top: 0.75rem;
    }
    
    .error-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #991b1b;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    
    .error-message {
      color: #6b7280;
      font-size: 0.875rem;
      margin-bottom: 0.75rem;
    }
    
    .retry-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #ef4444;
      color: white;
      border: none;
      padding: 0.5rem 0.75rem;
      border-radius: 4px;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    
    .retry-button:hover {
      background: #dc2626;
    }
    
    .resource-monitor, .performance-metrics {
      margin: 1.5rem;
      padding: 1rem;
      background: #f9fafb;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    
    .resource-monitor h4, .performance-metrics h4 {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.75rem;
    }
    
    .resource-meters {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .resource-meter {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .resource-label {
      font-size: 0.75rem;
      color: #6b7280;
      min-width: 3rem;
    }
    
    .meter-bar {
      flex: 1;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .meter-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    
    .meter-cpu-low { background: #10b981; }
    .meter-cpu-medium { background: #f59e0b; }
    .meter-cpu-high { background: #ef4444; }
    
    .meter-memory-low { background: #3b82f6; }
    .meter-memory-medium { background: #f59e0b; }
    .meter-memory-high { background: #ef4444; }
    
    .meter-network { background: #8b5cf6; }
    
    .resource-value {
      font-size: 0.75rem;
      font-weight: 600;
      color: #374151;
      min-width: 4rem;
      text-align: right;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 0.75rem;
    }
    
    .metric-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.75rem;
      background: white;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    
    .metric-label {
      font-size: 0.75rem;
      color: #6b7280;
      margin-bottom: 0.25rem;
    }
    
    .metric-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: #111827;
    }
    
    .metric-value.error-low { color: #10b981; }
    .metric-value.error-medium { color: #f59e0b; }
    .metric-value.error-high { color: #ef4444; }
    
    .metric-value.quality-excellent { color: #10b981; }
    .metric-value.quality-good { color: #3b82f6; }
    .metric-value.quality-fair { color: #f59e0b; }
    .metric-value.quality-poor { color: #ef4444; }
    
    .completion-animation {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1000;
      pointer-events: none;
    }
    
    .success-burst {
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 50%;
      padding: 1rem;
      color: white;
      box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
    }
    
    .compact .step-item {
      margin-bottom: 1rem;
    }
    
    .compact .step-description {
      display: none;
    }
    
    .compact .sub-steps {
      display: none;
    }
    
    @media (max-width: 768px) {
      .visualization-header {
        padding: 1rem;
      }
      
      .overall-progress {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }
      
      .time-info {
        justify-content: space-around;
      }
      
      .processing-steps {
        padding: 1rem;
      }
      
      .step-header {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
      }
      
      .metrics-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class ProcessingVisualizationComponent {
  @Input() session?: UploadSession;
  @Input() queueItems: QueueItem[] = [];
  @Input() config: ProcessingVisualizationConfig = {
    showDetailedSteps: true,
    enableAnimations: true,
    showPerformanceMetrics: true,
    showTimeEstimates: true,
    autoScroll: true,
    showResourceUsage: true,
    compactMode: false
  };
  
  @Output() stepRetry = new EventEmitter<string>();
  @Output() insightAction = new EventEmitter<{ insight: ProcessingInsight; stepId: string }>();
  
  // Signals for reactive state
  overallProgress = signal<number>(0);
  elapsedTime = signal<number>(0);
  estimatedTimeRemaining = signal<number>(0);
  processingSpeed = signal<number>(0);
  resourceUsage = signal<ResourceUsage | null>(null);
  performanceMetrics = signal<PerformanceMetrics | null>(null);
  animationState = signal<AnimationState>({
    pulseActive: false,
    glowActive: false,
    progressActive: false,
    completionBurst: false
  });
  
  // Computed properties
  visualizationSteps = computed<StepVisualization[]>(() => {
    if (!this.session) return [];
    
    return this.session.processingInsights
      ?.map(insight => this.createStepVisualization(insight))
      ?.filter(step => step !== null) as StepVisualization[] || [];
  });
  
  isCompleted = computed<boolean>(() => {
    return this.session?.status === 'completed';
  });
  
  // Math reference for template
  Math = Math;
  
  constructor() {
    // Effect for animation state management
    effect(() => {
      const progress = this.overallProgress();
      const isProcessing = this.session?.status === 'processing';
      
      this.animationState.update(state => ({
        ...state,
        progressActive: isProcessing && progress < 100,
        completionBurst: this.isCompleted() && progress === 100
      }));
    });
    
    // Effect for completion animation
    effect(() => {
      if (this.isCompleted()) {
        setTimeout(() => {
          this.animationState.update(state => ({
            ...state,
            completionBurst: false
          }));
        }, 3000);
      }
    });
  }
  
  private createStepVisualization(insight: any): StepVisualization {
    // This would map processing insights to step visualizations
    // For now, we'll create a mock visualization
    return {
      stepId: insight.type,
      status: 'completed',
      startTime: new Date(),
      endTime: new Date(),
      duration: 1000,
      result: {},
      progress: 100,
      icon: this.getStepIcon(insight.type),
      color: this.getStepColor(insight.type),
      description: insight.message,
      estimatedDuration: 2000,
      actualDuration: 1000,
      subSteps: [],
      insights: []
    };
  }
  
  private getStepIcon(type: string): string {
    const icons: Record<string, string> = {
      'validation': 'shield-check',
      'preprocessing': 'image',
      'ocr': 'type',
      'ai-analysis': 'brain',
      'optimization': 'zap',
      'conversion': 'refresh-cw'
    };
    return icons[type] || 'file';
  }
  
  private getStepColor(type: string): string {
    const colors: Record<string, string> = {
      'validation': '#3b82f6',
      'preprocessing': '#8b5cf6',
      'ocr': '#10b981',
      'ai-analysis': '#f59e0b',
      'optimization': '#ef4444',
      'conversion': '#6b7280'
    };
    return colors[type] || '#6b7280';
  }
  
  // Template methods
  getOverallStatusText(): string {
    if (!this.session) return '准备中...';
    
    switch (this.session.status) {
      case 'initializing': return '正在初始化...';
      case 'uploading': return '正在上传文件...';
      case 'processing': return '正在处理文件...';
      case 'completed': return '处理完成！';
      case 'failed': return '处理失败';
      default: return '准备中...';
    }
  }
  
  getProgressDetails(): string {
    if (!this.session) return '';
    
    const completed = this.session.completedFiles;
    const total = this.session.totalFiles;
    const current = this.session.currentStep;
    
    if (total > 1) {
      return `已完成 ${completed}/${total} 个文件 · 当前步骤: ${current}`;
    } else {
      return `当前步骤: ${current}`;
    }
  }
  
  getCircumference(): string {
    const radius = 36;
    return `${2 * Math.PI * radius}`;
  }
  
  getProgressOffset(): string {
    const circumference = 2 * Math.PI * 36;
    const progress = this.overallProgress();
    const offset = circumference - (progress / 100) * circumference;
    return `${offset}`;
  }
  
  getStepClasses(step: StepVisualization): string {
    const classes = [`step-${step.status}`];
    
    if (step.status === 'running') {
      classes.push('step-active');
    }
    
    return classes.join(' ');
  }
  
  getStepIconPath(icon: string): string {
    const paths: Record<string, string> = {
      'shield-check': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      'image': 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
      'type': 'M4 7v10c0 2.21 3.79 4 8.5 4s8.5-1.79 8.5-4V7M4 7c0 2.21 3.79 4 8.5 4S21 9.21 21 7M4 7c0-2.21 3.79-4 8.5-4S21 4.79 21 7',
      'brain': 'M12 2a2 2 0 00-2 2c0 1.02-.1 2.51-.26 4H8a2 2 0 00-2 2v6c0 1.1.9 2 2 2h8a2 2 0 002-2v-6a2 2 0 00-2-2h-1.74c-.16-1.49-.26-2.98-.26-4a2 2 0 00-2-2z',
      'zap': 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
      'refresh-cw': 'M1 4v6h6M23 20v-6h-6',
      'file': 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z'
    };
    return paths[icon] || paths['file'];
  }
  
  getInsightIconPath(type: string): string {
    const paths: Record<string, string> = {
      'optimization': 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
      'quality': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      'security': 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
      'performance': 'M13 10V3L4 14h7v7l9-11h-7z'
    };
    return paths[type] || paths['optimization'];
  }
  
  getStatusText(status: string): string {
    const texts: Record<string, string> = {
      'pending': '等待中',
      'running': '进行中',
      'completed': '已完成',
      'failed': '失败',
      'skipped': '已跳过'
    };
    return texts[status] || status;
  }
  
  isStepCompleted(step: StepVisualization): boolean {
    return step.status === 'completed';
  }
  
  isLastStep(step: StepVisualization): boolean {
    const steps = this.visualizationSteps();
    return steps.indexOf(step) === steps.length - 1;
  }
  
  getCpuUsageClass(usage: number): string {
    if (usage < 50) return 'meter-cpu-low';
    if (usage < 80) return 'meter-cpu-medium';
    return 'meter-cpu-high';
  }
  
  getMemoryUsagePercent(): number {
    const usage = this.resourceUsage()?.memoryUsage || 0;
    // Assuming 8GB max memory for calculation
    const maxMemory = 8 * 1024 * 1024 * 1024;
    return Math.min((usage / maxMemory) * 100, 100);
  }
  
  getMemoryUsageClass(percent: number): string {
    if (percent < 60) return 'meter-memory-low';
    if (percent < 80) return 'meter-memory-medium';
    return 'meter-memory-high';
  }
  
  getNetworkUsagePercent(): number {
    const bandwidth = this.resourceUsage()?.networkBandwidth || 0;
    // Assuming 100Mbps max for calculation
    const maxBandwidth = 100 * 1024 * 1024;
    return Math.min((bandwidth / maxBandwidth) * 100, 100);
  }
  
  getErrorRateClass(rate: number): string {
    if (rate < 0.05) return 'error-low';
    if (rate < 0.15) return 'error-medium';
    return 'error-high';
  }
  
  getQualityScoreClass(score: number): string {
    if (score >= 0.9) return 'quality-excellent';
    if (score >= 0.7) return 'quality-good';
    if (score >= 0.5) return 'quality-fair';
    return 'quality-poor';
  }
  
  formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${Math.round(milliseconds)}ms`;
    }
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
  
  formatSpeed(speed: number): string {
    return `${speed.toFixed(1)} 文件/分钟`;
  }
  
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
  
  formatBandwidth(bytesPerSecond: number): string {
    return `${this.formatBytes(bytesPerSecond)}/s`;
  }
  
  trackByStepId(index: number, step: StepVisualization): string {
    return step.stepId;
  }
  
  // Event handlers
  retryStep(stepId: string): void {
    this.stepRetry.emit(stepId);
  }
  
  executeInsightAction(insight: ProcessingInsight): void {
    // Find the step this insight belongs to
    const step = this.visualizationSteps().find(s => 
      s.insights?.some(i => i === insight)
    );
    
    if (step) {
      this.insightAction.emit({ insight, stepId: step.stepId });
    }
  }
}
