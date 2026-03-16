import { Job, JobStatus, JobType, CreateJobData } from './job.entity';

describe('JobEntity', () => {
  const validJobData: CreateJobData = {
    title: 'Senior Software Engineer',
    description:
      'We are looking for a senior software engineer with 5+ years of experience in building scalable web applications. The ideal candidate should have strong problem-solving skills and experience with modern frameworks.',
    department: 'Engineering',
    location: {
      type: 'hybrid',
      city: 'San Francisco',
      country: 'USA',
    },
    type: JobType.FULL_TIME,
    requirements: {
      skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
      experienceYears: 5,
      educationLevel: 'bachelor',
    },
    salaryMin: 120000,
    salaryMax: 180000,
    currency: 'USD',
    benefits: ['Health Insurance', '401k', 'Remote Work'],
    postedBy: 'user-123',
    organizationId: 'org-456',
  };

  describe('Job Creation', () => {
    it('should create job with valid data', () => {
      const job = new Job(validJobData);

      expect(job.title).toBe(validJobData.title);
      expect(job.description).toBe(validJobData.description);
      expect(job.department).toBe(validJobData.department);
      expect(job.location).toEqual(validJobData.location);
      expect(job.type).toBe(validJobData.type);
      expect(job.requirements).toEqual(validJobData.requirements);
      expect(job.salaryMin).toBe(validJobData.salaryMin);
      expect(job.salaryMax).toBe(validJobData.salaryMax);
      expect(job.currency).toBe(validJobData.currency);
      expect(job.benefits).toEqual(validJobData.benefits);
      expect(job.postedBy).toBe(validJobData.postedBy);
      expect(job.organizationId).toBe(validJobData.organizationId);
      expect(job.status).toBe(JobStatus.DRAFT);
      expect(job.id).toBeDefined();
      expect(job.createdAt).toBeInstanceOf(Date);
      expect(job.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique ID if not provided', () => {
      const job1 = new Job(validJobData);
      const job2 = new Job(validJobData);

      expect(job1.id).not.toBe(job2.id);
      expect(job1.id).toMatch(/^job-\d+-/);
    });

    it('should use provided ID if given', () => {
      const customId = 'custom-job-id';
      const job = new Job({ ...validJobData, id: customId });

      expect(job.id).toBe(customId);
    });

    it('should set default status to DRAFT', () => {
      const job = new Job(validJobData);

      expect(job.status).toBe(JobStatus.DRAFT);
    });

    it('should accept custom status', () => {
      const job = new Job({ ...validJobData, status: JobStatus.ACTIVE });

      expect(job.status).toBe(JobStatus.ACTIVE);
    });
  });

  describe('validateCreate', () => {
    it('should validate job title is required', () => {
      const result = Job.validateCreate({
        ...validJobData,
        title: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Job title is required');
    });

    it('should validate job title minimum length', () => {
      const result = Job.validateCreate({
        ...validJobData,
        title: 'AB',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Job title must be at least 3 characters',
      );
    });

    it('should validate job title maximum length', () => {
      const result = Job.validateCreate({
        ...validJobData,
        title: 'A'.repeat(201),
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Job title must not exceed 200 characters',
      );
    });

    it('should validate job description is required', () => {
      const result = Job.validateCreate({
        ...validJobData,
        description: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Job description is required');
    });

    it('should validate job description minimum length', () => {
      const result = Job.validateCreate({
        ...validJobData,
        description: 'Short description',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Job description must be at least 50 characters',
      );
    });

    it('should validate location is required', () => {
      const result = Job.validateCreate({
        ...validJobData,
        location: undefined as any,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Job location is required');
    });

    it('should validate location type is required', () => {
      const result = Job.validateCreate({
        ...validJobData,
        location: { city: 'NYC' } as any,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Location type is required');
    });

    it('should validate location type is valid', () => {
      const result = Job.validateCreate({
        ...validJobData,
        location: { type: 'invalid' } as any,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid location type');
    });

    it('should validate job type is required', () => {
      const result = Job.validateCreate({
        ...validJobData,
        type: undefined as any,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Job type is required');
    });

    it('should validate job type is valid', () => {
      const result = Job.validateCreate({
        ...validJobData,
        type: 'invalid' as any,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid job type');
    });

    it('should validate requirements are required', () => {
      const result = Job.validateCreate({
        ...validJobData,
        requirements: undefined as any,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Job requirements are required');
    });

    it('should validate at least one skill is required', () => {
      const result = Job.validateCreate({
        ...validJobData,
        requirements: {
          ...validJobData.requirements,
          skills: [],
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'At least one required skill is required',
      );
    });

    it('should validate experience years is non-negative', () => {
      const result = Job.validateCreate({
        ...validJobData,
        requirements: {
          ...validJobData.requirements,
          experienceYears: -1,
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Experience years must be a non-negative number',
      );
    });

    it('should validate posted by is required', () => {
      const result = Job.validateCreate({
        ...validJobData,
        postedBy: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Posted by user ID is required');
    });

    it('should validate organization ID is required', () => {
      const result = Job.validateCreate({
        ...validJobData,
        organizationId: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Organization ID is required');
    });

    it('should validate salary range', () => {
      const result = Job.validateCreate({
        ...validJobData,
        salaryMin: 100000,
        salaryMax: 50000,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Minimum salary cannot be greater than maximum salary',
      );
    });

    it('should validate salary values are non-negative', () => {
      const result = Job.validateCreate({
        ...validJobData,
        salaryMin: -1000,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Salary values must be non-negative');
    });

    it('should return valid for complete valid data', () => {
      const result = Job.validateCreate(validJobData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('State Transitions', () => {
    it('should handle draft -> active transition', () => {
      const job = new Job(validJobData);
      expect(job.status).toBe(JobStatus.DRAFT);

      const result = job.activate();

      expect(result.success).toBe(true);
      expect(job.status).toBe(JobStatus.ACTIVE);
      expect(job.publishedAt).toBeInstanceOf(Date);
    });

    it('should handle active -> closed transition', () => {
      const job = new Job({ ...validJobData, status: JobStatus.ACTIVE });

      const result = job.close();

      expect(result.success).toBe(true);
      expect(job.status).toBe(JobStatus.CLOSED);
      expect(job.closedAt).toBeInstanceOf(Date);
    });

    it('should handle draft -> archived transition', () => {
      const job = new Job(validJobData);

      const result = job.transitionTo(JobStatus.ARCHIVED);

      expect(result.success).toBe(true);
      expect(job.status).toBe(JobStatus.ARCHIVED);
    });

    it('should prevent invalid state transitions', () => {
      const job = new Job({ ...validJobData, status: JobStatus.ACTIVE });

      const result = job.transitionTo(JobStatus.DRAFT);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Cannot transition from active to draft');
      expect(job.status).toBe(JobStatus.ACTIVE);
    });

    it('should prevent draft -> closed transition', () => {
      const job = new Job(validJobData);

      const result = job.transitionTo(JobStatus.CLOSED);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Cannot transition from draft to closed');
    });

    it('should prevent archived -> any transition', () => {
      const job = new Job({ ...validJobData, status: JobStatus.ARCHIVED });

      expect(job.canTransitionTo(JobStatus.ACTIVE)).toBe(false);
      expect(job.canTransitionTo(JobStatus.CLOSED)).toBe(false);
      expect(job.canTransitionTo(JobStatus.DRAFT)).toBe(false);
    });

    it('should allow active -> paused transition', () => {
      const job = new Job({ ...validJobData, status: JobStatus.ACTIVE });

      const result = job.transitionTo(JobStatus.PAUSED);

      expect(result.success).toBe(true);
      expect(job.status).toBe(JobStatus.PAUSED);
    });

    it('should allow paused -> active transition', () => {
      const job = new Job({ ...validJobData, status: JobStatus.PAUSED });

      const result = job.transitionTo(JobStatus.ACTIVE);

      expect(result.success).toBe(true);
      expect(job.status).toBe(JobStatus.ACTIVE);
    });

    it('should allow paused -> closed transition', () => {
      const job = new Job({ ...validJobData, status: JobStatus.PAUSED });

      const result = job.transitionTo(JobStatus.CLOSED);

      expect(result.success).toBe(true);
      expect(job.status).toBe(JobStatus.CLOSED);
    });

    it('should allow closed -> archived transition', () => {
      const job = new Job({ ...validJobData, status: JobStatus.CLOSED });

      const result = job.transitionTo(JobStatus.ARCHIVED);

      expect(result.success).toBe(true);
      expect(job.status).toBe(JobStatus.ARCHIVED);
    });
  });

  describe('Update Job', () => {
    it('should update job title', () => {
      const job = new Job(validJobData);
      const result = job.update({ title: 'Updated Title' });

      expect(result.success).toBe(true);
      expect(job.title).toBe('Updated Title');
    });

    it('should update multiple fields', () => {
      const job = new Job(validJobData);
      const result = job.update({
        title: 'New Title',
        description:
          'New description that is definitely longer than fifty characters for validation.',
        department: 'New Department',
      });

      expect(result.success).toBe(true);
      expect(job.title).toBe('New Title');
      expect(job.department).toBe('New Department');
    });

    it('should reject update with invalid data', () => {
      const job = new Job(validJobData);
      const result = job.update({ title: '' });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Job title is required');
      expect(job.title).toBe(validJobData.title);
    });

    it('should not update archived job', () => {
      const job = new Job({ ...validJobData, status: JobStatus.ARCHIVED });
      const result = job.update({ title: 'New Title' });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Cannot update archived job');
    });

    it('should update timestamp on successful update', () => {
      const job = new Job(validJobData);
      const beforeUpdate = job.updatedAt;

      setTimeout(() => {
        job.update({ title: 'New Title' });
        expect(job.updatedAt.getTime()).toBeGreaterThan(beforeUpdate.getTime());
      }, 10);
    });
  });

  describe('Job Status Properties', () => {
    it('should return true for isActive when status is ACTIVE', () => {
      const job = new Job({ ...validJobData, status: JobStatus.ACTIVE });
      expect(job.isActive).toBe(true);
    });

    it('should return false for isActive when status is not ACTIVE', () => {
      const job = new Job({ ...validJobData, status: JobStatus.DRAFT });
      expect(job.isActive).toBe(false);
    });

    it('should return true for isClosed when status is CLOSED', () => {
      const job = new Job({ ...validJobData, status: JobStatus.CLOSED });
      expect(job.isClosed).toBe(true);
    });

    it('should return true for isClosed when status is ARCHIVED', () => {
      const job = new Job({ ...validJobData, status: JobStatus.ARCHIVED });
      expect(job.isClosed).toBe(true);
    });

    it('should return false for isClosed when status is ACTIVE', () => {
      const job = new Job({ ...validJobData, status: JobStatus.ACTIVE });
      expect(job.isClosed).toBe(false);
    });
  });

  describe('Expiration', () => {
    it('should return false for isExpired when no deadline', () => {
      const job = new Job(validJobData);
      expect(job.isExpired).toBe(false);
    });

    it('should return false for isExpired when deadline is in future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const job = new Job({ ...validJobData, deadline: futureDate });
      expect(job.isExpired).toBe(false);
    });

    it('should return true for isExpired when deadline has passed', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const job = new Job({ ...validJobData, deadline: pastDate });
      expect(job.isExpired).toBe(true);
    });
  });

  describe('toObject', () => {
    it('should convert job to plain object', () => {
      const job = new Job(validJobData);
      const obj = job.toObject();

      expect(obj.title).toBe(job.title);
      expect(obj.description).toBe(job.description);
      expect(obj.status).toBe(job.status);
      expect(obj.id).toBe(job.id);
    });
  });
});
