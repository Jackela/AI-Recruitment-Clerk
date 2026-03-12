/**
 * Test Data Types
 */

export interface JobData {
  title: string;
  description?: string;
  department?: string;
  location?: string;
  requirements?: string[];
}

export interface ResumeData {
  filePath: string;
  name: string;
}

export interface UserCredentials {
  email: string;
  password: string;
}

export interface User {
  email: string;
  password: string;
  role: 'hr' | 'candidate' | 'admin' | 'super_admin';
  name?: string;
}

/**
 * Test Data Constants
 */

export const TEST_JOB_DATA: JobData = {
  title: '高级前端工程师',
  description: '职位要求：熟悉主流前端框架，具备良好协作能力。',
};

export const TEST_JOBS: JobData[] = [
  {
    title: '高级前端工程师',
    description: '职位要求：5年以上前端开发经验，熟悉React和Angular',
  },
  {
    title: '后端开发工程师',
    description: '职位要求：3年以上Java开发经验',
  },
  {
    title: '产品经理',
    description: '职位要求：有互联网产品经验',
  },
];

export const TEST_USER: UserCredentials = {
  email: 'test@example.com',
  password: 'Test123456',
};

export const TEST_RESUME_FILES = {
  sample: 'src/test-data/resumes/简历.pdf',
  architect: 'src/test-data/resumes/建筑师简历.pdf',
  pm: 'src/test-data/resumes/简历_PM.pdf',
};

// Extended test data for complex scenarios

export const TEST_USERS: Record<string, User> = {
  hr: {
    email: 'hr@company.com',
    password: 'password123',
    role: 'hr',
    name: 'HR Manager',
  },
  candidate: {
    email: 'candidate@test.com',
    password: 'password123',
    role: 'candidate',
    name: 'John Candidate',
  },
  admin: {
    email: 'admin@company.com',
    password: 'admin123',
    role: 'admin',
    name: 'System Admin',
  },
  superAdmin: {
    email: 'superadmin@company.com',
    password: 'superadmin123',
    role: 'super_admin',
    name: 'Super Administrator',
  },
};

export const SAMPLE_RESUMES: Record<string, string> = {
  seniorDeveloper: 'src/test-data/resumes/简历.pdf',
  juniorDeveloper: 'src/test-data/resumes/简历2.pdf',
  backend: 'src/test-data/resumes/符天奇-简历.pdf',
  fullStackDeveloper: 'src/test-data/resumes/孔维轩简历.pdf',
  projectManager: 'src/test-data/resumes/简历_PM.pdf',
  architect: 'src/test-data/resumes/建筑师简历.pdf',
  designer: 'src/test-data/resumes/李世熙简历.pdf',
  threeDArtist: 'src/test-data/resumes/3D场景简历.pdf',
  largeFile: 'src/test-data/resumes/multi-page-resume.pdf',
  imageOnly: 'src/test-data/resumes/image-only-resume.pdf',
  sunResume: 'src/test-data/resumes/SUN.pdf',
  fuResume: 'src/test-data/resumes/符天奇-简历.pdf',
  kongModified: 'src/test-data/resumes/孔维轩_简历_改.pdf',
};

export const SAMPLE_JOBS: Record<string, JobData> = {
  frontend: {
    title: 'Senior Frontend Developer',
    description: `We are looking for a Senior Frontend Developer to join our team.
    
Requirements:
- 5+ years of experience with React, TypeScript
- Strong understanding of modern JavaScript (ES6+)
- Experience with state management (Redux, MobX, or Zustand)
- Familiarity with CSS-in-JS, Tailwind CSS
- Experience with testing frameworks (Jest, React Testing Library)
- Knowledge of CI/CD pipelines and build tools`,
    department: 'Engineering',
    location: 'Remote',
    requirements: ['React', 'TypeScript', 'JavaScript', 'CSS', 'Testing'],
  },
  backend: {
    title: 'Backend Developer',
    description: `Join our backend team to build scalable APIs and services.
    
Requirements:
- 3+ years of experience with Node.js, Python, or Go
- Experience with SQL and NoSQL databases
- Understanding of microservices architecture
- Knowledge of Docker and Kubernetes
- Familiarity with message queues (RabbitMQ, Kafka)`,
    department: 'Engineering',
    location: 'New York',
    requirements: ['Node.js', 'Python', 'PostgreSQL', 'MongoDB', 'Docker'],
  },
  fullstack: {
    title: 'Full Stack Developer',
    description: `Looking for a versatile full stack developer.
    
Requirements:
- Experience with both frontend and backend technologies
- Proficiency in React/Vue and Node.js
- Database design and optimization skills
- DevOps knowledge is a plus`,
    department: 'Engineering',
    location: 'Hybrid',
    requirements: ['React', 'Node.js', 'Full Stack', 'Database'],
  },
  devops: {
    title: 'DevOps Engineer',
    description: `Help us build and maintain our infrastructure.
    
Requirements:
- 4+ years of DevOps experience
- Expert in AWS/Azure/GCP
- Infrastructure as Code (Terraform, CloudFormation)
- CI/CD pipeline development
- Monitoring and observability (Datadog, Grafana)`,
    department: 'Operations',
    location: 'Remote',
    requirements: ['AWS', 'Terraform', 'Docker', 'Kubernetes', 'CI/CD'],
  },
  productManager: {
    title: 'Product Manager',
    description: `Lead product development and strategy.
    
Requirements:
- 5+ years of product management experience
- Strong analytical and communication skills
- Experience with agile methodologies
- Technical background preferred
- Data-driven decision making`,
    department: 'Product',
    location: 'San Francisco',
    requirements: ['Product Management', 'Agile', 'Analytics', 'Communication'],
  },
};

export const SAMPLE_CANDIDATES = [
  {
    email: 'candidate1@test.com',
    name: 'Alice Johnson',
    resume: SAMPLE_RESUMES.seniorDeveloper,
    skills: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
  },
  {
    email: 'candidate2@test.com',
    name: 'Bob Smith',
    resume: SAMPLE_RESUMES.backend,
    skills: ['Python', 'Django', 'PostgreSQL', 'Docker'],
  },
  {
    email: 'candidate3@test.com',
    name: 'Carol White',
    resume: SAMPLE_RESUMES.fullStackDeveloper,
    skills: ['Vue.js', 'Node.js', 'MongoDB', 'AWS'],
  },
  {
    email: 'candidate4@test.com',
    name: 'David Brown',
    resume: SAMPLE_RESUMES.projectManager,
    skills: ['Project Management', 'Agile', 'Scrum', 'JIRA'],
  },
  {
    email: 'candidate5@test.com',
    name: 'Emma Davis',
    resume: SAMPLE_RESUMES.architect,
    skills: ['System Design', 'Microservices', 'AWS', 'Kubernetes'],
  },
];

export const TEST_CONFIG = {
  timeouts: {
    short: 5000,
    medium: 15000,
    long: 30000,
    extended: 60000,
    veryLong: 120000,
  },
  thresholds: {
    minMatchScore: 50,
    maxMatchScore: 100,
    acceptableLoadTime: 3000,
    maxUploadSize: 10 * 1024 * 1024,
  },
  retryOptions: {
    retries: 3,
    delay: 1000,
  },
};

export const ERROR_MESSAGES = {
  unauthorized: 'You are not authorized to access this resource',
  sessionExpired: 'Your session has expired. Please log in again.',
  networkError: 'Network error. Please check your connection and try again.',
  uploadFailed: 'Failed to upload file. Please try again.',
  invalidCredentials: 'Invalid email or password',
  fileTooLarge: 'File size exceeds the maximum limit',
  invalidFileType: 'Invalid file type. Please upload a PDF file.',
};

export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    me: '/api/auth/me',
  },
  jobs: {
    list: '/api/jobs',
    create: '/api/jobs',
    update: (id: string) => `/api/jobs/${id}`,
    delete: (id: string) => `/api/jobs/${id}`,
    bulkDelete: '/api/jobs/bulk-delete',
  },
  resumes: {
    upload: '/api/resumes/upload',
    list: '/api/resumes',
    get: (id: string) => `/api/resumes/${id}`,
    delete: (id: string) => `/api/resumes/${id}`,
  },
  analysis: {
    start: '/api/analysis',
    results: '/api/analysis/results',
    bulk: '/api/analysis/bulk',
    export: '/api/analysis/export',
  },
  reports: {
    generate: '/api/reports/generate',
    download: (id: string) => `/api/reports/${id}/download`,
  },
};
