import { UserProfile } from './user-profile.value-object.js';
import type {
  QuestionnaireUserRole,
  CompanySize,
} from '../../application/dtos/questionnaire.dto.js';

describe('UserProfile', () => {
  describe('constructor', () => {
    it('should create user profile with all properties', () => {
      const profile = new UserProfile({
        role: 'hr' as QuestionnaireUserRole,
        industry: 'Technology',
        companySize: 'medium' as CompanySize,
        location: 'Beijing',
      });

      expect(profile).toBeInstanceOf(UserProfile);
      expect(profile.role).toBe('hr');
      expect(profile.industry).toBe('Technology');
      expect(profile.companySize).toBe('medium');
      expect(profile.location).toBe('Beijing');
    });

    it('should handle different roles', () => {
      const roles: QuestionnaireUserRole[] = [
        'hr',
        'recruiter',
        'manager',
        'founder',
        'other',
      ];

      roles.forEach((role) => {
        const profile = new UserProfile({
          role,
          industry: 'Tech',
          companySize: 'small',
          location: 'Shanghai',
        });
        expect(profile.role).toBe(role);
      });
    });

    it('should handle different company sizes', () => {
      const sizes: CompanySize[] = [
        'startup',
        'small',
        'medium',
        'large',
        'enterprise',
        'unknown',
      ];

      sizes.forEach((size) => {
        const profile = new UserProfile({
          role: 'hr',
          industry: 'Tech',
          companySize: size,
          location: 'Shanghai',
        });
        expect(profile.companySize).toBe(size);
      });
    });

    it('should handle different industries', () => {
      const industries = [
        'Technology',
        'Finance',
        'Healthcare',
        'Education',
        'Manufacturing',
      ];

      industries.forEach((industry) => {
        const profile = new UserProfile({
          role: 'manager',
          industry,
          companySize: 'large',
          location: 'Beijing',
        });
        expect(profile.industry).toBe(industry);
      });
    });

    it('should handle different locations', () => {
      const locations = [
        'Beijing',
        'Shanghai',
        'Shenzhen',
        'Hangzhou',
        'Chengdu',
      ];

      locations.forEach((location) => {
        const profile = new UserProfile({
          role: 'founder',
          industry: 'Tech',
          companySize: 'startup',
          location,
        });
        expect(profile.location).toBe(location);
      });
    });
  });

  describe('getters', () => {
    const createProfile = () =>
      new UserProfile({
        role: 'recruiter' as QuestionnaireUserRole,
        industry: 'Finance',
        companySize: 'enterprise' as CompanySize,
        location: 'Shanghai',
      });

    it('should get role', () => {
      const profile = createProfile();
      expect(profile.role).toBe('recruiter');
    });

    it('should get industry', () => {
      const profile = createProfile();
      expect(profile.industry).toBe('Finance');
    });

    it('should get company size', () => {
      const profile = createProfile();
      expect(profile.companySize).toBe('enterprise');
    });

    it('should get location', () => {
      const profile = createProfile();
      expect(profile.location).toBe('Shanghai');
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      const profile = new UserProfile({
        role: 'other' as QuestionnaireUserRole,
        industry: '',
        companySize: 'unknown' as CompanySize,
        location: '',
      });

      expect(profile.industry).toBe('');
      expect(profile.location).toBe('');
    });

    it('should handle unicode characters', () => {
      const profile = new UserProfile({
        role: 'hr',
        industry: '技术公司 🚀',
        companySize: 'medium',
        location: '北京',
      });

      expect(profile.industry).toBe('技术公司 🚀');
      expect(profile.location).toBe('北京');
    });
  });
});
