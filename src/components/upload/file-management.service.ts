/**
 * Enhanced File Management Service
 * Organization, tagging, version control, and batch operations
 */

import { Injectable, signal, computed } from '@angular/core';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { map, filter } from 'rxjs/operators';

export interface FileMetadata {
  id: string;
  originalName: string;
  displayName: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  lastModified: Date;
  
  // Organization
  folderId?: string;
  tags: string[];
  category: FileCategory;
  
  // Version Control
  version: number;
  parentFileId?: string;
  isLatestVersion: boolean;
  versionHistory: FileVersion[];
  
  // Processing Status
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  qualityScore?: number;
  extractedText?: string;
  
  // Collaboration
  owner: string;
  sharedWith: string[];
  permissions: FilePermissions;
  comments: FileComment[];
  
  // System
  checksums: {
    md5: string;
    sha256: string;
  };
  storageLocation: string;
  accessCount: number;
  lastAccessed: Date;
}

export interface FileFolder {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  owner: string;
  sharedWith: string[];
  permissions: FolderPermissions;
  color?: string;
  icon?: string;
  fileCount: number;
  totalSize: number;
}

export interface FileTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  category: 'system' | 'user' | 'auto-generated';
  usageCount: number;
  createdAt: Date;
  createdBy: string;
}

export interface FileVersion {
  id: string;
  version: number;
  fileId: string;
  uploadedAt: Date;
  uploadedBy: string;
  changes: string;
  size: number;
  checksums: {
    md5: string;
    sha256: string;
  };
  qualityScore?: number;
  isActive: boolean;
}

export interface FileComment {
  id: string;
  fileId: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  resolved: boolean;
  replies: FileCommentReply[];
  attachments?: string[];
}

export interface FileCommentReply {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
}

export interface FilePermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  canComment: boolean;
  canDownload: boolean;
}

export interface FolderPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreateFiles: boolean;
  canCreateFolders: boolean;
  canShare: boolean;
}

export type FileCategory = 
  | 'resume' 
  | 'cover-letter' 
  | 'portfolio' 
  | 'certificate' 
  | 'reference' 
  | 'transcript' 
  | 'photo' 
  | 'document' 
  | 'other';

export interface FileSearchQuery {
  text?: string;
  tags?: string[];
  category?: FileCategory;
  folderId?: string;
  owner?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
  qualityRange?: {
    min: number;
    max: number;
  };
  mimeTypes?: string[];
  processingStatus?: FileMetadata['processingStatus'][];
}

export interface FileSearchResult {
  files: FileMetadata[];
  totalCount: number;
  facets: {
    tags: { name: string; count: number }[];
    categories: { name: string; count: number }[];
    mimeTypes: { name: string; count: number }[];
    folders: { name: string; count: number }[];
  };
}

export interface BatchOperation {
  id: string;
  type: 'move' | 'copy' | 'delete' | 'tag' | 'share' | 'process';
  fileIds: string[];
  targetFolderId?: string;
  tags?: string[];
  shareWithUsers?: string[];
  parameters?: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  results: BatchOperationResult[];
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface BatchOperationResult {
  fileId: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  result?: any;
}

export interface FileActivity {
  id: string;
  fileId: string;
  userId: string;
  userName: string;
  action: 'uploaded' | 'viewed' | 'edited' | 'deleted' | 'shared' | 'commented' | 'tagged' | 'moved';
  details: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class FileManagementService {
  // Core state
  private files = signal<Map<string, FileMetadata>>(new Map());
  private folders = signal<Map<string, FileFolder>>(new Map());
  private tags = signal<Map<string, FileTag>>(new Map());
  private activities = signal<FileActivity[]>([]);
  private batchOperations = signal<Map<string, BatchOperation>>(new Map());
  
  // Selection state
  private selectedFiles = signal<Set<string>>(new Set());
  private selectedFolder = signal<string | null>(null);
  
  // Search and filter state
  private searchQuery = signal<FileSearchQuery>({});
  private sortBy = signal<'name' | 'date' | 'size' | 'quality'>('date');
  private sortOrder = signal<'asc' | 'desc'>('desc');
  private viewMode = signal<'list' | 'grid' | 'tree'>('grid');
  
  // Event streams
  private fileEvents = new Subject<{ type: string; fileId: string; data?: any }>();
  private batchEvents = new Subject<{ type: string; operationId: string; data?: any }>();
  
  // Computed properties
  currentFolderFiles = computed(() => {
    const currentFolder = this.selectedFolder();
    const query = this.searchQuery();
    const files = Array.from(this.files().values());
    
    let filteredFiles = files.filter(file => {
      // Folder filter
      if (currentFolder && file.folderId !== currentFolder) {
        return false;
      }
      
      // Text search
      if (query.text) {
        const searchText = query.text.toLowerCase();
        if (!file.displayName.toLowerCase().includes(searchText) &&
            !file.extractedText?.toLowerCase().includes(searchText) &&
            !file.tags.some(tag => tag.toLowerCase().includes(searchText))) {
          return false;
        }
      }
      
      // Tag filter
      if (query.tags && query.tags.length > 0) {
        if (!query.tags.some(tag => file.tags.includes(tag))) {
          return false;
        }
      }
      
      // Category filter
      if (query.category && file.category !== query.category) {
        return false;
      }
      
      // Date range filter
      if (query.dateRange) {
        if (file.uploadedAt < query.dateRange.start || file.uploadedAt > query.dateRange.end) {
          return false;
        }
      }
      
      // Size range filter
      if (query.sizeRange) {
        if (file.size < query.sizeRange.min || file.size > query.sizeRange.max) {
          return false;
        }
      }
      
      // Quality range filter
      if (query.qualityRange && file.qualityScore !== undefined) {
        if (file.qualityScore < query.qualityRange.min || file.qualityScore > query.qualityRange.max) {
          return false;
        }
      }
      
      // MIME type filter
      if (query.mimeTypes && query.mimeTypes.length > 0) {
        if (!query.mimeTypes.includes(file.mimeType)) {
          return false;
        }
      }
      
      // Processing status filter
      if (query.processingStatus && query.processingStatus.length > 0) {
        if (!query.processingStatus.includes(file.processingStatus)) {
          return false;
        }
      }
      
      return true;
    });
    
    // Sort files
    const sortBy = this.sortBy();
    const sortOrder = this.sortOrder();
    
    filteredFiles.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.displayName.toLowerCase();
          bValue = b.displayName.toLowerCase();
          break;
        case 'date':
          aValue = a.uploadedAt.getTime();
          bValue = b.uploadedAt.getTime();
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        case 'quality':
          aValue = a.qualityScore || 0;
          bValue = b.qualityScore || 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filteredFiles;
  });
  
  currentFolderPath = computed(() => {
    const currentFolder = this.selectedFolder();
    if (!currentFolder) return [];
    
    const path: FileFolder[] = [];
    let folder = this.folders().get(currentFolder);
    
    while (folder) {
      path.unshift(folder);
      folder = folder.parentId ? this.folders().get(folder.parentId) : undefined;
    }
    
    return path;
  });
  
  folderTree = computed(() => {
    const folders = Array.from(this.folders().values());
    const rootFolders = folders.filter(f => !f.parentId);
    
    const buildTree = (parentFolders: FileFolder[]): any[] => {
      return parentFolders.map(folder => ({
        ...folder,
        children: buildTree(folders.filter(f => f.parentId === folder.id))
      }));
    };
    
    return buildTree(rootFolders);
  });
  
  constructor() {
    this.initializeDefaultTags();
    this.initializeDefaultFolders();
  }
  
  // File Management
  addFile(file: File, metadata: Partial<FileMetadata> = {}): string {
    const fileId = this.generateId();
    const now = new Date();
    
    const fileMetadata: FileMetadata = {
      id: fileId,
      originalName: file.name,
      displayName: metadata.displayName || file.name,
      size: file.size,
      mimeType: file.type,
      uploadedAt: now,
      lastModified: metadata.lastModified || now,
      folderId: metadata.folderId || this.selectedFolder() || undefined,
      tags: metadata.tags || [],
      category: metadata.category || this.detectCategory(file),
      version: 1,
      isLatestVersion: true,
      versionHistory: [],
      processingStatus: 'pending',
      owner: metadata.owner || 'current-user',
      sharedWith: metadata.sharedWith || [],
      permissions: metadata.permissions || this.getDefaultPermissions(),
      comments: [],
      checksums: {
        md5: '', // Would be calculated
        sha256: '' // Would be calculated
      },
      storageLocation: '',
      accessCount: 0,
      lastAccessed: now
    };
    
    this.files.update(files => new Map(files.set(fileId, fileMetadata)));
    
    // Auto-tag based on content analysis
    this.autoTagFile(fileId, file);
    
    // Log activity
    this.logActivity({
      fileId,
      action: 'uploaded',
      details: `Uploaded file ${file.name}`,
      userId: 'current-user',
      userName: 'Current User'
    });
    
    this.emitFileEvent('file-added', fileId, { file: fileMetadata });
    
    return fileId;
  }
  
  updateFile(fileId: string, updates: Partial<FileMetadata>): boolean {
    const file = this.files().get(fileId);
    if (!file) return false;
    
    const updatedFile = {
      ...file,
      ...updates,
      lastModified: new Date()
    };
    
    this.files.update(files => new Map(files.set(fileId, updatedFile)));
    
    this.logActivity({
      fileId,
      action: 'edited',
      details: 'File metadata updated',
      userId: 'current-user',
      userName: 'Current User'
    });
    
    this.emitFileEvent('file-updated', fileId, { updates });
    
    return true;
  }
  
  deleteFile(fileId: string): boolean {
    const file = this.files().get(fileId);
    if (!file) return false;
    
    // Remove from selection if selected
    this.selectedFiles.update(selected => {
      const newSelected = new Set(selected);
      newSelected.delete(fileId);
      return newSelected;
    });
    
    this.files.update(files => {
      const newFiles = new Map(files);
      newFiles.delete(fileId);
      return newFiles;
    });
    
    this.logActivity({
      fileId,
      action: 'deleted',
      details: `Deleted file ${file.displayName}`,
      userId: 'current-user',
      userName: 'Current User'
    });
    
    this.emitFileEvent('file-deleted', fileId, { file });
    
    return true;
  }
  
  moveFile(fileId: string, targetFolderId: string | null): boolean {
    const file = this.files().get(fileId);
    if (!file) return false;
    
    const oldFolderId = file.folderId;
    
    this.updateFile(fileId, { folderId: targetFolderId || undefined });
    
    this.logActivity({
      fileId,
      action: 'moved',
      details: `Moved from ${oldFolderId || 'root'} to ${targetFolderId || 'root'}`,
      userId: 'current-user',
      userName: 'Current User'
    });
    
    return true;
  }
  
  duplicateFile(fileId: string): string | null {
    const file = this.files().get(fileId);
    if (!file) return null;
    
    const newFileId = this.generateId();
    const now = new Date();
    
    const duplicatedFile: FileMetadata = {
      ...file,
      id: newFileId,
      displayName: `${file.displayName} (Copy)`,
      uploadedAt: now,
      lastModified: now,
      version: 1,
      versionHistory: [],
      accessCount: 0,
      lastAccessed: now,
      comments: []
    };
    
    this.files.update(files => new Map(files.set(newFileId, duplicatedFile)));
    
    this.logActivity({
      fileId: newFileId,
      action: 'uploaded',
      details: `Duplicated from ${file.displayName}`,
      userId: 'current-user',
      userName: 'Current User'
    });
    
    return newFileId;
  }
  
  // Version Control
  createFileVersion(fileId: string, newFile: File, changes: string): string | null {
    const file = this.files().get(fileId);
    if (!file) return null;
    
    const versionId = this.generateId();
    const now = new Date();
    
    const newVersion: FileVersion = {
      id: versionId,
      version: file.version + 1,
      fileId,
      uploadedAt: now,
      uploadedBy: 'current-user',
      changes,
      size: newFile.size,
      checksums: {
        md5: '', // Would be calculated
        sha256: '' // Would be calculated
      },
      isActive: true
    };
    
    // Update file metadata
    this.updateFile(fileId, {
      version: newVersion.version,
      size: newFile.size,
      versionHistory: [...file.versionHistory, newVersion],
      processingStatus: 'pending'
    });
    
    this.logActivity({
      fileId,
      action: 'edited',
      details: `Created version ${newVersion.version}: ${changes}`,
      userId: 'current-user',
      userName: 'Current User'
    });
    
    return versionId;
  }
  
  revertToVersion(fileId: string, versionId: string): boolean {
    const file = this.files().get(fileId);
    if (!file) return false;
    
    const version = file.versionHistory.find(v => v.id === versionId);
    if (!version) return false;
    
    this.updateFile(fileId, {
      version: version.version,
      size: version.size,
      processingStatus: 'pending'
    });
    
    this.logActivity({
      fileId,
      action: 'edited',
      details: `Reverted to version ${version.version}`,
      userId: 'current-user',
      userName: 'Current User'
    });
    
    return true;
  }
  
  // Folder Management
  createFolder(name: string, parentId?: string): string {
    const folderId = this.generateId();
    const now = new Date();
    
    const parentFolder = parentId ? this.folders().get(parentId) : null;
    const path = parentFolder ? `${parentFolder.path}/${name}` : name;
    
    const folder: FileFolder = {
      id: folderId,
      name,
      parentId,
      path,
      createdAt: now,
      updatedAt: now,
      owner: 'current-user',
      sharedWith: [],
      permissions: this.getDefaultFolderPermissions(),
      fileCount: 0,
      totalSize: 0
    };
    
    this.folders.update(folders => new Map(folders.set(folderId, folder)));
    
    return folderId;
  }
  
  updateFolder(folderId: string, updates: Partial<FileFolder>): boolean {
    const folder = this.folders().get(folderId);
    if (!folder) return false;
    
    const updatedFolder = {
      ...folder,
      ...updates,
      updatedAt: new Date()
    };
    
    this.folders.update(folders => new Map(folders.set(folderId, updatedFolder)));
    
    return true;
  }
  
  deleteFolder(folderId: string, moveFilesToParent: boolean = false): boolean {
    const folder = this.folders().get(folderId);
    if (!folder) return false;
    
    // Handle files in the folder
    const filesInFolder = Array.from(this.files().values()).filter(f => f.folderId === folderId);
    
    if (moveFilesToParent) {
      filesInFolder.forEach(file => {
        this.updateFile(file.id, { folderId: folder.parentId });
      });
    } else {
      filesInFolder.forEach(file => {
        this.deleteFile(file.id);
      });
    }
    
    // Delete subfolders
    const subfolders = Array.from(this.folders().values()).filter(f => f.parentId === folderId);
    subfolders.forEach(subfolder => {
      this.deleteFolder(subfolder.id, moveFilesToParent);
    });
    
    this.folders.update(folders => {
      const newFolders = new Map(folders);
      newFolders.delete(folderId);
      return newFolders;
    });
    
    return true;
  }
  
  // Tag Management
  createTag(name: string, color: string, description?: string): string {
    const tagId = this.generateId();
    const now = new Date();
    
    const tag: FileTag = {
      id: tagId,
      name,
      color,
      description,
      category: 'user',
      usageCount: 0,
      createdAt: now,
      createdBy: 'current-user'
    };
    
    this.tags.update(tags => new Map(tags.set(tagId, tag)));
    
    return tagId;
  }
  
  addTagToFile(fileId: string, tagName: string): boolean {
    const file = this.files().get(fileId);
    if (!file || file.tags.includes(tagName)) return false;
    
    this.updateFile(fileId, {
      tags: [...file.tags, tagName]
    });
    
    // Update tag usage count
    const tag = Array.from(this.tags().values()).find(t => t.name === tagName);
    if (tag) {
      this.tags.update(tags => new Map(tags.set(tag.id, {
        ...tag,
        usageCount: tag.usageCount + 1
      })));
    }
    
    this.logActivity({
      fileId,
      action: 'tagged',
      details: `Added tag: ${tagName}`,
      userId: 'current-user',
      userName: 'Current User'
    });
    
    return true;
  }
  
  removeTagFromFile(fileId: string, tagName: string): boolean {
    const file = this.files().get(fileId);
    if (!file || !file.tags.includes(tagName)) return false;
    
    this.updateFile(fileId, {
      tags: file.tags.filter(t => t !== tagName)
    });
    
    // Update tag usage count
    const tag = Array.from(this.tags().values()).find(t => t.name === tagName);
    if (tag && tag.usageCount > 0) {
      this.tags.update(tags => new Map(tags.set(tag.id, {
        ...tag,
        usageCount: tag.usageCount - 1
      })));
    }
    
    return true;
  }
  
  // Search and Filter
  search(query: FileSearchQuery): FileSearchResult {
    this.searchQuery.set(query);
    
    const files = this.currentFolderFiles();
    const allFiles = Array.from(this.files().values());
    
    // Generate facets
    const facets = {
      tags: this.generateTagFacets(allFiles),
      categories: this.generateCategoryFacets(allFiles),
      mimeTypes: this.generateMimeTypeFacets(allFiles),
      folders: this.generateFolderFacets(allFiles)
    };
    
    return {
      files,
      totalCount: files.length,
      facets
    };
  }
  
  clearSearch(): void {
    this.searchQuery.set({});
  }
  
  // Selection Management
  selectFile(fileId: string): void {
    this.selectedFiles.update(selected => new Set(selected.add(fileId)));
  }
  
  deselectFile(fileId: string): void {
    this.selectedFiles.update(selected => {
      const newSelected = new Set(selected);
      newSelected.delete(fileId);
      return newSelected;
    });
  }
  
  selectAll(): void {
    const fileIds = this.currentFolderFiles().map(f => f.id);
    this.selectedFiles.set(new Set(fileIds));
  }
  
  deselectAll(): void {
    this.selectedFiles.set(new Set());
  }
  
  // Batch Operations
  startBatchOperation(type: BatchOperation['type'], fileIds: string[], parameters?: Record<string, any>): string {
    const operationId = this.generateId();
    const now = new Date();
    
    const operation: BatchOperation = {
      id: operationId,
      type,
      fileIds,
      parameters,
      status: 'pending',
      progress: 0,
      results: [],
      startedAt: now,
      ...parameters
    };
    
    this.batchOperations.update(ops => new Map(ops.set(operationId, operation)));
    
    // Start operation
    setTimeout(() => this.executeBatchOperation(operationId), 100);
    
    return operationId;
  }
  
  private async executeBatchOperation(operationId: string): Promise<void> {
    const operation = this.batchOperations().get(operationId);
    if (!operation) return;
    
    this.updateBatchOperation(operationId, { status: 'running' });
    
    const results: BatchOperationResult[] = [];
    
    for (let i = 0; i < operation.fileIds.length; i++) {
      const fileId = operation.fileIds[i];
      
      try {
        const result = await this.executeSingleOperation(operation.type, fileId, operation.parameters || {});
        results.push({ fileId, status: 'success', result });
      } catch (error) {
        results.push({ fileId, status: 'failed', error: String(error) });
      }
      
      const progress = ((i + 1) / operation.fileIds.length) * 100;
      this.updateBatchOperation(operationId, { progress, results: [...results] });
    }
    
    this.updateBatchOperation(operationId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date()
    });
    
    this.emitBatchEvent('batch-completed', operationId, { results });
  }
  
  private async executeSingleOperation(type: BatchOperation['type'], fileId: string, parameters: Record<string, any>): Promise<any> {
    switch (type) {
      case 'move':
        return this.moveFile(fileId, parameters.targetFolderId);
      
      case 'delete':
        return this.deleteFile(fileId);
      
      case 'tag':
        if (parameters.tags) {
          parameters.tags.forEach((tag: string) => this.addTagToFile(fileId, tag));
        }
        return true;
      
      case 'share':
        if (parameters.shareWithUsers) {
          const file = this.files().get(fileId);
          if (file) {
            return this.updateFile(fileId, {
              sharedWith: [...file.sharedWith, ...parameters.shareWithUsers]
            });
          }
        }
        return false;
      
      default:
        throw new Error(`Unsupported operation type: ${type}`);
    }
  }
  
  // Comments
  addComment(fileId: string, content: string): string {
    const file = this.files().get(fileId);
    if (!file) throw new Error('File not found');
    
    const commentId = this.generateId();
    const now = new Date();
    
    const comment: FileComment = {
      id: commentId,
      fileId,
      userId: 'current-user',
      userName: 'Current User',
      content,
      timestamp: now,
      resolved: false,
      replies: []
    };
    
    this.updateFile(fileId, {
      comments: [...file.comments, comment]
    });
    
    this.logActivity({
      fileId,
      action: 'commented',
      details: 'Added a comment',
      userId: 'current-user',
      userName: 'Current User'
    });
    
    return commentId;
  }
  
  replyToComment(fileId: string, commentId: string, content: string): string {
    const file = this.files().get(fileId);
    if (!file) throw new Error('File not found');
    
    const comment = file.comments.find(c => c.id === commentId);
    if (!comment) throw new Error('Comment not found');
    
    const replyId = this.generateId();
    const now = new Date();
    
    const reply: FileCommentReply = {
      id: replyId,
      userId: 'current-user',
      userName: 'Current User',
      content,
      timestamp: now
    };
    
    comment.replies.push(reply);
    
    this.updateFile(fileId, {
      comments: file.comments.map(c => c.id === commentId ? comment : c)
    });
    
    return replyId;
  }
  
  // Utility Methods
  private detectCategory(file: File): FileCategory {
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    
    if (name.includes('resume') || name.includes('cv')) return 'resume';
    if (name.includes('cover') || name.includes('letter')) return 'cover-letter';
    if (name.includes('portfolio')) return 'portfolio';
    if (name.includes('certificate') || name.includes('cert')) return 'certificate';
    if (name.includes('reference') || name.includes('recommendation')) return 'reference';
    if (name.includes('transcript')) return 'transcript';
    if (type.startsWith('image/')) return 'photo';
    
    return 'document';
  }
  
  private autoTagFile(fileId: string, file: File): void {
    const autoTags: string[] = [];
    
    // File type tags
    if (file.type.includes('pdf')) autoTags.push('PDF');
    if (file.type.includes('image')) autoTags.push('Image');
    if (file.type.includes('word')) autoTags.push('Word Document');
    
    // Size tags
    if (file.size > 10 * 1024 * 1024) autoTags.push('Large File');
    if (file.size < 1024 * 1024) autoTags.push('Small File');
    
    // Add auto tags
    autoTags.forEach(tag => this.addTagToFile(fileId, tag));
  }
  
  private getDefaultPermissions(): FilePermissions {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canShare: true,
      canComment: true,
      canDownload: true
    };
  }
  
  private getDefaultFolderPermissions(): FolderPermissions {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canCreateFiles: true,
      canCreateFolders: true,
      canShare: true
    };
  }
  
  private initializeDefaultTags(): void {
    const defaultTags = [
      { name: 'Important', color: '#ef4444', description: 'Important files' },
      { name: 'Draft', color: '#f59e0b', description: 'Draft documents' },
      { name: 'Final', color: '#10b981', description: 'Final versions' },
      { name: 'Review', color: '#3b82f6', description: 'Files under review' },
      { name: 'Archive', color: '#6b7280', description: 'Archived files' }
    ];
    
    defaultTags.forEach(tag => {
      const tagId = this.generateId();
      this.tags.update(tags => new Map(tags.set(tagId, {
        id: tagId,
        name: tag.name,
        color: tag.color,
        description: tag.description,
        category: 'system',
        usageCount: 0,
        createdAt: new Date(),
        createdBy: 'system'
      })));
    });
  }
  
  private initializeDefaultFolders(): void {
    const defaultFolders = [
      { name: 'Resumes', description: 'Resume documents' },
      { name: 'Cover Letters', description: 'Cover letter documents' },
      { name: 'Certificates', description: 'Certificates and credentials' },
      { name: 'Portfolio', description: 'Portfolio items' },
      { name: 'References', description: 'Reference letters' }
    ];
    
    defaultFolders.forEach(folder => {
      this.createFolder(folder.name);
    });
  }
  
  private generateTagFacets(files: FileMetadata[]): { name: string; count: number }[] {
    const tagCounts = new Map<string, number>();
    
    files.forEach(file => {
      file.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    
    return Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }
  
  private generateCategoryFacets(files: FileMetadata[]): { name: string; count: number }[] {
    const categoryCounts = new Map<string, number>();
    
    files.forEach(file => {
      categoryCounts.set(file.category, (categoryCounts.get(file.category) || 0) + 1);
    });
    
    return Array.from(categoryCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }
  
  private generateMimeTypeFacets(files: FileMetadata[]): { name: string; count: number }[] {
    const mimeTypeCounts = new Map<string, number>();
    
    files.forEach(file => {
      mimeTypeCounts.set(file.mimeType, (mimeTypeCounts.get(file.mimeType) || 0) + 1);
    });
    
    return Array.from(mimeTypeCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }
  
  private generateFolderFacets(files: FileMetadata[]): { name: string; count: number }[] {
    const folderCounts = new Map<string, number>();
    
    files.forEach(file => {
      const folderId = file.folderId || 'root';
      const folder = file.folderId ? this.folders().get(file.folderId) : null;
      const folderName = folder?.name || 'Root';
      
      folderCounts.set(folderName, (folderCounts.get(folderName) || 0) + 1);
    });
    
    return Array.from(folderCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }
  
  private logActivity(activity: Omit<FileActivity, 'id' | 'timestamp'>): void {
    const activityRecord: FileActivity = {
      id: this.generateId(),
      timestamp: new Date(),
      ...activity
    };
    
    this.activities.update(activities => [activityRecord, ...activities].slice(0, 1000));
  }
  
  private updateBatchOperation(operationId: string, updates: Partial<BatchOperation>): void {
    this.batchOperations.update(ops => {
      const operation = ops.get(operationId);
      if (operation) {
        const updatedOperation = { ...operation, ...updates };
        return new Map(ops.set(operationId, updatedOperation));
      }
      return ops;
    });
  }
  
  private emitFileEvent(type: string, fileId: string, data?: any): void {
    this.fileEvents.next({ type, fileId, data });
  }
  
  private emitBatchEvent(type: string, operationId: string, data?: any): void {
    this.batchEvents.next({ type, operationId, data });
  }
  
  private generateId(): string {
    return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  // Public API
  getFiles(): FileMetadata[] {
    return Array.from(this.files().values());
  }
  
  getFile(fileId: string): FileMetadata | undefined {
    return this.files().get(fileId);
  }
  
  getFolders(): FileFolder[] {
    return Array.from(this.folders().values());
  }
  
  getFolder(folderId: string): FileFolder | undefined {
    return this.folders().get(folderId);
  }
  
  getTags(): FileTag[] {
    return Array.from(this.tags().values());
  }
  
  getActivities(): FileActivity[] {
    return this.activities();
  }
  
  getBatchOperation(operationId: string): BatchOperation | undefined {
    return this.batchOperations().get(operationId);
  }
  
  getSelectedFiles(): string[] {
    return Array.from(this.selectedFiles());
  }
  
  getCurrentFolder(): string | null {
    return this.selectedFolder();
  }
  
  setCurrentFolder(folderId: string | null): void {
    this.selectedFolder.set(folderId);
  }
  
  getSortSettings(): { sortBy: string; sortOrder: string } {
    return {
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder()
    };
  }
  
  setSortSettings(sortBy: 'name' | 'date' | 'size' | 'quality', sortOrder: 'asc' | 'desc'): void {
    this.sortBy.set(sortBy);
    this.sortOrder.set(sortOrder);
  }
  
  getViewMode(): 'list' | 'grid' | 'tree' {
    return this.viewMode();
  }
  
  setViewMode(mode: 'list' | 'grid' | 'tree'): void {
    this.viewMode.set(mode);
  }
  
  // Event streams
  onFileEvents(): Observable<{ type: string; fileId: string; data?: any }> {
    return this.fileEvents.asObservable();
  }
  
  onBatchEvents(): Observable<{ type: string; operationId: string; data?: any }> {
    return this.batchEvents.asObservable();
  }
}
