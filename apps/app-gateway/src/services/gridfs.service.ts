import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GridFSBucket, GridFSBucketWriteStream, ObjectId } from 'mongodb';
import * as stream from 'stream';
import * as crypto from 'crypto';

/**
 * Defines the shape of the resume file metadata.
 */
export interface ResumeFileMetadata {
  fileType: 'resume';
  analysisId: string;
  deviceId?: string;
  userId?: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date;
  candidateName?: string;
  candidateEmail?: string;
  notes?: string;
  isGuestMode: boolean;
  contentHash?: string;
}

/**
 * Defines the shape of the saved resume file.
 */
export interface SavedResumeFile {
  fileId: string;
  filename: string;
  contentHash: string;
  fileSize: number;
  uploadDate: Date;
  metadata: ResumeFileMetadata;
  gridFsUrl: string;
}

// Convert Node Buffer to a Uint8Array view so crypto typings accept it without copies.
const toUint8ArrayView = (buffer: Buffer): Uint8Array =>
  new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

/**
 * Provides GridFS functionality for resume file storage.
 */
@Injectable()
export class GridFsService {
  private readonly logger = new Logger(GridFsService.name);
  private gridFSBucket: GridFSBucket;

  /**
   * Initializes a new instance of the GridFS Service.
   * @param connection - The MongoDB connection.
   */
  constructor(@InjectConnection() private readonly connection: Connection) {
    // Initialize GridFS bucket for storing resume files
    if (!this.connection.db) {
      throw new Error('MongoDB database connection not available');
    }
    this.gridFSBucket = new GridFSBucket(this.connection.db, {
      bucketName: 'resume-files',
      chunkSizeBytes: 255 * 1024, // 255 KB chunks for optimal performance
    });

    this.logger.log('GridFS service initialized for resume file storage');
  }

  /**
   * Stores a resume file buffer in GridFS.
   * @param buffer - The file buffer.
   * @param filename - The original filename.
   * @param metadata - The file metadata.
   * @returns A promise that resolves to the GridFS URL.
   */
  async storeResumeFile(
    buffer: Buffer,
    filename: string,
    metadata: ResumeFileMetadata,
  ): Promise<string> {
    try {
      this.logger.debug(
        `Storing resume file: ${filename}, size: ${buffer.length} bytes`,
      );

      // Generate content hash for integrity verification
      const contentHash = crypto
        .createHash('sha256')
        .update(toUint8ArrayView(buffer))
        .digest('hex');

      // Enhanced metadata with file information
      const enhancedMetadata: ResumeFileMetadata = {
        ...metadata,
        fileSize: buffer.length,
        contentHash,
        uploadedAt: metadata.uploadedAt || new Date(),
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
          this.logger.error('GridFS resume upload failed', {
            error: error.message,
            filename,
            bufferSize: buffer.length,
            analysisId: metadata.analysisId,
          });
          reject(new Error(`Failed to store resume file: ${error.message}`));
        });

        uploadStream.on('finish', () => {
          const fileId = uploadStream.id.toString();
          const gridFsUrl = `gridfs://resume-files/${fileId}`;

          this.logger.debug(
            `Successfully stored resume file: ${filename} with ID: ${fileId}`,
            {
              fileId,
              gridFsUrl,
              analysisId: metadata.analysisId,
              fileSize: buffer.length,
            },
          );

          resolve(gridFsUrl);
        });

        // Pipe buffer to GridFS
        readableStream.pipe(uploadStream);
      });
    } catch (error) {
      this.logger.error('Error in storeResumeFile', {
        error: error.message,
        filename,
        bufferSize: buffer?.length,
        analysisId: metadata.analysisId,
      });
      throw new Error(`Failed to store resume file: ${error.message}`);
    }
  }

  /**
   * Retrieves a resume file from GridFS.
   * @param gridFsUrl - The GridFS URL (format: gridfs://bucket-name/fileId).
   * @returns A promise that resolves to the file buffer.
   */
  async getResumeFile(gridFsUrl: string): Promise<Buffer> {
    try {
      this.logger.debug(`Retrieving resume file: ${gridFsUrl}`);

      const fileId = this.extractFileIdFromUrl(gridFsUrl);
      const objectId = new ObjectId(fileId);
      const downloadStream = this.gridFSBucket.openDownloadStream(objectId);

      const chunks: Uint8Array[] = [];

      return new Promise((resolve, reject) => {
        downloadStream.on('data', (chunk: Buffer) => {
          chunks.push(toUint8ArrayView(chunk));
        });

        downloadStream.on('error', (error) => {
          this.logger.error('GridFS resume download failed', {
            error: error.message,
            gridFsUrl,
            fileId,
          });
          reject(new Error(`Failed to retrieve resume file: ${error.message}`));
        });

        downloadStream.on('end', () => {
          const fileBuffer = Buffer.concat(chunks);
          this.logger.debug(
            `Successfully retrieved resume file: ${gridFsUrl}, size: ${fileBuffer.length} bytes`,
          );
          resolve(fileBuffer);
        });
      });
    } catch (error) {
      this.logger.error('Error in getResumeFile', {
        error: error.message,
        gridFsUrl,
      });
      throw new Error(`Failed to get resume file: ${error.message}`);
    }
  }

  /**
   * Retrieves resume file metadata.
   * @param gridFsUrl - The GridFS URL.
   * @returns A promise that resolves to the file metadata or null if not found.
   */
  async getResumeFileMetadata(
    gridFsUrl: string,
  ): Promise<ResumeFileMetadata | null> {
    try {
      this.logger.debug(`Getting metadata for resume file: ${gridFsUrl}`);

      const fileId = this.extractFileIdFromUrl(gridFsUrl);
      const objectId = new ObjectId(fileId);
      const files = await this.gridFSBucket.find({ _id: objectId }).toArray();

      if (files.length === 0) {
        this.logger.warn(`Resume file not found: ${gridFsUrl}`);
        return null;
      }

      return files[0].metadata as ResumeFileMetadata;
    } catch (error) {
      this.logger.error('Error in getResumeFileMetadata', {
        error: error.message,
        gridFsUrl,
      });
      throw new Error(`Failed to get resume file metadata: ${error.message}`);
    }
  }

  /**
   * Deletes a resume file from GridFS.
   * @param gridFsUrl - The GridFS URL.
   * @returns A promise that resolves to true if deleted, false if not found.
   */
  async deleteResumeFile(gridFsUrl: string): Promise<boolean> {
    try {
      this.logger.debug(`Deleting resume file: ${gridFsUrl}`);

      const fileId = this.extractFileIdFromUrl(gridFsUrl);
      const objectId = new ObjectId(fileId);

      // Check if file exists first
      const files = await this.gridFSBucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        this.logger.warn(`Resume file not found for deletion: ${gridFsUrl}`);
        return false;
      }

      await this.gridFSBucket.delete(objectId);

      this.logger.debug(`Successfully deleted resume file: ${gridFsUrl}`);
      return true;
    } catch (error) {
      this.logger.error('Error in deleteResumeFile', {
        error: error.message,
        gridFsUrl,
      });
      throw new Error(`Failed to delete resume file: ${error.message}`);
    }
  }

  /**
   * Verifies the integrity of a resume file.
   * @param gridFsUrl - The GridFS URL.
   * @returns A promise that resolves to true if integrity is valid.
   */
  async verifyResumeFileIntegrity(gridFsUrl: string): Promise<boolean> {
    try {
      this.logger.debug(`Verifying integrity of resume file: ${gridFsUrl}`);

      const [fileBuffer, metadata] = await Promise.all([
        this.getResumeFile(gridFsUrl),
        this.getResumeFileMetadata(gridFsUrl),
      ]);

      if (!metadata?.contentHash) {
        this.logger.warn(`No content hash found for file: ${gridFsUrl}`);
        return false;
      }

      // Verify content hash
      const actualHash = crypto
        .createHash('sha256')
        .update(toUint8ArrayView(fileBuffer))
        .digest('hex');
      const isValid = actualHash === metadata.contentHash;

      if (!isValid) {
        this.logger.error('Resume file integrity check failed', {
          gridFsUrl,
          expectedHash: metadata.contentHash,
          actualHash,
        });
      } else {
        this.logger.debug(`Resume file integrity verified: ${gridFsUrl}`);
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error in verifyResumeFileIntegrity', {
        error: error.message,
        gridFsUrl,
      });
      return false;
    }
  }

  /**
   * Performs a health check on the GridFS service.
   * @returns A promise that resolves to true if healthy.
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

  /**
   * Extracts the file ID from a GridFS URL.
   * @param gridFsUrl - The GridFS URL (format: gridfs://bucket-name/fileId).
   * @returns The file ID.
   */
  private extractFileIdFromUrl(gridFsUrl: string): string {
    const urlPattern = /^gridfs:\/\/[^\/]+\/(.+)$/;
    const match = gridFsUrl.match(urlPattern);

    if (!match) {
      throw new Error(`Invalid GridFS URL format: ${gridFsUrl}`);
    }

    return match[1];
  }

}
