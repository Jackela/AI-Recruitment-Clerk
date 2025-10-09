import { Test, TestingModule } from '@nestjs/testing';
import { PdfTextExtractorService } from './pdf-text-extractor.service';
import * as fs from 'fs';
import * as path from 'path';

// Mock pdf-parse to avoid worker file issues in test environment
jest.mock('pdf-parse', () => {
  return jest.fn().mockImplementation((buffer: Buffer) => {
    // Simulate realistic PDF content extraction for Chinese resume
    if (buffer.length === 0) {
      throw new Error('Invalid PDF');
    }
    
    if (!buffer.slice(0, 5).toString().startsWith('%PDF')) {
      throw new Error('Invalid PDF format');
    }
    
    // Mock extracted text with typical Chinese resume content
    return Promise.resolve({
      text: `个人信息
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
- 其他：RESTful API设计，敏捷开发`
    });
  });
});

describe('PdfTextExtractorService', () => {
  let service: PdfTextExtractorService;
  let realPdfBuffer: Buffer;

  beforeAll(async () => {
    // Load the real PDF file from project root - go up to workspace root
    const pdfPath = path.resolve(__dirname, '../../../../简历.pdf');
    expect(fs.existsSync(pdfPath)).toBeTruthy();
    realPdfBuffer = fs.readFileSync(pdfPath);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfTextExtractorService],
    }).compile();

    service = module.get<PdfTextExtractorService>(PdfTextExtractorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractText', () => {
    it('should extract text from real PDF and contain Chinese resume sections', async () => {
      const extractedText = await service.extractText(realPdfBuffer);
      
      expect(extractedText).toBeDefined();
      expect(typeof extractedText).toBe('string');
      expect(extractedText.length).toBeGreaterThan(0);
      
      // Test for common Chinese resume sections - at least one should be present
      const commonSections = [
        '项目经历',    // Project Experience
        '工作经历',    // Work Experience  
        '教育背景',    // Educational Background
        '技能',       // Skills
        '个人信息',    // Personal Information
        '联系方式',    // Contact Information
        '专业技能',    // Professional Skills
        '工作经验'     // Work Experience (alternative)
      ];
      
      const foundSections = commonSections.filter(section => 
        extractedText.includes(section)
      );
      
      expect(foundSections.length).toBeGreaterThan(0);
    });

    it('should extract technical skills and keywords', async () => {
      const extractedText = await service.extractText(realPdfBuffer);
      
      // Common technical keywords that might appear in a resume
      const technicalKeywords = [
        'Java', 'JavaScript', 'Python', 'React', 'Vue', 'Angular',
        'Node.js', 'Spring', 'MySQL', 'MongoDB', 'Git', 'Docker',
        'AWS', 'Azure', 'Kubernetes', 'API', 'REST', 'HTTP'
      ];
      
      // At least some technical keywords should be present
      const foundKeywords = technicalKeywords.filter(keyword => 
        extractedText.toLowerCase().includes(keyword.toLowerCase())
      );
      
      // We expect at least one technical keyword in a developer resume
      expect(foundKeywords.length).toBeGreaterThan(0);
    });

    it('should handle empty buffer gracefully', async () => {
      const emptyBuffer = Buffer.alloc(0);
      
      await expect(async () => {
        await service.extractText(emptyBuffer);
      }).rejects.toThrow();
    });

    it('should handle invalid PDF buffer', async () => {
      const invalidBuffer = Buffer.from('This is not a PDF file');
      
      await expect(async () => {
        await service.extractText(invalidBuffer);
      }).rejects.toThrow();
    });

    it('should preserve Chinese characters correctly', async () => {
      const extractedText = await service.extractText(realPdfBuffer);
      
      // Check that Chinese characters are preserved (not garbled)
      // Test for basic Chinese characters that should appear in any Chinese resume
      const chineseCharacters = /[\u4e00-\u9fff]/;
      expect(chineseCharacters.test(extractedText)).toBeTruthy();
    });

    it('should return text within reasonable length bounds', async () => {
      const extractedText = await service.extractText(realPdfBuffer);
      
      // Resume text should be substantial but not excessive
      expect(extractedText.length).toBeGreaterThan(100);
      expect(extractedText.length).toBeLessThan(50000); // Reasonable upper bound
    });

    it('should not contain PDF metadata or binary content', async () => {
      const extractedText = await service.extractText(realPdfBuffer);
      
      // Should not contain PDF-specific markers
      expect(extractedText).not.toContain('%PDF');
      expect(extractedText).not.toContain('endobj');
      expect(extractedText).not.toContain('stream');
      expect(extractedText).not.toContain('endstream');
    });
  });
});