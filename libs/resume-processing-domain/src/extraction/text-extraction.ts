/**
 * Text Extraction Service
 * Extracts structured information from resume text
 */

import { ResumeDTO } from '@ai-recruitment-clerk/resume-dto';

export interface SectionInfo {
  type:
    | 'experience'
    | 'education'
    | 'skills'
    | 'contact'
    | 'summary'
    | 'unknown';
  content: string;
  startIndex: number;
  endIndex: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
  isPresent: boolean;
}

export interface ContactInfo {
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  linkedIn: string | null;
  website: string | null;
}

export interface WorkExperience {
  company: string;
  position: string;
  dateRange: DateRange;
  location: string | null;
  bullets: string[];
}

export interface EducationEntry {
  school: string;
  degree: string;
  field: string | null;
  dateRange: DateRange;
  gpa: string | null;
}

export class TextExtractionService {
  private readonly sectionHeaders: Record<string, string[]> = {
    experience: [
      'experience',
      'work experience',
      'employment',
      'career',
      'professional experience',
      'work history',
    ],
    education: [
      'education',
      'academic',
      'qualifications',
      'degrees',
      'academic background',
    ],
    skills: [
      'skills',
      'technical skills',
      'competencies',
      'expertise',
      'technologies',
    ],
    contact: [
      'contact',
      'personal info',
      'personal information',
      'contact information',
    ],
    summary: [
      'summary',
      'objective',
      'profile',
      'about',
      'professional summary',
    ],
  };

  identifySections(text: string): SectionInfo[] {
    const sections: SectionInfo[] = [];
    const lines = text.split('\n');
    let currentSection: SectionInfo | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const sectionType = this.detectSectionType(line);

      if (sectionType !== 'unknown') {
        if (currentSection) {
          currentSection.endIndex = i;
          sections.push(currentSection);
        }
        currentSection = {
          type: sectionType,
          content: '',
          startIndex: i,
          endIndex: i,
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }

    if (currentSection) {
      currentSection.endIndex = lines.length;
      sections.push(currentSection);
    }

    return sections;
  }

  private detectSectionType(line: string): SectionInfo['type'] {
    const lowerLine = line.toLowerCase().trim();

    for (const [type, headers] of Object.entries(this.sectionHeaders)) {
      for (const header of headers) {
        if (
          lowerLine === header ||
          lowerLine.startsWith(header + ' ') ||
          lowerLine.endsWith(' ' + header) ||
          new RegExp(`^${header}[:\s-]`).test(lowerLine)
        ) {
          return type as SectionInfo['type'];
        }
      }
    }

    return 'unknown';
  }

  extractContactInfo(text: string): ContactInfo {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex =
      /[\+]?[(]?[\d]{1,4}[)]?[-\s\.]?[\d]{1,4}[-\s\.]?[\d]{1,9}/g;
    const linkedInRegex = /linkedin\.com\/in\/[a-zA-Z0-9-]+/i;
    const websiteRegex = /(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i;

    const emails = text.match(emailRegex) || [];
    const phones = text.match(phoneRegex) || [];
    const linkedInMatch = text.match(linkedInRegex);
    const websiteMatch = text.match(websiteRegex);

    const lines = text.split('\n').slice(0, 30);
    let name: string | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.length > 0 < 50 &&
        !emailRegex.test(trimmed) &&
        !phoneRegex.test(trimmed) &&
        !linkedInRegex.test(trimmed) &&
        !websiteRegex.test(trimmed) &&
        !this.isSectionHeader(trimmed)
      ) {
        name = trimmed;
        break;
      }
    }

    return {
      name,
      email: emails[0] || null,
      phone: phones[0] || null,
      address: this.extractAddress(text),
      linkedIn: linkedInMatch ? `https://www.${linkedInMatch[0]}` : null,
      website: websiteMatch ? websiteMatch[0] : null,
    };
  }

  private isSectionHeader(line: string): boolean {
    const lower = line.toLowerCase();
    return Object.values(this.sectionHeaders)
      .flat()
      .some((h) => lower.includes(h.toLowerCase()));
  }

  private extractAddress(text: string): string | null {
    const addressRegex = /\d+\s+[^,]+,\s*[A-Za-z]+,?\s*[A-Za-z]{2}\s*\d{5}/;
    const match = text.match(addressRegex);
    return match ? match[0] : null;
  }

  parseDateRange(text: string): DateRange | null {
    const patterns = [
      /(\d{1,2}\/\d{4})\s*[-–to]+\s*(\d{1,2}\/\d{4}|present)/i,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\s*[-–to]+\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4}|present)/i,
      /(\d{4})\s*[-–to]+\s*(\d{4}|present)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const isPresent =
          match[2]?.toLowerCase() === 'present' ||
          match[4]?.toLowerCase() === 'present';

        if (match[0].includes('/')) {
          const [startMonth, startYear] = match[1].split('/');
          return {
            startDate: `${startYear}-${startMonth.padStart(2, '0')}-01`,
            endDate: isPresent
              ? 'present'
              : `${match[2].split('/')[1]}-${match[2].split('/')[0].padStart(2, '0')}-01`,
            isPresent,
          };
        } else if (match[0].match(/Jan|Feb|Mar/i)) {
          const months: Record<string, string> = {
            jan: '01',
            feb: '02',
            mar: '03',
            apr: '04',
            may: '05',
            jun: '06',
            jul: '07',
            aug: '08',
            sep: '09',
            oct: '10',
            nov: '11',
            dec: '12',
          };
          const startMonth = months[match[1].toLowerCase().substring(0, 3)];
          const endMonth = isPresent
            ? null
            : months[match[3].toLowerCase().substring(0, 3)];

          return {
            startDate: `${match[2]}-${startMonth}-01`,
            endDate: isPresent ? 'present' : `${match[4]}-${endMonth}-01`,
            isPresent,
          };
        } else {
          return {
            startDate: `${match[1]}-01-01`,
            endDate: isPresent ? 'present' : `${match[2]}-01-01`,
            isPresent,
          };
        }
      }
    }

    return null;
  }

  extractBullets(text: string): string[] {
    const bulletPatterns = [
      /^[\s]*[•\-\*\+◦▪▫◆◇][\s]+(.+)$/gm,
      /^[\s]*\d+[.)][\s]+(.+)$/gm,
    ];

    const bullets: string[] = [];

    for (const pattern of bulletPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          bullets.push(match[1].trim());
        }
      }
    }

    return bullets;
  }

  extractWorkExperience(text: string): WorkExperience[] {
    const experiences: WorkExperience[] = [];
    const sections = this.identifySections(text);
    const experienceSection = sections.find((s) => s.type === 'experience');

    if (!experienceSection) return experiences;

    const lines = experienceSection.content.split('\n').filter((l) => l.trim());

    for (let i = 0; i < lines.length; i++) {
      const dateRange = this.parseDateRange(lines[i]);

      if (dateRange) {
        const company = i > 0 ? lines[i - 1].trim() : 'Unknown Company';
        const position =
          lines[i].replace(/\d{4}.*/, '').trim() || 'Unknown Position';

        const bullets: string[] = [];
        let j = i + 1;
        while (j < lines.length && !this.parseDateRange(lines[j])) {
          if (
            lines[j].trim().startsWith('•') ||
            lines[j].trim().startsWith('-')
          ) {
            bullets.push(lines[j].replace(/^[\s•\-]+/, '').trim());
          }
          j++;
        }

        experiences.push({
          company,
          position,
          dateRange,
          location: null,
          bullets,
        });
      }
    }

    return experiences;
  }

  extractEducation(text: string): EducationEntry[] {
    const educations: EducationEntry[] = [];
    const sections = this.identifySections(text);
    const educationSection = sections.find((s) => s.type === 'education');

    if (!educationSection) return educations;

    const lines = educationSection.content.split('\n').filter((l) => l.trim());
    const degreeKeywords = [
      'bachelor',
      'master',
      'phd',
      'doctorate',
      'bs',
      'ba',
      'ms',
      'mba',
      'md',
      'jd',
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      const hasDegree = degreeKeywords.some((kw) => line.includes(kw));

      if (hasDegree) {
        const school = i > 0 ? lines[i - 1].trim() : 'Unknown School';
        const degree = lines[i].trim();
        const dateRange =
          this.parseDateRange(lines[i]) ||
          (i + 1 < lines.length ? this.parseDateRange(lines[i + 1]) : null);

        const gpaMatch =
          lines[i].match(/GPA[:\s]+([\d.]+)/i) ||
          (i + 1 < lines.length
            ? lines[i + 1].match(/GPA[:\s]+([\d.]+)/i)
            : null);

        educations.push({
          school,
          degree,
          field: this.extractFieldOfStudy(degree),
          dateRange: dateRange || {
            startDate: '',
            endDate: '',
            isPresent: false,
          },
          gpa: gpaMatch ? gpaMatch[1] : null,
        });
      }
    }

    return educations;
  }

  private extractFieldOfStudy(degreeText: string): string | null {
    const match = degreeText.match(/(?:in|of)\s+(.+?)(?:,|\d|$)/i);
    return match ? match[1].trim() : null;
  }

  extractSkills(text: string): string[] {
    const sections = this.identifySections(text);
    const skillsSection = sections.find((s) => s.type === 'skills');

    if (skillsSection) {
      const content = skillsSection.content;
      return content
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length < 50);
    }

    return [];
  }

  extractSummary(text: string): string | null {
    const sections = this.identifySections(text);
    const summarySection = sections.find((s) => s.type === 'summary');

    if (summarySection) {
      return summarySection.content.trim().substring(0, 500);
    }

    const firstFewLines = text.split('\n').slice(0, 5).join(' ');
    if (firstFewLines.length > 50 && firstFewLines.length < 500) {
      return firstFewLines;
    }

    return null;
  }

  convertToResumeDTO(text: string): ResumeDTO {
    const contactInfo = this.extractContactInfo(text);
    const workExperiences = this.extractWorkExperience(text);
    const educations = this.extractEducation(text);
    const skills = this.extractSkills(text);
    const summary = this.extractSummary(text);

    return {
      contactInfo: {
        name: contactInfo.name,
        email: contactInfo.email,
        phone: contactInfo.phone,
      },
      summary: summary || undefined,
      skills,
      workExperience: workExperiences.map((we) => ({
        company: we.company,
        position: we.position,
        startDate: we.dateRange.startDate,
        endDate: we.dateRange.endDate,
        summary: we.bullets.join(' '),
      })),
      education: educations.map((ed) => ({
        school: ed.school,
        degree: ed.degree,
        major: ed.field,
      })),
    };
  }
}
