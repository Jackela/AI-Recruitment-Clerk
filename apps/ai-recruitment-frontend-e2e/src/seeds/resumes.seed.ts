import { join } from 'path';

export interface TestResume {
  filename: string;
  filepath: string;
  candidateName: string;
  skills: string[];
  experience: string;
  education: string;
}

export const testResumes: TestResume[] = [
  {
    filename: 'john-doe-resume.pdf',
    filepath: join(__dirname, '../fixtures/test-resumes/john-doe-resume.pdf'),
    candidateName: 'John Doe',
    skills: ['JavaScript', 'Python', 'React', 'Node.js', 'PostgreSQL'],
    experience: '5 years full-stack development',
    education: 'BS Computer Science, MIT',
  },
  {
    filename: 'jane-smith-resume.pdf',
    filepath: join(__dirname, '../fixtures/test-resumes/jane-smith-resume.pdf'),
    candidateName: 'Jane Smith',
    skills: ['Angular', 'TypeScript', 'AWS', 'Docker', 'Kubernetes'],
    experience: '7 years frontend and DevOps',
    education: 'MS Software Engineering, Stanford',
  },
  {
    filename: 'mike-johnson-resume.pdf',
    filepath: join(
      __dirname,
      '../fixtures/test-resumes/mike-johnson-resume.pdf',
    ),
    candidateName: 'Mike Johnson',
    skills: ['Java', 'Spring Boot', 'MySQL', 'Microservices', 'Redis'],
    experience: '6 years backend development',
    education: 'BS Information Systems, Berkeley',
  },
  {
    filename: 'sarah-chen-resume.pdf',
    filepath: join(__dirname, '../fixtures/test-resumes/sarah-chen-resume.pdf'),
    candidateName: 'Sarah Chen',
    skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL', 'Data Science'],
    experience: '4 years data science and ML',
    education: 'PhD Machine Learning, CMU',
  },
  {
    filename: 'alex-williams-resume.pdf',
    filepath: join(
      __dirname,
      '../fixtures/test-resumes/alex-williams-resume.pdf',
    ),
    candidateName: 'Alex Williams',
    skills: ['React', 'Vue.js', 'Sass', 'Webpack', 'UI/UX Design'],
    experience: '3 years frontend development',
    education: 'BA Digital Design, RISD',
  },
];

export const invalidResumes = {
  corrupted: {
    filename: 'corrupted.pdf',
    filepath: join(__dirname, '../fixtures/test-resumes/corrupted.pdf'),
    candidateName: 'Corrupted File',
    skills: [],
    experience: '',
    education: '',
  },
  largeFile: {
    filename: 'large-file.pdf',
    filepath: join(__dirname, '../fixtures/test-resumes/large-file.pdf'),
    candidateName: 'Large File Test',
    skills: [],
    experience: 'Test file over size limit',
    education: '',
  },
  wrongFormat: {
    filename: 'not-a-pdf.txt',
    filepath: join(__dirname, '../fixtures/test-resumes/not-a-pdf.txt'),
    candidateName: 'Wrong Format',
    skills: [],
    experience: 'Test non-PDF format',
    education: '',
  },
};
