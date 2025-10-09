import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GridFSBucket, GridFSBucketWriteStream, ObjectId } from 'mongodb';
import * as stream from 'stream';
import * as crypto from 'crypto';

// Convert Node Buffer to a Uint8Array view so crypto typings accept it without copies.
const toUint8ArrayView = (buffer: Buffer): Uint8Array =>
  new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

/**
 * Defines the shape of the report file metadata.
 */
export interface ReportFileMetadata {
  reportType: 'markdown' | 'html' | 'pdf' | 'json' | 'excel';
  jobId: string;
  resumeId: string;
  generatedBy: string;
  generatedAt: Date;
  fileSize?: number;
  contentHash?: string;
  reportId?: string;
  mimeType: string;
  encoding?: string;
}

/**
 * Defines the shape of the saved report file.
 */
export interface SavedReportFile {
  fileId: string;
  filename: string;
  contentHash: string;
  fileSize: number;
  uploadDate: Date;
  metadata: ReportFileMetadata;
}

/**
 * Defines the shape of the report file query.
 */
export interface ReportFileQuery {
  jobId?: string;
  resumeId?: string;
  reportType?: string;
  generatedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

// Enhanced type definition for GridFS filter operations
/**
 * Defines the shape of the grid fs filter.
 */
export interface GridFSFilter {
  'metadata.jobId'?: string;
  'metadata.resumeId'?: string;
  'metadata.reportType'?: string;
  'metadata.generatedBy'?: string;
  'metadata.generatedAt'?: {
    $gte?: Date;
    $lte?: Date;
  };
  [key: string]: unknown;
}

/**
 * Provides grid fs functionality.
 */
@Injectable()
export class GridFsService {
  private readonly logger = new Logger(GridFsService.name);
  private gridFSBucket: GridFSBucket;

  /**
   * Initializes a new instance of the Grid FS Service.
   * @param connection - The connection.
   */
  constructor(
    @InjectConnection('report-generator')
    private readonly connection: Connection,
  ) {
    // Initialize GridFS bucket for storing report files
    if (!this.connection.db) {
      throw new Error('MongoDB database connection not available');
    }
    this.gridFSBucket = new GridFSBucket(this.connection.db, {
      bucketName: 'reports',
      chunkSizeBytes: 255 * 1024, // 255 KB chunks for optimal performance
    });
  }

  /**
   * Performs the save report operation.
   * @param content - The content.
   * @param filename - The filename.
   * @param metadata - The metadata.
   * @returns A promise that resolves to string value.
   */
  async saveReport(
    content: string,
    filename: string,
    metadata: ReportFileMetadata,
  ): Promise<string> {
    try {
      this.logger.debug(`Saving report file: ${filename}`);

      // Generate content hash for integrity verification
      const contentHash = crypto
        .createHash('sha256')
        .update(content)
        .digest('hex');
      const fileSize = Buffer.byteLength(content, 'utf8');

      // Enhanced metadata with file information
      const enhancedMetadata: ReportFileMetadata = {
        ...metadata,
        fileSize,
        contentHash,
        generatedAt: metadata.generatedAt || new Date(),
      };

      // Create a readable stream from the content
      const contentBuffer = Buffer.from(content, 'utf8');
      const readableStream = new stream.Readable({
        read() {
          this.push(contentBuffer);
          this.push(null);
        },
      });

      // Create GridFS upload stream
      const uploadStream: GridFSBucketWriteStream =
        this.gridFSBucket.openUploadStream(filename, {
          metadata: enhancedMetadata,
        });

      return new Promise((resolve, reject) => {
        uploadStream.on('error', (error) => {
          this.logger.error('GridFS upload failed', {
            error: error.message,
            filename,
            metadata: enhancedMetadata,
          });
          reject(new Error(`Failed to save report file: ${error.message}`));
        });

        uploadStream.on('finish', () => {
          const fileId = uploadStream.id.toString();
          this.logger.debug(
            `Successfully saved report file: ${filename} with ID: ${fileId}`,
          );
          resolve(fileId);
        });

        // Pipe content to GridFS
        readableStream.pipe(uploadStream);
      });
    } catch (error) {
      this.logger.error('Error in saveReport', {
        error: error.message,
        filename,
        metadata,
      });
      throw new Error(`Failed to save report: ${error.message}`);
    }
  }

  /**
   * Performs the save report buffer operation.
   * @param buffer - The buffer.
   * @param filename - The filename.
   * @param metadata - The metadata.
   * @returns A promise that resolves to string value.
   */
  async saveReportBuffer(
    buffer: Buffer,
    filename: string,
    metadata: ReportFileMetadata,
  ): Promise<string> {
    try {
      this.logger.debug(
        `Saving report buffer: ${filename}, size: ${buffer.length} bytes`,
      );

      // Generate content hash for integrity verification
      const contentHash = crypto
        .createHash('sha256')
        .update(toUint8ArrayView(buffer))
        .digest('hex');

      // Enhanced metadata with file information
      const enhancedMetadata: ReportFileMetadata = {
        ...metadata,
        fileSize: buffer.length,
        contentHash,
        generatedAt: metadata.generatedAt || new Date(),
      };

      // Create a readable stream from the buffer
      const readableStream = new stream.Readable({
        read() {
          this.push(buffer);
          this.push(null);
        },
      });

      // Create GridFS upload stream
      const uploadStream: GridFSBucketWriteStream =
        this.gridFSBucket.openUploadStream(filename, {
          metadata: enhancedMetadata,
        });

      return new Promise((resolve, reject) => {
        uploadStream.on('error', (error) => {
          this.logger.error('GridFS buffer upload failed', {
            error: error.message,
            filename,
            bufferSize: buffer.length,
          });
          reject(new Error(`Failed to save report buffer: ${error.message}`));
        });

        uploadStream.on('finish', () => {
          const fileId = uploadStream.id.toString();
          this.logger.debug(
            `Successfully saved report buffer: ${filename} with ID: ${fileId}`,
          );
          resolve(fileId);
        });

        // Pipe buffer to GridFS
        readableStream.pipe(uploadStream);
      });
    } catch (error) {
      this.logger.error('Error in saveReportBuffer', {
        error: error.message,
        filename,
        bufferSize: buffer?.length,
      });
      throw new Error(`Failed to save report buffer: ${error.message}`);
    }
  }

  /**
   * Retrieves report.
   * @param fileId - The file id.
   * @returns A promise that resolves to Buffer.
   */
  async getReport(fileId: string): Promise<Buffer> {
    try {
      this.logger.debug(`Retrieving report file: ${fileId}`);

      const objectId = new ObjectId(fileId);
      const downloadStream = this.gridFSBucket.openDownloadStream(objectId);

      const chunks: Uint8Array[] = [];

      return new Promise((resolve, reject) => {
        downloadStream.on('data', (chunk: Buffer) => {
          chunks.push(toUint8ArrayView(chunk));
        });

        downloadStream.on('error', (error) => {
          this.logger.error('GridFS download failed', {
            error: error.message,
            fileId,
          });
          reject(new Error(`Failed to retrieve report: ${error.message}`));
        });

        downloadStream.on('end', () => {
          const fileBuffer = Buffer.concat(chunks);
          this.logger.debug(
            `Successfully retrieved report file: ${fileId}, size: ${fileBuffer.length} bytes`,
          );
          resolve(fileBuffer);
        });
      });
    } catch (error) {
      this.logger.error('Error in getReport', {
        error: error.message,
        fileId,
      });
      throw new Error(`Failed to get report: ${error.message}`);
    }
  }

  /**
   * Retrieves report stream.
   * @param fileId - The file id.
   * @returns A promise that resolves to NodeJS.ReadableStream.
   */
  async getReportStream(fileId: string): Promise<NodeJS.ReadableStream> {
    try {
      this.logger.debug(`Creating stream for report file: ${fileId}`);

      const objectId = new ObjectId(fileId);
      const downloadStream = this.gridFSBucket.openDownloadStream(objectId);

      // Add error handling to the stream
      downloadStream.on('error', (error) => {
        this.logger.error('GridFS stream error', {
          error: error.message,
          fileId,
        });
      });

      return downloadStream;
    } catch (error) {
      this.logger.error('Error in getReportStream', {
        error: error.message,
        fileId,
      });
      throw new Error(`Failed to create report stream: ${error.message}`);
    }
  }

  /**
   * Retrieves report metadata.
   * @param fileId - The file id.
   * @returns A promise that resolves to ReportFileMetadata | null.
   */
  async getReportMetadata(fileId: string): Promise<ReportFileMetadata | null> {
    try {
      this.logger.debug(`Getting metadata for report file: ${fileId}`);

      const objectId = new ObjectId(fileId);
      const files = await this.gridFSBucket.find({ _id: objectId }).toArray();

      if (files.length === 0) {
        this.logger.warn(`Report file not found: ${fileId}`);
        return null;
      }

      return files[0].metadata as ReportFileMetadata;
    } catch (error) {
      this.logger.error('Error in getReportMetadata', {
        error: error.message,
        fileId,
      });
      throw new Error(`Failed to get report metadata: ${error.message}`);
    }
  }

  /**
   * Performs the find report files operation.
   * @param query - The query.
   * @returns A promise that resolves to an array of SavedReportFile.
   */
  async findReportFiles(
    query: ReportFileQuery = {},
  ): Promise<SavedReportFile[]> {
    try {
      this.logger.debug('Finding report files', { query });

      const filter: GridFSFilter = {};

      if (query.jobId) {
        filter['metadata.jobId'] = query.jobId;
      }

      if (query.resumeId) {
        filter['metadata.resumeId'] = query.resumeId;
      }

      if (query.reportType) {
        filter['metadata.reportType'] = query.reportType;
      }

      if (query.generatedBy) {
        filter['metadata.generatedBy'] = query.generatedBy;
      }

      if (query.dateFrom || query.dateTo) {
        filter['metadata.generatedAt'] = {};
        if (query.dateFrom) {
          filter['metadata.generatedAt'].$gte = query.dateFrom;
        }
        if (query.dateTo) {
          filter['metadata.generatedAt'].$lte = query.dateTo;
        }
      }

      const files = await this.gridFSBucket
        .find(filter)
        .sort({ uploadDate: -1 })
        .toArray();

      return files.map((file) => ({
        fileId: file._id.toString(),
        filename: file.filename,
        contentHash: file.metadata?.contentHash || '',
        fileSize: file.length,
        uploadDate: file.uploadDate,
        metadata: file.metadata as ReportFileMetadata,
      }));
    } catch (error) {
      this.logger.error('Error in findReportFiles', {
        error: error.message,
        query,
      });
      throw new Error(`Failed to find report files: ${error.message}`);
    }
  }

  /**
   * Removes report.
   * @param fileId - The file id.
   * @returns A promise that resolves to boolean value.
   */
  async deleteReport(fileId: string): Promise<boolean> {
    try {
      this.logger.debug(`Deleting report file: ${fileId}`);

      const objectId = new ObjectId(fileId);

      // Check if file exists first
      const files = await this.gridFSBucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        this.logger.warn(`Report file not found for deletion: ${fileId}`);
        return false;
      }

      await this.gridFSBucket.delete(objectId);

      this.logger.debug(`Successfully deleted report file: ${fileId}`);
      return true;
    } catch (error) {
      this.logger.error('Error in deleteReport', {
        error: error.message,
        fileId,
      });
      throw new Error(`Failed to delete report: ${error.message}`);
    }
  }

  /**
   * Performs the verify report integrity operation.
   * @param fileId - The file id.
   * @returns A promise that resolves to boolean value.
   */
  async verifyReportIntegrity(fileId: string): Promise<boolean> {
    try {
      this.logger.debug(`Verifying integrity of report file: ${fileId}`);

      const [fileBuffer, metadata] = await Promise.all([
        this.getReport(fileId),
        this.getReportMetadata(fileId),
      ]);

      if (!metadata?.contentHash) {
        this.logger.warn(`No content hash found for file: ${fileId}`);
        return false;
      }

      // Verify content hash
      const actualHash = crypto
        .createHash('sha256')
        .update(toUint8ArrayView(fileBuffer))
        .digest('hex');
      const isValid = actualHash === metadata.contentHash;

      if (!isValid) {
        this.logger.error('Report file integrity check failed', {
          fileId,
          expectedHash: metadata.contentHash,
          actualHash,
        });
      } else {
        this.logger.debug(`Report file integrity verified: ${fileId}`);
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error in verifyReportIntegrity', {
        error: error.message,
        fileId,
      });
      return false;
    }
  }

  /**
   * Retrieves storage stats.
   * @returns The Promise<{ totalFiles: number; totalSize: number; sizeByType: Record<string, { count: number; size: number }>; }>.
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    sizeByType: Record<string, { count: number; size: number }>;
  }> {
    try {
      this.logger.debug('Getting GridFS storage statistics');

      const files = await this.gridFSBucket.find({}).toArray();

      const stats = {
        totalFiles: files.length,
        totalSize: files.reduce((sum, file) => sum + file.length, 0),
        sizeByType: {} as Record<string, { count: number; size: number }>,
      };

      // Group by report type
      files.forEach((file) => {
        const reportType = file.metadata?.reportType || 'unknown';
        if (!stats.sizeByType[reportType]) {
          stats.sizeByType[reportType] = { count: 0, size: 0 };
        }
        stats.sizeByType[reportType].count++;
        stats.sizeByType[reportType].size += file.length;
      });

      return stats;
    } catch (error) {
      this.logger.error('Error in getStorageStats', {
        error: error.message,
      });
      throw new Error(`Failed to get storage stats: ${error.message}`);
    }
  }

  /**
   * Performs the health check operation.
   * @returns A promise that resolves to boolean value.
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test connection by listing a small number of files
      await this.gridFSBucket.find({}).limit(1).toArray();
      return true;
    } catch (error) {
      this.logger.error('GridFS health check failed', { error: error.message });
      return false;
    }
  }

  private generateFilename(
    reportType: string,
    jobId: string,
    resumeId: string,
    extension: string,
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${reportType}-${jobId}-${resumeId}-${timestamp}.${extension}`;
  }
}
