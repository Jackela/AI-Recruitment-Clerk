/**
 * Multi-Modal Upload Service
 * Supports various upload methods: camera, email, URL, cloud storage
 */

import { Injectable, signal } from '@angular/core';
import { Observable, from, throwError, BehaviorSubject } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

export interface CameraCapture {
  id: string;
  blob: Blob;
  filename: string;
  timestamp: Date;
  deviceInfo: {
    camera: string;
    resolution: { width: number; height: number };
    orientation: string;
  };
}

export interface EmailImport {
  id: string;
  from: string;
  subject: string;
  attachments: EmailAttachment[];
  receivedAt: Date;
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  content: Blob;
}

export interface UrlImport {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  content: Blob;
  metadata: {
    title?: string;
    description?: string;
    lastModified?: Date;
  };
}

export interface CloudFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  modifiedTime: Date;
  downloadUrl: string;
  thumbnailUrl?: string;
  provider: 'google-drive' | 'dropbox' | 'onedrive' | 'box';
}

export interface CloudImportOptions {
  provider: 'google-drive' | 'dropbox' | 'onedrive' | 'box';
  folderId?: string;
  fileTypes?: string[];
  maxFiles?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MultiModalUploadService {
  private readonly supportedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly supportedVideoTypes = ['video/mp4', 'video/webm'];
  
  // Camera state
  private mediaStream = signal<MediaStream | null>(null);
  private cameraState = signal<{
    isActive: boolean;
    devices: MediaDeviceInfo[];
    selectedDevice?: string;
    constraints: MediaStreamConstraints;
  }>({
    isActive: false,
    devices: [],
    constraints: {
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: 'environment'
      }
    }
  });
  
  constructor() {
    this.initializeCameraDevices();
  }
  
  // Camera Capture Methods
  async initializeCameraDevices(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      this.cameraState.update(state => ({
        ...state,
        devices: videoDevices
      }));
    } catch (error) {
      console.error('Failed to enumerate camera devices:', error);
    }
  }
  
  async startCamera(deviceId?: string): Promise<MediaStream> {
    try {
      const constraints = this.cameraState().constraints;
      
      if (deviceId) {
        (constraints.video as MediaTrackConstraints).deviceId = deviceId;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      this.mediaStream.set(stream);
      this.cameraState.update(state => ({
        ...state,
        isActive: true,
        selectedDevice: deviceId
      }));
      
      return stream;
    } catch (error) {
      throw new Error(`Camera access failed: ${error}`);
    }
  }
  
  stopCamera(): void {
    const stream = this.mediaStream();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this.mediaStream.set(null);
      this.cameraState.update(state => ({
        ...state,
        isActive: false
      }));
    }
  }
  
  capturePhoto(videoElement: HTMLVideoElement): Promise<CameraCapture> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error('Canvas context not available');
        }
        
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        
        context.drawImage(videoElement, 0, 0);
        
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create image blob'));
            return;
          }
          
          const capture: CameraCapture = {
            id: this.generateId(),
            blob,
            filename: `camera-capture-${Date.now()}.jpg`,
            timestamp: new Date(),
            deviceInfo: {
              camera: this.cameraState().selectedDevice || 'default',
              resolution: {
                width: canvas.width,
                height: canvas.height
              },
              orientation: canvas.width > canvas.height ? 'landscape' : 'portrait'
            }
          };
          
          resolve(capture);
        }, 'image/jpeg', 0.9);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  async captureDocument(videoElement: HTMLVideoElement): Promise<CameraCapture> {
    const capture = await this.capturePhoto(videoElement);
    
    // Apply document enhancement (placeholder for AI processing)
    const enhancedBlob = await this.enhanceDocumentImage(capture.blob);
    
    return {
      ...capture,
      blob: enhancedBlob,
      filename: `document-scan-${Date.now()}.jpg`
    };
  }
  
  private async enhanceDocumentImage(blob: Blob): Promise<Blob> {
    // Placeholder for AI-powered document enhancement
    // In real implementation, this would:
    // 1. Apply perspective correction
    // 2. Enhance contrast and brightness
    // 3. Remove shadows
    // 4. Improve text clarity
    return blob;
  }
  
  // URL Import Methods
  async importFromUrl(url: string): Promise<UrlImport> {
    try {
      // Validate URL
      const urlObj = new URL(url);
      
      // Fetch the file
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const filename = this.extractFilenameFromUrl(url) || 'imported-file';
      
      const urlImport: UrlImport = {
        id: this.generateId(),
        url,
        filename,
        mimeType: blob.type || 'application/octet-stream',
        size: blob.size,
        content: blob,
        metadata: {
          title: response.headers.get('content-disposition') || undefined,
          lastModified: response.headers.get('last-modified') 
            ? new Date(response.headers.get('last-modified')!) 
            : undefined
        }
      };
      
      return urlImport;
    } catch (error) {
      throw new Error(`URL import failed: ${error}`);
    }
  }
  
  private extractFilenameFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const segments = pathname.split('/');
      const filename = segments[segments.length - 1];
      
      // Check if it has a file extension
      if (filename && filename.includes('.')) {
        return filename;
      }
      
      return null;
    } catch {
      return null;
    }
  }
  
  // Email Import Methods (requires backend integration)
  async connectEmailProvider(provider: 'gmail' | 'outlook' | 'imap'): Promise<void> {
    // This would integrate with email providers
    // For now, we'll simulate the flow
    switch (provider) {
      case 'gmail':
        return this.connectGmail();
      case 'outlook':
        return this.connectOutlook();
      case 'imap':
        return this.connectImap();
      default:
        throw new Error(`Unsupported email provider: ${provider}`);
    }
  }
  
  private async connectGmail(): Promise<void> {
    // OAuth flow for Gmail API
    throw new Error('Gmail integration requires backend implementation');
  }
  
  private async connectOutlook(): Promise<void> {
    // OAuth flow for Microsoft Graph API
    throw new Error('Outlook integration requires backend implementation');
  }
  
  private async connectImap(): Promise<void> {
    // IMAP configuration
    throw new Error('IMAP integration requires backend implementation');
  }
  
  async importFromEmail(emailId: string): Promise<EmailImport> {
    // This would fetch email and attachments from the connected provider
    throw new Error('Email import requires backend implementation');
  }
  
  // Cloud Storage Import Methods
  async connectCloudStorage(provider: CloudImportOptions['provider']): Promise<void> {
    switch (provider) {
      case 'google-drive':
        return this.connectGoogleDrive();
      case 'dropbox':
        return this.connectDropbox();
      case 'onedrive':
        return this.connectOneDrive();
      case 'box':
        return this.connectBox();
      default:
        throw new Error(`Unsupported cloud provider: ${provider}`);
    }
  }
  
  private async connectGoogleDrive(): Promise<void> {
    // OAuth flow for Google Drive API
    try {
      // This would use the Google Drive API
      // For now, we'll simulate the connection
      console.log('Connecting to Google Drive...');
    } catch (error) {
      throw new Error(`Google Drive connection failed: ${error}`);
    }
  }
  
  private async connectDropbox(): Promise<void> {
    // OAuth flow for Dropbox API
    try {
      console.log('Connecting to Dropbox...');
    } catch (error) {
      throw new Error(`Dropbox connection failed: ${error}`);
    }
  }
  
  private async connectOneDrive(): Promise<void> {
    // OAuth flow for Microsoft Graph API
    try {
      console.log('Connecting to OneDrive...');
    } catch (error) {
      throw new Error(`OneDrive connection failed: ${error}`);
    }
  }
  
  private async connectBox(): Promise<void> {
    // OAuth flow for Box API
    try {
      console.log('Connecting to Box...');
    } catch (error) {
      throw new Error(`Box connection failed: ${error}`);
    }
  }
  
  async listCloudFiles(options: CloudImportOptions): Promise<CloudFile[]> {
    // This would list files from the connected cloud storage
    // For now, we'll return a mock response
    const mockFiles: CloudFile[] = [
      {
        id: 'file1',
        name: 'Resume-John-Doe.pdf',
        size: 1024 * 1024, // 1MB
        mimeType: 'application/pdf',
        modifiedTime: new Date(),
        downloadUrl: 'https://example.com/file1',
        provider: options.provider
      }
    ];
    
    return mockFiles;
  }
  
  async importFromCloud(fileId: string, provider: CloudImportOptions['provider']): Promise<Blob> {
    // This would download the file from cloud storage
    throw new Error('Cloud import requires backend implementation');
  }
  
  // Clipboard Import Methods
  async importFromClipboard(): Promise<File[]> {
    try {
      const clipboardItems = await navigator.clipboard.read();
      const files: File[] = [];
      
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (this.supportedImageTypes.includes(type)) {
            const blob = await item.getType(type);
            const file = new File([blob], `clipboard-${Date.now()}.${this.getExtensionFromMimeType(type)}`, {
              type,
              lastModified: Date.now()
            });
            files.push(file);
          }
        }
      }
      
      return files;
    } catch (error) {
      throw new Error(`Clipboard import failed: ${error}`);
    }
  }
  
  // File Conversion Methods
  async convertFile(file: File, targetFormat: string): Promise<File> {
    // This would handle file format conversion
    // For now, we'll just return the original file
    return file;
  }
  
  async optimizeImage(file: File, options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const { maxWidth = 1920, maxHeight = 1080, quality = 0.8 } = options;
        
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(optimizedFile);
            } else {
              reject(new Error('Failed to optimize image'));
            }
          },
          file.type,
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }
  
  // Utility Methods
  private generateId(): string {
    return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  private getExtensionFromMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
    };
    
    return extensions[mimeType] || 'bin';
  }
  
  // Getters for reactive state
  getCameraState() {
    return this.cameraState.asReadonly();
  }
  
  getMediaStream() {
    return this.mediaStream.asReadonly();
  }
  
  // Device capability checks
  isCameraSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
  
  isClipboardSupported(): boolean {
    return !!(navigator.clipboard && navigator.clipboard.read);
  }
  
  isFileSystemAccessSupported(): boolean {
    return 'showOpenFilePicker' in window;
  }
  
  // Advanced file picker (where supported)
  async showAdvancedFilePicker(options: {
    types?: { description: string; accept: Record<string, string[]> }[];
    multiple?: boolean;
  } = {}): Promise<File[]> {
    if (!this.isFileSystemAccessSupported()) {
      throw new Error('File System Access API not supported');
    }
    
    try {
      // @ts-ignore - File System Access API
      const fileHandles = await window.showOpenFilePicker(options);
      const files: File[] = [];
      
      for (const handle of fileHandles) {
        const file = await handle.getFile();
        files.push(file);
      }
      
      return files;
    } catch (error) {
      if (error.name === 'AbortError') {
        return []; // User cancelled
      }
      throw error;
    }
  }
}
