import {
  ProcessingLegalBasis,
  DataRetentionStatus,
  BreachSeverity,
  BreachType,
  BreachStatus,
  DataProcessingRecord,
  DataRetentionPolicy,
  DataBreachRecord,
  CreateDataProcessingRecordDto,
  CreateBreachRecordDto,
  UpdateRetentionStatusDto,
} from './privacy-simple.dto';

describe('PrivacySimpleDto', () => {
  describe('Enums', () => {
    it('should have correct ProcessingLegalBasis values', () => {
      expect(ProcessingLegalBasis.CONSENT).toBe('consent');
      expect(ProcessingLegalBasis.CONTRACT).toBe('contract');
      expect(ProcessingLegalBasis.LEGITIMATE_INTERESTS).toBe(
        'legitimate_interests',
      );
    });

    it('should have correct DataRetentionStatus values', () => {
      expect(DataRetentionStatus.ACTIVE).toBe('active');
      expect(DataRetentionStatus.PENDING_DELETION).toBe('pending_deletion');
      expect(DataRetentionStatus.ANONYMIZED).toBe('anonymized');
      expect(DataRetentionStatus.DELETED).toBe('deleted');
    });

    it('should have correct BreachSeverity values', () => {
      expect(BreachSeverity.LOW).toBe('low');
      expect(BreachSeverity.MEDIUM).toBe('medium');
      expect(BreachSeverity.HIGH).toBe('high');
      expect(BreachSeverity.CRITICAL).toBe('critical');
    });

    it('should have correct BreachType values', () => {
      expect(BreachType.CONFIDENTIALITY).toBe('confidentiality');
      expect(BreachType.INTEGRITY).toBe('integrity');
      expect(BreachType.AVAILABILITY).toBe('availability');
    });

    it('should have correct BreachStatus values', () => {
      expect(BreachStatus.DETECTED).toBe('detected');
      expect(BreachStatus.INVESTIGATING).toBe('investigating');
      expect(BreachStatus.CONTAINED).toBe('contained');
      expect(BreachStatus.RESOLVED).toBe('resolved');
    });
  });

  describe('DataProcessingRecord', () => {
    it('should create a data processing record', () => {
      const record = new DataProcessingRecord();
      record.id = 'proc-1';
      record.name = 'Resume Processing';
      record.description = 'Processing candidate resumes';
      record.dataController = 'Company ABC';
      record.dataProcessorService = 'resume-parser';
      record.purposesOfProcessing = ['candidate_matching', 'hiring'];
      record.categoriesOfDataSubjects = ['job_applicants'];
      record.categoriesOfPersonalData = ['resume_content', 'contact_info'];
      record.legalBasis = ProcessingLegalBasis.CONTRACT;
      record.createdAt = new Date();
      record.updatedAt = new Date();

      expect(record.id).toBe('proc-1');
      expect(record.name).toBe('Resume Processing');
      expect(record.legalBasis).toBe(ProcessingLegalBasis.CONTRACT);
    });

    it('should allow optional retention period', () => {
      const record = new DataProcessingRecord();
      record.id = 'proc-2';
      record.name = 'Analytics';
      record.description = 'User analytics';
      record.dataController = 'Company ABC';
      record.dataProcessorService = 'analytics-service';
      record.purposesOfProcessing = ['analytics'];
      record.categoriesOfDataSubjects = ['users'];
      record.categoriesOfPersonalData = ['behavioral_data'];
      record.legalBasis = ProcessingLegalBasis.LEGITIMATE_INTERESTS;
      record.retentionPeriod = '2 years';
      record.createdAt = new Date();
      record.updatedAt = new Date();

      expect(record.retentionPeriod).toBe('2 years');
    });
  });

  describe('DataRetentionPolicy', () => {
    it('should create a retention policy', () => {
      const policy = new DataRetentionPolicy();
      policy.id = 'policy-1';
      policy.name = 'Resume Retention';
      policy.dataCategory = 'resume_content';
      policy.retentionPeriodDays = 365;
      policy.allowUserDeletion = true;
      policy.hasLegalHoldExemption = false;
      policy.isActive = true;
      policy.createdAt = new Date();
      policy.updatedAt = new Date();

      expect(policy.retentionPeriodDays).toBe(365);
      expect(policy.allowUserDeletion).toBe(true);
    });

    it('should allow default action', () => {
      const policy = new DataRetentionPolicy();
      policy.id = 'policy-2';
      policy.name = 'Logs Retention';
      policy.dataCategory = 'system_logs';
      policy.retentionPeriodDays = 90;
      policy.defaultAction = DataRetentionStatus.DELETED;
      policy.allowUserDeletion = false;
      policy.hasLegalHoldExemption = false;
      policy.isActive = true;
      policy.createdAt = new Date();
      policy.updatedAt = new Date();

      expect(policy.defaultAction).toBe(DataRetentionStatus.DELETED);
    });
  });

  describe('DataBreachRecord', () => {
    it('should create a breach record', () => {
      const breach = new DataBreachRecord();
      breach.id = 'breach-1';
      breach.title = 'Unauthorized Access';
      breach.description = 'Potential unauthorized access to user data';
      breach.breachType = BreachType.CONFIDENTIALITY;
      breach.severity = BreachSeverity.HIGH;
      breach.status = BreachStatus.INVESTIGATING;
      breach.discoveryDate = new Date();
      breach.affectedRecordsCount = 100;
      breach.affectedDataCategories = ['email', 'name'];
      breach.reportedBy = 'security@company.com';
      breach.createdAt = new Date();
      breach.updatedAt = new Date();

      expect(breach.severity).toBe(BreachSeverity.HIGH);
      expect(breach.status).toBe(BreachStatus.INVESTIGATING);
      expect(breach.affectedRecordsCount).toBe(100);
    });

    it('should allow optional dates', () => {
      const breach = new DataBreachRecord();
      breach.id = 'breach-2';
      breach.title = 'Data Exposure';
      breach.description = 'Data exposed via misconfigured API';
      breach.breachType = BreachType.CONFIDENTIALITY;
      breach.severity = BreachSeverity.MEDIUM;
      breach.status = BreachStatus.CONTAINED;
      breach.discoveryDate = new Date();
      breach.createdAt = new Date();
      breach.updatedAt = new Date();

      expect(breach.estimatedOccurrenceDate).toBeUndefined();
      expect(breach.containmentDate).toBeUndefined();
    });
  });

  describe('CreateDataProcessingRecordDto', () => {
    it('should create a processing record DTO', () => {
      const dto = new CreateDataProcessingRecordDto();
      dto.name = 'New Processing';
      dto.description = 'Description';
      dto.dataProcessorService = 'service-name';
      dto.purposesOfProcessing = ['purpose1', 'purpose2'];
      dto.categoriesOfPersonalData = ['personal_data'];
      dto.legalBasis = ProcessingLegalBasis.CONSENT;

      expect(dto.name).toBe('New Processing');
      expect(dto.legalBasis).toBe(ProcessingLegalBasis.CONSENT);
    });
  });

  describe('CreateBreachRecordDto', () => {
    it('should create a breach record DTO', () => {
      const dto = new CreateBreachRecordDto();
      dto.title = 'Security Incident';
      dto.description = 'Description of incident';
      dto.breachType = BreachType.INTEGRITY;
      dto.severity = BreachSeverity.CRITICAL;
      dto.discoveryDate = new Date();
      dto.reportedBy = 'security-team';

      expect(dto.breachType).toBe(BreachType.INTEGRITY);
      expect(dto.severity).toBe(BreachSeverity.CRITICAL);
    });
  });

  describe('UpdateRetentionStatusDto', () => {
    it('should create an update retention status DTO', () => {
      const dto = new UpdateRetentionStatusDto();
      dto.recordId = 'record-123';
      dto.status = DataRetentionStatus.DELETED;
      dto.notes = 'User requested deletion';
      dto.performedBy = 'admin';

      expect(dto.recordId).toBe('record-123');
      expect(dto.status).toBe(DataRetentionStatus.DELETED);
      expect(dto.notes).toBe('User requested deletion');
    });
  });
});
