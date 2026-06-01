import { Injectable, Logger } from '@nestjs/common';
import { InputValidator, ResumeParserException } from '@ai-recruitment-clerk/infrastructure-shared';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

/**
 * Result of file validation and processing
 */
export interface FileProcessingResult {
  buffer: Buffer;
  hash: string;
  size: number;
  mimeType: string;
}

/**
 * Configuration for file processing constraints
 */
export interface FileProcessingConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
}

export type FileDownloadFunction = (url: string) => Promise<Buffer>;

/**
 * Handles file validation, download, and processing operations for resume parsing.
 * Extracted from ParsingService to separate file handling concerns from business logic.
 */
@Injectable()
export class FileProcessingService {
  private readonly logger = new Logger(FileProcessingService.name);
  private readonly DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly DEFAULT_ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  private readonly config: FileProcessingConfig;
  private downloadFn?: FileDownloadFunction;

  constructor(config?: Partial<FileProcessingConfig>) {
    this.config = {
      maxFileSize: config?.maxFileSize ?? this.DEFAULT_MAX_FILE_SIZE,
      allowedMimeTypes:
        config?.allowedMimeTypes ?? this.DEFAULT_ALLOWED_MIME_TYPES,
    };
  }

  public setDownloadFunction(downloadFn: FileDownloadFunction): void {
    this.downloadFn = downloadFn;
  }

  /**
   * Downloads and validates a file from GridFS URL
   * @param gridFsUrl - The GridFS URL to download from
   * @param filename - Original filename for validation
   * @param metadata - Optional file metadata
   * @returns Validated file buffer with hash
   * @throws ResumeParserException if download or validation fails
   */
  public async downloadAndValidateFile(
    gridFsUrl: string,
    filename: string,
    metadata?: { mimetype?: string; size?: number },
  ): Promise<FileProcessingResult> {
    const downloadFn = this.downloadFn ?? this.defaultDownloadFile.bind(this);

    return this.downloadAndValidateFileWithService(
      downloadFn,
      gridFsUrl,
      filename,
      metadata,
    );
  }

  /**
   * Downloads and validates a file using provided GridFS service
   * @param downloadFn - Function to download file buffer
   * @param gridFsUrl - The GridFS URL
   * @param filename - Original filename
   * @param metadata - Optional file metadata
   * @returns Processing result with buffer, hash, and metadata
   */
  public async downloadAndValidateFileWithService(
    downloadFn: (url: string) => Promise<Buffer>,
    gridFsUrl: string,
    filename: string,
    metadata?: { mimetype?: string; size?: number },
  ): Promise<FileProcessingResult> {
    // Download file
    const fileBuffer = await downloadFn(gridFsUrl);

    if (!fileBuffer || fileBuffer.length === 0) {
      throw new ResumeParserException('FILE_DOWNLOAD_FAILED', {
        filename,
        gridFsUrl,
      });
    }

    return this.validateFileBuffer(fileBuffer, filename, metadata);
  }

  /**
   * Validates a file buffer against size and format constraints
   * @param buffer - The file buffer to validate
   * @param filename - Original filename
   * @param metadata - Optional file metadata
   * @returns Processing result with buffer, hash, and detected MIME type
   * @throws ResumeParserException if validation fails
   */
  public validateFileBuffer(
    buffer: Buffer,
    filename: string,
    metadata?: { mimetype?: string; size?: number },
  ): FileProcessingResult {
    // Validate file size
    if (buffer.length > this.config.maxFileSize) {
      throw new ResumeParserException('FILE_SIZE_EXCEEDED', {
        filename,
        actualSize: buffer.length,
        maxAllowed: this.config.maxFileSize,
      });
    }

    // Detect MIME type from buffer signature
    const detectedMimeType = this.detectMimeType(buffer);

    // Validate file using InputValidator
    const validation = InputValidator.validateResumeFile({
      buffer: buffer,
      originalname: filename,
      mimetype: metadata?.mimetype || detectedMimeType,
      size: buffer.length,
    });

    if (!validation.isValid) {
      throw new ResumeParserException('FILE_VALIDATION_FAILED', {
        filename,
        validationErrors: validation.errors,
        actualMimeType: metadata?.mimetype || detectedMimeType,
      });
    }

    // Generate file hash for integrity checking
    const fileHash = this.generateFileHash(buffer);

    this.logger.log(
      `File validation passed for: ${filename} (${buffer.length} bytes, ${detectedMimeType})`,
    );

    return {
      buffer,
      hash: fileHash,
      size: buffer.length,
      mimeType: detectedMimeType,
    };
  }

  /**
   * Checks if a buffer is a PDF file based on header signature
   * @param buffer - File buffer to check
   * @returns True if buffer starts with PDF signature
   */
  public isPdfFile(buffer: Buffer): boolean {
    const header = buffer.toString('ascii', 0, 4);
    return header === '%PDF';
  }

  /**
   * Detects MIME type from buffer file signature
   * @param buffer - File buffer to analyze
   * @returns Detected MIME type or 'application/octet-stream' if unknown
   */
  public detectMimeType(buffer: Buffer): string {
    // Check PDF signature first
    const pdfHeader = buffer.toString('ascii', 0, 4);
    if (pdfHeader === '%PDF') {
      return 'application/pdf';
    }

    // Check DOCX signature (PK header)
    const docxHeader = buffer.toString('ascii', 0, 2);
    if (docxHeader === 'PK') {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    // Check DOC signature (OLE2 header) - use byte comparison
    if (buffer.length >= 8) {
      const docSignature: readonly number[] = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
      const matches = docSignature.every((byte, index) => buffer[index] === byte);
      if (matches) {
        return 'application/msword';
      }
    }

    return 'application/octet-stream';
  }

  /**
   * Generates SHA-256 hash of file buffer for integrity verification
   * @param buffer - File buffer to hash
   * @returns Hexadecimal hash string
   */
  public generateFileHash(buffer: Buffer): string {
    return createHash('sha256')
      .update(Uint8Array.from(buffer))
      .digest('hex');
  }

  /**
   * Checks if a given MIME type is allowed
   * @param mimeType - MIME type to check
   * @returns True if MIME type is in allowed list
   */
  public isAllowedMimeType(mimeType: string): boolean {
    return this.config.allowedMimeTypes.includes(mimeType);
  }

  /**
   * Gets current file processing configuration
   * @returns Current configuration
   */
  public getConfig(): Readonly<FileProcessingConfig> {
    return { ...this.config };
  }

  private async defaultDownloadFile(url: string): Promise<Buffer> {
    if (!url || typeof url !== 'string') {
      throw new ResumeParserException('FILE_DOWNLOAD_FAILED', {
        url,
        reason: 'empty_url',
      });
    }

    if (url.startsWith('gridfs://')) {
      throw new ResumeParserException('FILE_DOWNLOAD_SERVICE_UNAVAILABLE', {
        url,
        reason: 'GridFS downloads require a registered download function',
      });
    }

    if (url.startsWith('file://')) {
      return readFile(new URL(url));
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      const response = await fetch(url);

      if (!response.ok) {
        throw new ResumeParserException('FILE_DOWNLOAD_FAILED', {
          url,
          status: response.status,
          statusText: response.statusText,
        });
      }

      return Buffer.from(await response.arrayBuffer());
    }

    throw new ResumeParserException('FILE_DOWNLOAD_FAILED', {
      url,
      reason: 'unsupported_url_scheme',
    });
  }
}
