/**
 * Revolutionary Upload Experience Component
 * Master component integrating all upload systems for a complete experience
 */

import { Component, Input, Output, EventEmitter, ViewChild, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SmartDropZoneComponent } from './smart-drop-zone.component';
import { ProcessingVisualizationComponent } from './processing-visualization.component';
import { MultiModalUploadService } from './multi-modal-upload.service';
import { UploadQueueManagerService, QueueItem } from './upload-queue-manager.service';
import { AIPreprocessingService } from './ai-preprocessing.service';
import { FileManagementService, FileMetadata } from './file-management.service';
import { 
  UploadSession, 
  UploadSystemConfig, 
  DEFAULT_UPLOAD_CONFIG,
  PerformanceMetrics,
  ResourceUsage
} from './upload-system-architecture';

export interface UploadExperienceConfig {
  // Feature toggles
  enableAIPreprocessing: boolean;
  enableMultiModal: boolean;
  enableCollaboration: boolean;
  enableFileManagement: boolean;
  enableMobileOptimization: boolean;
  enableCloudIntegration: boolean;
  
  // UI preferences
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  showAdvancedControls: boolean;
  autoStartProcessing: boolean;
  
  // Upload settings
  maxFiles: number;
  maxFileSize: number;
  acceptedTypes: string[];
  enableBatchUpload: boolean;
  enableResumableUploads: boolean;
  
  // AI settings
  qualityThreshold: number;
  enableSmartSuggestions: boolean;
  autoOptimizeFiles: boolean;
  
  // Collaboration settings
  enableComments: boolean;
  enableVersionControl: boolean;
  enableSharing: boolean;
}

export interface UploadExperienceState {
  mode: 'upload' | 'processing' | 'management' | 'collaboration';
  session?: UploadSession;
  selectedFiles: string[];
  currentFolder?: string;
  searchQuery?: string;
  notifications: UploadNotification[];
  isOnline: boolean;
  isMobile: boolean;
}

export interface UploadNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  dismissible: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style: 'primary' | 'secondary' | 'danger';
}

@Component({
  selector: 'arc-revolutionary-upload-experience',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    SmartDropZoneComponent, 
    ProcessingVisualizationComponent
  ],
  template: `
    <div class="revolutionary-upload-experience" 
         [class.compact]="config.compactMode"
         [class.mobile]="state().isMobile"
         [class.dark]="theme() === 'dark'"
         [class.offline]="!state().isOnline">
      
      <!-- Header with Mode Switcher -->
      <div class="experience-header">
        <div class="mode-switcher">
          <button class="mode-btn" 
                  [class.active]="state().mode === 'upload'"
                  (click)="switchMode('upload')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7,10 12,15 17,10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            上传
          </button>
          
          <button class="mode-btn" 
                  [class.active]="state().mode === 'processing'"
                  (click)="switchMode('processing')"
                  *ngIf="hasActiveProcessing()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12,6 12,12 16,14"></polyline>
            </svg>
            处理
          </button>
          
          <button class="mode-btn" 
                  [class.active]="state().mode === 'management'"
                  (click)="switchMode('management')"
                  *ngIf="config.enableFileManagement">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            管理
          </button>
          
          <button class="mode-btn" 
                  [class.active]="state().mode === 'collaboration'"
                  (click)="switchMode('collaboration')"
                  *ngIf="config.enableCollaboration">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            协作
          </button>
        </div>
        
        <!-- Status Indicators -->
        <div class="status-indicators">
          <div class="online-indicator" [class.online]="state().isOnline">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
              <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
              <line x1="12" y1="20" x2="12.01" y2="20"></line>
            </svg>
            {{ state().isOnline ? '在线' : '离线' }}
          </div>
          
          <div class="queue-indicator" *ngIf="queueStats()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 6v6l4 2"></path>
            </svg>
            {{ queueStats()?.uploadingItems || 0 }} 上传中
          </div>
          
          <div class="performance-indicator" *ngIf="performanceMetrics()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"></polyline>
            </svg>
            {{ formatSpeed(performanceMetrics()?.uploadSpeed || 0) }}
          </div>
        </div>
        
        <!-- Settings Button -->
        <button class="settings-btn" (click)="showSettings = !showSettings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      </div>
      
      <!-- Notifications -->
      <div class="notifications" *ngIf="state().notifications.length > 0">
        <div class="notification" 
             *ngFor="let notification of state().notifications; trackBy: trackNotification"
             [class]="'notification-' + notification.type">
          <div class="notification-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path [attr.d]="getNotificationIconPath(notification.type)"></path>
            </svg>
          </div>
          <div class="notification-content">
            <h4>{{ notification.title }}</h4>
            <p>{{ notification.message }}</p>
            <div class="notification-actions" *ngIf="notification.actions">
              <button *ngFor="let action of notification.actions"
                      [class]="'action-btn action-' + action.style"
                      (click)="action.action()">
                {{ action.label }}
              </button>
            </div>
          </div>
          <button class="notification-dismiss" 
                  *ngIf="notification.dismissible"
                  (click)="dismissNotification(notification.id)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Main Content Area -->
      <div class="experience-content">
        
        <!-- Upload Mode -->
        <div class="upload-mode" *ngIf="state().mode === 'upload'">
          <arc-smart-drop-zone
            [config]="dropZoneConfig()"
            (filesSelected)="onFilesSelected($event)"
            (fileRemoved)="onFileRemoved($event)"
            (analysisRequested)="onAnalysisRequested($event)"
            (previewRequested)="onPreviewRequested($event)"
            (cameraRequested)="onCameraRequested()"
            (cloudImportRequested)="onCloudImportRequested()"
            (urlImportRequested)="onUrlImportRequested($event)">
          </arc-smart-drop-zone>
          
          <!-- Upload Controls -->
          <div class="upload-controls" *ngIf="hasSelectedFiles()">
            <div class="control-group">
              <label>Quality Threshold</label>
              <input type="range" 
                     min="0" max="1" step="0.1" 
                     [(ngModel)]="config.qualityThreshold"
                     class="quality-slider">
              <span>{{ (config.qualityThreshold * 100).toFixed(0) }}%</span>
            </div>
            
            <div class="control-group">
              <label>
                <input type="checkbox" [(ngModel)]="config.autoOptimizeFiles">
                自动优化文件
              </label>
            </div>
            
            <div class="control-group">
              <label>
                <input type="checkbox" [(ngModel)]="config.enableSmartSuggestions">
                智能建议
              </label>
            </div>
            
            <div class="upload-actions">
              <button class="primary-btn" (click)="startUpload()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="16,16 12,12 8,16"></polyline>
                  <line x1="12" y1="21" x2="12" y2="12"></line>
                </svg>
                开始上传
              </button>
              
              <button class="secondary-btn" (click)="clearSelection()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                清空
              </button>
            </div>
          </div>
        </div>
        
        <!-- Processing Mode -->
        <div class="processing-mode" *ngIf="state().mode === 'processing'">
          <arc-processing-visualization
            [session]="state().session"
            [queueItems]="queueItems()"
            [config]="processingVisualizationConfig()"
            (stepRetry)="onStepRetry($event)"
            (insightAction)="onInsightAction($event)">
          </arc-processing-visualization>
        </div>
        
        <!-- File Management Mode -->
        <div class="management-mode" *ngIf="state().mode === 'management'">
          <div class="file-browser">
            <!-- Folder Tree -->
            <div class="folder-tree">
              <h3>文件夹</h3>
              <div class="tree-item" 
                   *ngFor="let folder of folderTree(); trackBy: trackFolder"
                   [class.active]="folder.id === state().currentFolder"
                   (click)="selectFolder(folder.id)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                {{ folder.name }}
                <span class="file-count">({{ folder.fileCount }})</span>
              </div>
            </div>
            
            <!-- File Grid -->
            <div class="file-grid">
              <div class="file-card" 
                   *ngFor="let file of managedFiles(); trackBy: trackFile"
                   [class.selected]="isFileSelected(file.id)"
                   (click)="toggleFileSelection(file.id)">
                <div class="file-thumbnail">
                  <img *ngIf="file.mimeType.startsWith('image/')" 
                       [src]="getFilePreviewUrl(file.id)" 
                       [alt]="file.displayName">
                  <div class="file-icon" *ngIf="!file.mimeType.startsWith('image/')">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14,2 14,8 20,8"></polyline>
                    </svg>
                  </div>
                  
                  <div class="file-overlay">
                    <div class="quality-score" *ngIf="file.qualityScore">
                      {{ Math.round(file.qualityScore * 100) }}
                    </div>
                    <div class="processing-status" [class]="'status-' + file.processingStatus">
                      {{ getProcessingStatusText(file.processingStatus) }}
                    </div>
                  </div>
                </div>
                
                <div class="file-info">
                  <h4 class="file-name">{{ file.displayName }}</h4>
                  <p class="file-details">
                    {{ formatFileSize(file.size) }} · 
                    {{ formatDate(file.uploadedAt) }}
                  </p>
                  <div class="file-tags">
                    <span class="tag" *ngFor="let tag of file.tags.slice(0, 3)">{{ tag }}</span>
                    <span class="tag-more" *ngIf="file.tags.length > 3">+{{ file.tags.length - 3 }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Collaboration Mode -->
        <div class="collaboration-mode" *ngIf="state().mode === 'collaboration'">
          <div class="collaboration-content">
            <h3>协作功能</h3>
            <p>协作功能正在开发中...</p>
          </div>
        </div>
      </div>
      
      <!-- Settings Panel -->
      <div class="settings-panel" *ngIf="showSettings">
        <div class="settings-header">
          <h3>设置</h3>
          <button class="close-btn" (click)="showSettings = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="settings-content">
          <div class="setting-group">
            <h4>上传设置</h4>
            
            <label>
              <span>最大文件数量</span>
              <input type="number" [(ngModel)]="config.maxFiles" min="1" max="100">
            </label>
            
            <label>
              <span>最大文件大小 (MB)</span>
              <input type="number" [(ngModel)]="maxFileSizeMB" min="1" max="1000">
            </label>
            
            <label>
              <input type="checkbox" [(ngModel)]="config.enableBatchUpload">
              <span>批量上传</span>
            </label>
            
            <label>
              <input type="checkbox" [(ngModel)]="config.enableResumableUploads">
              <span>断点续传</span>
            </label>
          </div>
          
          <div class="setting-group">
            <h4>AI 设置</h4>
            
            <label>
              <input type="checkbox" [(ngModel)]="config.enableAIPreprocessing">
              <span>AI 预处理</span>
            </label>
            
            <label>
              <input type="checkbox" [(ngModel)]="config.autoOptimizeFiles">
              <span>自动优化</span>
            </label>
            
            <label>
              <input type="checkbox" [(ngModel)]="config.enableSmartSuggestions">
              <span>智能建议</span>
            </label>
          </div>
          
          <div class="setting-group">
            <h4>界面设置</h4>
            
            <label>
              <span>主题</span>
              <select [(ngModel)]="config.theme">
                <option value="light">浅色</option>
                <option value="dark">深色</option>
                <option value="auto">自动</option>
              </select>
            </label>
            
            <label>
              <input type="checkbox" [(ngModel)]="config.compactMode">
              <span>紧凑模式</span>
            </label>
            
            <label>
              <input type="checkbox" [(ngModel)]="config.showAdvancedControls">
              <span>高级控制</span>
            </label>
          </div>
        </div>
      </div>
      
      <!-- Offline Indicator -->
      <div class="offline-banner" *ngIf="!state().isOnline">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
          <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
          <line x1="12" y1="20" x2="12.01" y2="20"></line>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
        离线模式 - 文件将在连接恢复后上传
      </div>
    </div>
  `,
  styles: [`
    .revolutionary-upload-experience {
      min-height: 100vh;
      background: #f8fafc;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto;
      transition: all 0.3s ease;
    }
    
    .revolutionary-upload-experience.dark {
      background: #0f172a;
      color: #e2e8f0;
    }
    
    .experience-header {
      background: white;
      border-bottom: 1px solid #e5e7eb;
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    
    .dark .experience-header {
      background: #1e293b;
      border-bottom-color: #334155;
    }
    
    .mode-switcher {
      display: flex;
      gap: 0.5rem;
    }
    
    .mode-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: transparent;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      color: #6b7280;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .mode-btn:hover {
      background: #f3f4f6;
      border-color: #3b82f6;
      color: #3b82f6;
    }
    
    .mode-btn.active {
      background: #3b82f6;
      border-color: #3b82f6;
      color: white;
    }
    
    .dark .mode-btn {
      border-color: #475569;
      color: #94a3b8;
    }
    
    .dark .mode-btn:hover {
      background: #334155;
      border-color: #3b82f6;
      color: #3b82f6;
    }
    
    .status-indicators {
      display: flex;
      gap: 1rem;
      align-items: center;
    }
    
    .online-indicator,
    .queue-indicator,
    .performance-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #6b7280;
    }
    
    .online-indicator.online {
      color: #10b981;
    }
    
    .settings-btn {
      background: transparent;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 0.5rem;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .settings-btn:hover {
      background: #f3f4f6;
      border-color: #3b82f6;
      color: #3b82f6;
    }
    
    .notifications {
      padding: 1rem 1.5rem 0;
    }
    
    .notification {
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 0.5rem;
      position: relative;
    }
    
    .notification-info {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
    }
    
    .notification-success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }
    
    .notification-warning {
      background: #fffbeb;
      border: 1px solid #fed7aa;
      color: #92400e;
    }
    
    .notification-error {
      background: #fef2f2;
      border: 1px solid: #fecaca;
      color: #991b1b;
    }
    
    .notification-content h4 {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    
    .notification-content p {
      font-size: 0.875rem;
      opacity: 0.9;
      margin-bottom: 0.5rem;
    }
    
    .notification-actions {
      display: flex;
      gap: 0.5rem;
    }
    
    .action-btn {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .action-primary {
      background: #3b82f6;
      color: white;
      border: none;
    }
    
    .action-secondary {
      background: transparent;
      color: currentColor;
      border: 1px solid currentColor;
    }
    
    .action-danger {
      background: #ef4444;
      color: white;
      border: none;
    }
    
    .notification-dismiss {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: transparent;
      border: none;
      color: currentColor;
      opacity: 0.6;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
    }
    
    .notification-dismiss:hover {
      opacity: 1;
      background: rgba(0, 0, 0, 0.1);
    }
    
    .experience-content {
      padding: 1.5rem;
    }
    
    .upload-controls {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      margin-top: 1.5rem;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    
    .dark .upload-controls {
      background: #1e293b;
    }
    
    .control-group {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    
    .control-group label {
      font-weight: 500;
      color: #374151;
      min-width: 120px;
    }
    
    .dark .control-group label {
      color: #d1d5db;
    }
    
    .quality-slider {
      flex: 1;
      max-width: 200px;
    }
    
    .upload-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e5e7eb;
    }
    
    .dark .upload-actions {
      border-top-color: #475569;
    }
    
    .primary-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .primary-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    .secondary-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: transparent;
      color: #6b7280;
      border: 1px solid #d1d5db;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .secondary-btn:hover {
      background: #f3f4f6;
      border-color: #3b82f6;
      color: #3b82f6;
    }
    
    .file-browser {
      display: grid;
      grid-template-columns: 250px 1fr;
      gap: 1.5rem;
      min-height: 500px;
    }
    
    .folder-tree {
      background: white;
      border-radius: 8px;
      padding: 1rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .dark .folder-tree {
      background: #1e293b;
    }
    
    .folder-tree h3 {
      font-size: 0.875rem;
      font-weight: 600;
      color: #6b7280;
      margin-bottom: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .tree-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      border-radius: 6px;
      cursor: pointer;
      margin-bottom: 0.25rem;
      transition: all 0.2s ease;
    }
    
    .tree-item:hover {
      background: #f3f4f6;
    }
    
    .tree-item.active {
      background: #eff6ff;
      color: #1d4ed8;
    }
    
    .dark .tree-item:hover {
      background: #334155;
    }
    
    .dark .tree-item.active {
      background: #1e40af;
      color: white;
    }
    
    .file-count {
      margin-left: auto;
      font-size: 0.75rem;
      color: #6b7280;
    }
    
    .file-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }
    
    .file-card {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }
    
    .file-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .file-card.selected {
      border: 2px solid #3b82f6;
    }
    
    .dark .file-card {
      background: #1e293b;
    }
    
    .file-thumbnail {
      height: 120px;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }
    
    .file-thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .file-icon {
      color: #6b7280;
    }
    
    .file-overlay {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .quality-score {
      background: rgba(59, 130, 246, 0.9);
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    .processing-status {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .status-pending {
      background: rgba(107, 114, 128, 0.9);
      color: white;
    }
    
    .status-processing {
      background: rgba(251, 146, 60, 0.9);
      color: white;
    }
    
    .status-completed {
      background: rgba(16, 185, 129, 0.9);
      color: white;
    }
    
    .status-failed {
      background: rgba(239, 68, 68, 0.9);
      color: white;
    }
    
    .file-info {
      padding: 1rem;
    }
    
    .file-name {
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .file-details {
      font-size: 0.75rem;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }
    
    .file-tags {
      display: flex;
      gap: 0.25rem;
      flex-wrap: wrap;
    }
    
    .tag {
      background: #f3f4f6;
      color: #374151;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-size: 0.625rem;
      font-weight: 500;
    }
    
    .tag-more {
      background: #e5e7eb;
      color: #6b7280;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-size: 0.625rem;
    }
    
    .settings-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      height: 100vh;
      background: white;
      box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
      z-index: 200;
      overflow-y: auto;
    }
    
    .dark .settings-panel {
      background: #1e293b;
    }
    
    .settings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .dark .settings-header {
      border-bottom-color: #475569;
    }
    
    .close-btn {
      background: transparent;
      border: none;
      color: #6b7280;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 6px;
    }
    
    .close-btn:hover {
      background: #f3f4f6;
      color: #374151;
    }
    
    .settings-content {
      padding: 1.5rem;
    }
    
    .setting-group {
      margin-bottom: 2rem;
    }
    
    .setting-group h4 {
      font-size: 1rem;
      font-weight: 600;
      color: #111827;
      margin-bottom: 1rem;
    }
    
    .dark .setting-group h4 {
      color: #f9fafb;
    }
    
    .setting-group label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      font-size: 0.875rem;
      color: #374151;
    }
    
    .dark .setting-group label {
      color: #d1d5db;
    }
    
    .setting-group input,
    .setting-group select {
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
    }
    
    .setting-group input[type="checkbox"] {
      width: auto;
    }
    
    .offline-banner {
      position: fixed;
      bottom: 1rem;
      left: 50%;
      transform: translateX(-50%);
      background: #f59e0b;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
    }
    
    .compact .experience-content {
      padding: 1rem;
    }
    
    .compact .upload-controls {
      padding: 1rem;
    }
    
    .compact .file-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 0.75rem;
    }
    
    .compact .file-thumbnail {
      height: 80px;
    }
    
    .mobile .file-browser {
      grid-template-columns: 1fr;
    }
    
    .mobile .folder-tree {
      order: 2;
      margin-top: 1rem;
    }
    
    .mobile .settings-panel {
      width: 100%;
    }
    
    @media (max-width: 768px) {
      .experience-header {
        padding: 1rem;
      }
      
      .mode-switcher {
        flex-wrap: wrap;
      }
      
      .status-indicators {
        display: none;
      }
      
      .experience-content {
        padding: 1rem;
      }
      
      .upload-actions {
        flex-direction: column;
      }
      
      .file-grid {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      }
    }
  `]
})
export class RevolutionaryUploadExperienceComponent {
  @Input() config: UploadExperienceConfig = {
    enableAIPreprocessing: true,
    enableMultiModal: true,
    enableCollaboration: false,
    enableFileManagement: true,
    enableMobileOptimization: true,
    enableCloudIntegration: false,
    theme: 'auto',
    compactMode: false,
    showAdvancedControls: false,
    autoStartProcessing: true,
    maxFiles: 10,
    maxFileSize: 50 * 1024 * 1024,
    acceptedTypes: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
    enableBatchUpload: true,
    enableResumableUploads: true,
    qualityThreshold: 0.7,
    enableSmartSuggestions: true,
    autoOptimizeFiles: true,
    enableComments: true,
    enableVersionControl: true,
    enableSharing: true
  };
  
  @Output() sessionCreated = new EventEmitter<UploadSession>();
  @Output() sessionCompleted = new EventEmitter<UploadSession>();
  @Output() filesProcessed = new EventEmitter<{ sessionId: string; results: any[] }>();
  
  // Component state
  state = signal<UploadExperienceState>({
    mode: 'upload',
    selectedFiles: [],
    notifications: [],
    isOnline: navigator.onLine,
    isMobile: this.detectMobile()
  });
  
  showSettings = false;
  
  // Computed properties
  theme = computed(() => {
    if (this.config.theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return this.config.theme;
  });
  
  maxFileSizeMB = this.config.maxFileSize / (1024 * 1024);
  
  dropZoneConfig = computed(() => ({
    acceptedTypes: this.config.acceptedTypes,
    maxFileSize: this.config.maxFileSize,
    maxFiles: this.config.maxFiles,
    enablePreview: true,
    enableAIAnalysis: this.config.enableAIPreprocessing,
    showQualityIndicators: true,
    allowMultiple: this.config.enableBatchUpload,
    enableDragSort: false
  }));
  
  processingVisualizationConfig = computed(() => ({
    showDetailedSteps: !this.config.compactMode,
    enableAnimations: true,
    showPerformanceMetrics: this.config.showAdvancedControls,
    showTimeEstimates: true,
    autoScroll: true,
    showResourceUsage: this.config.showAdvancedControls,
    compactMode: this.config.compactMode
  }));
  
  queueItems = signal<QueueItem[]>([]);
  queueStats = signal<any>(null);
  performanceMetrics = signal<PerformanceMetrics | null>(null);
  folderTree = signal<any[]>([]);
  managedFiles = signal<FileMetadata[]>([]);
  
  // Math reference for template
  Math = Math;
  
  constructor(
    private multiModalService: MultiModalUploadService,
    private queueManager: UploadQueueManagerService,
    private aiPreprocessing: AIPreprocessingService,
    private fileManagement: FileManagementService
  ) {
    this.initializeServices();
    this.setupEventListeners();
  }
  
  private initializeServices(): void {
    // Subscribe to queue statistics
    this.queueStats.set(this.queueManager.getStatistics());
    
    // Subscribe to folder tree
    this.folderTree.set(this.fileManagement.folderTree());
    
    // Subscribe to managed files
    this.managedFiles.set(this.fileManagement.currentFolderFiles());
  }
  
  private setupEventListeners(): void {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.state.update(state => ({ ...state, isOnline: true }));
      this.showNotification('success', '已连接到网络', '文件上传将继续进行');
    });
    
    window.addEventListener('offline', () => {
      this.state.update(state => ({ ...state, isOnline: false }));
      this.showNotification('warning', '网络连接中断', '文件将在网络恢复后上传');
    });
    
    // Queue events
    this.queueManager.onQueueEvents().subscribe(event => {
      this.handleQueueEvent(event);
    });
    
    // File management events
    this.fileManagement.onFileEvents().subscribe(event => {
      this.handleFileEvent(event);
    });
  }
  
  private detectMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  // Mode Management
  switchMode(mode: UploadExperienceState['mode']): void {
    this.state.update(state => ({ ...state, mode }));
  }
  
  hasActiveProcessing(): boolean {
    return this.queueStats()?.uploadingItems > 0 || this.queueStats()?.processingItems > 0;
  }
  
  // File Upload Handlers
  onFilesSelected(files: File[]): void {
    if (!this.state().isOnline && !this.config.enableResumableUploads) {
      this.showNotification('error', '网络不可用', '请检查网络连接后重试');
      return;
    }
    
    // Add files to management system
    const fileIds = files.map(file => this.fileManagement.addFile(file));
    
    this.state.update(state => ({
      ...state,
      selectedFiles: [...state.selectedFiles, ...fileIds]
    }));
    
    this.showNotification('info', '文件已选择', `已选择 ${files.length} 个文件`);
    
    if (this.config.autoStartProcessing) {
      this.startUpload();
    }
  }
  
  onFileRemoved(fileId: string): void {
    this.fileManagement.deleteFile(fileId);
    
    this.state.update(state => ({
      ...state,
      selectedFiles: state.selectedFiles.filter(id => id !== fileId)
    }));
  }
  
  onAnalysisRequested(event: { fileId: string; file: File }): void {
    if (this.config.enableAIPreprocessing) {
      this.aiPreprocessing.preprocessFile(event.file, event.fileId)
        .then(result => {
          this.showNotification('success', 'AI 分析完成', 
            `文件质量得分: ${Math.round(result.qualityAssessment.overallScore * 100)}`);
        })
        .catch(error => {
          this.showNotification('error', 'AI 分析失败', error.message);
        });
    }
  }
  
  onPreviewRequested(event: { fileId: string; file: File }): void {
    // Open file preview modal
    console.log('Preview requested for file:', event.fileId);
  }
  
  onCameraRequested(): void {
    if (this.config.enableMultiModal) {
      this.multiModalService.startCamera()
        .then(stream => {
          this.showNotification('info', '相机已启动', '可以开始拍摄文件');
        })
        .catch(error => {
          this.showNotification('error', '相机启动失败', error.message);
        });
    }
  }
  
  onCloudImportRequested(): void {
    if (this.config.enableCloudIntegration) {
      this.showNotification('info', '云导入', '云存储导入功能正在开发中');
    }
  }
  
  onUrlImportRequested(url: string): void {
    if (this.config.enableMultiModal) {
      this.multiModalService.importFromUrl(url)
        .then(result => {
          // Convert to File and add to system
          const file = new File([result.content], result.filename, { type: result.mimeType });
          this.onFilesSelected([file]);
          this.showNotification('success', 'URL 导入成功', `已导入文件: ${result.filename}`);
        })
        .catch(error => {
          this.showNotification('error', 'URL 导入失败', error.message);
        });
    }
  }
  
  // Upload Control
  startUpload(): void {
    const selectedFiles = this.state().selectedFiles
      .map(id => this.fileManagement.getFile(id))
      .filter(file => file !== undefined) as FileMetadata[];
    
    if (selectedFiles.length === 0) {
      this.showNotification('warning', '没有文件', '请先选择要上传的文件');
      return;
    }
    
    // Create upload session
    const sessionId = this.generateId();
    const session: UploadSession = {
      id: sessionId,
      deviceId: 'current-device',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'uploading',
      files: [],
      totalFiles: selectedFiles.length,
      completedFiles: 0,
      failedFiles: 0,
      overallProgress: 0,
      currentStep: '开始上传',
      estimatedTimeRemaining: 0,
      qualityScore: 0,
      improvementSuggestions: [],
      processingInsights: [],
      sharedWith: [],
      approvalStatus: 'not-required',
      comments: []
    };
    
    this.state.update(state => ({ ...state, session, mode: 'processing' }));
    
    // Start queue processing
    const files = selectedFiles.map(fileMetadata => {
      // Create mock File objects - in real implementation, these would be actual files
      return new File([''], fileMetadata.originalName, { type: fileMetadata.mimeType });
    });
    
    const itemIds = this.queueManager.addToQueue(files, sessionId, 'normal');
    
    this.sessionCreated.emit(session);
    this.showNotification('info', '上传开始', `开始上传 ${selectedFiles.length} 个文件`);
  }
  
  clearSelection(): void {
    this.state.update(state => ({ ...state, selectedFiles: [] }));
  }
  
  hasSelectedFiles(): boolean {
    return this.state().selectedFiles.length > 0;
  }
  
  // Processing Handlers
  onStepRetry(stepId: string): void {
    this.showNotification('info', '重试步骤', `正在重试步骤: ${stepId}`);
  }
  
  onInsightAction(event: { insight: any; stepId: string }): void {
    this.showNotification('info', '执行建议', event.insight.message);
  }
  
  // File Management
  selectFolder(folderId: string): void {
    this.fileManagement.setCurrentFolder(folderId);
    this.state.update(state => ({ ...state, currentFolder: folderId }));
  }
  
  toggleFileSelection(fileId: string): void {
    if (this.isFileSelected(fileId)) {
      this.fileManagement.deselectFile(fileId);
    } else {
      this.fileManagement.selectFile(fileId);
    }
  }
  
  isFileSelected(fileId: string): boolean {
    return this.fileManagement.getSelectedFiles().includes(fileId);
  }
  
  // Event Handlers
  private handleQueueEvent(event: any): void {
    switch (event.type) {
      case 'upload-started':
        this.showNotification('info', '上传开始', '文件上传已开始');
        break;
      case 'completed':
        this.showNotification('success', '上传完成', '文件上传已完成');
        break;
      case 'failed':
        this.showNotification('error', '上传失败', '文件上传失败');
        break;
    }
  }
  
  private handleFileEvent(event: any): void {
    switch (event.type) {
      case 'file-added':
        // Update managed files
        this.managedFiles.set(this.fileManagement.currentFolderFiles());
        break;
      case 'file-updated':
        this.managedFiles.set(this.fileManagement.currentFolderFiles());
        break;
      case 'file-deleted':
        this.managedFiles.set(this.fileManagement.currentFolderFiles());
        break;
    }
  }
  
  // Notification Management
  showNotification(type: UploadNotification['type'], title: string, message: string, actions?: NotificationAction[]): void {
    const notification: UploadNotification = {
      id: this.generateId(),
      type,
      title,
      message,
      timestamp: new Date(),
      dismissible: true,
      actions
    };
    
    this.state.update(state => ({
      ...state,
      notifications: [notification, ...state.notifications].slice(0, 5)
    }));
    
    // Auto-dismiss info and success notifications
    if (type === 'info' || type === 'success') {
      setTimeout(() => {
        this.dismissNotification(notification.id);
      }, 5000);
    }
  }
  
  dismissNotification(notificationId: string): void {
    this.state.update(state => ({
      ...state,
      notifications: state.notifications.filter(n => n.id !== notificationId)
    }));
  }
  
  // Utility Methods
  getNotificationIconPath(type: UploadNotification['type']): string {
    const paths = {
      info: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
      success: 'M22 11.08V12a10 10 0 1 1-5.93-9.14',
      warning: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
      error: 'M18 6L6 18M6 6l12 12'
    };
    return paths[type];
  }
  
  getProcessingStatusText(status: string): string {
    const texts = {
      pending: '等待',
      processing: '处理中',
      completed: '完成',
      failed: '失败'
    };
    return texts[status] || status;
  }
  
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
  
  formatDate(date: Date): string {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  formatSpeed(bytesPerSecond: number): string {
    return this.formatFileSize(bytesPerSecond) + '/s';
  }
  
  getFilePreviewUrl(fileId: string): string {
    // Return preview URL for file
    return `/api/files/${fileId}/preview`;
  }
  
  trackNotification(index: number, notification: UploadNotification): string {
    return notification.id;
  }
  
  trackFolder(index: number, folder: any): string {
    return folder.id;
  }
  
  trackFile(index: number, file: FileMetadata): string {
    return file.id;
  }
  
  private generateId(): string {
    return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}
