import { ResumesController } from './resumes.controller';

describe('ResumesController', () => {
  let controller: ResumesController;

  beforeEach(() => {
    controller = new ResumesController({} as any);
  });

  describe('upload', () => {
    it('should upload resume', async () => {
      const result = await controller.upload({} as any);

      expect(result).toHaveProperty('resumeId');
    });
  });

  describe('getResume', () => {
    it('should get resume by id', async () => {
      const result = await controller.getResume('resume-123');

      expect(result).toHaveProperty('id');
    });
  });

  describe('listResumes', () => {
    it('should list resumes', async () => {
      const result = await controller.listResumes({} as any);

      expect(result).toHaveProperty('resumes');
      expect(result).toHaveProperty('total');
    });
  });
});
