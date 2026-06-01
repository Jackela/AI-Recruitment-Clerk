import { AppGatewayNatsService } from './app-gateway-nats.service';

describe('AppGatewayNatsService', () => {
  let service: AppGatewayNatsService;

  beforeEach(() => {
    service = new AppGatewayNatsService();
  });

  describe('publishJobJdSubmitted', () => {
    it('should publish job JD submitted event', async () => {
      const event = {
        jobId: 'job-123',
        jobTitle: 'Software Engineer',
        jdText: 'Job description',
        timestamp: new Date().toISOString(),
      };

      const result = await service.publishJobJdSubmitted(event);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('messageId');
    });
  });

  describe('publishResumeSubmitted', () => {
    it('should publish resume submitted event', async () => {
      const event = {
        jobId: 'job-123',
        resumeId: 'resume-456',
        originalFilename: 'resume.pdf',
        tempGridFsUrl: 'gridfs://resume-456',
      };

      const result = await service.publishResumeSubmitted(event);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('messageId');
    });
  });
});
