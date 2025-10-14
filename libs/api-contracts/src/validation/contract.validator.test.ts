/**
 * Contract Validation Tests
 * Ensures contract validation utilities work correctly
 */

import { ContractValidator } from './contract.validator.js';

describe('ContractValidator', () => {
  describe('validateJobContract', () => {
    it('should validate valid job data', () => {
      const validJob = {
        id: 'job-123',
        title: 'Software Engineer',
        status: 'active' as const,
        createdAt: new Date(),
        resumeCount: 5,
      };

      const result = ContractValidator.validateJobContract(validJob, 'JobBase');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.contractName).toBe('JobBase');
    });

    it('should detect missing required fields', () => {
      const invalidJob = {
        title: 'Software Engineer',
        // Missing id, status, createdAt, resumeCount
      };

      const result = ContractValidator.validateJobContract(
        invalidJob,
        'JobBase',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('id must be a non-empty string');
      expect(result.errors).toContain(
        'status must be one of: draft, active, processing, completed, closed',
      );
      expect(result.errors).toContain('createdAt must be a Date object');
      expect(result.errors).toContain(
        'resumeCount must be a non-negative number',
      );
    });

    it('should detect invalid status values', () => {
      const invalidJob = {
        id: 'job-123',
        title: 'Software Engineer',
        status: 'invalid-status',
        createdAt: new Date(),
        resumeCount: 5,
      };

      const result = ContractValidator.validateJobContract(
        invalidJob,
        'JobBase',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'status must be one of: draft, active, processing, completed, closed',
      );
    });

    it('should validate JobDetail requires jdText', () => {
      const jobWithoutJdText = {
        id: 'job-123',
        title: 'Software Engineer',
        status: 'active' as const,
        createdAt: new Date(),
        resumeCount: 5,
        // Missing jdText
      };

      const result = ContractValidator.validateJobContract(
        jobWithoutJdText,
        'JobDetail',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'jdText must be a non-empty string for JobDetail',
      );
    });

    it('should validate negative resume count', () => {
      const invalidJob = {
        id: 'job-123',
        title: 'Software Engineer',
        status: 'active' as const,
        createdAt: new Date(),
        resumeCount: -1,
      };

      const result = ContractValidator.validateJobContract(
        invalidJob,
        'JobBase',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'resumeCount must be a non-negative number',
      );
    });
  });

  describe('validateReportContract', () => {
    it('should validate valid analysis report', () => {
      const validReport = {
        id: 'report-123',
        resumeId: 'resume-456',
        jobId: 'job-789',
        candidateName: 'John Doe',
        matchScore: 85,
        oneSentenceSummary: 'Strong candidate with relevant experience.',
        strengths: ['React', 'TypeScript'],
        potentialGaps: ['AWS experience'],
        redFlags: [],
        suggestedInterviewQuestions: ['Tell me about your React projects'],
        generatedAt: new Date(),
      };

      const result = ContractValidator.validateReportContract(
        validReport,
        'AnalysisReport',
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.contractName).toBe('AnalysisReport');
    });

    it('should detect invalid match score', () => {
      const invalidReport = {
        id: 'report-123',
        candidateName: 'John Doe',
        matchScore: 150, // Invalid: > 100
        oneSentenceSummary: 'Summary',
        generatedAt: new Date(),
      };

      const result = ContractValidator.validateReportContract(
        invalidReport,
        'ReportListItem',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'matchScore must be a number between 0 and 100',
      );
    });

    it('should validate AnalysisReport requires additional fields', () => {
      const incompleteReport = {
        id: 'report-123',
        candidateName: 'John Doe',
        matchScore: 85,
        oneSentenceSummary: 'Summary',
        generatedAt: new Date(),
        // Missing required fields for AnalysisReport
      };

      const result = ContractValidator.validateReportContract(
        incompleteReport,
        'AnalysisReport',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('resumeId must be a non-empty string');
      expect(result.errors).toContain('jobId must be a non-empty string');
      expect(result.errors).toContain('strengths must be an array of strings');
    });
  });

  describe('compareContracts', () => {
    it('should detect matching contracts', () => {
      const frontend = { id: 'test', name: 'John', age: 25 };
      const backend = { id: 'test', name: 'John', age: 25 };

      const result = ContractValidator.compareContracts(
        frontend,
        backend,
        'TestContract',
      );

      expect(result.structureMatch).toBe(true);
      expect(result.typeMatch).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.extraFields).toHaveLength(0);
      expect(result.typeMismatches).toHaveLength(0);
    });

    it('should detect missing fields', () => {
      const frontend = { id: 'test', name: 'John' };
      const backend = { id: 'test', name: 'John', age: 25 };

      const result = ContractValidator.compareContracts(
        frontend,
        backend,
        'TestContract',
      );

      expect(result.structureMatch).toBe(false);
      expect(result.missingFields).toContain('age');
      expect(result.extraFields).toHaveLength(0);
    });

    it('should detect extra fields', () => {
      const frontend = { id: 'test', name: 'John', email: 'john@test.com' };
      const backend = { id: 'test', name: 'John' };

      const result = ContractValidator.compareContracts(
        frontend,
        backend,
        'TestContract',
      );

      expect(result.structureMatch).toBe(false);
      expect(result.missingFields).toHaveLength(0);
      expect(result.extraFields).toContain('email');
    });

    it('should detect type mismatches', () => {
      const frontend = { id: 'test', name: 'John', age: '25' }; // age as string
      const backend = { id: 'test', name: 'John', age: 25 }; // age as number

      const result = ContractValidator.compareContracts(
        frontend,
        backend,
        'TestContract',
      );

      expect(result.typeMatch).toBe(false);
      expect(result.typeMismatches).toHaveLength(1);
      expect(result.typeMismatches[0]).toEqual({
        field: 'age',
        expected: 'number',
        actual: 'string',
      });
    });
  });

  describe('integration tests', () => {
    it('should validate realistic frontend-backend job contract comparison', () => {
      // Simulate frontend job model
      const frontendJob = {
        id: 'job-123',
        title: 'Senior Frontend Developer',
        jdText: 'We are looking for an experienced frontend developer...',
        status: 'active' as const,
        createdAt: new Date('2024-01-15'),
        resumeCount: 12,
      };

      // Simulate backend DTO
      const backendJobDto = {
        id: 'job-123',
        title: 'Senior Frontend Developer',
        jdText: 'We are looking for an experienced frontend developer...',
        status: 'active' as const,
        createdAt: new Date('2024-01-15'),
        resumeCount: 12,
      };

      // Validate individual contracts
      const frontendValidation = ContractValidator.validateJobContract(
        frontendJob,
        'JobDetail',
      );
      const backendValidation = ContractValidator.validateJobContract(
        backendJobDto,
        'JobDetail',
      );

      expect(frontendValidation.isValid).toBe(true);
      expect(backendValidation.isValid).toBe(true);

      // Compare contracts
      const comparison = ContractValidator.compareContracts(
        frontendJob,
        backendJobDto,
        'JobContract',
      );

      expect(comparison.structureMatch).toBe(true);
      expect(comparison.typeMatch).toBe(true);
    });

    it('should detect when frontend and backend job status enums diverge', () => {
      const frontendJob = {
        id: 'job-123',
        title: 'Developer',
        status: 'archived', // Status not supported by backend
        createdAt: new Date(),
        resumeCount: 5,
      };

      const result = ContractValidator.validateJobContract(
        frontendJob,
        'JobBase',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'status must be one of: draft, active, processing, completed, closed',
      );
    });
  });
});
