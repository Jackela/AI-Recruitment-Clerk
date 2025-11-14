import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { GridFsFileInfo } from '../dto/resume-parsing.dto';
import { getConfig } from '@ai-recruitment-clerk/configuration';

/**
 * Provides grid fs functionality.
 */
@Injectable()
export class GridFsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GridFsService.name);
  private gridFSBucket!: GridFSBucket;
  private bucketName = 'resume-files';
  private readonly inMemoryStore = new Map<
    string,
    { buffer: Buffer; info: GridFsFileInfo & { metadata?: Record<string, any> } }
  >();
  private readonly config = getConfig();

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
   * @param gridFsUrl - The GridFS URL (format: gridfs://bucket-name/fileId).
   * @returns A promise that resolves to Buffer.
   */
  async downloadFile(gridFsUrl: string): Promise<Buffer> {
    try {
      this.logger.debug(`Downloading file from GridFS: ${gridFsUrl}`);

      // Validate GridFS URL format
      if (!gridFsUrl || typeof gridFsUrl !== 'string') {
        throw new Error('GridFS URL must be a non-empty string');
      }

      // Extract file ID from GridFS URL
      const fileId = this.extractFileIdFromUrl(gridFsUrl);

      // Test mode/in-memory fallback
      const inMemory = this.inMemoryStore.get(fileId);
      if (inMemory) {
        return inMemory.buffer;
      }

      // Convert to MongoDB ObjectId
      let objectId: ObjectId;
      try {
        objectId = new ObjectId(fileId);
      } catch (error) {
        throw new Error(`Invalid file ID format: ${fileId}`);
      }

      // Check if GridFS bucket is initialized
      if (!this.gridFSBucket) {
        throw new Error(
          'GridFS bucket not initialized. Service may not be connected.',
        );
      }

      // Verify file exists before attempting download
      const files = await this.gridFSBucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        throw new Error(`File not found in GridFS: ${fileId}`);
      }

      // Create download stream
      const downloadStream = this.gridFSBucket.openDownloadStream(objectId);
      const chunks: Uint8Array[] = [];

      return new Promise((resolve, reject) => {
        downloadStream.on('data', (chunk: Buffer) => {
          chunks.push(
            new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength),
          );
        });

        downloadStream.on('error', (error) => {
          this.logger.error('GridFS download stream error', {
            error: error.message,
            gridFsUrl,
            fileId,
          });
          reject(
            new Error(`Failed to download file from GridFS: ${error.message}`),
          );
        });

        downloadStream.on('end', () => {
          const totalLength = chunks.reduce(
            (sum, chunk) => sum + chunk.byteLength,
            0,
          );
          const fileBuffer = Buffer.allocUnsafe(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            fileBuffer.set(chunk, offset);
            offset += chunk.byteLength;
          }
          this.logger.debug(
            `Successfully downloaded file from GridFS: ${gridFsUrl}, size: ${fileBuffer.length} bytes`,
            { fileId, bufferSize: fileBuffer.length },
          );
          resolve(fileBuffer);
        });
      });
    } catch (error) {
      this.logger.error('Error in downloadFile', {
        error: error.message,
        gridFsUrl,
      });

      // Re-throw with more specific error context
      if (error.message.includes('File not found')) {
        throw new Error(`File not found: ${gridFsUrl}`);
      } else if (error.message.includes('Invalid')) {
        throw new Error(`Invalid GridFS URL or file ID: ${gridFsUrl}`);
      } else {
        throw new Error(
          `Failed to download file from GridFS: ${error.message}`,
        );
      }
    }
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
    if (!_buffer || !Buffer.isBuffer(_buffer) || _buffer.length === 0) {
      throw new Error('File buffer must be a non-empty Buffer');
    }

    if (!_filename || typeof _filename !== 'string') {
      throw new Error('Filename is required to upload to GridFS');
    }

    // In test mode or when GridFS is not connected, store files in-memory
    if (this.config.env.isTest || !this.gridFSBucket) {
      const objectId = new ObjectId().toHexString();
      const gridFsUrl = `gridfs://${this.bucketName}/${objectId}`;
      const info: GridFsFileInfo & { metadata?: Record<string, any> } = {
        id: objectId,
        filename: _filename,
        contentType:
          (_metadata && _metadata.contentType) || 'application/octet-stream',
        length: _buffer.length,
        uploadDate: new Date(),
        metadata: _metadata ?? {},
      };
      this.inMemoryStore.set(objectId, {
        buffer: _buffer,
        info,
      });
      this.logger.debug(`Stored file in in-memory GridFS: ${gridFsUrl}`);
      return gridFsUrl;
    }

    throw new Error('GridFsService.uploadFile not implemented');
  }

  /**
   * Performs the file exists operation.
   * @param _gridFsUrl - The grid fs url.
   * @returns A promise that resolves to boolean value.
   */
  async fileExists(_gridFsUrl: string): Promise<boolean> {
    const fileId = this.extractFileIdFromUrl(_gridFsUrl);

    if (this.inMemoryStore.has(fileId)) {
      return true;
    }

    if (!this.gridFSBucket) {
      return false;
    }

    try {
      const objectId = new ObjectId(fileId);
      const files = await this.gridFSBucket.find({ _id: objectId }).toArray();
      return files.length > 0;
    } catch (error) {
      this.logger.warn('Error while checking GridFS file existence', {
        error: (error as Error).message,
        gridFsUrl: _gridFsUrl,
      });
      return false;
    }
  }

  /**
   * Retrieves file info.
   * @param _gridFsUrl - The grid fs url.
   * @returns A promise that resolves to GridFsFileInfo.
   */
  async getFileInfo(_gridFsUrl: string): Promise<GridFsFileInfo> {
    const fileId = this.extractFileIdFromUrl(_gridFsUrl);

    const inMemory = this.inMemoryStore.get(fileId);
    if (inMemory) {
      const { metadata, ...info } = inMemory.info;
      return info as GridFsFileInfo;
    }

    if (!this.gridFSBucket) {
      throw new Error(`File not found: ${_gridFsUrl}`);
    }

    try {
      const objectId = new ObjectId(fileId);
      const files = await this.gridFSBucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        throw new Error(`File not found in GridFS: ${fileId}`);
      }

      const file = files[0];
      return {
        id: file._id?.toString?.() ?? fileId,
        filename: file.filename,
        contentType: file.contentType || 'application/octet-stream',
        length: file.length,
        uploadDate: file.uploadDate,
      };
    } catch (error) {
      this.logger.error('Error retrieving GridFS file info', {
        error: (error as Error).message,
        gridFsUrl: _gridFsUrl,
      });
      throw error;
    }
  }

  /**
   * Removes file.
   * @param _gridFsUrl - The grid fs url.
   * @returns A promise that resolves when the operation completes.
   */
  async deleteFile(_gridFsUrl: string): Promise<void> {
    const fileId = this.extractFileIdFromUrl(_gridFsUrl);

    if (this.inMemoryStore.delete(fileId)) {
      this.logger.debug(`Deleted in-memory GridFS file: ${_gridFsUrl}`);
      return;
    }

    if (!this.gridFSBucket) {
      this.logger.warn(
        `GridFS bucket not initialized when deleting file: ${_gridFsUrl}`,
      );
      return;
    }

    try {
      const objectId = new ObjectId(fileId);
      await this.gridFSBucket.delete(objectId);
    } catch (error) {
      this.logger.warn('Error deleting GridFS file', {
        error: (error as Error).message,
        gridFsUrl: _gridFsUrl,
      });
    }
  }

  /**
   * Performs the connect operation.
   * @returns A promise that resolves when the operation completes.
   */
  async connect(): Promise<void> {
    try {
      // Skip actual connection in test environment
      if (this.config.env.isTest) {
        this.logger.log('GridFS service connected (test mode)');
        return;
      }

      // Initialize GridFS bucket for resume file operations
      if (!this.connection.db) {
        throw new Error('MongoDB database connection not available');
      }

      this.gridFSBucket = new GridFSBucket(this.connection.db, {
        bucketName: this.bucketName,
        chunkSizeBytes: 255 * 1024, // 255 KB chunks for optimal performance
      });

      this.logger.log(`GridFS service connected - bucket: ${this.bucketName}`);
    } catch (error) {
      this.logger.error('Failed to connect to GridFS:', error);
      throw new Error(`GridFS connection failed: ${error.message}`);
    }
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
   * Extract file ID from GridFS URL.
   * Expected format: gridfs://bucketname/objectId
   * @param gridFsUrl - The GridFS URL to parse.
   * @returns The extracted file ID.
   */
  private extractFileIdFromUrl(gridFsUrl: string): string {
    const urlPattern = /^gridfs:\/\/[^/]+\/(.+)$/;
    const match = gridFsUrl.match(urlPattern);

    if (!match) {
      throw new Error(
        `Invalid GridFS URL format: ${gridFsUrl}. Expected format: gridfs://bucket-name/fileId`,
      );
    }

    const fileId = match[1];
    if (!fileId || fileId.trim() === '') {
      throw new Error(`Empty file ID in GridFS URL: ${gridFsUrl}`);
    }

    return fileId;
  }

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

