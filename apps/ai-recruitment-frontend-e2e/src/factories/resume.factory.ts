import { join } from 'path';
import type { TestResume } from '../seeds/resumes.seed';

export interface ResumeCreateOptions {
  filename?: string;
  candidateName?: string;
  skills?: string[];
  experience?: string;
  education?: string;
  prefix?: string;
}

export class ResumeFactory {
  private static counter = 0;

  static create(overrides: ResumeCreateOptions = {}): TestResume {
    const counter = ++this.counter;
    const timestamp = Date.now();
    const prefix = overrides.prefix || 'test';

    return {
      filename:
        overrides.filename || `${prefix}-${counter}-${timestamp}-resume.pdf`,
      filepath: join(
        __dirname,
        `../fixtures/test-resumes/${overrides.filename || 'default-resume.pdf'}`,
      ),
      candidateName: overrides.candidateName || `Test Candidate ${counter}`,
      skills: overrides.skills || ['JavaScript', 'Communication'],
      experience: overrides.experience || '3 years professional experience',
      education: overrides.education || 'BS Computer Science',
    };
  }

  static createMany(
    count: number,
    overrides: ResumeCreateOptions = {},
  ): TestResume[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createForSkill(
    skill: string,
    overrides: ResumeCreateOptions = {},
  ): TestResume {
    return this.create({
      ...overrides,
      skills: [skill, 'Communication', 'Problem Solving'],
      candidateName: overrides.candidateName || `${skill} Specialist`,
    });
  }

  static createBatchWithSkills(skills: string[]): TestResume[] {
    return skills.map((skill, i) =>
      this.create({
        candidateName: `Candidate ${i + 1} - ${skill}`,
        skills: [skill, 'JavaScript', 'Team Collaboration'],
      }),
    );
  }

  static resetCounter(): void {
    this.counter = 0;
  }
}
