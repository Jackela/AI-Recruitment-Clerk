/**
 * @fileoverview ScoringService DBC Validators Tests
 * @author AI Recruitment Team
 * @since 1.0.0
 * @version 1.0.0
 * @module ScoringContractTests
 */

import { 
  ContractViolationError, 
  ContractValidators 
} from './dbc.decorators';

describe('ScoringService DBC Validators', () => {
  describe('isValidJD', () => {
    it('should validate complete valid JD', () => {
      const validJD = {
        requiredSkills: [
          { skill: 'JavaScript', level: 'advanced' },
          { skill: 'React', level: 'intermediate' }
        ],
        experienceYears: { min: 3, max: 7 },
        educationLevel: 'bachelor',
        seniority: 'mid',
        softSkills: ['communication', 'teamwork']
      };

      expect(ContractValidators.isValidJD(validJD)).toBe(true);
    });

    it('should reject JD with empty skills array', () => {
      const invalidJD = {
        requiredSkills: [],
        experienceYears: { min: 3, max: 7 },
        educationLevel: 'bachelor',
        seniority: 'mid'
      };

      expect(ContractValidators.isValidJD(invalidJD)).toBe(false);
    });

    it('should reject JD with invalid experience years', () => {
      const invalidJD = {
        requiredSkills: [{ skill: 'JavaScript', level: 'advanced' }],
        experienceYears: { min: 5, max: 3 }, // max < min
        educationLevel: 'bachelor',
        seniority: 'mid'
      };

      expect(ContractValidators.isValidJD(invalidJD)).toBe(false);
    });

    it('should reject JD with negative experience years', () => {
      const invalidJD = {
        requiredSkills: [{ skill: 'JavaScript', level: 'advanced' }],
        experienceYears: { min: -1, max: 5 },
        educationLevel: 'bachelor',
        seniority: 'mid'
      };

      expect(ContractValidators.isValidJD(invalidJD)).toBe(false);
    });

    it('should reject JD with invalid education level', () => {
      const invalidJD = {
        requiredSkills: [{ skill: 'JavaScript', level: 'advanced' }],
        experienceYears: { min: 3, max: 7 },
        educationLevel: 'invalid',
        seniority: 'mid'
      };

      expect(ContractValidators.isValidJD(invalidJD)).toBe(false);
    });

    it('should reject JD with invalid seniority', () => {
      const invalidJD = {
        requiredSkills: [{ skill: 'JavaScript', level: 'advanced' }],
        experienceYears: { min: 3, max: 7 },
        educationLevel: 'bachelor',
        seniority: 'invalid'
      };

      expect(ContractValidators.isValidJD(invalidJD)).toBe(false);
    });
  });

  describe('isValidResume', () => {
    it('should validate complete valid resume', () => {
      const validResume = {
        skills: ['JavaScript', 'React', 'Node.js'],
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: 'present'
          }
        ],
        education: {
          degree: 'bachelor',
          major: 'Computer Science',
          school: 'University'
        },
        contactInfo: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      };

      expect(ContractValidators.isValidResume(validResume)).toBe(true);
    });

    it('should reject resume with empty skills', () => {
      const invalidResume = {
        skills: [],
        workExperience: [{ company: 'Tech Corp' }],
        education: { degree: 'bachelor' },
        contactInfo: { name: 'John Doe' }
      };

      expect(ContractValidators.isValidResume(invalidResume)).toBe(false);
    });

    it('should reject resume without work experience array', () => {
      const invalidResume = {
        skills: ['JavaScript'],
        workExperience: 'not an array',
        education: { degree: 'bachelor' },
        contactInfo: { name: 'John Doe' }
      };

      expect(ContractValidators.isValidResume(invalidResume)).toBe(false);
    });

    it('should reject resume without contact name', () => {
      const invalidResume = {
        skills: ['JavaScript'],
        workExperience: [{ company: 'Tech Corp' }],
        education: { degree: 'bachelor' },
        contactInfo: { email: 'john@example.com' } // missing name
      };

      expect(ContractValidators.isValidResume(invalidResume)).toBe(false);
    });

    it('should reject resume without education', () => {
      const invalidResume = {
        skills: ['JavaScript'],
        workExperience: [{ company: 'Tech Corp' }],
        contactInfo: { name: 'John Doe' }
        // missing education
      };

      expect(ContractValidators.isValidResume(invalidResume)).toBe(false);
    });
  });

  describe('isValidScoreRange', () => {
    it('should validate scores in 0-100 range', () => {
      expect(ContractValidators.isValidScoreRange(0)).toBe(true);
      expect(ContractValidators.isValidScoreRange(50)).toBe(true);
      expect(ContractValidators.isValidScoreRange(100)).toBe(true);
      expect(ContractValidators.isValidScoreRange(75.5)).toBe(true);
    });

    it('should reject scores outside 0-100 range', () => {
      expect(ContractValidators.isValidScoreRange(-1)).toBe(false);
      expect(ContractValidators.isValidScoreRange(101)).toBe(false);
      expect(ContractValidators.isValidScoreRange(150)).toBe(false);
    });

    it('should reject non-numeric scores', () => {
      expect(ContractValidators.isValidScoreRange('85')).toBe(false);
      expect(ContractValidators.isValidScoreRange(null)).toBe(false);
      expect(ContractValidators.isValidScoreRange(undefined)).toBe(false);
      expect(ContractValidators.isValidScoreRange({})).toBe(false);
    });
  });

  describe('isValidScoreDTO', () => {
    it('should validate complete valid score DTO', () => {
      const validScoreDTO = {
        overallScore: 85,
        skillScore: {
          score: 90,
          details: 'Strong technical skills match'
        },
        experienceScore: {
          score: 80,
          details: '5 years relevant experience'
        },
        educationScore: {
          score: 85,
          details: 'Bachelor degree meets requirements'
        }
      };

      expect(ContractValidators.isValidScoreDTO(validScoreDTO)).toBe(true);
    });

    it('should reject score DTO with invalid overall score', () => {
      const invalidScoreDTO = {
        overallScore: 150, // Invalid range
        skillScore: { score: 90, details: 'Good skills' },
        experienceScore: { score: 80, details: 'Good experience' },
        educationScore: { score: 85, details: 'Good education' }
      };

      expect(ContractValidators.isValidScoreDTO(invalidScoreDTO)).toBe(false);
    });

    it('should reject score DTO with missing skill score', () => {
      const invalidScoreDTO = {
        overallScore: 85,
        // Missing skillScore
        experienceScore: { score: 80, details: 'Good experience' },
        educationScore: { score: 85, details: 'Good education' }
      };

      expect(ContractValidators.isValidScoreDTO(invalidScoreDTO)).toBe(false);
    });

    it('should reject score DTO with empty details', () => {
      const invalidScoreDTO = {
        overallScore: 85,
        skillScore: { score: 90, details: '' }, // Empty details
        experienceScore: { score: 80, details: 'Good experience' },
        educationScore: { score: 85, details: 'Good education' }
      };

      expect(ContractValidators.isValidScoreDTO(invalidScoreDTO)).toBe(false);
    });

    it('should reject score DTO with invalid component scores', () => {
      const invalidScoreDTO = {
        overallScore: 85,
        skillScore: { score: -10, details: 'Invalid score' }, // Invalid range
        experienceScore: { score: 80, details: 'Good experience' },
        educationScore: { score: 85, details: 'Good education' }
      };

      expect(ContractValidators.isValidScoreDTO(invalidScoreDTO)).toBe(false);
    });
  });

  describe('isValidExperienceRange', () => {
    it('should validate reasonable experience ranges', () => {
      expect(ContractValidators.isValidExperienceRange({ min: 0, max: 5 })).toBe(true);
      expect(ContractValidators.isValidExperienceRange({ min: 3, max: 10 })).toBe(true);
      expect(ContractValidators.isValidExperienceRange({ min: 10, max: 20 })).toBe(true);
    });

    it('should reject invalid experience ranges', () => {
      expect(ContractValidators.isValidExperienceRange({ min: 5, max: 3 })).toBe(false); // max < min
      expect(ContractValidators.isValidExperienceRange({ min: -1, max: 5 })).toBe(false); // negative min
      expect(ContractValidators.isValidExperienceRange({ min: 0, max: 60 })).toBe(false); // unrealistic max
    });

    it('should handle edge cases', () => {
      expect(ContractValidators.isValidExperienceRange({ min: 0, max: 0 })).toBe(true); // Same min/max
      expect(ContractValidators.isValidExperienceRange({ min: 0, max: 50 })).toBe(true); // Max limit
    });

    it('should reject invalid objects', () => {
      expect(ContractValidators.isValidExperienceRange(null)).toBe(false);
      expect(ContractValidators.isValidExperienceRange({})).toBe(false);
      expect(ContractValidators.isValidExperienceRange({ min: 'three', max: 5 })).toBe(false);
      expect(ContractValidators.isValidExperienceRange({ min: 3 })).toBe(false); // Missing max
    });
  });

  describe('Integration Test - Scoring Workflow Simulation', () => {
    it('should simulate complete scoring workflow with contracts', () => {
      const mockScoringWorkflow = (jdDto: any, resumeDto: any) => {
        // Precondition validation
        if (!ContractValidators.isValidJD(jdDto)) {
          throw new ContractViolationError(
            'Invalid JD structure',
            'PRE',
            'ScoringService.calculateEnhancedMatchScore'
          );
        }

        if (!ContractValidators.isValidResume(resumeDto)) {
          throw new ContractViolationError(
            'Invalid resume structure',
            'PRE',
            'ScoringService.calculateEnhancedMatchScore'
          );
        }

        // Mock scoring calculation
        const skillMatchPercentage = 0.8; // 80% skill match
        const experienceMatchPercentage = 0.75; // 75% experience match
        const educationMatchPercentage = 0.9; // 90% education match

        const overallScore = Math.round(
          skillMatchPercentage * 40 + // 40% weight
          experienceMatchPercentage * 35 + // 35% weight  
          educationMatchPercentage * 25 // 25% weight
        );

        const result = {
          overallScore,
          skillScore: {
            score: Math.round(skillMatchPercentage * 100),
            details: `Skills analysis: ${skillMatchPercentage * 100}% match with required skills`
          },
          experienceScore: {
            score: Math.round(experienceMatchPercentage * 100),
            details: `Experience analysis: ${experienceMatchPercentage * 100}% relevance match`
          },
          educationScore: {
            score: Math.round(educationMatchPercentage * 100),
            details: `Education analysis: ${educationMatchPercentage * 100}% requirement match`
          }
        };

        // Postcondition validation
        if (!ContractValidators.isValidScoreDTO(result)) {
          throw new ContractViolationError(
            'Invalid scoring result structure',
            'POST',
            'ScoringService.calculateEnhancedMatchScore'
          );
        }

        return result;
      };

      // Test with valid inputs
      const validJD = {
        requiredSkills: [{ skill: 'JavaScript', level: 'advanced' }],
        experienceYears: { min: 3, max: 7 },
        educationLevel: 'bachelor',
        seniority: 'mid',
        softSkills: ['communication']
      };

      const validResume = {
        skills: ['JavaScript', 'React'],
        workExperience: [{ company: 'Tech Corp', position: 'Developer', startDate: '2020-01-01', endDate: 'present' }],
        education: { degree: 'bachelor', major: 'CS', school: 'University' },
        contactInfo: { name: 'John Doe', email: 'john@example.com' }
      };

      const result = mockScoringWorkflow(validJD, validResume);
      
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.skillScore.details).toContain('Skills analysis');

      // Test with invalid inputs
      expect(() => {
        mockScoringWorkflow({ requiredSkills: [] }, validResume);
      }).toThrow(ContractViolationError);

      expect(() => {
        mockScoringWorkflow(validJD, { skills: [] });
      }).toThrow(ContractViolationError);
    });
  });

  describe('Performance and Consistency Tests', () => {
    it('should validate efficiently at scale', () => {
      const startTime = Date.now();
      
      const validJD = {
        requiredSkills: [{ skill: 'JavaScript', level: 'advanced' }],
        experienceYears: { min: 3, max: 7 },
        educationLevel: 'bachelor',
        seniority: 'mid',
        softSkills: ['communication']
      };

      // Run 1000 validations
      for (let i = 0; i < 1000; i++) {
        ContractValidators.isValidJD(validJD);
        ContractValidators.isValidScoreRange(75);
        ContractValidators.isValidExperienceRange({ min: 2, max: 8 });
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should maintain consistency across multiple validations', () => {
      const jd = {
        requiredSkills: [{ skill: 'Python', level: 'intermediate' }],
        experienceYears: { min: 2, max: 5 },
        educationLevel: 'bachelor',
        seniority: 'junior',
        softSkills: ['teamwork']
      };

      // Same input should always return same result
      for (let i = 0; i < 10; i++) {
        expect(ContractValidators.isValidJD(jd)).toBe(true);
      }

      // Invalid input should always return false
      const invalidJD = { requiredSkills: [] };
      for (let i = 0; i < 10; i++) {
        expect(ContractValidators.isValidJD(invalidJD)).toBe(false);
      }
    });
  });
});