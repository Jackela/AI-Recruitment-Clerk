declare module 'pdf-parse-fork' {
  interface PDFInfo {
    PDFFormatVersion?: string;
    IsAcroFormPresent?: boolean;
    IsXFAPresent?: boolean;
    Title?: string;
    Author?: string;
    Subject?: string;
    Keywords?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
  }

  interface PDFMetadata {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _metadata?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Metadata?: any;
  }

  interface PDFVersion {
    PDFFormatVersion?: string;
  }

  interface _PDFPageInfo {
    Width?: number;
    Height?: number;
  }

  interface PDFExtractOptions {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pagerender?: (pageData: any) => Promise<string>;
    max?: number;
    version?: string;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: PDFMetadata;
    text: string;
    version: PDFVersion;
  }

  function pdf(
    dataBuffer: Buffer,
    options?: PDFExtractOptions,
  ): Promise<PDFData>;

  export = pdf;
}
