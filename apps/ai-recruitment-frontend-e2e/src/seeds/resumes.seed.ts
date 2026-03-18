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
    filename: 'test-resume.pdf',
    filepath: join(__dirname, '../test-data/resumes/test-resume.pdf'),
    candidateName: 'Test Candidate',
    skills: ['JavaScript', 'Python', 'React', 'Node.js', 'PostgreSQL'],
    experience: '5 years full-stack development',
    education: 'BS Computer Science',
  },
  {
    filename: 'SUN.pdf',
    filepath: join(__dirname, '../test-data/resumes/SUN.pdf'),
    candidateName: 'Sun Candidate',
    skills: ['Angular', 'TypeScript', 'AWS', 'Docker', 'Kubernetes'],
    experience: '7 years frontend and DevOps',
    education: 'MS Software Engineering',
  },
  {
    filename: 'image-only-resume.pdf',
    filepath: join(__dirname, '../test-data/resumes/image-only-resume.pdf'),
    candidateName: 'Image Only',
    skills: ['Java', 'Spring Boot', 'MySQL', 'Microservices', 'Redis'],
    experience: '6 years backend development',
    education: 'BS Information Systems',
  },
  {
    filename: '简历_PM.pdf',
    filepath: join(__dirname, '../test-data/resumes/简历_PM.pdf'),
    candidateName: 'PM Candidate',
    skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL', 'Data Science'],
    experience: '4 years data science and ML',
    education: 'PhD Machine Learning',
  },
  {
    filename: 'multi-page-resume.pdf',
    filepath: join(__dirname, '../test-data/resumes/multi-page-resume.pdf'),
    candidateName: 'Multi Page',
    skills: ['React', 'Vue.js', 'Sass', 'Webpack', 'UI/UX Design'],
    experience: '3 years frontend development',
    education: 'BA Digital Design',
  },
];

export const invalidResumes = {
  corrupted: {
    filename: '3D场景简历.pdf',
    filepath: join(__dirname, '../test-data/resumes/3D场景简历.pdf'),
    candidateName: 'Corrupted File',
    skills: [],
    experience: '',
    education: '',
  },
  largeFile: {
    filename: '李世熙简历.pdf',
    filepath: join(__dirname, '../test-data/resumes/李世熙简历.pdf'),
    candidateName: 'Large File Test',
    skills: [],
    experience: 'Test file over size limit',
    education: '',
  },
  wrongFormat: {
    filename: '简历.pdf',
    filepath: join(__dirname, '../test-data/resumes/简历.pdf'),
    candidateName: 'Wrong Format',
    skills: [],
    experience: 'Test non-PDF format',
    education: '',
  },
};
