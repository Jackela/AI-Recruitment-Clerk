/**
 * File Validation Constants - Single Source of Truth (SSOT)
 * All file validation constants should be imported from here.
 */

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Default timeout for file operations in milliseconds
 */
export const FILE_OPERATION_TIMEOUT = 30000;

/**
 * MIME types allowed for resume files
 */
export const RESUME_MIME_TYPES: readonly string[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

/**
 * File extensions allowed for resume files
 */
export const RESUME_EXTENSIONS: readonly string[] = [
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
] as const;

/**
 * MIME types allowed for image files
 */
export const IMAGE_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

/**
 * File extensions allowed for image files
 */
export const IMAGE_EXTENSIONS: readonly string[] = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
] as const;

/**
 * MIME types allowed for job description files
 */
export const JOB_DESCRIPTION_MIME_TYPES: readonly string[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/html',
] as const;

/**
 * Default file validation configuration for resumes
 */
export const DEFAULT_RESUME_VALIDATION_CONFIG = {
  maxSize: MAX_FILE_SIZE,
  allowedMimeTypes: [...RESUME_MIME_TYPES],
  allowedExtensions: [...RESUME_EXTENSIONS],
  scanForMalware: true,
} as const;

/**
 * File size limits by category (in bytes)
 */
export const FILE_SIZE_LIMITS = {
  resume: MAX_FILE_SIZE,          // 10MB
  image: 5 * 1024 * 1024,         // 5MB
  jobDescription: MAX_FILE_SIZE,  // 10MB
  report: 20 * 1024 * 1024,       // 20MB
} as const;

/**
 * Human-readable file size labels
 */
export const FILE_SIZE_LABELS = {
  [MAX_FILE_SIZE]: '10MB',
  [5 * 1024 * 1024]: '5MB',
  [20 * 1024 * 1024]: '20MB',
} as const;

/**
 * Helper function to format bytes to human-readable string
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Helper function to check if a file size is valid
 */
export function isValidFileSize(size: number, maxSize: number = MAX_FILE_SIZE): boolean {
  return size > 0 && size <= maxSize;
}

/**
 * Helper function to check if a MIME type is allowed for resumes
 */
export function isValidResumeMimeType(mimeType: string): boolean {
  return RESUME_MIME_TYPES.includes(mimeType);
}

/**
 * Helper function to check if a file extension is allowed for resumes
 */
export function isValidResumeExtension(extension: string): boolean {
  const normalizedExt = extension.toLowerCase().startsWith('.')
    ? extension.toLowerCase()
    : `.${extension.toLowerCase()}`;
  return RESUME_EXTENSIONS.includes(normalizedExt);
}
