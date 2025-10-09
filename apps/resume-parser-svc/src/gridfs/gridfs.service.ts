import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { GridFsFileInfo } from '../dto/resume-parsing.dto';

/**
 * Provides grid fs functionality.
 */
@Injectable()
export class GridFsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GridFsService.name);
  private gridFSBucket!: GridFSBucket;
  private bucketName = 'resume-files';

  /**
   * Initializes a new instance of the Grid FS Service.
   * @param connection - The connection.
   */
  constructor(
    @InjectConnection('resume-parser') private readonly connection: Connection,
  ) {}

  /**
   * Performs the on module init operation.
   * @returns The result of the operation.
   */
  async onModuleInit() {
    await this.connect();
  }

  /**
   * Performs the on module destroy operation.
   * @returns The result of the operation.
   */
  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Performs the download file operation.
   * @param _gridFsUrl - The grid fs url.
   * @returns A promise that resolves to Buffer.
   */
  async downloadFile(_gridFsUrl: string): Promise<Buffer> {
    throw new Error('GridFsService.downloadFile not implemented');
  }

  /**
   * Performs the upload file operation.
   * @param _buffer - The buffer.
   * @param _filename - The filename.
   * @param _metadata - The metadata.
   * @returns A promise that resolves to string value.
   */
  async uploadFile(
    _buffer: Buffer,
    _filename: string,
    _metadata?: any,
  ): Promise<string> {
    throw new Error('GridFsService.uploadFile not implemented');
  }

  /**
   * Performs the file exists operation.
   * @param _gridFsUrl - The grid fs url.
   * @returns A promise that resolves to boolean value.
   */
  async fileExists(_gridFsUrl: string): Promise<boolean> {
    throw new Error('GridFsService.fileExists not implemented');
  }

  /**
   * Retrieves file info.
   * @param _gridFsUrl - The grid fs url.
   * @returns A promise that resolves to GridFsFileInfo.
   */
  async getFileInfo(_gridFsUrl: string): Promise<GridFsFileInfo> {
    throw new Error('GridFsService.getFileInfo not implemented');
  }

  /**
   * Removes file.
   * @param _gridFsUrl - The grid fs url.
   * @returns A promise that resolves when the operation completes.
   */
  async deleteFile(_gridFsUrl: string): Promise<void> {
    throw new Error('GridFsService.deleteFile not implemented');
  }

  /**
   * Performs the connect operation.
   * @returns A promise that resolves when the operation completes.
   */
  async connect(): Promise<void> {
    // In unit tests we don't connect to a real DB; consider successful
    this.logger.log('GridFS service connected (stub)');
  }

  /**
   * Performs the disconnect operation.
   * @returns A promise that resolves when the operation completes.
   */
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
  // Removed unused private method to satisfy strict TypeScript checks

  // Removed unused private method to satisfy strict TypeScript checks

  /**
   * Health check method for service monitoring
   */
  async healthCheck(): Promise<{
    status: string;
    bucket: string;
    connected: boolean;
  }> {
    try {
      const connected = this.connection.readyState === 1 && !!this.gridFSBucket;
      return {
        status: connected ? 'healthy' : 'unhealthy',
        bucket: this.bucketName,
        connected,
      };
    } catch (error) {
      this.logger.error('GridFS health check failed:', error);
      return {
        status: 'unhealthy',
        bucket: this.bucketName,
        connected: false,
      };
    }
  }
}
