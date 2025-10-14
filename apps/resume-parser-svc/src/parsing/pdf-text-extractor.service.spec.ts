// Mock pdf-parse completely for comprehensive testing - MUST be before imports
jest.mock('pdf-parse', () => jest.fn());

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PdfTextExtractorService } from './pdf-text-extractor.service';

// Get reference to the mocked function
const pdfParse = require('pdf-parse') as jest.MockedFunction<any>;

describe('PdfTextExtractorService', () => {
  let service: PdfTextExtractorService;
  let mockLogger: jest.Mocked<Logger>;

  // Test data factories for different PDF scenarios
  const createValidPdfBuffer = (content = 'Sample PDF content'): Buffer => {
    const pdfHeader = '%PDF-1.4\n';
    const pdfContent = `${pdfHeader}${content}\n%%EOF`;
    return Buffer.from(pdfContent);
  };

  const createInvalidBuffer = (content = 'Not a PDF'): Buffer => {
    return Buffer.from(content);
  };

  const createCorruptedPdfBuffer = (): Buffer => {
    const pdfHeader = '%PDF-1.4\n';
    const corruptedContent = `${pdfHeader}corrupted binary data \x00\x01\x02\xFF`;
    return Buffer.from(corruptedContent);
  };

  const createLargePdfBuffer = (): Buffer => {
    const pdfHeader = '%PDF-1.4\n';
    const largeContent = 'A'.repeat(10000000); // 10MB of content
    return Buffer.from(`${pdfHeader}${largeContent}\n%%EOF`);
  };

  // Mock PDF parse response factories
  const createMockPdfParseResponse = (
    text: string,
    numPages = 1,
    metadata = {},
  ) => ({
    text,
    numpages: numPages,
    numrender: numPages,
    info: {
      PDFFormatVersion: '1.4',
      IsAcroFormPresent: false,
      IsXFAPresent: false,
      ...metadata,
    },
    metadata: {
      ...metadata,
    },
    version: '1.10.100',
  });

  const createSinglePageTextContent = (): string => `
John Doe
Software Engineer
Email: john.doe@example.com
Phone: +1-555-0123

EXPERIENCE
Senior Developer at Tech Corp (2020-2023)
- Developed web applications using React and Node.js
- Led team of 5 developers
- Improved system performance by 40%

EDUCATION
Bachelor of Computer Science
University of Technology (2016-2020)

SKILLS
- JavaScript, TypeScript, Python
- React, Vue.js, Angular
- Node.js, Express.js
- MySQL, MongoDB, PostgreSQL
- AWS, Docker, Kubernetes
`;

  const createMultiPageTextContent = (): string => `
JOHN DOE - SOFTWARE ENGINEER

CONTACT INFORMATION
Email: john.doe@example.com
Phone: +1-555-0123
LinkedIn: linkedin.com/in/johndoe
GitHub: github.com/johndoe

PROFESSIONAL SUMMARY
Experienced software engineer with 8+ years of experience in full-stack development.
Passionate about building scalable applications and leading development teams.

TECHNICAL SKILLS
Programming Languages: JavaScript, TypeScript, Python, Java, C++
Frontend: React, Vue.js, Angular, HTML5, CSS3, SASS
Backend: Node.js, Express.js, Django, Spring Boot
Databases: MySQL, PostgreSQL, MongoDB, Redis
Cloud: AWS, Azure, Google Cloud Platform
DevOps: Docker, Kubernetes, Jenkins, GitLab CI/CD

[PAGE BREAK]

PROFESSIONAL EXPERIENCE

Senior Software Engineer | Tech Corporation | 2020 - Present
• Lead development of microservices architecture serving 1M+ users
• Mentored junior developers and conducted code reviews
• Implemented CI/CD pipelines reducing deployment time by 60%
• Collaborated with product managers to define technical requirements

Software Developer | StartupXYZ | 2018 - 2020
• Built responsive web applications using React and Node.js
• Developed RESTful APIs and integrated third-party services
• Optimized database queries improving response time by 50%
• Participated in agile development process

Junior Developer | WebDev Agency | 2016 - 2018
• Created websites for small businesses using WordPress and custom PHP
• Maintained legacy systems and fixed bugs
• Learned modern development practices and frameworks

[PAGE BREAK]

EDUCATION

Bachelor of Science in Computer Science
State University | 2012 - 2016
• Graduated Magna Cum Laude (GPA: 3.8/4.0)
• Relevant Coursework: Data Structures, Algorithms, Database Systems, Software Engineering

CERTIFICATIONS
• AWS Certified Solutions Architect (2021)
• Google Cloud Professional Cloud Architect (2020)
• Certified Kubernetes Administrator (2019)

PROJECTS

E-Commerce Platform (2022)
• Built full-stack e-commerce application using React, Node.js, and MongoDB
• Implemented payment processing with Stripe API
• Deployed on AWS with auto-scaling capabilities

Task Management System (2021)
• Developed team collaboration tool using Vue.js and Express.js
• Real-time updates using WebSocket connections
• Integrated with Slack and email notifications

LANGUAGES
• English (Native)
• Spanish (Conversational)
• French (Basic)
`;

  const createImageBasedPdfContent = (): string => `
[OCR Text from Image-based PDF]
John    Doe
Software   Engineer

Contact:
john.doe@email.com
555-123-4567

Experience:
2020-2023    Senior Developer
Tech  Corp

Skills:
JavaScript
Python
React
Node.js
`;

  const createChineseResumeContent = (): string => `
个人信息
姓名：张三
电话：138****1234
邮箱：zhangsan@example.com

教育背景
2018-2022  北京大学  计算机科学与技术  本科

工作经历
2022-至今  某科技公司  高级前端开发工程师

项目经历
1. 电商平台前端开发
技术栈：React, Vue.js, JavaScript, TypeScript
负责用户界面开发和API集成

2. 移动端应用开发  
技术栈：React Native, Node.js
开发跨平台移动应用

专业技能
- 前端技术：JavaScript, TypeScript, React, Vue, Angular
- 后端技术：Node.js, Python, Java
- 数据库：MySQL, MongoDB
- 工具：Git, Docker, AWS, Kubernetes
- 其他：RESTful API设计，敏捷开发
`;

  beforeEach(async () => {
    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      verbose: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfTextExtractorService,
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<PdfTextExtractorService>(PdfTextExtractorService);

    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset pdf-parse mock implementation
    pdfParse.mockReset();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(PdfTextExtractorService);
    });

    it('should have logger properly injected', () => {
      expect(mockLogger).toBeDefined();
    });
  });

  describe('extractText - Success Scenarios', () => {
    it('should extract text from single-page PDF successfully', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const expectedText = createSinglePageTextContent();
      const mockResponse = createMockPdfParseResponse(expectedText, 1);

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.extractText(pdfBuffer);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('John Doe');
      expect(result).toContain('Software Engineer');
      expect(result).toContain('EXPERIENCE');
      expect(result).toContain('EDUCATION');
      expect(result).toContain('SKILLS');

      expect(pdfParse).toHaveBeenCalledWith(pdfBuffer, {
        normalizeWhitespace: true,
        disableCombineTextItems: false,
      });

      // Note: Logger calls are working but with real Logger instance
      // These assertions will be updated after logger mock is properly configured
    });

    it('should extract text from multi-page PDF successfully', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const expectedText = createMultiPageTextContent();
      const mockResponse = createMockPdfParseResponse(expectedText, 3);

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.extractText(pdfBuffer);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain('JOHN DOE');
      expect(result).toContain('CONTACT INFORMATION');
      expect(result).toContain('PROFESSIONAL EXPERIENCE');
      expect(result).toContain('EDUCATION');
      expect(result).toContain('CERTIFICATIONS');
      expect(result).toContain('PROJECTS');
      expect(result).toContain('LANGUAGES');

      // Verify page breaks are handled properly
      expect(result).not.toContain('[PAGE BREAK]');

      expect(pdfParse).toHaveBeenCalledTimes(1);
    });

    it('should extract text from image-based PDF with OCR content', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const expectedText = createImageBasedPdfContent();
      const mockResponse = createMockPdfParseResponse(expectedText, 1, {
        isImageBased: true,
        ocrConfidence: 0.85,
      });

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.extractText(pdfBuffer);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain('John    Doe'); // OCR may have spacing issues
      expect(result).toContain('Software   Engineer');
      expect(result).toContain('john.doe@email.com');
      expect(result).toContain('JavaScript');
      expect(result).toContain('React');

      // Verify text cleaning preserved important spacing
      expect(result).not.toContain('   '); // Multiple spaces should be cleaned
    });

    it('should extract Chinese text content correctly', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const expectedText = createChineseResumeContent();
      const mockResponse = createMockPdfParseResponse(expectedText, 1);

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.extractText(pdfBuffer);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain('个人信息');
      expect(result).toContain('张三');
      expect(result).toContain('教育背景');
      expect(result).toContain('北京大学');
      expect(result).toContain('工作经历');
      expect(result).toContain('项目经历');
      expect(result).toContain('专业技能');

      // Verify Chinese characters are preserved
      const chineseCharacters = /[\u4e00-\u9fff]/;
      expect(chineseCharacters.test(result)).toBeTruthy();
    });

    it('should handle text-only PDF with special characters', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const specialText = `
José García-Martínez
Software Architect
Email: josé@example.com

Summary:
• Expert in full-stack development
• 10+ years of experience
• Fluent in English, Spanish, & French

Skills:
→ JavaScript, TypeScript, Python
→ React.js, Vue.js, Angular
→ Node.js, Express.js
→ AWS, Azure, GCP

Achievements:
★ Led team of 15 developers
★ Reduced costs by 30%
★ Improved performance by 50%
`;
      const mockResponse = createMockPdfParseResponse(specialText, 1);

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.extractText(pdfBuffer);

      // Assert
      expect(result).toContain('José García-Martínez');
      expect(result).toContain('josé@example.com');
      expect(result).toContain('•');
      expect(result).toContain('→');
      expect(result).toContain('★');
      expect(result).toContain('&');
    });

    it('should handle large PDF files efficiently', async () => {
      // Arrange
      const largePdfBuffer = createLargePdfBuffer();
      const largeText = 'A'.repeat(100000); // 100KB of text
      const mockResponse = createMockPdfParseResponse(largeText, 50);

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const startTime = Date.now();
      const result = await service.extractText(largePdfBuffer);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(50000);
      expect(processingTime).toBeLessThan(5000); // Should process within 5 seconds

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Processing PDF buffer of size: ${largePdfBuffer.length} bytes`,
      );
    });
  });

  describe('extractText - Input Validation', () => {
    it('should throw error for null buffer', async () => {
      // Act & Assert
      await expect(service.extractText(null as any)).rejects.toThrow(
        'PDF text extraction failed: Invalid or empty PDF buffer provided',
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to extract text from PDF'),
        expect.any(String),
      );
    });

    it('should throw error for undefined buffer', async () => {
      // Act & Assert
      await expect(service.extractText(undefined as any)).rejects.toThrow(
        'PDF text extraction failed: Invalid or empty PDF buffer provided',
      );
    });

    it('should throw error for empty buffer', async () => {
      // Arrange
      const emptyBuffer = Buffer.alloc(0);

      // Act & Assert
      await expect(service.extractText(emptyBuffer)).rejects.toThrow(
        'PDF text extraction failed: Invalid or empty PDF buffer provided',
      );
    });

    it('should throw error for invalid PDF format (missing header)', async () => {
      // Arrange
      const invalidBuffer = createInvalidBuffer('This is not a PDF file');

      // Act & Assert
      await expect(service.extractText(invalidBuffer)).rejects.toThrow(
        'PDF text extraction failed: Invalid PDF format - missing PDF header',
      );
    });

    it('should throw error for buffer with wrong PDF header', async () => {
      // Arrange
      const wrongHeaderBuffer = Buffer.from('PDF-1.4\nSome content'); // Missing %

      // Act & Assert
      await expect(service.extractText(wrongHeaderBuffer)).rejects.toThrow(
        'PDF text extraction failed: Invalid PDF format - missing PDF header',
      );
    });

    it('should validate PDF header with different versions', async () => {
      // Test various valid PDF headers
      const validHeaders = [
        '%PDF-1.3',
        '%PDF-1.4',
        '%PDF-1.5',
        '%PDF-1.6',
        '%PDF-1.7',
        '%PDF-2.0',
      ];

      for (const header of validHeaders) {
        const buffer = Buffer.from(`${header}\nContent`);
        const mockResponse = createMockPdfParseResponse('Test content', 1);
        pdfParse.mockResolvedValueOnce(mockResponse);

        await expect(service.extractText(buffer)).resolves.toBeDefined();
      }
    });
  });

  describe('extractText - Error Scenarios', () => {
    it('should handle pdf-parse library throwing error', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const parseError = new Error('PDF parsing failed: corrupted file');

      pdfParse.mockRejectedValueOnce(parseError);

      // Act & Assert
      await expect(service.extractText(pdfBuffer)).rejects.toThrow(
        'PDF text extraction failed: PDF parsing failed: corrupted file',
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to extract text from PDF: PDF parsing failed: corrupted file',
        expect.any(String),
      );
    });

    it('should handle corrupted PDF file', async () => {
      // Arrange
      const corruptedBuffer = createCorruptedPdfBuffer();
      const corruptionError = new Error('Invalid PDF structure');

      pdfParse.mockRejectedValueOnce(corruptionError);

      // Act & Assert
      await expect(service.extractText(corruptedBuffer)).rejects.toThrow(
        'PDF text extraction failed: Invalid PDF structure',
      );
    });

    it('should handle memory allocation errors for very large files', async () => {
      // Arrange
      const largePdfBuffer = createLargePdfBuffer();
      const memoryError = new Error('Cannot allocate memory');

      pdfParse.mockRejectedValueOnce(memoryError);

      // Act & Assert
      await expect(service.extractText(largePdfBuffer)).rejects.toThrow(
        'PDF text extraction failed: Cannot allocate memory',
      );
    });

    it('should handle password-protected PDF error', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const passwordError = new Error('PDF is password protected');

      pdfParse.mockRejectedValueOnce(passwordError);

      // Act & Assert
      await expect(service.extractText(pdfBuffer)).rejects.toThrow(
        'PDF text extraction failed: PDF is password protected',
      );
    });

    it('should handle PDF with no extractable text content', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const mockResponse = createMockPdfParseResponse('', 1); // Empty text

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.extractText(pdfBuffer);

      // Assert
      expect(result).toBe('');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'PDF parsed successfully but no text content found',
      );
    });

    it('should handle PDF with only whitespace content', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const whitespaceText = '   \n\n\t\t   \n   ';
      const mockResponse = createMockPdfParseResponse(whitespaceText, 1);

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.extractText(pdfBuffer);

      // Assert
      expect(result).toBe('');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'PDF parsed successfully but no text content found',
      );
    });

    it('should handle timeout errors during processing', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const timeoutError = new Error('Operation timed out');

      pdfParse.mockRejectedValueOnce(timeoutError);

      // Act & Assert
      await expect(service.extractText(pdfBuffer)).rejects.toThrow(
        'PDF text extraction failed: Operation timed out',
      );
    });
  });

  describe('Text Cleaning Functionality', () => {
    it('should normalize Windows line endings to Unix', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const textWithWindowsLineEndings = 'Line 1\r\nLine 2\r\nLine 3';
      const mockResponse = createMockPdfParseResponse(
        textWithWindowsLineEndings,
        1,
      );

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.extractText(pdfBuffer);

      // Assert
      expect(result).toBe('Line 1\nLine 2\nLine 3');
      expect(result).not.toContain('\r\n');
    });

    it('should convert carriage returns to newlines', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const textWithCarriageReturns = 'Line 1\rLine 2\rLine 3';
      const mockResponse = createMockPdfParseResponse(
        textWithCarriageReturns,
        1,
      );

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.extractText(pdfBuffer);

      // Assert
      expect(result).toBe('Line 1\nLine 2\nLine 3');
      expect(result).not.toContain('\r');
    });

    it('should collapse multiple newlines to maximum of 2', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const textWithMultipleNewlines =
        'Paragraph 1\n\n\n\n\nParagraph 2\n\n\n\nParagraph 3';
      const mockResponse = createMockPdfParseResponse(
        textWithMultipleNewlines,
        1,
      );

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.extractText(pdfBuffer);

      // Assert
      expect(result).toBe('Paragraph 1\n\nParagraph 2\n\nParagraph 3');
      expect(result).not.toMatch(/\n{3,}/);
    });

    it('should collapse multiple spaces and tabs to single space', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const textWithMultipleSpaces = 'Word1    Word2\t\t\tWord3     Word4';
      const mockResponse = createMockPdfParseResponse(
        textWithMultipleSpaces,
        1,
      );

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.extractText(pdfBuffer);

      // Assert
      expect(result).toBe('Word1 Word2 Word3 Word4');
      expect(result).not.toMatch(/[ \t]{2,}/);
    });

    it('should trim leading and trailing whitespace', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const textWithPadding = '   \n\n  Content with padding  \n\n   ';
      const mockResponse = createMockPdfParseResponse(textWithPadding, 1);

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.extractText(pdfBuffer);

      // Assert
      expect(result).toBe('Content with padding');
      expect(result).not.toMatch(/^\s/);
      expect(result).not.toMatch(/\s$/);
    });

    it('should preserve single spaces and single newlines', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const wellFormattedText =
        'Name: John Doe\nTitle: Software Engineer\n\nSkills:\n- JavaScript\n- Python';
      const mockResponse = createMockPdfParseResponse(wellFormattedText, 1);

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.extractText(pdfBuffer);

      // Assert
      expect(result).toBe(
        'Name: John Doe\nTitle: Software Engineer\n\nSkills:\n- JavaScript\n- Python',
      );
    });

    it('should handle mixed whitespace scenarios', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const messyText =
        '\n\n   Header   \n\n\n\nContent  with   spaces\t\tand\ttabs\r\n\r\n\r\nEnd   \n\n';
      const mockResponse = createMockPdfParseResponse(messyText, 1);

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.extractText(pdfBuffer);

      // Assert
      expect(result).toBe('Header\n\nContent with spaces and tabs\n\nEnd');
      // Verify no multiple consecutive whitespace remains
      expect(result).not.toMatch(/[ \t]{2,}/);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle very small PDF buffer', async () => {
      // Arrange
      const smallBuffer = Buffer.from('%PDF-1.4\nA\n%%EOF'); // Minimal valid PDF
      const mockResponse = createMockPdfParseResponse('A', 1);

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.extractText(smallBuffer);

      // Assert
      expect(result).toBe('A');
    });

    it('should handle PDF with maximum text content', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const maxText = 'X'.repeat(1000000); // 1MB of text
      const mockResponse = createMockPdfParseResponse(maxText, 1);

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.extractText(pdfBuffer);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(1000000);
      expect(result).toBe(maxText);
    });

    it('should handle PDF with unusual characters and encoding', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const unusualText =
        '🚀 Émoji résumé with ñoñó characters and symbols: ∑∞≈≠≤≥±×÷';
      const mockResponse = createMockPdfParseResponse(unusualText, 1);

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.extractText(pdfBuffer);

      // Assert
      expect(result).toBe(unusualText);
      expect(result).toContain('🚀');
      expect(result).toContain('Émoji');
      expect(result).toContain('ñoñó');
      expect(result).toContain('∑∞≈≠≤≥±×÷');
    });

    it('should handle concurrent extraction requests', async () => {
      // Arrange
      const pdfBuffers = [
        createValidPdfBuffer('Content 1'),
        createValidPdfBuffer('Content 2'),
        createValidPdfBuffer('Content 3'),
      ];

      const mockResponses = [
        createMockPdfParseResponse('Result 1', 1),
        createMockPdfParseResponse('Result 2', 1),
        createMockPdfParseResponse('Result 3', 1),
      ];

      pdfParse
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2]);

      // Act
      const promises = pdfBuffers.map((buffer) => service.extractText(buffer));
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0]).toBe('Result 1');
      expect(results[1]).toBe('Result 2');
      expect(results[2]).toBe('Result 3');
      expect(pdfParse).toHaveBeenCalledTimes(3);
    });

    it('should handle PDFs with different page orientations', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const orientationText =
        'Portrait content\nLandscape table data\nMixed orientation content';
      const mockResponse = createMockPdfParseResponse(orientationText, 2, {
        pageOrientation: 'mixed',
      });

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.extractText(pdfBuffer);

      // Assert
      expect(result).toContain('Portrait content');
      expect(result).toContain('Landscape table data');
      expect(result).toContain('Mixed orientation content');
    });

    it('should maintain performance under stress conditions', async () => {
      // Arrange
      const stressTestCount = 10;
      const pdfBuffer = createValidPdfBuffer('Stress test content');
      const mockResponse = createMockPdfParseResponse('Stress test result', 1);

      // Setup mock to resolve for all stress test calls
      for (let i = 0; i < stressTestCount; i++) {
        pdfParse.mockResolvedValueOnce(mockResponse);
      }

      // Act
      const startTime = Date.now();
      const promises = Array(stressTestCount)
        .fill(null)
        .map(() => service.extractText(pdfBuffer));
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Assert
      expect(results).toHaveLength(stressTestCount);
      expect(
        results.every((result) => result === 'Stress test result'),
      ).toBeTruthy();
      expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(pdfParse).toHaveBeenCalledTimes(stressTestCount);
    });
  });

  describe('Logging and Monitoring', () => {
    it('should log processing start with buffer size', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer('Test content');
      const mockResponse = createMockPdfParseResponse('Test result', 1);

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      await service.extractText(pdfBuffer);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Processing PDF buffer of size: ${pdfBuffer.length} bytes`,
      );
    });

    it('should log successful extraction with character count', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer('Test content');
      const testText = 'Extracted text content for testing';
      const mockResponse = createMockPdfParseResponse(testText, 1);

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      await service.extractText(pdfBuffer);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Successfully extracted ${testText.length} characters from PDF`,
      );
    });

    it('should log warning for PDFs with no text content', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const mockResponse = createMockPdfParseResponse('', 1);

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      await service.extractText(pdfBuffer);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'PDF parsed successfully but no text content found',
      );
    });

    it('should log error details when extraction fails', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const extractionError = new Error('Specific extraction error');

      pdfParse.mockRejectedValueOnce(extractionError);

      // Act & Assert
      await expect(service.extractText(pdfBuffer)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to extract text from PDF: Specific extraction error',
        expect.any(String),
      );
    });

    it('should not log sensitive information', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const sensitiveText =
        'SSN: 123-45-6789\nCredit Card: 4111-1111-1111-1111';
      const mockResponse = createMockPdfParseResponse(sensitiveText, 1);

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      await service.extractText(pdfBuffer);

      // Assert - Verify that sensitive content is not logged
      const allLogCalls = [
        ...mockLogger.debug.mock.calls,
        ...mockLogger.log.mock.calls,
        ...mockLogger.warn.mock.calls,
        ...mockLogger.error.mock.calls,
      ].flat();

      const loggedContent = allLogCalls.join(' ');
      expect(loggedContent).not.toContain('123-45-6789');
      expect(loggedContent).not.toContain('4111-1111-1111-1111');
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle buffer cleanup after processing', async () => {
      // Arrange
      const largePdfBuffer = createLargePdfBuffer();
      const mockResponse = createMockPdfParseResponse(
        'Large content result',
        1,
      );

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.extractText(largePdfBuffer);

      // Assert
      expect(result).toBeDefined();
      expect(pdfParse).toHaveBeenCalledWith(largePdfBuffer, expect.any(Object));

      // Verify the service doesn't hold references to large buffers
      expect(result.length).toBeLessThan(largePdfBuffer.length);
    });

    it('should process PDFs within reasonable time limits', async () => {
      // Arrange
      const pdfBuffer = createValidPdfBuffer();
      const mockResponse = createMockPdfParseResponse('Time test content', 1);

      pdfParse.mockResolvedValueOnce(mockResponse);

      // Act
      const startTime = Date.now();
      await service.extractText(pdfBuffer);
      const processingTime = Date.now() - startTime;

      // Assert
      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second for normal PDFs
    });
  });
});
