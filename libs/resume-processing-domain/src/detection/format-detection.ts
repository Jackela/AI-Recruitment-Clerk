/**
 * Format Detection Service
 * Detects file types, encodings, and validates formats
 */

import {
  ResumeParserException,
  ResumeParserErrorCode,
} from '@ai-recruitment-clerk/shared-dtos';

export interface FileFormat {
  mimeType: string;
  extension: string;
  isSupported: boolean;
  confidence: number;
}

export interface EncodingInfo {
  encoding: string;
  confidence: number;
  isValid: boolean;
}

export interface FormatValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  format: FileFormat | null;
  encoding: EncodingInfo | null;
}

export class FormatDetectionService {
  private readonly supportedFormats: Map<string, string> = new Map([
    ['application/pdf', 'pdf'],
    [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'docx',
    ],
    ['application/msword', 'doc'],
    ['text/html', 'html'],
    ['application/xhtml+xml', 'xhtml'],
    ['text/plain', 'txt'],
    ['text/markdown', 'md'],
    ['text/rtf', 'rtf'],
    ['application/rtf', 'rtf'],
  ]);

  private readonly magicNumbers: Array<{
    mimeType: string;
    signature: number[];
    offset: number;
  }> = [
    {
      mimeType: 'application/pdf',
      signature: [0x25, 0x50, 0x44, 0x46],
      offset: 0,
    },
    {
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      signature: [0x50, 0x4b, 0x03, 0x04],
      offset: 0,
    },
    {
      mimeType: 'application/msword',
      signature: [0xd0, 0xcf, 0x11, 0xe0],
      offset: 0,
    },
    {
      mimeType: 'text/rtf',
      signature: [0x7b, 0x5c, 0x72, 0x74, 0x66],
      offset: 0,
    },
  ];

  detectFileType(buffer: Buffer, filename?: string): FileFormat {
    let detectedMimeType = 'application/octet-stream';
    let confidence = 0;

    for (const { mimeType, signature, offset } of this.magicNumbers) {
      if (this.checkMagicNumber(buffer, signature, offset)) {
        detectedMimeType = mimeType;
        confidence = 0.95;
        break;
      }
    }

    if (confidence === 0 && filename) {
      const ext = this.getExtension(filename).toLowerCase();
      const mimeByExt = this.getMimeTypeByExtension(ext);
      if (mimeByExt) {
        detectedMimeType = mimeByExt;
        confidence = 0.7;
      }
    }

    if (confidence === 0) {
      const textContent = buffer.toString(
        'utf-8',
        0,
        Math.min(buffer.length, 100),
      );
      if (
        textContent.includes('<!DOCTYPE html>') ||
        textContent.includes('<html>')
      ) {
        detectedMimeType = 'text/html';
        confidence = 0.9;
      } else if (this.isPlainText(buffer)) {
        detectedMimeType = 'text/plain';
        confidence = 0.8;
      }
    }

    const extension = this.supportedFormats.get(detectedMimeType) || 'unknown';
    const isSupported = this.supportedFormats.has(detectedMimeType);

    return {
      mimeType: detectedMimeType,
      extension,
      isSupported,
      confidence,
    };
  }

  private checkMagicNumber(
    buffer: Buffer,
    signature: number[],
    offset: number,
  ): boolean {
    if (buffer.length < offset + signature.length) {
      return false;
    }

    for (let i = 0; i < signature.length; i++) {
      if (buffer[offset + i] !== signature[i]) {
        return false;
      }
    }

    return true;
  }

  private getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot + 1) : '';
  }

  private getMimeTypeByExtension(ext: string): string | null {
    for (const [mime, extension] of this.supportedFormats.entries()) {
      if (extension === ext) {
        return mime;
      }
    }
    return null;
  }

  private isPlainText(buffer: Buffer): boolean {
    const sample = buffer.slice(0, Math.min(buffer.length, 512));
    const textChars = sample.filter(
      (b) => (b >= 0x20 && b <= 0x7e) || b === 0x0a || b === 0x0d || b === 0x09,
    );
    return textChars.length / sample.length > 0.9;
  }

  detectEncoding(buffer: Buffer): EncodingInfo {
    if (buffer.length === 0) {
      return {
        encoding: 'utf-8',
        confidence: 0,
        isValid: false,
      };
    }

    if (
      buffer.length >= 3 &&
      buffer[0] === 0xef &&
      buffer[1] === 0xbb &&
      buffer[2] === 0xbf
    ) {
      return {
        encoding: 'utf-8',
        confidence: 1.0,
        isValid: true,
      };
    }

    if (buffer.length >= 2) {
      if (buffer[0] === 0xfe && buffer[1] === 0xff) {
        return {
          encoding: 'utf-16be',
          confidence: 1.0,
          isValid: true,
        };
      }
      if (buffer[0] === 0xff && buffer[1] === 0xfe) {
        return {
          encoding: 'utf-16le',
          confidence: 1.0,
          isValid: true,
        };
      }
    }

    const utf8Valid = this.isValidUtf8(buffer);
    if (utf8Valid) {
      return {
        encoding: 'utf-8',
        confidence: 0.9,
        isValid: true,
      };
    }

    return {
      encoding: 'ascii',
      confidence: 0.6,
      isValid: true,
    };
  }

  private isValidUtf8(buffer: Buffer): boolean {
    let i = 0;
    while (i < buffer.length) {
      const byte = buffer[i];

      if (byte <= 0x7f) {
        i++;
      } else if ((byte & 0xe0) === 0xc0) {
        if (i + 1 >= buffer.length || (buffer[i + 1] & 0xc0) !== 0x80)
          return false;
        i += 2;
      } else if ((byte & 0xf0) === 0xe0) {
        if (
          i + 2 >= buffer.length ||
          (buffer[i + 1] & 0xc0) !== 0x80 ||
          (buffer[i + 2] & 0xc0) !== 0x80
        )
          return false;
        i += 3;
      } else if ((byte & 0xf8) === 0xf0) {
        if (
          i + 3 >= buffer.length ||
          (buffer[i + 1] & 0xc0) !== 0x80 ||
          (buffer[i + 2] & 0xc0) !== 0x80 ||
          (buffer[i + 3] & 0xc0) !== 0x80
        )
          return false;
        i += 4;
      } else {
        return false;
      }
    }
    return true;
  }

  validateFormat(
    buffer: Buffer,
    filename: string,
    mimeType?: string,
  ): FormatValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (buffer.length === 0) {
      errors.push('File buffer is empty');
      return {
        isValid: false,
        errors,
        warnings,
        format: null,
        encoding: null,
      };
    }

    const format = this.detectFileType(buffer, filename);
    const encoding = this.detectEncoding(buffer);

    if (!format.isSupported) {
      errors.push(`Unsupported file format: ${format.mimeType}`);
    }

    if (format.confidence < 0.5) {
      warnings.push('Low confidence in file type detection');
    }

    if (buffer.length > 10 * 1024 * 1024) {
      errors.push('File size exceeds 10MB limit');
    }

    if (mimeType && mimeType !== format.mimeType) {
      warnings.push(
        `Declared MIME type (${mimeType}) differs from detected type (${format.mimeType})`,
      );
    }

    if (format.mimeType === 'application/pdf') {
      const pdfValidation = this.validatePdf(buffer);
      errors.push(...pdfValidation.errors);
      warnings.push(...pdfValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      format,
      encoding,
    };
  }

  private validatePdf(buffer: Buffer): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const header = buffer.slice(0, 8).toString('ascii');
    if (!header.startsWith('%PDF')) {
      errors.push('Invalid PDF header');
    }

    const footer = buffer.slice(-8).toString('ascii');
    if (!footer.includes('%%EOF')) {
      warnings.push('PDF may be truncated (missing EOF marker)');
    }

    const hasXref = buffer.toString('ascii').includes('xref');
    if (!hasXref) {
      warnings.push('PDF structure may be corrupted (missing xref table)');
    }

    return { errors, warnings };
  }

  isSupportedFormat(mimeType: string): boolean {
    return this.supportedFormats.has(mimeType);
  }

  getSupportedFormats(): FileFormat[] {
    return Array.from(this.supportedFormats.entries()).map(
      ([mimeType, extension]) => ({
        mimeType,
        extension,
        isSupported: true,
        confidence: 1.0,
      }),
    );
  }

  assertSupportedFormat(mimeType: string): void {
    if (!this.isSupportedFormat(mimeType)) {
      throw new ResumeParserException(
        ResumeParserErrorCode.UNSUPPORTED_FORMAT,
        { mimeType },
      );
    }
  }
}
