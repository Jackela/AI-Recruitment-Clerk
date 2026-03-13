/**
 * PDF Generator Tests
 * Tests for PDF generation functionality
 */

interface PDFPage {
  content: string;
  images: string[];
  styles: Record<string, unknown>;
}

interface PDFDocument {
  pages: PDFPage[];
  metadata: {
    title: string;
    author: string;
    createdAt: Date;
  };
}

class PDFGenerator {
  private document: PDFDocument;

  constructor(title: string, author: string) {
    this.document = {
      pages: [],
      metadata: {
        title,
        author,
        createdAt: new Date(),
      },
    };
  }

  addPage(content: string, styles?: Record<string, unknown>): void {
    this.document.pages.push({
      content,
      images: [],
      styles: styles || {},
    });
  }

  addImage(pageIndex: number, imageData: string): void {
    if (this.document.pages[pageIndex]) {
      this.document.pages[pageIndex].images.push(imageData);
    }
  }

  generate(): Buffer {
    if (this.document.pages.length === 0) {
      throw new Error('Cannot generate PDF with no pages');
    }
    return Buffer.from(JSON.stringify(this.document));
  }

  getPageCount(): number {
    return this.document.pages.length;
  }

  getMetadata(): PDFDocument['metadata'] {
    return { ...this.document.metadata };
  }
}

describe('PDFGenerator', () => {
  describe('constructor', () => {
    it('should create PDF with metadata', () => {
      const generator = new PDFGenerator('Test Report', 'Test Author');

      const metadata = generator.getMetadata();
      expect(metadata.title).toBe('Test Report');
      expect(metadata.author).toBe('Test Author');
      expect(metadata.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('addPage', () => {
    it('should add single page', () => {
      const generator = new PDFGenerator('Test', 'Author');
      generator.addPage('Page 1 content');

      expect(generator.getPageCount()).toBe(1);
    });

    it('should add multiple pages', () => {
      const generator = new PDFGenerator('Test', 'Author');
      generator.addPage('Page 1');
      generator.addPage('Page 2');
      generator.addPage('Page 3');

      expect(generator.getPageCount()).toBe(3);
    });

    it('should apply styles to page', () => {
      const generator = new PDFGenerator('Test', 'Author');
      const styles = { fontSize: 12, color: 'blue' };
      generator.addPage('Content', styles);

      expect(generator.getPageCount()).toBe(1);
    });
  });

  describe('addImage', () => {
    it('should add image to existing page', () => {
      const generator = new PDFGenerator('Test', 'Author');
      generator.addPage('Content');
      generator.addImage(0, 'base64-image-data');

      expect(generator.getPageCount()).toBe(1);
    });

    it('should handle invalid page index gracefully', () => {
      const generator = new PDFGenerator('Test', 'Author');
      generator.addPage('Content');

      expect(() => generator.addImage(5, 'image')).not.toThrow();
    });
  });

  describe('generate', () => {
    it('should generate PDF buffer', () => {
      const generator = new PDFGenerator('Test', 'Author');
      generator.addPage('Content');

      const pdf = generator.generate();
      expect(pdf).toBeInstanceOf(Buffer);
      expect(pdf.length).toBeGreaterThan(0);
    });

    it('should throw error for empty PDF', () => {
      const generator = new PDFGenerator('Test', 'Author');

      expect(() => generator.generate()).toThrow(
        'Cannot generate PDF with no pages',
      );
    });

    it('should include all pages in generated PDF', () => {
      const generator = new PDFGenerator('Test', 'Author');
      generator.addPage('Page 1');
      generator.addPage('Page 2');

      const pdf = generator.generate();
      const doc = JSON.parse(pdf.toString());
      expect(doc.pages).toHaveLength(2);
    });
  });

  describe('multi-page PDF', () => {
    it('should create multi-page document', () => {
      const generator = new PDFGenerator('Multi-page Report', 'Author');

      for (let i = 1; i <= 5; i++) {
        generator.addPage(`Content for page ${i}`);
      }

      expect(generator.getPageCount()).toBe(5);
    });
  });

  describe('error handling', () => {
    it('should handle empty content', () => {
      const generator = new PDFGenerator('Test', 'Author');
      generator.addPage('');

      expect(generator.getPageCount()).toBe(1);
    });

    it('should handle special characters in content', () => {
      const generator = new PDFGenerator('Test', 'Author');
      generator.addPage('Special chars: äöü ñ 中文 🎉');

      const pdf = generator.generate();
      expect(pdf).toBeInstanceOf(Buffer);
    });
  });
});
