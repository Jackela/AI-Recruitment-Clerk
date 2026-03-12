/**
 * Job Management Domain - Job Entity
 * Represents a job posting in the recruitment system
 */

export enum JobStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

export enum JobType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  FREELANCE = 'freelance',
  INTERNSHIP = 'internship',
}

export interface JobRequirements {
  skills: string[];
  experienceYears: number;
  educationLevel?: string;
  certifications?: string[];
  languages?: string[];
}

export interface JobLocation {
  type: 'remote' | 'onsite' | 'hybrid';
  city?: string;
  country?: string;
  address?: string;
}

export interface CreateJobData {
  id?: string;
  title: string;
  description: string;
  department?: string;
  location: JobLocation;
  type: JobType;
  requirements: JobRequirements;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  benefits?: string[];
  postedBy: string;
  organizationId: string;
  status?: JobStatus;
  deadline?: Date;
}

export class Job {
  readonly id: string;
  title: string;
  description: string;
  department?: string;
  location: JobLocation;
  type: JobType;
  requirements: JobRequirements;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  benefits?: string[];
  readonly postedBy: string;
  readonly organizationId: string;
  status: JobStatus;
  readonly createdAt: Date;
  updatedAt: Date;
  deadline?: Date;
  publishedAt?: Date;
  closedAt?: Date;

  private static readonly VALID_STATUS_TRANSITIONS: Record<
    JobStatus,
    JobStatus[]
  > = {
    [JobStatus.DRAFT]: [JobStatus.ACTIVE, JobStatus.ARCHIVED],
    [JobStatus.ACTIVE]: [JobStatus.PAUSED, JobStatus.CLOSED],
    [JobStatus.PAUSED]: [JobStatus.ACTIVE, JobStatus.CLOSED],
    [JobStatus.CLOSED]: [JobStatus.ARCHIVED],
    [JobStatus.ARCHIVED]: [],
  };

  constructor(data: CreateJobData) {
    this.id = data.id || Job.generateId();
    this.title = data.title;
    this.description = data.description;
    this.department = data.department;
    this.location = data.location;
    this.type = data.type;
    this.requirements = data.requirements;
    this.salaryMin = data.salaryMin;
    this.salaryMax = data.salaryMax;
    this.currency = data.currency;
    this.benefits = data.benefits;
    this.postedBy = data.postedBy;
    this.organizationId = data.organizationId;
    this.status = data.status || JobStatus.DRAFT;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.deadline = data.deadline;
  }

  /**
   * Validate job data before creation
   */
  static validateCreate(data: Partial<CreateJobData>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.title || data.title.trim().length === 0) {
      errors.push('Job title is required');
    } else if (data.title.trim().length < 3) {
      errors.push('Job title must be at least 3 characters');
    } else if (data.title.trim().length > 200) {
      errors.push('Job title must not exceed 200 characters');
    }

    if (!data.description || data.description.trim().length === 0) {
      errors.push('Job description is required');
    } else if (data.description.trim().length < 50) {
      errors.push('Job description must be at least 50 characters');
    }

    if (!data.location) {
      errors.push('Job location is required');
    } else if (!data.location.type) {
      errors.push('Location type is required');
    } else if (!['remote', 'onsite', 'hybrid'].includes(data.location.type)) {
      errors.push('Invalid location type');
    }

    if (!data.type) {
      errors.push('Job type is required');
    } else if (!Object.values(JobType).includes(data.type as JobType)) {
      errors.push('Invalid job type');
    }

    if (!data.requirements) {
      errors.push('Job requirements are required');
    } else {
      if (!data.requirements.skills || data.requirements.skills.length === 0) {
        errors.push('At least one required skill is required');
      }
      if (
        typeof data.requirements.experienceYears !== 'number' ||
        data.requirements.experienceYears < 0
      ) {
        errors.push('Experience years must be a non-negative number');
      }
    }

    if (!data.postedBy) {
      errors.push('Posted by user ID is required');
    }

    if (!data.organizationId) {
      errors.push('Organization ID is required');
    }

    if (data.salaryMin !== undefined && data.salaryMax !== undefined) {
      if (data.salaryMin > data.salaryMax) {
        errors.push('Minimum salary cannot be greater than maximum salary');
      }
      if (data.salaryMin < 0 || data.salaryMax < 0) {
        errors.push('Salary values must be non-negative');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if a status transition is valid
   */
  canTransitionTo(newStatus: JobStatus): boolean {
    const validTransitions = Job.VALID_STATUS_TRANSITIONS[this.status];
    return validTransitions.includes(newStatus);
  }

  /**
   * Transition job to a new status
   */
  transitionTo(newStatus: JobStatus): { success: boolean; errors?: string[] } {
    if (!this.canTransitionTo(newStatus)) {
      return {
        success: false,
        errors: [`Cannot transition from ${this.status} to ${newStatus}`],
      };
    }

    const previousStatus = this.status;
    this.status = newStatus;
    this.updatedAt = new Date();

    // Record timestamps for specific transitions
    if (previousStatus === JobStatus.DRAFT && newStatus === JobStatus.ACTIVE) {
      this.publishedAt = new Date();
    }
    if (newStatus === JobStatus.CLOSED) {
      this.closedAt = new Date();
    }

    return { success: true };
  }

  /**
   * Activate the job (from draft to active)
   */
  activate(): { success: boolean; errors?: string[] } {
    return this.transitionTo(JobStatus.ACTIVE);
  }

  /**
   * Close the job
   */
  close(): { success: boolean; errors?: string[] } {
    return this.transitionTo(JobStatus.CLOSED);
  }

  /**
   * Update job details
   */
  update(
    data: Partial<Omit<CreateJobData, 'id' | 'postedBy' | 'organizationId'>>,
  ): { success: boolean; errors?: string[] } {
    // Cannot update if archived
    if (this.status === JobStatus.ARCHIVED) {
      return {
        success: false,
        errors: ['Cannot update archived job'],
      };
    }

    // Validate the update data
    const validation = Job.validateCreate({
      ...this.toObject(),
      ...data,
    });

    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    // Apply updates
    if (data.title !== undefined) this.title = data.title;
    if (data.description !== undefined) this.description = data.description;
    if (data.department !== undefined) this.department = data.department;
    if (data.location !== undefined) this.location = data.location;
    if (data.type !== undefined) this.type = data.type;
    if (data.requirements !== undefined) this.requirements = data.requirements;
    if (data.salaryMin !== undefined) this.salaryMin = data.salaryMin;
    if (data.salaryMax !== undefined) this.salaryMax = data.salaryMax;
    if (data.currency !== undefined) this.currency = data.currency;
    if (data.benefits !== undefined) this.benefits = data.benefits;
    if (data.deadline !== undefined) this.deadline = data.deadline;

    this.updatedAt = new Date();

    return { success: true };
  }

  /**
   * Check if the job is active
   */
  get isActive(): boolean {
    return this.status === JobStatus.ACTIVE;
  }

  /**
   * Check if the job is closed
   */
  get isClosed(): boolean {
    return (
      this.status === JobStatus.CLOSED || this.status === JobStatus.ARCHIVED
    );
  }

  /**
   * Check if the job has expired
   */
  get isExpired(): boolean {
    if (!this.deadline) return false;
    return new Date() > this.deadline;
  }

  /**
   * Convert job to plain object
   */
  toObject(): CreateJobData {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      department: this.department,
      location: this.location,
      type: this.type,
      requirements: this.requirements,
      salaryMin: this.salaryMin,
      salaryMax: this.salaryMax,
      currency: this.currency,
      benefits: this.benefits,
      postedBy: this.postedBy,
      organizationId: this.organizationId,
      status: this.status,
      deadline: this.deadline,
    };
  }

  /**
   * Generate a unique job ID
   */
  private static generateId(): string {
    return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
