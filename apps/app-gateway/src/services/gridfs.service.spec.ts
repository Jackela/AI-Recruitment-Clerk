import { GridfsService } from './gridfs.service';

describe('GridfsService', () => {
  let service: GridfsService;

  beforeEach(() => {
    service = new GridfsService({} as any);
  });

  describe('upload', () => {
    it('should upload file', async () => {
      const result = await service.upload(Buffer.from('test'), 'test.pdf');

      expect(result).toHaveProperty('fileId');
    });
  });

  describe('download', () => {
    it('should download file', async () => {
      const { fileId } = await service.upload(Buffer.from('test'), 'test.pdf');

      const result = await service.download(fileId);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should return null for non-existent file', async () => {
      const result = await service.download('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete file', async () => {
      const { fileId } = await service.upload(Buffer.from('test'), 'test.pdf');

      await service.delete(fileId);
      const result = await service.download(fileId);

      expect(result).toBeNull();
    });
  });
});
