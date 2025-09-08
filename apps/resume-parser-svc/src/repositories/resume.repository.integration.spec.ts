import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ResumeRepository } from './resume.repository';
import { Resume, ResumeSchema } from '../schemas/resume.schema';
import { MongodbTestSetup } from '../testing/mongodb-test-setup';

describe('ResumeRepository Integration', () => {
  let repository: ResumeRepository;
  let module: TestingModule;

  beforeAll(async () => {
    // Start MongoDB memory server and get test module
    const mongooseModule = await MongodbTestSetup.getMongooseTestModule('resume-parser');
    const featureModule = MongodbTestSetup.getMongooseFeatureModule(
      [{ name: Resume.name, schema: ResumeSchema }],
      'resume-parser',
    );

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env'],
        }),
        mongooseModule,
        featureModule,
      ],
      providers: [ResumeRepository],
    }).compile();

    repository = module.get<ResumeRepository>(ResumeRepository);
  }, 30000);

  afterAll(async () => {
    if (module) {
      await module.close();
    }
    await MongodbTestSetup.stopMongoMemoryServer();
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const healthStatus = await repository.healthCheck();
      expect(healthStatus.status).toBe('healthy');
      expect(healthStatus.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('CRUD Operations', () => {
    let createdResumeId: string;
    const testResumeData = {
      contactInfo: {
        name: '张测试',
        email: 'test@example.com',
        phone: '13800138000',
      },
      skills: ['Python', 'JavaScript', 'MongoDB'],
      workExperience: [
        {
          company: '测试公司',
          position: '软件工程师',
          startDate: '2023-01-01',
          endDate: '2024-01-01',
          summary: '负责系统开发和维护',
        },
      ],
      education: [
        {
          school: '测试大学',
          degree: '学士',
          major: '计算机科学',
        },
      ],
      originalFilename: 'test-resume.pdf',
      gridFsUrl: 'gridfs://resume-files/507f1f77bcf86cd799439011',
      processingConfidence: 0.95,
      status: 'completed',
    };

    it('should create a new resume', async () => {
      const createdResume = await repository.create(testResumeData);

      expect(createdResume).toBeDefined();
      expect(createdResume._id).toBeDefined();
      expect(createdResume.contactInfo.name).toBe(
        testResumeData.contactInfo.name,
      );
      expect(createdResume.contactInfo.email).toBe(
        testResumeData.contactInfo.email,
      );
      expect(createdResume.skills).toEqual(testResumeData.skills);
      expect(createdResume.status).toBe(testResumeData.status);

      createdResumeId = (createdResume as any)._id.toString();
    });

    it('should find resume by ID', async () => {
      const foundResume = await repository.findById(createdResumeId);

      expect(foundResume).toBeDefined();
      expect((foundResume as any)?._id.toString()).toBe(createdResumeId);
      expect(foundResume?.contactInfo.name).toBe(
        testResumeData.contactInfo.name,
      );
    });

    it('should find resume by email', async () => {
      const resumesByEmail = await repository.findByEmail(
        testResumeData.contactInfo.email,
      );

      expect(resumesByEmail).toBeDefined();
      expect(resumesByEmail.length).toBeGreaterThan(0);
      expect(resumesByEmail[0].contactInfo.email).toBe(
        testResumeData.contactInfo.email,
      );
    });

    it('should find resume by GridFS URL', async () => {
      const resumeByUrl = await repository.findByGridFsUrl(
        testResumeData.gridFsUrl,
      );

      expect(resumeByUrl).toBeDefined();
      expect(resumeByUrl?.gridFsUrl).toBe(testResumeData.gridFsUrl);
    });

    it('should update resume by ID', async () => {
      const updateData = {
        processingConfidence: 0.98,
        status: 'completed',
      };

      const updatedResume = await repository.updateById(
        createdResumeId,
        updateData,
      );

      expect(updatedResume).toBeDefined();
      expect(updatedResume?.processingConfidence).toBe(0.98);
      expect(updatedResume?.status).toBe('completed');
    });

    it('should update resume status', async () => {
      const updatedResume = await repository.updateStatus(
        createdResumeId,
        'failed',
        'Test error',
      );

      expect(updatedResume).toBeDefined();
      expect(updatedResume?.status).toBe('failed');
      expect(updatedResume?.processedAt).toBeDefined();
    });

    it('should find resumes by status', async () => {
      const failedResumes = await repository.findByStatus('failed');

      expect(failedResumes).toBeDefined();
      expect(failedResumes.length).toBeGreaterThan(0);
      expect(
        failedResumes.some((r: any) => r._id.toString() === createdResumeId),
      ).toBe(true);
    });

    it('should find resumes with specific skills', async () => {
      // First update our test resume status back to completed
      await repository.updateStatus(createdResumeId, 'completed');

      const resumesWithSkills = await repository.findWithSkills([
        'Python',
        'JavaScript',
      ]);

      expect(resumesWithSkills).toBeDefined();
      expect(
        resumesWithSkills.some(
          (r) => r.skills.includes('Python') && r.skills.includes('JavaScript'),
        ),
      ).toBe(true);
    });

    it('should count resumes by status', async () => {
      const statusCounts = await repository.countByStatus();

      expect(statusCounts).toBeDefined();
      expect(typeof statusCounts).toBe('object');
      expect(statusCounts['completed']).toBeGreaterThanOrEqual(1);
    });

    it('should delete resume by ID', async () => {
      const deleteResult = await repository.deleteById(createdResumeId);

      expect(deleteResult).toBe(true);

      // Verify deletion
      const deletedResume = await repository.findById(createdResumeId);
      expect(deletedResume).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should return null when finding non-existent resume by ID', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const result = await repository.findById(nonExistentId);
      expect(result).toBeNull();
    });

    it('should return empty array when finding resumes by non-existent email', async () => {
      const result = await repository.findByEmail('nonexistent@example.com');
      expect(result).toEqual([]);
    });

    it('should return false when deleting non-existent resume', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const result = await repository.deleteById(nonExistentId);
      expect(result).toBe(false);
    });
  });
});
