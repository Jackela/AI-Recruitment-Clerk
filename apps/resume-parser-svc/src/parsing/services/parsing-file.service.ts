/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Injectable, Logger } from '@nestjs/common';
import { GridFsService } from '../../gridfs/gridfs.service';
import {
  FileProcessingService,
  ResumeEncryptionService,
} from '../../processing';
import type { SecuredResumeDto } from '../../processing';
import type { ResumeDTO, FileMetadata } from '@ai-recruitment-clerk/resume-dto';
import { createHash } from 'crypto';
import pdfParse from 'pdf-parse-fork';

/**
 * Handles file operations for the parsing service.
 * Extracted from ParsingService to improve maintainability.
 */
@Injectable()
export class ParsingFileService {
  private readonly logger = new Logger(ParsingFileService.name);

  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  constructor(
    private readonly gridFsService: GridFsService,
    private readonly fileProcessingService: FileProcessingService,
    private readonly resumeEncryptionService: ResumeEncryptionService,
  ) {}

  /**
   * Downloads and validates a file from GridFS.
   * @param gridFsUrl - GridFS URL
   * @param filename - Original filename
   * @param metadata - Optional file metadata
   * @returns File buffer and validation result
   */
  public async downloadAndValidateFile(
    gridFsUrl: string,
    filename: string,
    metadata?: FileMetadata,
  ): Promise<Buffer> {
    const result = await this.fileProcessingService.downloadAndValidateFileWithService(
      (url) => this.gridFsService.downloadFile(url),
      gridFsUrl,
      filename,
      metadata,
    );
    return result.buffer;
  }

  /**
   * Validates organization access.
   * @param organizationId - Organization ID
   * @param jobId - Job ID
   */
  public validateOrganizationAccess(organizationId: string, jobId: string): void {
    this.resumeEncryptionService.validateOrganizationAccess(organizationId, jobId);
  }

  /**
   * Encrypts sensitive data in a resume DTO.
   * @param resumeDto - Resume DTO to encrypt
   * @param organizationId - Organization ID for encryption key
   * @returns Encrypted resume DTO
   */
  public encryptSensitiveData(
    resumeDto: ResumeDTO,
    organizationId: string,
  ): SecuredResumeDto {
    return this.resumeEncryptionService.encryptSensitiveData(
      resumeDto as unknown as Record<string, unknown>,
      organizationId,
    );
  }

  /**
   * Extracts text from a file buffer.
   * For PDF files, uses pdf-parse; for plain text, decodes UTF-8.
   * @param buffer - File buffer
   * @returns Extracted text
   */
  public async extractTextFromMaybeTextFile(buffer: Buffer): Promise<string> {
    try {
      const header = buffer.toString('ascii', 0, 4);
      if (header === '%PDF') {
        const res = await pdfParse(buffer);
        return res?.text || '';
      }
      // Assume UTF-8 text as fallback
      return buffer.toString('utf8');
    } catch (err: unknown) {
      this.logger.warn('Failed to extract text from buffer', err as Error);
      return '';
    }
  }

  /**
   * Checks if a buffer contains a PDF file.
   * @param buffer - File buffer
   * @returns True if PDF
   */
  public isPdf(buffer: Buffer): boolean {
    return buffer.toString('ascii', 0, 4) === '%PDF';
  }

  /**
   * Creates a SHA-256 hash of a file buffer.
   * @param buffer - File buffer
   * @returns Hex-encoded hash
   */
  public createFileHash(buffer: Buffer): string {
    return createHash('sha256').update(Uint8Array.from(buffer)).digest('hex');
  }

  /**
   * Gets the maximum file size allowed.
   * @returns Max file size in bytes
   */
  public getMaxFileSize(): number {
    return this.MAX_FILE_SIZE;
  }

  /**
   * Gets the allowed MIME types.
   * @returns Array of allowed MIME types
   */
  public getAllowedMimeTypes(): string[] {
    return [...this.ALLOWED_MIME_TYPES];
  }

  /**
   * Validates file buffer and filename.
   * @param buffer - File buffer
   * @param filename - Filename
   * @param userId - User ID
   * @throws Error if validation fails
   */
  public validateFileInput(buffer: Buffer, filename: string, userId: string): void {
    if (!(buffer instanceof Buffer) || buffer.length === 0) {
      throw new Error('File buffer must be valid and non-empty');
    }
    if (!filename || typeof filename !== 'string' || filename.trim().length === 0) {
      throw new Error('File name must be non-empty string');
    }
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('User ID must be non-empty string');
    }
    if (buffer.length > this.MAX_FILE_SIZE) {
      throw new Error('File size exceeds maximum allowed');
    }
  }

  /**
   * Attempts to upload a file to GridFS.
   * @param buffer - File buffer
   * @param filename - Filename
   * @returns URL of uploaded file, or undefined if upload failed
   */
  public async uploadFile(buffer: Buffer, filename: string): Promise<string | undefined> {
    try {
      if (
        this.gridFsService &&
        typeof (this.gridFsService as unknown as { uploadFile?: unknown }).uploadFile === 'function'
      ) {
        return await (
          this.gridFsService as unknown as { uploadFile: (buffer: Buffer, filename: string) => Promise<string> }
        ).uploadFile(buffer, filename);
      }
    } catch (e) {
      this.logger.warn(`Failed to upload file ${filename}: ${(e as Error)?.message || 'Unknown error'}`);
    }
    return undefined;
  }
}
