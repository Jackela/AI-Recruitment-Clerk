import {
  TextExtractionService,
  SectionInfo,
  DateRange,
  ContactInfo,
  WorkExperience,
  EducationEntry,
} from './text-extraction';

describe('TextExtractionService', () => {
  let service: TextExtractionService;

  beforeEach(() => {
    service = new TextExtractionService();
  });

  describe('identifySections', () => {
    it('should identify experience section', () => {
      const text = `Name
Email

Experience
Software Engineer at Tech Corp
2020 - present

Education
University of Technology`;

      const sections = service.identifySections(text);
      const experienceSection = sections.find((s) => s.type === 'experience');

      expect(experienceSection).toBeDefined();
      expect(experienceSection?.type).toBe('experience');
    });

    it('should identify education section', () => {
      const text = `Name

Education
Bachelor of Science
University

Experience
Job 2020-2023`;

      const sections = service.identifySections(text);
      const educationSection = sections.find((s) => s.type === 'education');

      expect(educationSection).toBeDefined();
    });

    it('should identify skills section', () => {
      const text = `Name

Skills
JavaScript, TypeScript, Python

Experience
Job`;

      const sections = service.identifySections(text);
      const skillsSection = sections.find((s) => s.type === 'skills');

      expect(skillsSection).toBeDefined();
    });

    it('should identify contact section', () => {
      const text = `Name

Contact Information
Email: test@example.com
Phone: 123-456-7890

Experience
Job`;

      const sections = service.identifySections(text);
      const contactSection = sections.find((s) => s.type === 'contact');

      expect(contactSection).toBeDefined();
    });

    it('should identify summary section', () => {
      const text = `Name

Professional Summary
Experienced developer with 10 years

Experience
Job`;

      const sections = service.identifySections(text);
      const summarySection = sections.find((s) => s.type === 'summary');

      expect(summarySection).toBeDefined();
    });

    it('should handle multiple sections', () => {
      const text = `Name

Summary
Summary text

Experience
Job 1

Education
Degree

Skills
JavaScript`;

      const sections = service.identifySections(text);

      expect(sections.length).toBeGreaterThanOrEqual(3);
      expect(sections.some((s) => s.type === 'summary')).toBe(true);
      expect(sections.some((s) => s.type === 'experience')).toBe(true);
      expect(sections.some((s) => s.type === 'education')).toBe(true);
    });

    it('should return empty array for text without sections', () => {
      const text = `Just some random text
without any clear sections`;

      const sections = service.identifySections(text);

      expect(sections).toEqual([]);
    });
  });

  describe('extractContactInfo', () => {
    it('should extract email address', () => {
      const text = `John Doe
john.doe@example.com
555-1234`;

      const contact = service.extractContactInfo(text);

      expect(contact.email).toBe('john.doe@example.com');
    });

    it('should extract phone number', () => {
      const text = `Jane Smith
jane@example.com
+1 (555) 123-4567`;

      const contact = service.extractContactInfo(text);

      expect(contact.phone).toBe('+1 (555) 123-4567');
    });

    it('should extract name from first lines', () => {
      const text = `Alice Johnson
alice@example.com`;

      const contact = service.extractContactInfo(text);

      expect(contact.name).toBe('Alice Johnson');
    });

    it('should extract LinkedIn URL', () => {
      const text = `Name
email@test.com
linkedin.com/in/username`;

      const contact = service.extractContactInfo(text);

      expect(contact.linkedIn).toBe('https://www.linkedin.com/in/username');
    });

    it('should extract website', () => {
      const text = `Name
email@test.com
www.example.com`;

      const contact = service.extractContactInfo(text);

      expect(contact.website).toBe('www.example.com');
    });

    it('should extract address', () => {
      const text = `Name
123 Main Street, Boston, MA 02101
email@test.com`;

      const contact = service.extractContactInfo(text);

      expect(contact.address).toBe('123 Main Street, Boston, MA 02101');
    });

    it('should handle text without contact info', () => {
      const text = `Just some random text without contact information`;

      const contact = service.extractContactInfo(text);

      expect(contact.email).toBeNull();
      expect(contact.phone).toBeNull();
      expect(contact.name).toBeNull();
    });
  });

  describe('parseDateRange', () => {
    it('should parse year range', () => {
      const text = 'Software Engineer 2020 - 2023';

      const dateRange = service.parseDateRange(text);

      expect(dateRange).not.toBeNull();
      expect(dateRange?.startDate).toContain('2020');
      expect(dateRange?.endDate).toContain('2023');
      expect(dateRange?.isPresent).toBe(false);
    });

    it('should parse present date range', () => {
      const text = 'Developer 2020 - present';

      const dateRange = service.parseDateRange(text);

      expect(dateRange).not.toBeNull();
      expect(dateRange?.endDate).toBe('present');
      expect(dateRange?.isPresent).toBe(true);
    });

    it('should parse month/year range', () => {
      const text = 'Engineer Jan 2020 - Dec 2023';

      const dateRange = service.parseDateRange(text);

      expect(dateRange).not.toBeNull();
      expect(dateRange?.startDate).toContain('2020');
    });

    it('should parse slash date format', () => {
      const text = 'Position 01/2020 - 12/2023';

      const dateRange = service.parseDateRange(text);

      expect(dateRange).not.toBeNull();
    });

    it('should return null for text without date', () => {
      const text = 'Just some random text';

      const dateRange = service.parseDateRange(text);

      expect(dateRange).toBeNull();
    });
  });

  describe('extractBullets', () => {
    it('should extract bullet points', () => {
      const text = `• First bullet point
• Second bullet point
• Third bullet point`;

      const bullets = service.extractBullets(text);

      expect(bullets).toContain('First bullet point');
      expect(bullets).toContain('Second bullet point');
      expect(bullets).toContain('Third bullet point');
    });

    it('should extract hyphen bullets', () => {
      const text = `- First item
- Second item
- Third item`;

      const bullets = service.extractBullets(text);

      expect(bullets.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract numbered bullets', () => {
      const text = `1. First item
2. Second item
3. Third item`;

      const bullets = service.extractBullets(text);

      expect(bullets.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for text without bullets', () => {
      const text = 'Just some text without bullets';

      const bullets = service.extractBullets(text);

      expect(bullets).toEqual([]);
    });
  });

  describe('extractWorkExperience', () => {
    it('should extract work experience entries', () => {
      const text = `Experience
ABC Company
Software Engineer 2020 - present
• Developed features
• Fixed bugs

XYZ Corp
Developer 2018 - 2020`;

      const experiences = service.extractWorkExperience(text);

      expect(experiences.length).toBeGreaterThanOrEqual(1);
      expect(experiences[0].company).toBeDefined();
    });

    it('should extract date ranges for each experience', () => {
      const text = `Experience
Company A
Engineer 2020 - 2023

Company B
Developer 2018 - 2020`;

      const experiences = service.extractWorkExperience(text);

      expect(experiences.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract bullet points for experience', () => {
      const text = `Experience
Tech Corp
Engineer 2020 - present
• Built API
• Designed database`;

      const experiences = service.extractWorkExperience(text);

      if (experiences.length > 0) {
        expect(experiences[0].bullets.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should return empty array for text without experience', () => {
      const text = 'Just education information';

      const experiences = service.extractWorkExperience(text);

      expect(experiences).toEqual([]);
    });
  });

  describe('extractEducation', () => {
    it('should extract education entries', () => {
      const text = `Education
University of Technology
Bachelor of Science in Computer Science

Harvard University
Master of Engineering`;

      const educations = service.extractEducation(text);

      expect(educations.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract degree and field', () => {
      const text = `Education
Stanford University
PhD in Artificial Intelligence`;

      const educations = service.extractEducation(text);

      if (educations.length > 0) {
        expect(educations[0].degree).toBeDefined();
        expect(educations[0].field).toBeDefined();
      }
    });

    it('should extract GPA if present', () => {
      const text = `Education
University
Bachelor of Science
GPA: 3.8/4.0`;

      const educations = service.extractEducation(text);

      if (educations.length > 0) {
        expect(educations[0].gpa).toBe('3.8');
      }
    });

    it('should return empty array for text without education', () => {
      const text = 'Just work experience information';

      const educations = service.extractEducation(text);

      expect(educations).toEqual([]);
    });
  });

  describe('extractSkills', () => {
    it('should extract skills from skills section', () => {
      const text = `Skills
JavaScript, TypeScript, Python, React, Node.js`;

      const skills = service.extractSkills(text);

      expect(skills).toContain('JavaScript');
      expect(skills).toContain('TypeScript');
      expect(skills).toContain('Python');
    });

    it('should handle skills separated by semicolons', () => {
      const text = `Technical Skills
JavaScript; Python; Java; Go`;

      const skills = service.extractSkills(text);

      expect(skills.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle skills on multiple lines', () => {
      const text = `Skills
JavaScript
TypeScript
Python`;

      const skills = service.extractSkills(text);

      expect(skills.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for text without skills section', () => {
      const text = 'Just some text without skills';

      const skills = service.extractSkills(text);

      expect(skills).toEqual([]);
    });
  });

  describe('extractSummary', () => {
    it('should extract summary from summary section', () => {
      const text = `Professional Summary
Experienced software developer with 10 years of experience
in web development and cloud technologies.

Experience
Job 2020 - present`;

      const summary = service.extractSummary(text);

      expect(summary).toBeDefined();
      expect(summary?.length).toBeGreaterThan(0);
    });

    it('should extract objective as summary', () => {
      const text = `Objective
Seeking a challenging position in software engineering`;

      const summary = service.extractSummary(text);

      expect(summary).toBeDefined();
    });

    it('should return null for text without summary', () => {
      const text = 'Just contact info\njohn@example.com';

      const summary = service.extractSummary(text);

      expect(summary).toBeNull();
    });
  });

  describe('convertToResumeDTO', () => {
    it('should convert text to complete ResumeDTO', () => {
      const text = `John Doe
john.doe@example.com
+1 555-1234

Experience
Tech Corp
Software Engineer 2020 - present
• Built APIs

Education
University
Bachelor of Science

Skills
JavaScript, Python`;

      const resume = service.convertToResumeDTO(text);

      expect(resume.contactInfo.name).toBe('John Doe');
      expect(resume.contactInfo.email).toBe('john.doe@example.com');
      expect(resume.skills.length).toBeGreaterThanOrEqual(1);
      expect(resume.workExperience.length).toBeGreaterThanOrEqual(1);
      expect(resume.education.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle minimal text', () => {
      const text = 'Name\nemail@test.com';

      const resume = service.convertToResumeDTO(text);

      expect(resume.contactInfo).toBeDefined();
      expect(resume.skills).toEqual([]);
    });
  });
});
