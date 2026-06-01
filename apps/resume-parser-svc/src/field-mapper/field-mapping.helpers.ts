import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';
import { SkillsTaxonomy } from '@ai-recruitment-clerk/candidate-scoring-domain';
import { DateParser } from './date-parser';

export class FieldValueNormalizer {
  public static normalizeString(value: unknown): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    return value.trim().replace(/\s+/g, ' ');
  }

  public static normalizeName(name: unknown): string | null {
    if (!name || typeof name !== 'string') {
      return null;
    }

    const normalized = name.trim().replace(/\s+/g, ' ');
    if (normalized.length < 2 || normalized.length > 100) {
      return null;
    }
    if (!/^[a-zA-Z\s'.-]+$/.test(normalized)) {
      return null;
    }

    return normalized;
  }

  public static normalizeEmail(email: unknown): string | null {
    if (!email || typeof email !== 'string') {
      return null;
    }

    return email.trim().toLowerCase();
  }

  public static normalizePhone(phone: unknown): string | null {
    if (!phone || typeof phone !== 'string') {
      return null;
    }

    const normalized = phone
      .replace(/[^\d+()-\s]/g, '')
      .trim()
      .replace(/\s+/g, ' ');

    return this.isValidPhone(normalized) ? normalized : null;
  }

  public static normalizeDegree(degree: string): string {
    if (!degree || typeof degree !== 'string') {
      return '';
    }

    const normalized = degree.trim().toLowerCase();
    const degreeMap: Record<string, string> = {
      'bachelor of science': 'Bachelor of Science',
      'bachelor of arts': 'Bachelor of Arts',
      'bachelor of technology': 'Bachelor of Technology',
      'bachelor of engineering': 'Bachelor of Engineering',
      'master of science': 'Master of Science',
      'master of arts': 'Master of Arts',
      'master of business administration': 'Master of Business Administration',
      'master of technology': 'Master of Technology',
      'master of engineering': 'Master of Engineering',
      'doctor of philosophy': 'Doctor of Philosophy',
      bachelor: "Bachelor's Degree",
      bachelors: "Bachelor's Degree",
      "bachelor's": "Bachelor's Degree",
      ba: 'Bachelor of Arts',
      bs: 'Bachelor of Science',
      bsc: 'Bachelor of Science',
      'b.a': 'Bachelor of Arts',
      'b.s': 'Bachelor of Science',
      btech: 'Bachelor of Technology',
      beng: 'Bachelor of Engineering',
      master: "Master's Degree",
      masters: "Master's Degree",
      "master's": "Master's Degree",
      ma: 'Master of Arts',
      ms: 'Master of Science',
      msc: 'Master of Science',
      'm.a': 'Master of Arts',
      'm.s': 'Master of Science',
      mba: 'Master of Business Administration',
      mtech: 'Master of Technology',
      meng: 'Master of Engineering',
      phd: 'Doctor of Philosophy',
      'ph.d': 'Doctor of Philosophy',
      doctorate: 'Doctorate',
      doctoral: 'Doctorate',
      dphil: 'Doctor of Philosophy',
      associate: 'Associate Degree',
      associates: 'Associate Degree',
      diploma: 'Diploma',
      certificate: 'Certificate',
      'high school': 'High School Diploma',
      secondary: 'High School Diploma',
    };

    if (degreeMap[normalized]) {
      return degreeMap[normalized];
    }

    for (const [key, value] of Object.entries(degreeMap)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }

    return degree
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  public static isValidEmail(email: string): boolean {
    if (!email || email.length > 254) {
      return false;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  public static isValidPhone(phone: string): boolean {
    if (!phone) {
      return false;
    }

    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 7 && digitsOnly.length <= 15;
  }
}

export class ContactFieldMapper {
  public map(
    rawContactInfo: Record<string, unknown>,
  ): ResumeDTO['contactInfo'] {
    if (!rawContactInfo || typeof rawContactInfo !== 'object') {
      return { name: null, email: null, phone: null };
    }

    return {
      name: FieldValueNormalizer.normalizeName(rawContactInfo.name),
      email: FieldValueNormalizer.normalizeEmail(rawContactInfo.email),
      phone: FieldValueNormalizer.normalizePhone(rawContactInfo.phone),
    };
  }
}

export class ExperienceFieldMapper {
  public async map(
    rawWorkExperience: Record<string, unknown>[],
    normalizeDate: (dateString: string) => Promise<string>,
  ): Promise<ResumeDTO['workExperience']> {
    if (!Array.isArray(rawWorkExperience)) {
      return [];
    }

    const mappedExperience: ResumeDTO['workExperience'] = [];

    for (const rawExp of rawWorkExperience) {
      if (!rawExp || typeof rawExp !== 'object') {
        continue;
      }

      const company = FieldValueNormalizer.normalizeString(rawExp.company);
      const position = FieldValueNormalizer.normalizeString(rawExp.position);
      const summary = FieldValueNormalizer.normalizeString(
        rawExp.summary || rawExp.description || '',
      );
      const startDate = await normalizeDate(String(rawExp.startDate || ''));
      const endDate = await normalizeDate(String(rawExp.endDate || ''));

      if (company && position) {
        mappedExperience.push({
          company,
          position,
          startDate,
          endDate,
          summary,
        });
      }
    }

    return mappedExperience.sort((a, b) => {
      const aDate = DateParser.parseDate(a.startDate);
      const bDate = DateParser.parseDate(b.startDate);

      if (!aDate.date && !bDate.date) return 0;
      if (!aDate.date) return 1;
      if (!bDate.date) return -1;

      return bDate.date.getTime() - aDate.date.getTime();
    });
  }
}

export class EducationFieldMapper {
  public map(rawEducation: Record<string, unknown>[]): ResumeDTO['education'] {
    if (!Array.isArray(rawEducation)) {
      return [];
    }

    const mappedEducation: ResumeDTO['education'] = [];

    for (const rawEdu of rawEducation) {
      if (!rawEdu || typeof rawEdu !== 'object') {
        continue;
      }

      const school = FieldValueNormalizer.normalizeString(
        rawEdu.school || rawEdu.institution || rawEdu.university,
      );
      const degree = FieldValueNormalizer.normalizeDegree(
        String(rawEdu.degree || ''),
      );
      const major = FieldValueNormalizer.normalizeString(
        rawEdu.major || rawEdu.field || rawEdu.fieldOfStudy,
      );

      if (school && degree) {
        mappedEducation.push({ school, degree, major });
      }
    }

    return mappedEducation;
  }
}

export class SkillsFieldMapper {
  public normalize(rawSkills: unknown[]): string[] {
    let skillsArray = rawSkills;

    if (!Array.isArray(skillsArray)) {
      if (typeof skillsArray === 'string') {
        skillsArray = (skillsArray as string)
          .split(/[,;\n]/)
          .map((skill) => skill.trim())
          .filter((skill) => skill.length > 0);
      } else {
        return [];
      }
    }

    const normalizedSkills = new Set<string>();

    for (const rawSkill of skillsArray) {
      if (!rawSkill || typeof rawSkill !== 'string') {
        continue;
      }

      const cleanSkill = rawSkill.trim();
      if (cleanSkill.length === 0 || cleanSkill.length > 100) {
        continue;
      }

      const normalizedSkill = SkillsTaxonomy.normalizeSkill(cleanSkill);
      if (normalizedSkill && normalizedSkill.length > 0) {
        normalizedSkills.add(normalizedSkill);
      }
    }

    return Array.from(normalizedSkills)
      .sort((a, b) => {
        const aInfo = SkillsTaxonomy.getSkillInfo(a);
        const bInfo = SkillsTaxonomy.getSkillInfo(b);

        if (aInfo && bInfo) {
          if (aInfo.weight !== bInfo.weight) {
            return bInfo.weight - aInfo.weight;
          }
          return a.localeCompare(b);
        }

        return a.localeCompare(b);
      })
      .slice(0, 50);
  }
}

export class ResumeDataValidator {
  public validate(resumeDto: ResumeDTO): string[] {
    const errors: string[] = [];

    if (!resumeDto.contactInfo) {
      errors.push('Contact information is missing');
    } else {
      if (
        !resumeDto.contactInfo.name ||
        resumeDto.contactInfo.name.trim().length === 0
      ) {
        errors.push('Contact name is missing or empty');
      }
      if (
        resumeDto.contactInfo.email &&
        !FieldValueNormalizer.isValidEmail(resumeDto.contactInfo.email)
      ) {
        errors.push('Email format is invalid');
      }
      if (
        resumeDto.contactInfo.phone &&
        !FieldValueNormalizer.isValidPhone(resumeDto.contactInfo.phone)
      ) {
        errors.push('Phone number format is invalid');
      }
    }

    if (!Array.isArray(resumeDto.skills)) {
      errors.push('Skills must be an array');
    } else if (resumeDto.skills.length === 0) {
      errors.push('No skills found in resume');
    } else {
      resumeDto.skills.forEach((skill, index) => {
        if (typeof skill !== 'string' || skill.trim().length === 0) {
          errors.push(`Skill at index ${index} is invalid or empty`);
        }
      });
    }

    if (!Array.isArray(resumeDto.workExperience)) {
      errors.push('Work experience must be an array');
    } else {
      resumeDto.workExperience.forEach((exp, index) => {
        if (!exp.company || exp.company.trim().length === 0) {
          errors.push(`Work experience ${index}: Company name is missing`);
        }
        if (!exp.position || exp.position.trim().length === 0) {
          errors.push(`Work experience ${index}: Position title is missing`);
        }
        if (!exp.startDate || exp.startDate.trim().length === 0) {
          errors.push(`Work experience ${index}: Start date is missing`);
        }
        if (!exp.endDate || exp.endDate.trim().length === 0) {
          errors.push(`Work experience ${index}: End date is missing`);
        }
        if (exp.startDate && exp.startDate !== 'present') {
          const startDateParsed = DateParser.parseDate(exp.startDate);
          if (!startDateParsed.date) {
            errors.push(`Work experience ${index}: Invalid start date format`);
          }
        }
        if (exp.endDate && exp.endDate !== 'present') {
          const endDateParsed = DateParser.parseDate(exp.endDate);
          if (!endDateParsed.date) {
            errors.push(`Work experience ${index}: Invalid end date format`);
          }
        }
      });
    }

    if (!Array.isArray(resumeDto.education)) {
      errors.push('Education must be an array');
    } else {
      resumeDto.education.forEach((edu, index) => {
        if (!edu.school || edu.school.trim().length === 0) {
          errors.push(`Education ${index}: School name is missing`);
        }
        if (!edu.degree || edu.degree.trim().length === 0) {
          errors.push(`Education ${index}: Degree is missing`);
        }
      });
    }

    return errors;
  }

  public calculateConfidence(
    resumeDto: ResumeDTO,
    validationErrors: string[],
  ): number {
    let score = 100;

    score -= validationErrors.length * 5;
    if (!resumeDto.contactInfo.name) score -= 15;
    if (!resumeDto.contactInfo.email) score -= 10;
    if (!resumeDto.contactInfo.phone) score -= 5;
    if (resumeDto.skills.length === 0) score -= 20;
    if (resumeDto.workExperience.length === 0) score -= 25;
    if (resumeDto.education.length === 0) score -= 10;

    const skillScore = SkillsTaxonomy.calculateSkillScore(resumeDto.skills);
    score += (skillScore - 50) / 10;

    const experienceQuality = resumeDto.workExperience.reduce((acc, exp) => {
      let expScore = 0;
      if (exp.startDate && exp.startDate !== '') expScore += 2;
      if (exp.endDate && exp.endDate !== '') expScore += 2;
      if (exp.summary && exp.summary.length > 10) expScore += 3;
      return acc + expScore;
    }, 0);

    score += Math.min(20, experienceQuality);

    return Math.max(0, Math.min(100, score)) / 100;
  }
}

export class DateRangeExtractor {
  public async extract(
    text: string,
    normalizeDate: (dateString: string) => Promise<string>,
  ): Promise<{ startDate: string; endDate: string; confidence: number }[]> {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const dateRangePatterns = [
      /(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s*[-\u2013\u2014to]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2}|present|current)/gi,
      /(\d{1,2}[/-]\d{4})\s*[-\u2013\u2014to]\s*(\d{1,2}[/-]\d{4}|present|current)/gi,
      /(\w+\s+\d{4})\s*[-\u2013\u2014to]\s*(\w+\s+\d{4}|present|current)/gi,
      /(\d{4})\s*[-\u2013\u2014to]\s*(\d{4}|present|current)/gi,
    ];

    const extractedRanges: {
      startDate: string;
      endDate: string;
      confidence: number;
    }[] = [];

    for (const pattern of dateRangePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const startDate = await normalizeDate(match[1]);
        const endDate = await normalizeDate(match[2]);

        if (startDate) {
          const startParsed = DateParser.parseDate(match[1]);
          const endParsed = DateParser.parseDate(match[2]);
          const confidence = Math.min(
            startParsed.confidence,
            endParsed.confidence,
          );

          extractedRanges.push({ startDate, endDate, confidence });
        }
      }
    }

    return extractedRanges;
  }
}
