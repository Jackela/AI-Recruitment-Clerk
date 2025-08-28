/**
 * Smart Drop Zone Component
 * Revolutionary upload interface with AI-powered file analysis
 */

import { Component, Input, Output, EventEmitter, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadFile, FileQualityAssessment, ContentAnalysis } from './upload-system-architecture';

interface DropZoneConfig {
  acceptedTypes: string[];
  maxFileSize: number;
  maxFiles: number;
  enablePreview: boolean;
  enableAIAnalysis: boolean;
  showQualityIndicators: boolean;
  allowMultiple: boolean;
  enableDragSort: boolean;
}

interface FilePreview {
  id: string;
  file: File;
  preview?: string;
  thumbnail?: string;
  analysisStatus: 'pending' | 'analyzing' | 'completed' | 'failed';
  qualityScore?: number;
  contentType?: string;
  issues: string[];
  suggestions: string[];
}

interface DragState {
  isDragging: boolean;
  isOver: boolean;
  dragCount: number;
  lastDroppedFiles: File[];
  rejectedFiles: File[];
}

@Component({
  selector: 'arc-smart-drop-zone',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="smart-drop-zone" 
         [class.dragging]="dragState().isDragging"
         [class.drag-over]="dragState().isOver"
         [class.has-files]="previews().length > 0"
         (dragenter)="onDragEnter($event)"
         (dragover)="onDragOver($event)"
         (dragleave)="onDragLeave($event)"
         (drop)="onDrop($event)">
      
      <!-- Main Drop Area -->
      <div class="drop-area" *ngIf="previews().length === 0">
        <div class="drop-zone-visual">
          <div class="upload-icon" [class.animated]="dragState().isDragging">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7,10 12,15 17,10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </div>
          
          <div class="drop-text">
            <h3>{{ getDropText() }}</h3>
            <p>{{ getDropSubtext() }}</p>
          </div>
          
          <div class="supported-formats">
            <span class="format-tag" *ngFor="let format of config.acceptedTypes">
              {{ format.toUpperCase() }}
            </span>
          </div>
        </div>
        
        <!-- Alternative Upload Options -->
        <div class="upload-alternatives">
          <button class="alt-btn" (click)="openFileDialog()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
            </svg>
            选择文件
          </button>
          
          <button class="alt-btn" (click)="openCamera()" *ngIf="config.enableAIAnalysis">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            拍照上传
          </button>
          
          <button class="alt-btn" (click)="openCloudImport()" *ngIf="config.enableAIAnalysis">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
            </svg>
            云端导入
          </button>
          
          <button class="alt-btn" (click)="openUrlImport()" *ngIf="config.enableAIAnalysis">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            URL 导入
          </button>
        </div>
      </div>
      
      <!-- File Previews -->
      <div class="file-previews" *ngIf="previews().length > 0">
        <div class="preview-header">
          <h4>已选择文件 ({{ previews().length }})</h4>
          <div class="preview-actions">
            <button class="action-btn" (click)="analyzeAll()" *ngIf="config.enableAIAnalysis">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"></path>
                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
              </svg>
              智能分析
            </button>
            <button class="action-btn danger" (click)="clearAll()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
              清空
            </button>
          </div>
        </div>
        
        <div class="preview-grid">
          <div class="file-preview" 
               *ngFor="let preview of previews(); trackBy: trackByFileId"
               [class.analyzing]="preview.analysisStatus === 'analyzing'"
               [class.completed]="preview.analysisStatus === 'completed'"
               [class.failed]="preview.analysisStatus === 'failed'">
            
            <!-- File Thumbnail -->
            <div class="preview-thumbnail">
              <img *ngIf="preview.thumbnail" [src]="preview.thumbnail" [alt]="preview.file.name">
              <div class="file-icon" *ngIf="!preview.thumbnail">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                </svg>
              </div>
              
              <!-- Quality Indicator -->
              <div class="quality-indicator" *ngIf="preview.qualityScore !== undefined">
                <div class="quality-score" [class]="getQualityClass(preview.qualityScore)">
                  {{ Math.round(preview.qualityScore * 100) }}
                </div>
              </div>
              
              <!-- Analysis Status -->
              <div class="analysis-status">
                <div class="status-spinner" *ngIf="preview.analysisStatus === 'analyzing'">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="2" x2="12" y2="6"></line>
                    <line x1="12" y1="18" x2="12" y2="22"></line>
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                    <line x1="2" y1="12" x2="6" y2="12"></line>
                    <line x1="18" y1="12" x2="22" y2="12"></line>
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                  </svg>
                </div>
                
                <div class="status-check" *ngIf="preview.analysisStatus === 'completed'">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"></polyline>
                  </svg>
                </div>
                
                <div class="status-error" *ngIf="preview.analysisStatus === 'failed'">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                </div>
              </div>
            </div>
            
            <!-- File Information -->
            <div class="preview-info">
              <div class="file-name" [title]="preview.file.name">{{ preview.file.name }}</div>
              <div class="file-details">
                <span class="file-size">{{ formatFileSize(preview.file.size) }}</span>
                <span class="file-type">{{ getFileExtension(preview.file.name) }}</span>
                <span class="content-type" *ngIf="preview.contentType">{{ preview.contentType }}</span>
              </div>
              
              <!-- Issues and Suggestions -->
              <div class="quality-feedback" *ngIf="preview.issues.length > 0 || preview.suggestions.length > 0">
                <div class="issues" *ngIf="preview.issues.length > 0">
                  <div class="issue" *ngFor="let issue of preview.issues.slice(0, 2)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {{ issue }}
                  </div>
                </div>
                
                <div class="suggestions" *ngIf="preview.suggestions.length > 0">
                  <div class="suggestion" *ngFor="let suggestion of preview.suggestions.slice(0, 1)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    {{ suggestion }}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Actions -->
            <div class="preview-actions">
              <button class="preview-btn" (click)="removeFile(preview.id)" title="移除文件">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              
              <button class="preview-btn" (click)="analyzeFile(preview.id)" 
                      *ngIf="config.enableAIAnalysis && preview.analysisStatus !== 'analyzing'"
                      title="重新分析">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23,4 23,10 17,10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
              </button>
              
              <button class="preview-btn" (click)="previewFile(preview.id)" title="预览文件">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Add More Files Button -->
        <div class="add-more" *ngIf="previews().length < config.maxFiles">
          <button class="add-more-btn" (click)="openFileDialog()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            添加更多文件
          </button>
        </div>
      </div>
      
      <!-- Drag Overlay -->
      <div class="drag-overlay" *ngIf="dragState().isDragging">
        <div class="drag-content">
          <div class="drag-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7,10 12,15 17,10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </div>
          <h3>释放文件开始上传</h3>
          <p>支持 {{ config.acceptedTypes.join(', ').toUpperCase() }} 格式</p>
        </div>
      </div>
      
      <!-- Hidden File Input -->
      <input type="file" 
             #fileInput
             [accept]="getAcceptAttribute()"
             [multiple]="config.allowMultiple"
             (change)="onFileSelect($event)"
             style="display: none;">
    </div>
  `,
  styles: [`
    .smart-drop-zone {
      position: relative;
      border: 2px dashed #e5e7eb;
      border-radius: 12px;
      background: #fafafa;
      transition: all 0.3s ease;
      min-height: 200px;
      overflow: hidden;
    }
    
    .smart-drop-zone.dragging {
      border-color: #3b82f6;
      background: #eff6ff;
      transform: scale(1.02);
    }
    
    .smart-drop-zone.drag-over {
      border-color: #10b981;
      background: #ecfdf5;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
    }
    
    .smart-drop-zone.has-files {
      border-style: solid;
      background: white;
    }
    
    .drop-area {
      padding: 2rem;
      text-align: center;
    }
    
    .drop-zone-visual {
      margin-bottom: 2rem;
    }
    
    .upload-icon {
      display: inline-block;
      color: #6b7280;
      margin-bottom: 1rem;
      transition: all 0.3s ease;
    }
    
    .upload-icon.animated {
      animation: bounce 0.6s ease-in-out infinite alternate;
      color: #3b82f6;
    }
    
    @keyframes bounce {
      from { transform: translateY(0); }
      to { transform: translateY(-10px); }
    }
    
    .drop-text h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #111827;
      margin-bottom: 0.5rem;
    }
    
    .drop-text p {
      color: #6b7280;
      margin-bottom: 1rem;
    }
    
    .supported-formats {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    
    .format-tag {
      background: #f3f4f6;
      color: #374151;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .upload-alternatives {
      display: flex;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    
    .alt-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: white;
      border: 1px solid #d1d5db;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      color: #374151;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .alt-btn:hover {
      background: #f9fafb;
      border-color: #3b82f6;
      color: #3b82f6;
    }
    
    .file-previews {
      padding: 1.5rem;
    }
    
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .preview-header h4 {
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
    }
    
    .preview-actions {
      display: flex;
      gap: 0.5rem;
    }
    
    .action-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      color: #374151;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .action-btn:hover {
      background: #e5e7eb;
    }
    
    .action-btn.danger {
      color: #dc2626;
      border-color: #fecaca;
      background: #fef2f2;
    }
    
    .action-btn.danger:hover {
      background: #fee2e2;
    }
    
    .preview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }
    
    .file-preview {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1rem;
      transition: all 0.3s ease;
      position: relative;
    }
    
    .file-preview.analyzing {
      border-color: #f59e0b;
      background: #fffbeb;
    }
    
    .file-preview.completed {
      border-color: #10b981;
      background: #f0fdf4;
    }
    
    .file-preview.failed {
      border-color: #ef4444;
      background: #fef2f2;
    }
    
    .preview-thumbnail {
      position: relative;
      width: 64px;
      height: 64px;
      margin: 0 auto 1rem;
      border-radius: 8px;
      overflow: hidden;
      background: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .preview-thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .file-icon {
      color: #6b7280;
    }
    
    .quality-indicator {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: white;
      border: 2px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .quality-score {
      font-size: 0.625rem;
      font-weight: 700;
    }
    
    .quality-score.excellent { color: #10b981; border-color: #10b981; }
    .quality-score.good { color: #3b82f6; border-color: #3b82f6; }
    .quality-score.fair { color: #f59e0b; border-color: #f59e0b; }
    .quality-score.poor { color: #ef4444; border-color: #ef4444; }
    
    .analysis-status {
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: white;
      border: 2px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .status-spinner {
      animation: spin 1s linear infinite;
      color: #f59e0b;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .status-check { color: #10b981; }
    .status-error { color: #ef4444; }
    
    .preview-info {
      text-align: center;
    }
    
    .file-name {
      font-weight: 600;
      color: #111827;
      margin-bottom: 0.5rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .file-details {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.75rem;
      color: #6b7280;
    }
    
    .quality-feedback {
      margin-top: 0.75rem;
      text-align: left;
    }
    
    .issue, .suggestion {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.75rem;
      margin-bottom: 0.25rem;
    }
    
    .issue {
      color: #dc2626;
    }
    
    .suggestion {
      color: #059669;
    }
    
    .preview-actions {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      display: flex;
      gap: 0.25rem;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    
    .file-preview:hover .preview-actions {
      opacity: 1;
    }
    
    .preview-btn {
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 0.25rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .preview-btn:hover {
      background: white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .add-more {
      text-align: center;
      margin-top: 1rem;
    }
    
    .add-more-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: white;
      border: 2px dashed #d1d5db;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      color: #6b7280;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .add-more-btn:hover {
      border-color: #3b82f6;
      color: #3b82f6;
      background: #eff6ff;
    }
    
    .drag-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(59, 130, 246, 0.1);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }
    
    .drag-content {
      text-align: center;
      color: #3b82f6;
    }
    
    .drag-icon {
      margin-bottom: 1rem;
      animation: bounce 0.6s ease-in-out infinite alternate;
    }
    
    @media (max-width: 768px) {
      .preview-grid {
        grid-template-columns: 1fr;
      }
      
      .upload-alternatives {
        flex-direction: column;
        align-items: center;
      }
      
      .preview-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }
      
      .preview-actions {
        justify-content: center;
      }
    }
  `]
})
export class SmartDropZoneComponent {
  @Input() config: DropZoneConfig = {
    acceptedTypes: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
    enablePreview: true,
    enableAIAnalysis: true,
    showQualityIndicators: true,
    allowMultiple: true,
    enableDragSort: false
  };
  
  @Output() filesSelected = new EventEmitter<File[]>();
  @Output() fileRemoved = new EventEmitter<string>();
  @Output() analysisRequested = new EventEmitter<{ fileId: string; file: File }>();
  @Output() previewRequested = new EventEmitter<{ fileId: string; file: File }>();
  @Output() cameraRequested = new EventEmitter<void>();
  @Output() cloudImportRequested = new EventEmitter<void>();
  @Output() urlImportRequested = new EventEmitter<string>();
  
  // Signals for reactive state
  previews = signal<FilePreview[]>([]);
  dragState = signal<DragState>({
    isDragging: false,
    isOver: false,
    dragCount: 0,
    lastDroppedFiles: [],
    rejectedFiles: []
  });
  
  // ViewChild reference to file input
  fileInput?: HTMLInputElement;
  
  // Computed properties
  canAddFiles = computed(() => this.previews().length < this.config.maxFiles);
  totalSize = computed(() => 
    this.previews().reduce((sum, p) => sum + p.file.size, 0)
  );
  
  constructor() {
    // Effect to emit files when previews change
    effect(() => {
      const files = this.previews().map(p => p.file);
      this.filesSelected.emit(files);
    });
  }
  
  // Drag and Drop Handlers
  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const state = this.dragState();
    this.dragState.set({
      ...state,
      isDragging: true,
      dragCount: state.dragCount + 1
    });
  }
  
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const state = this.dragState();
    this.dragState.set({
      ...state,
      isOver: true
    });
  }
  
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const state = this.dragState();
    const newCount = state.dragCount - 1;
    
    this.dragState.set({
      ...state,
      dragCount: newCount,
      isDragging: newCount > 0,
      isOver: false
    });
  }
  
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.dragState.set({
      isDragging: false,
      isOver: false,
      dragCount: 0,
      lastDroppedFiles: [],
      rejectedFiles: []
    });
    
    const files = Array.from(event.dataTransfer?.files || []);
    this.processFiles(files);
  }
  
  // File Selection Handlers
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    this.processFiles(files);
    
    // Reset input
    input.value = '';
  }
  
  openFileDialog(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = this.getAcceptAttribute();
    input.multiple = this.config.allowMultiple;
    input.onchange = (e) => this.onFileSelect(e);
    input.click();
  }
  
  // File Processing
  processFiles(files: File[]): void {
    const validFiles: File[] = [];
    const rejectedFiles: File[] = [];
    
    files.forEach(file => {
      if (this.validateFile(file)) {
        validFiles.push(file);
      } else {
        rejectedFiles.push(file);
      }
    });
    
    // Add valid files to previews
    validFiles.forEach(file => this.addFilePreview(file));
    
    // Update drag state with rejected files for user feedback
    if (rejectedFiles.length > 0) {
      const state = this.dragState();
      this.dragState.set({
        ...state,
        rejectedFiles
      });
    }
  }
  
  validateFile(file: File): boolean {
    // Check file size
    if (file.size > this.config.maxFileSize) {
      return false;
    }
    
    // Check file type
    const extension = this.getFileExtension(file.name).toLowerCase();
    if (!this.config.acceptedTypes.includes(extension)) {
      return false;
    }
    
    // Check if we can add more files
    if (!this.canAddFiles()) {
      return false;
    }
    
    return true;
  }
  
  addFilePreview(file: File): void {
    const preview: FilePreview = {
      id: this.generateFileId(),
      file,
      analysisStatus: 'pending',
      issues: [],
      suggestions: []
    };
    
    // Generate thumbnail for image files
    if (file.type.startsWith('image/')) {
      this.generateThumbnail(file, preview);
    }
    
    // Add to previews
    this.previews.update(previews => [...previews, preview]);
    
    // Start AI analysis if enabled
    if (this.config.enableAIAnalysis) {
      this.analyzeFile(preview.id);
    }
  }
  
  generateThumbnail(file: File, preview: FilePreview): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.thumbnail = e.target?.result as string;
      // Trigger change detection
      this.previews.update(previews => [...previews]);
    };
    reader.readAsDataURL(file);
  }
  
  // File Management
  removeFile(fileId: string): void {
    this.previews.update(previews => 
      previews.filter(p => p.id !== fileId)
    );
    this.fileRemoved.emit(fileId);
  }
  
  clearAll(): void {
    this.previews.set([]);
  }
  
  // AI Analysis
  analyzeFile(fileId: string): void {
    const preview = this.previews().find(p => p.id === fileId);
    if (!preview) return;
    
    // Update status
    this.updateFileStatus(fileId, 'analyzing');
    
    // Emit analysis request
    this.analysisRequested.emit({ fileId, file: preview.file });
  }
  
  analyzeAll(): void {
    this.previews().forEach(preview => {
      if (preview.analysisStatus !== 'analyzing') {
        this.analyzeFile(preview.id);
      }
    });
  }
  
  updateFileStatus(fileId: string, status: FilePreview['analysisStatus']): void {
    this.previews.update(previews => 
      previews.map(p => 
        p.id === fileId ? { ...p, analysisStatus: status } : p
      )
    );
  }
  
  updateFileAnalysis(fileId: string, analysis: {
    qualityScore?: number;
    contentType?: string;
    issues?: string[];
    suggestions?: string[];
  }): void {
    this.previews.update(previews => 
      previews.map(p => 
        p.id === fileId ? {
          ...p,
          analysisStatus: 'completed',
          qualityScore: analysis.qualityScore,
          contentType: analysis.contentType,
          issues: analysis.issues || [],
          suggestions: analysis.suggestions || []
        } : p
      )
    );
  }
  
  // Alternative Upload Methods
  openCamera(): void {
    this.cameraRequested.emit();
  }
  
  openCloudImport(): void {
    this.cloudImportRequested.emit();
  }
  
  openUrlImport(): void {
    const url = prompt('请输入文件URL:');
    if (url) {
      this.urlImportRequested.emit(url);
    }
  }
  
  // File Preview
  previewFile(fileId: string): void {
    const preview = this.previews().find(p => p.id === fileId);
    if (preview) {
      this.previewRequested.emit({ fileId, file: preview.file });
    }
  }
  
  // Utility Methods
  getAcceptAttribute(): string {
    return this.config.acceptedTypes.map(type => `.${type}`).join(',');
  }
  
  getFileExtension(filename: string): string {
    return filename.split('.').pop() || '';
  }
  
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  getQualityClass(score: number): string {
    if (score >= 0.9) return 'excellent';
    if (score >= 0.7) return 'good';
    if (score >= 0.5) return 'fair';
    return 'poor';
  }
  
  getDropText(): string {
    if (this.dragState().isDragging) {
      return '释放文件开始上传';
    }
    return '拖拽文件到此处上传';
  }
  
  getDropSubtext(): string {
    if (this.dragState().isDragging) {
      return `支持 ${this.config.acceptedTypes.join(', ').toUpperCase()} 格式`;
    }
    return `或点击下方按钮选择文件。最大支持 ${this.config.maxFiles} 个文件，单个文件最大 ${this.formatFileSize(this.config.maxFileSize)}`;
  }
  
  generateFileId(): string {
    return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  trackByFileId(index: number, item: FilePreview): string {
    return item.id;
  }
  
  // Math reference for template
  Math = Math;
}
