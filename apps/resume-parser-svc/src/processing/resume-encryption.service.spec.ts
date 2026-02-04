import { ResumeEncryptionService } from './resume-encryption.service';
import { ResumeParserException } from '@ai-recruitment-clerk/infrastructure-shared';
import { EncryptionService } from '@ai-recruitment-clerk/infrastructure-shared';

// Mock EncryptionService
jest.mock('@ai-recruitment-clerk/infrastructure-shared', () => ({
  ResumeParserException: class extends Error {
    code: string;
    context: unknown;
    constructor(code: string, context: unknown) {
      super(code);
      this.name = 'ResumeParserException';
      this.code = code;
      this.context = context;
    }
  },
  EncryptionService: {
    encryptUserPII: jest.fn((data: Record<string, unknown>) => ({
      ...data,
      encrypted: true,
      timestamp: Date.now(),
    })),
  },
}));

describe('ResumeEncryptionService', () => {
  let service: ResumeEncryptionService;

  beforeEach(() => {
    service = new ResumeEncryptionService();
    jest.clearAllMocks();
  });

  const mockResumeDto = {
    contactInfo: {
      email: 'test@example.com',
      phone: '+1234567890',
      address: '123 Test St',
    },
    skills: ['JavaScript', 'TypeScript'],
    workExperience: [],
    education: [],
  };

  describe('encryptSensitiveData', () => {
    it('should encrypt contact info in resume DTO', () => {
      const result = service.encryptSensitiveData(mockResumeDto, 'org-123');

      expect(result._organizationId).toBe('org-123');
      expect(result._dataClassification).toBe('sensitive-pii');
      expect(result.contactInfo.encrypted).toBe(true);
    });

    it('should preserve non-PII fields', () => {
      const result = service.encryptSensitiveData(mockResumeDto, 'org-123');

      expect(result.skills).toEqual(mockResumeDto.skills);
      expect(result.workExperience).toEqual(mockResumeDto.workExperience);
    });

    it('should handle resume without contact info', () => {
      const resumeWithoutContact = {
        skills: ['JavaScript'],
        workExperience: [],
        education: [],
      };

      const result = service.encryptSensitiveData(
        resumeWithoutContact,
        'org-123',
      );

      expect(result._organizationId).toBe('org-123');
      expect(result.contactInfo).toBeUndefined();
    });
  });

  describe('secureResumeData', () => {
    it('should secure resume with full options', () => {
      const options = {
        organizationId: 'org-456',
        encryptContactInfo: true,
        dataClassification: 'confidential',
        processingNode: 'node-1',
      };

      const result = service.secureResumeData(mockResumeDto, options);

      expect(result._organizationId).toBe('org-456');
      expect(result._dataClassification).toBe('confidential');
      expect(result._processingNode).toBe('node-1');
      expect(result.contactInfo.encrypted).toBe(true);
    });

    it('should skip contact encryption when disabled', () => {
      const options = {
        organizationId: 'org-456',
        encryptContactInfo: false,
      };

      const result = service.secureResumeData(mockResumeDto, options);

      expect(result.contactInfo.encrypted).toBeUndefined();
      expect(result._organizationId).toBe('org-456');
    });
  });

  describe('validateOrganizationId', () => {
    it('should accept valid organization IDs', () => {
      expect(service.validateOrganizationId('org-12345')).toBe(true);
      expect(service.validateOrganizationId('valid-org-id')).toBe(true);
    });

    it('should reject empty organization ID', () => {
      expect(() =>
        service.validateOrganizationId(''),
      ).toThrow(ResumeParserException);
    });

    it('should reject organization ID below minimum length', () => {
      expect(() =>
        service.validateOrganizationId('abc'),
      ).toThrow(ResumeParserException);
    });

    it('should accept custom minimum length', () => {
      expect(() =>
        service.validateOrganizationId('org123', 10),
      ).toThrow(ResumeParserException);
    });
  });

  describe('validateOrganizationAccess', () => {
    it('should validate access with matching org and job', () => {
      expect(
        service.validateOrganizationAccess(
          'org-12345678',
          'org-12345678-job-123',
        ),
      ).toBe(true);
    });

    it('should warn but not throw for non-matching org and job', () => {
      // This should log a warning but not throw
      expect(
        service.validateOrganizationAccess('org-12345678', 'job-456'),
      ).toBe(true);
    });

    it('should reject invalid organization ID', () => {
      expect(() =>
        service.validateOrganizationAccess('abc', 'job-123'),
      ).toThrow(ResumeParserException);
    });
  });

  describe('createSecurityMetadata', () => {
    it('should create security metadata with defaults', () => {
      const metadata = service.createSecurityMetadata('org-123');

      expect(metadata.encrypted).toBe(true);
      expect(metadata.encryptionVersion).toBe('1.0');
      expect(metadata.dataClassification).toBe('sensitive-pii');
      expect(typeof metadata.processingNode).toBe('string');
    });

    it('should use provided processing node', () => {
      const metadata = service.createSecurityMetadata('org-123', 'node-5');

      expect(metadata.processingNode).toBe('node-5');
    });

    it('should use NODE_NAME env variable when available', () => {
      const originalNodeName = process.env.NODE_NAME;
      process.env.NODE_NAME = 'test-node';

      const metadata = service.createSecurityMetadata('org-123');
      expect(metadata.processingNode).toBe('test-node');

      process.env.NODE_NAME = originalNodeName;
    });
  });
});
