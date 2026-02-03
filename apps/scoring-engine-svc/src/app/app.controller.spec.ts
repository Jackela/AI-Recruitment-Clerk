import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
  });

  describe('gapAnalysis', () => {
    it('should return matched and missing skills based on provided lists', () => {
      const controller = app.get<AppController>(AppController);

      const response = controller.gapAnalysis({
        jdSkills: ['TypeScript', 'Node', 'CI/CD'],
        resumeSkills: ['typescript', 'GraphQL'],
      });

      expect(response).toEqual({
        matchedSkills: expect.arrayContaining(['typescript']),
        missingSkills: expect.arrayContaining(['node', 'ci/cd']),
        suggestedSkills: [],
      });
    });

    it('tokenizes free-text job description when explicit skills missing', () => {
      const controller = app.get<AppController>(AppController);

      const response = controller.gapAnalysis({
        jdText: 'We need DevOpsAWS engineers',
        resumeText: 'Experienced with aws and docker',
      });

      expect(response.matchedSkills).toContain('aws');
      expect(response.missingSkills).toEqual(
        expect.arrayContaining(['dev', 'ops']),
      );
    });
  });
});
