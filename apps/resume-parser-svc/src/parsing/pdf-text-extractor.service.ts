import { Injectable, Logger } from '@nestjs/common';
const pdfParse = require('pdf-parse');

/**
 * Provides pdf text extractor functionality.
 */
@Injectable()
export class PdfTextExtractorService {
  private readonly logger = new Logger(PdfTextExtractorService.name);

  /**
   * Performs the extract text operation.
   * @param buffer - The buffer.
   * @returns A promise that resolves to string value.
   */
  public async extractText(buffer: Buffer): Promise<string> {
    try {
      // Validate input buffer
      if (!buffer || buffer.length === 0) {
        throw new Error('Invalid or empty PDF buffer provided');
      }

      // Validate PDF header
      const header = buffer.slice(0, 5).toString();
      if (!header.startsWith('%PDF')) {
        throw new Error('Invalid PDF format - missing PDF header');
      }

      this.logger.debug(
        `Processing PDF buffer of size: ${buffer.length} bytes`,
      );

      // Parse PDF using pdf-parse library
      const pdfData = await pdfParse(buffer, {
        // Options for better text extraction
        normalizeWhitespace: true,
        disableCombineTextItems: false,
      });

      const extractedText = pdfData.text;

      if (!extractedText || extractedText.trim().length === 0) {
        this.logger.warn('PDF parsed successfully but no text content found');
        return '';
      }

      this.logger.debug(
        `Successfully extracted ${extractedText.length} characters from PDF`,
      );

      // Clean up the extracted text
      return this.cleanExtractedText(extractedText);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to extract text from PDF: ${err.message}`,
        err.stack,
      );
      throw new Error(`PDF text extraction failed: ${err.message}`);
    }
  }

  private cleanExtractedText(text: string): string {
    // Remove excessive whitespace while preserving structure
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n') // Convert any remaining \r to \n
      .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines to maximum 2
      .replace(/[ \t]{2,}/g, ' ') // Collapse multiple spaces/tabs to single space
      .trim();
  }
}
