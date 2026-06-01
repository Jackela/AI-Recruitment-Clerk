import { ResumeController } from './resume.controller';

describe('ResumeController', () => {
  let controller: ResumeController;

  beforeEach(() => {
    controller = new ResumeController({} as any);
  });

  describe('upload', () => {
    it('should upload resume', async () => {
      const result = await controller.upload({} as any);

      expect(result).toHaveProperty('resumeId');
    });
  });

  describe('getResume', () => {
    it('should get resume', async () => {
      const result = await controller.getResume('r-123');

      expect(result).toHaveProperty('id');
    });
  });

  describe('listResumes', () => {
    it('should list resumes', async () => {
      const result = await controller.listResumes({} as any);

      expect(result).toHaveProperty('items');
    });
  });
});
