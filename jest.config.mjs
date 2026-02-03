const baseProjects = [
  '<rootDir>/apps/app-gateway/jest.config.ts',
  '<rootDir>/apps/resume-parser-svc/jest.config.ts',
  '<rootDir>/apps/ai-recruitment-frontend/jest.config.ts',
  '<rootDir>/apps/scoring-engine-svc/jest.config.ts',
  '<rootDir>/apps/report-generator-svc/jest.config.ts',
  '<rootDir>/apps/jd-extractor-svc/jest.config.ts',
  '<rootDir>/libs/shared-dtos/jest.config.js',
  '<rootDir>/libs/api-contracts/jest.config.cjs',
  '<rootDir>/libs/user-management-domain/jest.config.ts',
  '<rootDir>/libs/infrastructure-shared/jest.config.ts',
  '<rootDir>/libs/candidate-scoring-domain/jest.config.ts',
  '<rootDir>/libs/ai-services-shared/jest.config.ts',
  '<rootDir>/libs/incentive-system-domain/jest.config.ts',
  '<rootDir>/libs/marketing-domain/jest.config.ts',
  '<rootDir>/libs/usage-management-domain/jest.config.ts',
  '<rootDir>/libs/job-management-domain/jest.config.ts',
  '<rootDir>/libs/resume-processing-domain/jest.config.ts',
  '<rootDir>/libs/report-generation-domain/jest.config.ts',
  '<rootDir>/libs/shared-nats-client/jest.config.ts',
];

export default {
  projects: baseProjects,
  passWithNoTests: true,
};
