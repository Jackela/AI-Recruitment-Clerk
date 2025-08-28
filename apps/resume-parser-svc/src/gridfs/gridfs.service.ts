import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { GridFsFileInfo } from '../dto/resume-parsing.dto';
import { Readable } from 'stream';

@Injectable()
export class GridFsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GridFsService.name);
  private gridFSBucket: GridFSBucket;
  private bucketName = 'resume-files';

  constructor(
    @InjectConnection('resume-parser') private readonly connection: Connection,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async downloadFile(gridFsUrl: string): Promise<Buffer> {
    try {
      const objectId = this.extractObjectIdFromUrl(gridFsUrl);
      
      // Check if file exists first
      const fileExists = await this.fileExists(gridFsUrl);
      if (!fileExists) {
        throw new Error(`File not found: ${gridFsUrl}`);
      }

      const downloadStream = this.gridFSBucket.openDownloadStream(objectId);
      const chunks: Uint8Array[] = [];
      
      return new Promise((resolve, reject) => {
        downloadStream.on('data', (chunk: Uint8Array) => {
          chunks.push(chunk);
        });
        
        downloadStream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          this.logger.log(`Downloaded file: ${gridFsUrl}, size: ${buffer.length} bytes`);
          resolve(buffer);
        });
        
        downloadStream.on('error', (error) => {
          this.logger.error(`Error downloading file ${gridFsUrl}:`, error);
          reject(error);
        });
      });
    } catch (error) {
      this.logger.error(`Failed to download file ${gridFsUrl}:`, error);
      throw error;
    }
  }

  async uploadFile(buffer: Buffer, filename: string, metadata?: any): Promise<string> {
    try {
      const uploadStream = this.gridFSBucket.openUploadStream(filename, {
        metadata: {
          uploadDate: new Date(),
          ...metadata
        }
      });

      const readable = new Readable();
      readable.push(buffer);
      readable.push(null); // End of stream

      return new Promise((resolve, reject) => {
        uploadStream.on('finish', () => {
          const gridFsUrl = this.generateGridFsUrl(uploadStream.id);
          this.logger.log(`Uploaded file: ${filename}, GridFS URL: ${gridFsUrl}`);
          resolve(gridFsUrl);
        });
        
        uploadStream.on('error', (error) => {
          this.logger.error(`Error uploading file ${filename}:`, error);
          reject(error);
        });
        
        readable.pipe(uploadStream);
      });
    } catch (error) {
      this.logger.error(`Failed to upload file ${filename}:`, error);
      throw error;
    }
  }

  async fileExists(gridFsUrl: string): Promise<boolean> {
    try {
      const objectId = this.extractObjectIdFromUrl(gridFsUrl);
      const files = await this.gridFSBucket.find({ _id: objectId }).toArray();
      return files.length > 0;
    } catch (error) {
      this.logger.error(`Error checking if file exists ${gridFsUrl}:`, error);
      return false;
    }
  }

  async getFileInfo(gridFsUrl: string): Promise<GridFsFileInfo> {
    try {
      const objectId = this.extractObjectIdFromUrl(gridFsUrl);
      const files = await this.gridFSBucket.find({ _id: objectId }).toArray();
      
      if (files.length === 0) {
        throw new Error(`File not found: ${gridFsUrl}`);
      }
      
      const file = files[0];
      return {
        id: file._id.toString(),
        filename: file.filename,
        contentType: file.metadata?.contentType || 'application/octet-stream',
        length: file.length,
        uploadDate: file.uploadDate
      };
    } catch (error) {
      this.logger.error(`Failed to get file info ${gridFsUrl}:`, error);
      throw error;
    }
  }

  async deleteFile(gridFsUrl: string): Promise<void> {
    try {
      const objectId = this.extractObjectIdFromUrl(gridFsUrl);
      
      // Check if file exists first
      const fileExists = await this.fileExists(gridFsUrl);
      if (!fileExists) {
        this.logger.warn(`File not found for deletion: ${gridFsUrl}`);
        return;
      }
      
      await this.gridFSBucket.delete(objectId);
      this.logger.log(`Deleted file: ${gridFsUrl}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${gridFsUrl}:`, error);
      throw error;
    }
  }

  async connect(): Promise<void> {
    try {
      // Wait for connection to be ready
      if (this.connection.readyState !== 1) {
        await new Promise((resolve, reject) => {
          if (this.connection.readyState === 1) {
            resolve(void 0);
            return;
          }
          this.connection.once('connected', resolve);
          this.connection.once('error', reject);
          // Timeout after 10 seconds
          setTimeout(() => reject(new Error('MongoDB connection timeout')), 10000);
        });
      }
      
      this.gridFSBucket = new GridFSBucket(this.connection.db, {
        bucketName: this.bucketName
      });
      
      this.logger.log(`GridFS connected successfully with bucket: ${this.bucketName}`);
    } catch (error) {
      this.logger.error('Failed to connect to GridFS:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // GridFS bucket doesn't need explicit cleanup
      // Connection cleanup is handled by Mongoose
      this.logger.log('GridFS service disconnected');
    } catch (error) {
      this.logger.error('Error during GridFS disconnect:', error);
      throw error;
    }
  }

  /**
   * Extract ObjectId from GridFS URL
   * Expected format: gridfs://bucketname/objectId
   */
  private extractObjectIdFromUrl(gridFsUrl: string): ObjectId {
    try {
      // Handle both formats: "gridfs://bucketname/objectId" and just "objectId"
      const parts = gridFsUrl.split('/');
      const objectIdString = parts.length > 1 ? parts[parts.length - 1] : gridFsUrl;
      
      if (!ObjectId.isValid(objectIdString)) {
        throw new Error(`Invalid ObjectId: ${objectIdString}`);
      }
      
      return new ObjectId(objectIdString);
    } catch (error) {
      throw new Error(`Invalid GridFS URL format: ${gridFsUrl}`);
    }
  }

  /**
   * Generate GridFS URL from ObjectId
   */
  private generateGridFsUrl(objectId: ObjectId): string {
    return `gridfs://${this.bucketName}/${objectId.toString()}`;
  }

  /**
   * Health check method for service monitoring
   */
  async healthCheck(): Promise<{ status: string; bucket: string; connected: boolean }> {
    try {
      const connected = this.connection.readyState === 1 && !!this.gridFSBucket;
      return {
        status: connected ? 'healthy' : 'unhealthy',
        bucket: this.bucketName,
        connected
      };
    } catch (error) {
      this.logger.error('GridFS health check failed:', error);
      return {
        status: 'unhealthy',
        bucket: this.bucketName,
        connected: false
      };
    }
  }
}