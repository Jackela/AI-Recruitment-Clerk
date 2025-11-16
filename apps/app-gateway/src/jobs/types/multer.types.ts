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
// Class removed to avoid unsafe declaration merging; prefer using the interface
// and plain object construction where needed.
