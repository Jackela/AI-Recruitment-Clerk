/**
 * Simple validation script to test field mapper functionality
 */
import { SkillsTaxonomy } from '@ai-recruitment-clerk/candidate-scoring-domain';
import { DateParser } from './date-parser';
import { ExperienceCalculator } from './experience-calculator';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';

// Test Skills Taxonomy
console.log('=== Testing Skills Taxonomy ===');
console.log(
  'JavaScript normalization:',
  SkillsTaxonomy.normalizeSkill('javascript'),
);
console.log('React normalization:', SkillsTaxonomy.normalizeSkill('reactjs'));
console.log('Node.js normalization:', SkillsTaxonomy.normalizeSkill('nodejs'));

const skillScore = SkillsTaxonomy.calculateSkillScore([
  'JavaScript',
  'Python',
  'React',
  'Node.js',
]);
console.log('Skill score for JS, Python, React, Node.js:', skillScore);

const relatedSkills = SkillsTaxonomy.getRelatedSkills('JavaScript');
console.log('Related skills for JavaScript:', relatedSkills.slice(0, 3));

// Test Date Parser
console.log('\n=== Testing Date Parser ===');
const parsedDate = DateParser.parseDate('2020-01-15');
console.log(
  'Parsed 2020-01-15:',
  parsedDate.date?.toISOString(),
  'Confidence:',
  parsedDate.confidence,
);

const presentDate = DateParser.parseDate('present');
console.log('Parsed present:', presentDate.isPresent);

const normalizedDate = DateParser.normalizeToISO('01/15/2020');
console.log('Normalized 01/15/2020 to ISO:', normalizedDate);

// Test Experience Calculator
console.log('\n=== Testing Experience Calculator ===');
const mockWorkExperience: ResumeDTO['workExperience'] = [
  {
    company: 'Tech Corp',
    position: 'Senior Software Engineer',
    startDate: '2020-01-01',
    endDate: '2023-01-01',
    summary: 'Led development of web applications using React and Node.js',
  },
  {
    company: 'StartupXYZ',
    position: 'Junior Developer',
    startDate: '2018-06-01',
    endDate: '2019-12-01',
    summary: 'Developed mobile applications',
  },
];

const experienceAnalysis = ExperienceCalculator.analyzeExperience(
  mockWorkExperience,
  ['React', 'Node.js'],
);
console.log('Total experience years:', experienceAnalysis.totalExperienceYears);
console.log(
  'Relevant experience years:',
  experienceAnalysis.relevantExperienceYears,
);
console.log('Seniority level:', experienceAnalysis.seniorityLevel);
console.log('Confidence score:', experienceAnalysis.confidenceScore);

const experienceSummary =
  ExperienceCalculator.getExperienceSummary(experienceAnalysis);
console.log('Experience summary:', experienceSummary);

console.log('\n=== All tests completed successfully! ===');
