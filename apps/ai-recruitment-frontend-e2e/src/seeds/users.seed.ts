export interface TestUser {
  email: string;
  password: string;
  role: 'ADMIN' | 'HR' | 'CANDIDATE';
}

export const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'Admin123!',
    role: 'ADMIN' as const,
  },
  hr: {
    email: 'hr@test.com',
    password: 'HR123!',
    role: 'HR' as const,
  },
  candidate: {
    email: 'candidate@test.com',
    password: 'Candidate123!',
    role: 'CANDIDATE' as const,
  },
  hiringManager: {
    email: 'hiring.manager@test.com',
    password: 'Hiring123!',
    role: 'HR' as const,
  },
  recruiter: {
    email: 'recruiter@test.com',
    password: 'Recruiter123!',
    role: 'HR' as const,
  },
};

export const invalidUsers = {
  nonExistent: {
    email: 'nonexistent@test.com',
    password: 'WrongPass123!',
    role: 'CANDIDATE' as const,
  },
  invalidEmail: {
    email: 'invalid-email',
    password: 'Test123!',
    role: 'CANDIDATE' as const,
  },
  weakPassword: {
    email: 'weak@test.com',
    password: '123',
    role: 'CANDIDATE' as const,
  },
  locked: {
    email: 'locked@test.com',
    password: 'Locked123!',
    role: 'CANDIDATE' as const,
  },
};
