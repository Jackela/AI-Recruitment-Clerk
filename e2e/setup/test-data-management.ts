/**
 * Test Data Management System for E2E Tests
 * 
 * Provides:
 * - Test user creation and cleanup
 * - Sample resume generation
 * - Job posting templates
 * - Database state management
 * - Environment-specific data
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

export interface TestUser {
  id?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'hr_manager' | 'recruiter' | 'guest';
  organization?: string;
  permissions: string[];
  createdAt: Date;
}

export interface TestJob {
  id?: string;
  title: string;
  department: string;
  description: string;
  requirements: string[];
  skills: string[];
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  priority: 'high' | 'medium' | 'low';
  status: 'draft' | 'published' | 'closed';
  createdBy: string;
  createdAt: Date;
}

export interface TestResume {
  fileName: string;
  candidateName: string;
  candidateEmail: string;
  expectedScore: number;
  skills: string[];
  experience: number;
  education: string;
  quality: 'excellent' | 'good' | 'average' | 'poor';
}

class TestDataManager {
  private testDataDir: string;
  private resumesDir: string;
  private users: Map<string, TestUser> = new Map();
  private jobs: Map<string, TestJob> = new Map();
  private resumes: Map<string, TestResume> = new Map();

  constructor() {
    this.testDataDir = path.join(__dirname, '../test-data');
    this.resumesDir = path.join(this.testDataDir, 'resumes');
    this.ensureDirectories();
    this.loadTestData();
  }

  private ensureDirectories() {
    if (!existsSync(this.testDataDir)) {
      mkdirSync(this.testDataDir, { recursive: true });
    }
    if (!existsSync(this.resumesDir)) {
      mkdirSync(this.resumesDir, { recursive: true });
    }
  }

  private loadTestData() {
    this.createTestUsers();
    this.createTestJobs();
    this.createTestResumes();
  }

  private createTestUsers() {
    const users: TestUser[] = [
      {
        email: 'admin@ai-recruitment.com',
        password: 'Admin123!@#',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        permissions: ['*'],
        createdAt: new Date()
      },
      {
        email: 'hr.manager@test.com',
        password: 'HRManager123!',
        firstName: 'HR',
        lastName: 'Manager',
        role: 'hr_manager',
        organization: 'Test Company',
        permissions: ['read_jobs', 'create_jobs', 'read_applications', 'manage_applications'],
        createdAt: new Date()
      },
      {
        email: 'recruiter@test.com',
        password: 'Recruiter123!',
        firstName: 'Test',
        lastName: 'Recruiter',
        role: 'recruiter',
        organization: 'Test Company',
        permissions: ['read_jobs', 'read_applications', 'review_applications'],
        createdAt: new Date()
      },
      {
        email: 'mobile.user@test.com',
        password: 'Mobile123!',
        firstName: 'Mobile',
        lastName: 'User',
        role: 'hr_manager',
        organization: 'Mobile Company',
        permissions: ['read_jobs', 'create_jobs', 'read_applications'],
        createdAt: new Date()
      }
    ];

    users.forEach(user => {
      user.id = this.generateId();
      this.users.set(user.email, user);
    });
  }

  private createTestJobs() {
    const jobs: TestJob[] = [
      {
        title: 'Senior Full Stack Developer',
        department: 'Engineering',
        description: 'We are looking for an experienced full stack developer to join our growing team.',
        requirements: [
          '5+ years of experience in web development',
          'Proficiency in React, Node.js, and TypeScript',
          'Experience with cloud platforms (AWS/GCP)',
          'Strong problem-solving skills'
        ],
        skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'MongoDB'],
        salary: { min: 80000, max: 120000, currency: 'USD' },
        location: 'Remote/Hybrid',
        type: 'full-time',
        priority: 'high',
        status: 'published',
        createdBy: 'hr.manager@test.com',
        createdAt: new Date()
      },
      {
        title: 'Product Manager',
        department: 'Product',
        description: 'Strategic product manager to drive product vision and roadmap.',
        requirements: [
          '4+ years of product management experience',
          'Experience with agile methodologies',
          'Strong analytical and strategic thinking',
          'Stakeholder management experience'
        ],
        skills: ['Product Strategy', 'Agile', 'Analytics', 'Leadership'],
        salary: { min: 90000, max: 130000, currency: 'USD' },
        location: 'San Francisco, CA',
        type: 'full-time',
        priority: 'high',
        status: 'published',
        createdBy: 'hr.manager@test.com',
        createdAt: new Date()
      },
      {
        title: 'UX Designer',
        department: 'Design',
        description: 'Creative UX designer to enhance user experience across our products.',
        requirements: [
          '3+ years of UX design experience',
          'Proficiency in Figma, Sketch, or Adobe XD',
          'User research and testing experience',
          'Portfolio demonstrating design thinking'
        ],
        skills: ['UX Design', 'Figma', 'User Research', 'Prototyping'],
        salary: { min: 70000, max: 100000, currency: 'USD' },
        location: 'New York, NY',
        type: 'full-time',
        priority: 'medium',
        status: 'published',
        createdBy: 'hr.manager@test.com',
        createdAt: new Date()
      }
    ];

    jobs.forEach(job => {
      job.id = this.generateId();
      this.jobs.set(job.id, job);
    });
  }

  private createTestResumes() {
    const resumes: TestResume[] = [
      {
        fileName: 'excellent-developer-resume.pdf',
        candidateName: 'Alice Johnson',
        candidateEmail: 'alice.johnson@email.com',
        expectedScore: 95,
        skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'PostgreSQL', 'Docker'],
        experience: 7,
        education: 'M.S. Computer Science',
        quality: 'excellent'
      },
      {
        fileName: 'good-developer-resume.pdf',
        candidateName: 'Bob Smith',
        candidateEmail: 'bob.smith@email.com',
        expectedScore: 82,
        skills: ['React', 'JavaScript', 'Node.js', 'MongoDB'],
        experience: 4,
        education: 'B.S. Computer Science',
        quality: 'good'
      },
      {
        fileName: 'average-developer-resume.pdf',
        candidateName: 'Carol Davis',
        candidateEmail: 'carol.davis@email.com',
        expectedScore: 65,
        skills: ['HTML', 'CSS', 'JavaScript', 'React'],
        experience: 2,
        education: 'B.S. Information Technology',
        quality: 'average'
      },
      {
        fileName: 'poor-match-resume.pdf',
        candidateName: 'David Wilson',
        candidateEmail: 'david.wilson@email.com',
        expectedScore: 30,
        skills: ['PHP', 'WordPress', 'MySQL'],
        experience: 1,
        education: 'Associate Degree',
        quality: 'poor'
      },
      {
        fileName: 'excellent-sales-resume.pdf',
        candidateName: 'Emma Thompson',
        candidateEmail: 'emma.thompson@email.com',
        expectedScore: 88,
        skills: ['Sales Management', 'CRM', 'Salesforce', 'Team Leadership'],
        experience: 6,
        education: 'MBA',
        quality: 'excellent'
      },
      {
        fileName: 'good-sales-resume.pdf',
        candidateName: 'Frank Miller',
        candidateEmail: 'frank.miller@email.com',
        expectedScore: 75,
        skills: ['Sales', 'Customer Relations', 'HubSpot'],
        experience: 3,
        education: 'B.A. Business Administration',
        quality: 'good'
      }
    ];

    resumes.forEach(resume => {
      this.resumes.set(resume.fileName, resume);
    });

    // Generate actual PDF files for testing
    this.generateResumeFiles();
  }

  private generateResumeFiles() {
    this.resumes.forEach((resume, fileName) => {
      const resumePath = path.join(this.resumesDir, fileName);
      
      if (!existsSync(resumePath)) {
        // Generate a simple PDF-like content for testing
        const content = this.generateResumeContent(resume);
        writeFileSync(resumePath, content);
      }
    });

    // Create corrupted file for error testing
    const corruptedPath = path.join(this.resumesDir, 'corrupted-file.pdf');
    if (!existsSync(corruptedPath)) {
      writeFileSync(corruptedPath, 'This is not a valid PDF file content');
    }

    // Create oversized file for testing
    const oversizedPath = path.join(this.resumesDir, 'oversized-resume.pdf');
    if (!existsSync(oversizedPath)) {
      const largeContent = 'Large file content '.repeat(100000); // ~1.5MB
      writeFileSync(oversizedPath, largeContent);
    }
  }

  private generateResumeContent(resume: TestResume): string {
    return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj

4 0 obj
<< /Length 200 >>
stream
BT
/F1 12 Tf
50 750 Td
(${resume.candidateName}) Tj
0 -20 Td
(Email: ${resume.candidateEmail}) Tj
0 -20 Td
(Experience: ${resume.experience} years) Tj
0 -20 Td
(Education: ${resume.education}) Tj
0 -20 Td
(Skills: ${resume.skills.join(', ')}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
454
%%EOF`;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Public API methods
  getUser(email: string): TestUser | undefined {
    return this.users.get(email);
  }

  getAllUsers(): TestUser[] {
    return Array.from(this.users.values());
  }

  getUsersByRole(role: TestUser['role']): TestUser[] {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }

  getJob(id: string): TestJob | undefined {
    return this.jobs.get(id);
  }

  getAllJobs(): TestJob[] {
    return Array.from(this.jobs.values());
  }

  getJobsByStatus(status: TestJob['status']): TestJob[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }

  getResume(fileName: string): TestResume | undefined {
    return this.resumes.get(fileName);
  }

  getAllResumes(): TestResume[] {
    return Array.from(this.resumes.values());
  }

  getResumesByQuality(quality: TestResume['quality']): TestResume[] {
    return Array.from(this.resumes.values()).filter(resume => resume.quality === quality);
  }

  getResumePath(fileName: string): string {
    return path.join(this.resumesDir, fileName);
  }

  // Database integration methods (for API testing)
  async seedDatabase(): Promise<void> {
    console.log('Seeding test database...');
    
    // In a real implementation, this would:
    // 1. Connect to test database
    // 2. Clear existing test data
    // 3. Insert test users, jobs, etc.
    // 4. Set up proper relationships
    
    // Mock implementation
    await this.delay(1000);
    console.log('Database seeded successfully');
  }

  async cleanupDatabase(): Promise<void> {
    console.log('Cleaning up test database...');
    
    // In a real implementation, this would:
    // 1. Remove all test data
    // 2. Reset sequences/counters
    // 3. Clean up file uploads
    
    await this.delay(500);
    console.log('Database cleaned up successfully');
  }

  async createTestUser(userData: Partial<TestUser>): Promise<TestUser> {
    const user: TestUser = {
      id: this.generateId(),
      email: userData.email || `test-${Date.now()}@example.com`,
      password: userData.password || 'TestPass123!',
      firstName: userData.firstName || 'Test',
      lastName: userData.lastName || 'User',
      role: userData.role || 'recruiter',
      organization: userData.organization || 'Test Organization',
      permissions: userData.permissions || ['read_jobs'],
      createdAt: new Date()
    };

    this.users.set(user.email, user);
    
    // In real implementation, save to database via API
    console.log(`Created test user: ${user.email}`);
    
    return user;
  }

  async deleteTestUser(email: string): Promise<void> {
    this.users.delete(email);
    
    // In real implementation, delete from database via API
    console.log(`Deleted test user: ${email}`);
  }

  // Utility methods
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Environment-specific configurations
  getEnvironmentConfig() {
    const env = process.env.NODE_ENV || 'test';
    
    const configs = {
      test: {
        baseUrl: 'http://localhost:4200',
        apiUrl: 'http://localhost:8080',
        websocketUrl: 'ws://localhost:3001',
        cleanupAfterTests: true
      },
      staging: {
        baseUrl: 'https://staging.ai-recruitment.com',
        apiUrl: 'https://api-staging.ai-recruitment.com',
        websocketUrl: 'wss://ws-staging.ai-recruitment.com',
        cleanupAfterTests: true
      },
      production: {
        baseUrl: 'https://ai-recruitment.com',
        apiUrl: 'https://api.ai-recruitment.com',
        websocketUrl: 'wss://ws.ai-recruitment.com',
        cleanupAfterTests: false // Never cleanup production data
      }
    };

    return configs[env as keyof typeof configs] || configs.test;
  }

  // Export data for external use
  exportTestData() {
    return {
      users: Array.from(this.users.values()),
      jobs: Array.from(this.jobs.values()),
      resumes: Array.from(this.resumes.values()),
      metadata: {
        generatedAt: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'test',
        version: '1.0.0'
      }
    };
  }

  // Import data from external source
  importTestData(data: any) {
    if (data.users) {
      data.users.forEach((user: TestUser) => {
        this.users.set(user.email, user);
      });
    }

    if (data.jobs) {
      data.jobs.forEach((job: TestJob) => {
        this.jobs.set(job.id!, job);
      });
    }

    if (data.resumes) {
      data.resumes.forEach((resume: TestResume) => {
        this.resumes.set(resume.fileName, resume);
      });
    }

    console.log('Test data imported successfully');
  }
}

// Singleton instance
export const testDataManager = new TestDataManager();

// Export for use in tests
export default testDataManager;