/**
 * Defines the shape of the multer file.
 */
export interface IMulterFile {
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
export class MulterFile implements IMulterFile {
  public fieldname?: string;
  public originalname = '';
  public encoding?: string;
  public mimetype = '';
  public size = 0;
  public destination?: string;
  public filename?: string;
  public path?: string;
  public buffer?: Buffer;

  /**
   * Initializes a new instance of the Multer File.
   * @param data - The data.
   */
  constructor(data: Partial<MulterFile> = {}) {
    Object.assign(this, data);
    this.buffer = data.buffer ?? Buffer.alloc(0);
  }
}
