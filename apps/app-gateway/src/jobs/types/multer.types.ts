/**
 * Defines the shape of the multer file.
 */
export interface MulterFile {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
}

/**
 * Represents the multer file.
 */
export class MulterFile implements MulterFile {
  fieldname?: string;
  originalname: string = '';
  encoding?: string;
  mimetype: string = '';
  size: number = 0;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;

  /**
   * Initializes a new instance of the Multer File.
   * @param data - The data.
   */
  constructor(data: Partial<MulterFile> = {}) {
    Object.assign(this, data);
    this.buffer = data.buffer ?? Buffer.alloc(0);
  }
}
