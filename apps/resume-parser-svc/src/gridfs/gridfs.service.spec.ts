import { GridFsService } from './gridfs.service';
import type { ResumeParserConfigService } from '../config';

const mockConfig = {
  isTest: true,
  nodeName: 'unknown',
  gridfsBucketName: 'resumes',
} as unknown as ResumeParserConfigService;

describe('GridFsService (isolated)', () => {
  let service: GridFsService;

  beforeEach(() => {
    service = new GridFsService({} as any, mockConfig);
    (service as any).gridFSBucket = {
      find: jest
        .fn()
        .mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
    };
  });

  it('throws when bucket is not initialized', async () => {
    (service as any).gridFSBucket = null;
    await expect(service.downloadFile('gridfs://bucket/507f1f77bcf86cd799439011')).rejects.toThrow(
      'GridFS bucket not initialized. Service may not be connected.',
    );
  });

  it('throws for invalid gridfs url', async () => {
    await expect(service.downloadFile('invalid-url')).rejects.toThrow(
      'Invalid GridFS URL or file ID: invalid-url',
    );
  });

  it('throws when file is not found', async () => {
    await expect(
      service.downloadFile('gridfs://bucket/507f1f77bcf86cd799439011'),
    ).rejects.toThrow('File not found:');
  });
});
