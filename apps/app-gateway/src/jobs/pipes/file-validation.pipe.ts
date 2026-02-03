import type { PipeTransform} from '@nestjs/common';
import { Injectable, BadRequestException } from '@nestjs/common';
import type { MulterFile } from '../types/multer.types';

/**
 * Represents the file validation pipe.
 */
@Injectable()
export class FileValidationPipe implements PipeTransform {
  /**
   * Performs the transform operation.
   * @param files - The files.
   * @returns The an array of MulterFile.
   */
  public transform(files: MulterFile[]): MulterFile[] {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one resume file is required');
    }

    // Validate each file
    files.forEach((file, index) => {
      // Check file type (only PDF allowed)
      if (file.mimetype !== 'application/pdf') {
        throw new BadRequestException(
          `File ${index + 1}: Only PDF files are allowed`,
        );
      }

      // Check file size (max 10MB per file)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new BadRequestException(
          `File ${index + 1}: File size cannot exceed 10MB`,
        );
      }

      // Check filename
      if (!file.originalname || file.originalname.trim() === '') {
        throw new BadRequestException(`File ${index + 1}: Invalid filename`);
      }
    });

    return files;
  }
}
