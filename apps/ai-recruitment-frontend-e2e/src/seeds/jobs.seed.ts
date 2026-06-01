export interface TestJob {
  title: string;
  description: string;
  requirements: string[];
  status: 'active' | 'draft' | 'closed' | 'archived';
  location?: string;
  salaryRange?: string;
  department?: string;
}

export const testJobs: TestJob[] = [
  {
    title: '[TEST] Software Engineer',
    description:
      'Full-stack development position working with modern technologies',
    requirements: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
    status: 'active',
    location: 'Remote',
    salaryRange: '$80,000 - $120,000',
    department: 'Engineering',
  },
  {
    title: '[TEST] Senior Backend Developer',
    description: 'Design and implement scalable backend services',
    requirements: ['Node.js', 'Python', 'MongoDB', 'AWS', 'Microservices'],
    status: 'active',
    location: 'New York, NY',
    salaryRange: '$120,000 - $160,000',
    department: 'Engineering',
  },
  {
    title: '[TEST] DevOps Engineer',
    description: 'Manage CI/CD pipelines and cloud infrastructure',
    requirements: ['Docker', 'Kubernetes', 'Terraform', 'AWS', 'Jenkins'],
    status: 'active',
    location: 'San Francisco, CA',
    salaryRange: '$130,000 - $170,000',
    department: 'Infrastructure',
  },
  {
    title: '[TEST] Frontend Developer',
    description: 'Build responsive and accessible user interfaces',
    requirements: ['Angular', 'TypeScript', 'CSS', 'HTML5', 'RxJS'],
    status: 'draft',
    location: 'Remote',
    salaryRange: '$90,000 - $130,000',
    department: 'Engineering',
  },
  {
    title: '[TEST] Data Scientist',
    description: 'Analyze hiring data and build predictive models',
    requirements: [
      'Python',
      'Machine Learning',
      'SQL',
      'Pandas',
      'scikit-learn',
    ],
    status: 'active',
    location: 'Austin, TX',
    salaryRange: '$110,000 - $150,000',
    department: 'Data',
  },
  {
    title: '[TEST] HR Manager',
    description: 'Oversee recruitment and talent acquisition processes',
    requirements: ['HRIS', 'Talent Acquisition', 'Leadership', 'Communication'],
    status: 'closed',
    location: 'Chicago, IL',
    salaryRange: '$90,000 - $120,000',
    department: 'Human Resources',
  },
];

export const jobTemplates = {
  engineering: {
    department: 'Engineering',
    requirements: ['Git', 'Agile', 'Problem Solving'],
  },
  design: {
    department: 'Design',
    requirements: ['Figma', 'Adobe XD', 'UI/UX'],
  },
  marketing: {
    department: 'Marketing',
    requirements: ['SEO', 'Analytics', 'Content Strategy'],
  },
};
