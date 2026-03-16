/**
 * Resume Parser - Main parser interface and implementations
 * Handles parsing of different resume formats (PDF, DOCX, HTML, TXT)
 */

import type { ResumeDTO } from '@ai-recruitment-clerk/resume-dto';
import {
  ResumeParserException,
  ResumeParserErrorCode,
} from '@ai-recruitment-clerk/shared-dtos';

export interface ParseResult {
  success: boolean;
  resume?: ResumeDTO;
  error?: string;
  parsingTimeMs: number;
}

export interface ParserOptions {
  extractSkills?: boolean;
  extractContactInfo?: boolean;
  extractEducation?: boolean;
  extractWorkExperience?: boolean;
  language?: string;
}

export abstract class ResumeParser {
  abstract parse(
    buffer: Buffer,
    filename: string,
    options?: ParserOptions,
  ): Promise<ParseResult>;
  abstract supports(mimeType: string): boolean;
}

export class PdfResumeParser extends ResumeParser {
  public supports(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  public async parse(
    buffer: Buffer,
    filename: string,
    options: ParserOptions = {},
  ): Promise<ParseResult> {
    const startTime = Date.now();

    try {
      if (buffer.length === 0) {
        throw new ResumeParserException(
          ResumeParserErrorCode.FILE_PARSE_FAILED,
          { fileName: filename, fileType: 'pdf' },
        );
      }

      if (this.isCorruptedPdf(buffer)) {
        throw new ResumeParserException(ResumeParserErrorCode.PDF_CORRUPTION, {
          fileName: filename,
          fileType: 'pdf',
        });
      }

      const text = this.extractTextFromPdf(buffer);

      if (!text || text.length < 10) {
        throw new ResumeParserException(
          ResumeParserErrorCode.CONTENT_EXTRACTION_FAILED,
          { fileName: filename, fileType: 'pdf' },
        );
      }

      const resume = this.parseResumeStructure(text, options);

      return {
        success: true,
        resume,
        parsingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        parsingTimeMs: Date.now() - startTime,
      };
    }
  }

  private isCorruptedPdf(buffer: Buffer): boolean {
    const pdfHeader = buffer.slice(0, 4).toString('ascii');
    return pdfHeader !== '%PDF';
  }

  private extractTextFromPdf(buffer: Buffer): string {
    const text = buffer.toString('utf-8');
    return text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim();
  }

  private parseResumeStructure(
    text: string,
    options: ParserOptions,
  ): ResumeDTO {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    return {
      contactInfo:
        options.extractContactInfo !== false
          ? this.extractContactInfo(lines)
          : { name: null, email: null, phone: null },
      skills: options.extractSkills !== false ? this.extractSkills(text) : [],
      workExperience:
        options.extractWorkExperience !== false
          ? this.extractWorkExperience(text)
          : [],
      education:
        options.extractEducation !== false ? this.extractEducation(text) : [],
    };
  }

  private extractContactInfo(lines: string[]): {
    name: string | null;
    email: string | null;
    phone: string | null;
  } {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const phoneRegex = /[+]?[\d\s\-()]{10,}/;

    let email: string | null = null;
    let phone: string | null = null;
    let name: string | null = null;

    for (const line of lines.slice(0, 20)) {
      if (!email) {
        const emailMatch = line.match(emailRegex);
        if (emailMatch) email = emailMatch[0];
      }
      if (!phone) {
        const phoneMatch = line.match(phoneRegex);
        if (phoneMatch) phone = phoneMatch[0];
      }
      if (
        !name &&
        line.length > 0 &&
        line.length < 50 &&
        !emailRegex.test(line) &&
        !phoneRegex.test(line)
      ) {
        name = line;
      }
    }

    return { name, email, phone };
  }

  private extractSkills(text: string): string[] {
    const commonSkills = [
      'JavaScript',
      'TypeScript',
      'Python',
      'Java',
      'C++',
      'Go',
      'Rust',
      'React',
      'Angular',
      'Vue',
      'Node.js',
      'Express',
      'NestJS',
      'SQL',
      'MongoDB',
      'PostgreSQL',
      'Redis',
      'Docker',
      'Kubernetes',
      'AWS',
      'Azure',
      'GCP',
      'Git',
      'CI/CD',
      'Agile',
      'Scrum',
    ];

    return commonSkills.filter((skill) =>
      new RegExp(`\\b${skill}\\b`, 'i').test(text),
    );
  }

  private extractWorkExperience(text: string): Array<{
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    summary: string;
  }> {
    const experiences: Array<{
      company: string;
      position: string;
      startDate: string;
      endDate: string;
      summary: string;
    }> = [];

    const experienceSection = text.match(
      /(?:Experience|Work Experience|Employment)[\s\S]*?(?:(?:Education|Skills|Projects|Certifications)|$)/i,
    );

    if (experienceSection) {
      const lines = experienceSection[0].split('\n').filter((l) => l.trim());

      for (let i = 0; i < lines.length; i++) {
        const dateMatch = lines[i].match(/(\d{4})\s*-\s*(\d{4}|present)/i);
        if (dateMatch && i > 0) {
          experiences.push({
            company: lines[i - 1].trim(),
            position:
              lines[i].replace(dateMatch[0], '').trim() || 'Unknown Position',
            startDate: `${dateMatch[1]}-01-01`,
            endDate:
              dateMatch[2].toLowerCase() === 'present'
                ? 'present'
                : `${dateMatch[2]}-01-01`,
            summary: lines[i + 1] || '',
          });
        }
      }
    }

    return experiences;
  }

  private extractEducation(text: string): Array<{
    school: string;
    degree: string;
    major: string | null;
  }> {
    const educations: Array<{
      school: string;
      degree: string;
      major: string | null;
    }> = [];

    const educationSection = text.match(
      /(?:Education|Academic)[\s\S]*?(?:(?:Experience|Skills|Projects|Certifications)|$)/i,
    );

    if (educationSection) {
      const lines = educationSection[0].split('\n').filter((l) => l.trim());

      for (let i = 0; i < lines.length; i++) {
        const degreeMatch = lines[i].match(
          /(Bachelor|Master|PhD|Doctorate|BS|BA|MS|MBA|MD)/i,
        );
        if (degreeMatch && i > 0) {
          educations.push({
            school: lines[i - 1].trim(),
            degree: degreeMatch[0],
            major:
              lines[i].replace(degreeMatch[0], '').replace(/in/i, '').trim() ||
              null,
          });
        }
      }
    }

    return educations;
  }
}

export class DocxResumeParser extends ResumeParser {
  public supports(mimeType: string): boolean {
    return (
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    );
  }

  public async parse(
    buffer: Buffer,
    filename: string,
    options: ParserOptions = {},
  ): Promise<ParseResult> {
    const startTime = Date.now();

    try {
      if (buffer.length < 100) {
        throw new ResumeParserException(
          ResumeParserErrorCode.FILE_PARSE_FAILED,
          { fileName: filename, fileType: 'docx' },
        );
      }

      const text = this.extractTextFromDocx(buffer);

      if (!text || text.length < 10) {
        throw new ResumeParserException(
          ResumeParserErrorCode.CONTENT_EXTRACTION_FAILED,
          { fileName: filename, fileType: 'docx' },
        );
      }

      const pdfParser = new PdfResumeParser();
      const resume = (
        pdfParser as unknown as {
          parseResumeStructure(text: string, options: ParserOptions): ResumeDTO;
        }
      ).parseResumeStructure(text, options);

      return {
        success: true,
        resume,
        parsingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        parsingTimeMs: Date.now() - startTime,
      };
    }
  }

  private extractTextFromDocx(buffer: Buffer): string {
    return buffer
      .toString('utf-8')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .trim();
  }
}

export class HtmlResumeParser extends ResumeParser {
  public supports(mimeType: string): boolean {
    return mimeType === 'text/html' || mimeType === 'application/xhtml+xml';
  }

  public async parse(
    buffer: Buffer,
    filename: string,
    options: ParserOptions = {},
  ): Promise<ParseResult> {
    const startTime = Date.now();

    try {
      const html = buffer.toString('utf-8');

      if (!html.includes('<')) {
        throw new ResumeParserException(
          ResumeParserErrorCode.FILE_PARSE_FAILED,
          { fileName: filename, fileType: 'html' },
        );
      }

      const text = this.extractTextFromHtml(html);

      if (!text || text.length < 10) {
        throw new ResumeParserException(
          ResumeParserErrorCode.CONTENT_EXTRACTION_FAILED,
          { fileName: filename, fileType: 'html' },
        );
      }

      const pdfParser = new PdfResumeParser();
      const resume = (
        pdfParser as unknown as {
          parseResumeStructure(text: string, options: ParserOptions): ResumeDTO;
        }
      ).parseResumeStructure(text, options);

      return {
        success: true,
        resume,
        parsingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        parsingTimeMs: Date.now() - startTime,
      };
    }
  }

  private extractTextFromHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export class PlainTextResumeParser extends ResumeParser {
  public supports(mimeType: string): boolean {
    return mimeType === 'text/plain' || mimeType === 'text/markdown';
  }

  public async parse(
    buffer: Buffer,
    filename: string,
    options: ParserOptions = {},
  ): Promise<ParseResult> {
    const startTime = Date.now();

    try {
      const text = buffer.toString('utf-8');

      if (!text || text.length < 10) {
        throw new ResumeParserException(
          ResumeParserErrorCode.FILE_PARSE_FAILED,
          { fileName: filename, fileType: 'txt' },
        );
      }

      const pdfParser = new PdfResumeParser();
      const resume = (
        pdfParser as unknown as {
          parseResumeStructure(text: string, options: ParserOptions): ResumeDTO;
        }
      ).parseResumeStructure(text, options);

      return {
        success: true,
        resume,
        parsingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        parsingTimeMs: Date.now() - startTime,
      };
    }
  }
}

export class ResumeParserFactory {
  private static parsers: ResumeParser[] = [
    new PdfResumeParser(),
    new DocxResumeParser(),
    new HtmlResumeParser(),
    new PlainTextResumeParser(),
  ];

  static getParser(mimeType: string): ResumeParser {
    const parser = this.parsers.find((p) => p.supports(mimeType));

    if (!parser) {
      throw new ResumeParserException(
        ResumeParserErrorCode.UNSUPPORTED_FORMAT,
        { mimeType },
      );
    }

    return parser;
  }

  static registerParser(parser: ResumeParser): void {
    this.parsers.push(parser);
  }
}
