import {
  ResumeParserFactory,
  PdfResumeParser,
  DocxResumeParser,
  HtmlResumeParser,
  PlainTextResumeParser,
  ParserOptions,
} from './resume-parser';
import {
  ResumeParserException,
  ResumeParserErrorCode,
} from '@ai-recruitment-clerk/shared-dtos';

describe('ResumeParser', () => {
  describe('PdfResumeParser', () => {
    let parser: PdfResumeParser;

    beforeEach(() => {
      parser = new PdfResumeParser();
    });

    describe('supports', () => {
      it('should support application/pdf', () => {
        expect(parser.supports('application/pdf')).toBe(true);
      });

      it('should not support other mime types', () => {
        expect(parser.supports('text/plain')).toBe(false);
        expect(parser.supports('application/msword')).toBe(false);
      });
    });

    describe('parse', () => {
      it('should parse valid PDF with contact info', async () => {
        const pdfContent = `%PDF-1.4
John Doe
john.doe@example.com
+1 (555) 123-4567

Experience
ABC Company
Software Engineer 2020 - present
Developed web applications

Education
University of Technology
Bachelor in Computer Science

Skills
JavaScript, TypeScript, React`;

        const buffer = Buffer.from(pdfContent);
        const result = await parser.parse(buffer, 'resume.pdf');

        expect(result.success).toBe(true);
        expect(result.resume).toBeDefined();
        expect(result.resume?.contactInfo.name).toBe('John Doe');
        expect(result.resume?.contactInfo.email).toBe('john.doe@example.com');
        expect(result.parsingTimeMs).toBeGreaterThanOrEqual(0);
      });

      it('should extract work experience with date ranges', async () => {
        const pdfContent = `%PDF-1.4
Jane Smith
jane@example.com

Experience
Tech Corp
Senior Developer 2018 - 2023
Led development team
Startup Inc
Developer 2015 - 2018
Built MVP

Education
MIT
Master in Engineering`;

        const buffer = Buffer.from(pdfContent);
        const result = await parser.parse(buffer, 'resume.pdf');

        expect(result.success).toBe(true);
        expect(result.resume?.workExperience.length).toBeGreaterThanOrEqual(1);
        expect(result.resume?.workExperience[0].company).toBe('Tech Corp');
      });

      it('should extract education information', async () => {
        const pdfContent = `%PDF-1.4
Bob Wilson
bob@example.com

Education
Stanford University
PhD in Computer Science
Harvard University
Bachelor of Science`;

        const buffer = Buffer.from(pdfContent);
        const result = await parser.parse(buffer, 'resume.pdf');

        expect(result.success).toBe(true);
        expect(result.resume?.education.length).toBeGreaterThanOrEqual(1);
      });

      it('should detect skills from resume text', async () => {
        const pdfContent = `%PDF-1.4
Alice Johnson
alice@example.com

Skills
JavaScript TypeScript Python React Node.js Docker`;

        const buffer = Buffer.from(pdfContent);
        const result = await parser.parse(buffer, 'resume.pdf');

        expect(result.success).toBe(true);
        expect(result.resume?.skills).toContain('JavaScript');
        expect(result.resume?.skills).toContain('TypeScript');
        expect(result.resume?.skills).toContain('React');
      });

      it('should throw error for empty buffer', async () => {
        const buffer = Buffer.from('');
        const result = await parser.parse(buffer, 'empty.pdf');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should throw error for corrupted PDF', async () => {
        const buffer = Buffer.from('NOT_A_PDF_FILE');
        const result = await parser.parse(buffer, 'corrupted.pdf');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should throw error when content extraction fails', async () => {
        const buffer = Buffer.from('%PDF-1.4\x00\x00\x00');
        const result = await parser.parse(buffer, 'minimal.pdf');

        expect(result.success).toBe(false);
      });
    });

    describe('parse with options', () => {
      it('should respect extractSkills option', async () => {
        const pdfContent = `%PDF-1.4
Name
email@test.com

Skills
JavaScript Python`;

        const buffer = Buffer.from(pdfContent);
        const options: ParserOptions = { extractSkills: false };
        const result = await parser.parse(buffer, 'resume.pdf', options);

        expect(result.success).toBe(true);
        expect(result.resume?.skills).toEqual([]);
      });

      it('should respect extractContactInfo option', async () => {
        const pdfContent = `%PDF-1.4
John Doe
john@example.com

Skills
JavaScript`;

        const buffer = Buffer.from(pdfContent);
        const options: ParserOptions = { extractContactInfo: false };
        const result = await parser.parse(buffer, 'resume.pdf', options);

        expect(result.success).toBe(true);
        expect(result.resume?.contactInfo.name).toBeNull();
        expect(result.resume?.contactInfo.email).toBeNull();
      });

      it('should respect extractEducation option', async () => {
        const pdfContent = `%PDF-1.4
Name
email@test.com

Education
University
Bachelor Degree`;

        const buffer = Buffer.from(pdfContent);
        const options: ParserOptions = { extractEducation: false };
        const result = await parser.parse(buffer, 'resume.pdf', options);

        expect(result.success).toBe(true);
        expect(result.resume?.education).toEqual([]);
      });

      it('should respect extractWorkExperience option', async () => {
        const pdfContent = `%PDF-1.4
Name
email@test.com

Experience
Company 2020 - present`;

        const buffer = Buffer.from(pdfContent);
        const options: ParserOptions = { extractWorkExperience: false };
        const result = await parser.parse(buffer, 'resume.pdf', options);

        expect(result.success).toBe(true);
        expect(result.resume?.workExperience).toEqual([]);
      });
    });
  });

  describe('DocxResumeParser', () => {
    let parser: DocxResumeParser;

    beforeEach(() => {
      parser = new DocxResumeParser();
    });

    describe('supports', () => {
      it('should support docx mime type', () => {
        expect(
          parser.supports(
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ),
        ).toBe(true);
      });

      it('should support doc mime type', () => {
        expect(parser.supports('application/msword')).toBe(true);
      });
    });

    describe('parse', () => {
      it('should parse valid DOCX content', async () => {
        const xmlContent = `<?xml version="1.0"?>
<w:document>
  <w:body>
    <w:p><w:r><w:t>John Doe</w:t></w:r></w:p>
    <w:p><w:r><w:t>john@example.com</w:t></w:r></w:p>
    <w:p><w:r><w:t>Skills: JavaScript</w:t></w:r></w:p>
  </w:body>
</w:document>`;

        const buffer = Buffer.from(xmlContent);
        const result = await parser.parse(buffer, 'resume.docx');

        expect(result.success).toBe(true);
        expect(result.resume).toBeDefined();
      });

      it('should fail for empty buffer', async () => {
        const buffer = Buffer.alloc(50);
        const result = await parser.parse(buffer, 'empty.docx');

        expect(result.success).toBe(false);
      });
    });
  });

  describe('HtmlResumeParser', () => {
    let parser: HtmlResumeParser;

    beforeEach(() => {
      parser = new HtmlResumeParser();
    });

    describe('supports', () => {
      it('should support text/html', () => {
        expect(parser.supports('text/html')).toBe(true);
      });

      it('should support application/xhtml+xml', () => {
        expect(parser.supports('application/xhtml+xml')).toBe(true);
      });
    });

    describe('parse', () => {
      it('should parse HTML resume', async () => {
        const html = `<!DOCTYPE html>
<html>
<body>
  <h1>Jane Smith</h1>
  <p>jane@example.com</p>
  <div class="skills">JavaScript, React</div>
</body>
</html>`;

        const buffer = Buffer.from(html);
        const result = await parser.parse(buffer, 'resume.html');

        expect(result.success).toBe(true);
        expect(result.resume).toBeDefined();
      });

      it('should fail for invalid HTML', async () => {
        const buffer = Buffer.from('Not HTML content');
        const result = await parser.parse(buffer, 'not-html.html');

        expect(result.success).toBe(false);
      });

      it('should extract text from styled HTML', async () => {
        const html = `<!DOCTYPE html>
<html>
<style>body { color: black; }</style>
<body>
  <h1>Name</h1>
  &nbsp;email@test.com&nbsp;
  Skills: TypeScript
</body>
</html>`;

        const buffer = Buffer.from(html);
        const result = await parser.parse(buffer, 'styled.html');

        expect(result.success).toBe(true);
      });
    });
  });

  describe('PlainTextResumeParser', () => {
    let parser: PlainTextResumeParser;

    beforeEach(() => {
      parser = new PlainTextResumeParser();
    });

    describe('supports', () => {
      it('should support text/plain', () => {
        expect(parser.supports('text/plain')).toBe(true);
      });

      it('should support text/markdown', () => {
        expect(parser.supports('text/markdown')).toBe(true);
      });
    });

    describe('parse', () => {
      it('should parse plain text resume', async () => {
        const text = `John Doe
john@example.com
+1 555-1234

Skills: JavaScript, Python`;

        const buffer = Buffer.from(text);
        const result = await parser.parse(buffer, 'resume.txt');

        expect(result.success).toBe(true);
        expect(result.resume).toBeDefined();
      });

      it('should fail for empty text', async () => {
        const buffer = Buffer.from('');
        const result = await parser.parse(buffer, 'empty.txt');

        expect(result.success).toBe(false);
      });

      it('should fail for very short text', async () => {
        const buffer = Buffer.from('Hi');
        const result = await parser.parse(buffer, 'short.txt');

        expect(result.success).toBe(false);
      });
    });
  });

  describe('ResumeParserFactory', () => {
    describe('getParser', () => {
      it('should return PDF parser for application/pdf', () => {
        const parser = ResumeParserFactory.getParser('application/pdf');
        expect(parser).toBeInstanceOf(PdfResumeParser);
      });

      it('should return DOCX parser for docx mime type', () => {
        const parser = ResumeParserFactory.getParser(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        );
        expect(parser).toBeInstanceOf(DocxResumeParser);
      });

      it('should return HTML parser for text/html', () => {
        const parser = ResumeParserFactory.getParser('text/html');
        expect(parser).toBeInstanceOf(HtmlResumeParser);
      });

      it('should throw exception for unsupported format', () => {
        expect(() => {
          ResumeParserFactory.getParser('image/png');
        }).toThrow(ResumeParserException);
      });

      it('should throw exception with UNSUPPORTED_FORMAT code', () => {
        try {
          ResumeParserFactory.getParser('application/zip');
        } catch (error) {
          expect(error).toBeInstanceOf(ResumeParserException);
          if (error instanceof ResumeParserException) {
            expect(error.enhancedDetails.code).toBe(
              ResumeParserErrorCode.UNSUPPORTED_FORMAT,
            );
          }
        }
      });
    });

    describe('registerParser', () => {
      it('should allow registering custom parser', () => {
        const customParser = new PlainTextResumeParser();
        ResumeParserFactory.registerParser(customParser);

        expect(() => {
          ResumeParserFactory.getParser('text/plain');
        }).not.toThrow();
      });
    });
  });
});
