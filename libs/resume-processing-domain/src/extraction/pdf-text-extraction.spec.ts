import { PdfResumeParser } from '../parsers/resume-parser';
import { TextExtractionService } from '../extraction/text-extraction';

describe('PDF Text Extraction', () => {
  let parser: PdfResumeParser;
  let extractionService: TextExtractionService;

  beforeEach(() => {
    parser = new PdfResumeParser();
    extractionService = new TextExtractionService();
  });

  describe('PDF Header Validation', () => {
    it('should accept valid PDF header %PDF-1.4', async () => {
      const pdfContent = `%PDF-1.4
John Doe
john@example.com

Skills
JavaScript`;

      const buffer = Buffer.from(pdfContent);
      const result = await parser.parse(buffer, 'valid.pdf');

      expect(result.success).toBe(true);
    });

    it('should accept valid PDF header %PDF-1.7', async () => {
      const pdfContent = `%PDF-1.7
Content here`;

      const buffer = Buffer.from(pdfContent);
      const result = await parser.parse(buffer, 'valid17.pdf');

      expect(result.success).toBe(true);
    });

    it('should reject invalid PDF header', async () => {
      const fakeContent = `NOTPDF
Some content`;

      const buffer = Buffer.from(fakeContent);
      const result = await parser.parse(buffer, 'fake.pdf');

      expect(result.success).toBe(false);
    });

    it('should reject binary garbage as corrupted PDF', async () => {
      const garbageBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe]);

      const result = await parser.parse(garbageBuffer, 'garbage.pdf');

      expect(result.success).toBe(false);
    });
  });

  describe('PDF Content Extraction', () => {
    it('should extract clean text from PDF content', async () => {
      const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

John Doe Resume

Experience
Company Name
Software Engineer 2020 - present
Built amazing software products`;

      const buffer = Buffer.from(pdfContent);
      const result = await parser.parse(buffer, 'complex.pdf');

      expect(result.success).toBe(true);
      expect(result.resume).toBeDefined();
    });

    it('should handle PDF with special characters', async () => {
      const pdfContent = `%PDF-1.4
José García
jose@example.com

Skills
C++, C#, .NET`;

      const buffer = Buffer.from(pdfContent);
      const result = await parser.parse(buffer, 'unicode.pdf');

      expect(result.success).toBe(true);
    });

    it('should handle minimal valid PDF', async () => {
      const pdfContent = `%PDF-1.4
Name
email@test.com

Skills
Python`;

      const buffer = Buffer.from(pdfContent);
      const result = await parser.parse(buffer, 'minimal.pdf');

      expect(result.success).toBe(true);
      expect(result.resume?.contactInfo.email).toBe('email@test.com');
    });
  });

  describe('PDF Structure Parsing', () => {
    it('should parse work experience with PDF structure', async () => {
      const pdfContent = `%PDF-1.4
Jane Smith
jane@example.com

Experience
ABC Corporation
Senior Developer 2018 - 2023
• Led team of 5 engineers
• Implemented CI/CD pipeline

XYZ Startup
Developer 2015 - 2018
• Built MVP from scratch`;

      const buffer = Buffer.from(pdfContent);
      const result = await parser.parse(buffer, 'experience.pdf');

      expect(result.success).toBe(true);
      expect(result.resume?.workExperience.length).toBeGreaterThanOrEqual(1);
    });

    it('should parse education with PDF structure', async () => {
      const pdfContent = `%PDF-1.4
Bob Wilson
bob@example.com

Education
Stanford University
PhD Computer Science 2010 - 2015

MIT
BS Electrical Engineering 2006 - 2010`;

      const buffer = Buffer.from(pdfContent);
      const result = await parser.parse(buffer, 'education.pdf');

      expect(result.success).toBe(true);
      expect(result.resume?.education.length).toBeGreaterThanOrEqual(1);
    });

    it('should parse skills section from PDF', async () => {
      const pdfContent = `%PDF-1.4
Alice Johnson
alice@example.com

Technical Skills
JavaScript, React, Node.js, Python, AWS, Docker, Kubernetes, Git`;

      const buffer = Buffer.from(pdfContent);
      const result = await parser.parse(buffer, 'skills.pdf');

      expect(result.success).toBe(true);
      expect(result.resume?.skills.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('PDF Parsing Options', () => {
    it('should extract only contact when configured', async () => {
      const pdfContent = `%PDF-1.4
Full Name
name@example.com
+1234567890

Experience
Job 2020 - present

Education
University Degree`;

      const buffer = Buffer.from(pdfContent);
      const result = await parser.parse(buffer, 'partial.pdf', {
        extractContactInfo: true,
        extractSkills: false,
        extractWorkExperience: false,
        extractEducation: false,
      });

      expect(result.success).toBe(true);
      expect(result.resume?.contactInfo.name).toBe('Full Name');
      expect(result.resume?.workExperience).toEqual([]);
      expect(result.resume?.education).toEqual([]);
    });
  });

  describe('PDF Text Extraction Integration', () => {
    it('should work with text extraction service on PDF content', async () => {
      const pdfContent = `%PDF-1.4
Resume

Contact
john.doe@example.com
(555) 123-4567

Experience
TechCorp 2020 - present`;

      const buffer = Buffer.from(pdfContent);
      const parseResult = await parser.parse(buffer, 'integration.pdf');

      expect(parseResult.success).toBe(true);
      expect(parseResult.resume).toBeDefined();

      if (parseResult.resume) {
        expect(parseResult.resume.contactInfo.email).toBe(
          'john.doe@example.com',
        );
      }
    });

    it('should handle multi-page PDF simulation', async () => {
      const pdfContent = `%PDF-1.4
%âãÏÓ
1 0 obj
<<
/Type /Catalog
>>
endobj

Page 1 Content
John Doe
john@example.com

Page 2 Content
Experience
Company 2020 - present`;

      const buffer = Buffer.from(pdfContent);
      const result = await parser.parse(buffer, 'multipage.pdf');

      expect(result.success).toBe(true);
    });
  });
});
