import { PdfTextExtractorService } from './pdf-text-extractor.service';
import pdfParse from 'pdf-parse';

jest.mock('pdf-parse', () => jest.fn());

const mockPdfParse = pdfParse as unknown as jest.MockedFunction<any>;

describe('PdfTextExtractorService (isolated)', () => {
  let service: PdfTextExtractorService;
  const loggerStub = {
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PdfTextExtractorService();
    (service as any).logger = loggerStub;
    Object.values(loggerStub).forEach((fn) => fn.mockReset());
  });

  it('returns parsed text when buffer contains a PDF header', async () => {
    const buffer = Buffer.from('%PDF-1.4\nHello world\n%%EOF', 'utf8');
    mockPdfParse.mockResolvedValueOnce({ text: 'Hello world', numpages: 1 } as any);

    const result = await service.extractText(buffer);

    expect(result).toBe('Hello world');
    expect(mockPdfParse).toHaveBeenCalledWith(buffer, {
      normalizeWhitespace: true,
      disableCombineTextItems: false,
    });
  });

  it('throws when buffer is empty', async () => {
    await expect(service.extractText(Buffer.alloc(0))).rejects.toThrow(
      'PDF text extraction failed: Invalid or empty PDF buffer provided',
    );
  });

  it('throws when buffer lacks PDF header', async () => {
    const buffer = Buffer.from('NOT_A_PDF', 'utf8');

    await expect(service.extractText(buffer)).rejects.toThrow(
      'PDF text extraction failed: Invalid PDF format - missing PDF header',
    );
  });
});
