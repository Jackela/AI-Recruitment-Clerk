import type { TestJob } from '../seeds/jobs.seed';

export interface JobCreateOptions {
  title?: string;
  description?: string;
  requirements?: string[];
  status?: 'active' | 'draft' | 'closed' | 'archived';
  location?: string;
  salaryRange?: string;
  department?: string;
  prefix?: string;
}

export class JobFactory {
  private static counter = 0;

  static create(overrides: JobCreateOptions = {}): TestJob {
    const counter = ++this.counter;
    const timestamp = Date.now();
    const prefix = overrides.prefix || '[TEST]';

    return {
      title:
        overrides.title || `${prefix} Job Position ${counter} - ${timestamp}`,
      description:
        overrides.description || 'Auto-generated test job description',
      requirements: overrides.requirements || [
        'JavaScript',
        'Communication',
        'Problem Solving',
      ],
      status: overrides.status || 'active',
      location: overrides.location || 'Remote',
      salaryRange: overrides.salaryRange || '$80,000 - $120,000',
      department: overrides.department || 'Engineering',
    };
  }

  static createMany(
    count: number,
    overrides: JobCreateOptions = {},
  ): TestJob[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createActive(
    overrides: Omit<JobCreateOptions, 'status'> = {},
  ): TestJob {
    return this.create({ ...overrides, status: 'active' });
  }

  static createDraft(
    overrides: Omit<JobCreateOptions, 'status'> = {},
  ): TestJob {
    return this.create({ ...overrides, status: 'draft' });
  }

  static createClosed(
    overrides: Omit<JobCreateOptions, 'status'> = {},
  ): TestJob {
    return this.create({ ...overrides, status: 'closed' });
  }

  static createBatch(count: number, department: string): TestJob[] {
    return Array.from({ length: count }, (_, i) =>
      this.create({
        department,
        title: `[TEST] ${department} Position ${i + 1}`,
      }),
    );
  }

  static resetCounter(): void {
    this.counter = 0;
  }
}
