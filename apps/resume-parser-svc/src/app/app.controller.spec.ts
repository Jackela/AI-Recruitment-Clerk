import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ResumeRepository } from '../repositories/resume.repository';
import { GridFsService } from '../gridfs/gridfs.service';

describe('AppController', () => {
  let controller: AppController;
  let appService: jest.Mocked<AppService>;
  let resumeRepository: jest.Mocked<ResumeRepository>;
  let gridFsService: jest.Mocked<GridFsService>;

  beforeEach(async () => {
    const mockAppService = {
      getData: jest.fn(),
    };

    const mockResumeRepository = {
      healthCheck: jest.fn(),
    };

    const mockGridFsService = {
      healthCheck: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: AppService, useValue: mockAppService },
        { provide: ResumeRepository, useValue: mockResumeRepository },
        { provide: GridFsService, useValue: mockGridFsService },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get(AppService);
    resumeRepository = module.get(ResumeRepository);
    gridFsService = module.get(GridFsService);
  });

  describe('getData', () => {
    it('should return data from app service', () => {
      const mockData = { 
        message: 'Resume Parser Service API',
        status: 'ready' 
      };
      appService.getData.mockReturnValue(mockData);

      const result = controller.getData();

      expect(result).toBe(mockData);
      expect(appService.getData).toHaveBeenCalled();
    });

    it('should handle initializing status', () => {
      const mockData = { 
        message: 'Resume Parser Service API',
        status: 'initializing' 
      };
      appService.getData.mockReturnValue(mockData);

      const result = controller.getData();

      expect(result).toBe(mockData);
      expect((result as any).status).toBe('initializing');
    });
  });

  describe('getHealth', () => {
    it('should return healthy status when all services are healthy', async () => {
      resumeRepository.healthCheck.mockResolvedValue({
        status: 'healthy',
        count: 10,
      });
      
      gridFsService.healthCheck.mockResolvedValue({
        status: 'healthy',
        bucket: 'resumes',
        connected: true,
      });

      const result = await controller.getHealth();

      expect(result).toMatchObject({
        status: 'ok',
        service: 'resume-parser-svc',
        database: {
          status: 'healthy',
          resumeCount: 10,
        },
        gridfs: {
          status: 'healthy',
          bucket: 'resumes',
          connected: true,
        },
      });
      expect(result.timestamp).toBeDefined();
      expect(resumeRepository.healthCheck).toHaveBeenCalled();
      expect(gridFsService.healthCheck).toHaveBeenCalled();
    });

    it('should return degraded status when database is unhealthy', async () => {
      resumeRepository.healthCheck.mockResolvedValue({
        status: 'unhealthy',
        count: 0,
      });
      
      gridFsService.healthCheck.mockResolvedValue({
        status: 'healthy',
        bucket: 'resumes',
        connected: true,
      });

      const result = await controller.getHealth();

      expect(result).toMatchObject({
        status: 'degraded',
        service: 'resume-parser-svc',
        database: {
          status: 'unhealthy',
          resumeCount: 0,
        },
        gridfs: {
          status: 'healthy',
          bucket: 'resumes',
          connected: true,
        },
      });
    });

    it('should return degraded status when GridFS is unhealthy', async () => {
      resumeRepository.healthCheck.mockResolvedValue({
        status: 'healthy',
        count: 5,
      });
      
      gridFsService.healthCheck.mockResolvedValue({
        status: 'unhealthy',
        bucket: 'resumes',
        connected: false,
      });

      const result = await controller.getHealth();

      expect(result).toMatchObject({
        status: 'degraded',
        service: 'resume-parser-svc',
        database: {
          status: 'healthy',
          resumeCount: 5,
        },
        gridfs: {
          status: 'unhealthy',
          bucket: 'resumes',
          connected: false,
        },
      });
    });

    it('should return degraded status when both services are unhealthy', async () => {
      resumeRepository.healthCheck.mockResolvedValue({
        status: 'unhealthy',
        count: 0,
      });
      
      gridFsService.healthCheck.mockResolvedValue({
        status: 'unhealthy',
        bucket: 'resumes',
        connected: false,
      });

      const result = await controller.getHealth();

      expect(result).toMatchObject({
        status: 'degraded',
        service: 'resume-parser-svc',
        database: {
          status: 'unhealthy',
          resumeCount: 0,
        },
        gridfs: {
          status: 'unhealthy',
          bucket: 'resumes',
          connected: false,
        },
      });
    });

    it('should handle health check errors gracefully', async () => {
      resumeRepository.healthCheck.mockRejectedValue(new Error('DB connection failed'));
      
      gridFsService.healthCheck.mockResolvedValue({
        status: 'healthy',
        bucket: 'resumes',
        connected: true,
      });

      await expect(controller.getHealth()).rejects.toThrow('DB connection failed');
    });

    it('should include timestamp in ISO format', async () => {
      resumeRepository.healthCheck.mockResolvedValue({
        status: 'healthy',
        count: 10,
      });
      
      gridFsService.healthCheck.mockResolvedValue({
        status: 'healthy',
        bucket: 'resumes',
        connected: true,
      });

      const result = await controller.getHealth();
      const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
      
      expect(result.timestamp).toMatch(timestampRegex);
    });
  });
});