import { ScoringService } from './scoring.service';
import type {
  JobRequirements,
  CandidateProfile,
  ScoringCriteria,
} from './scoring.service';

describe('ScoringService', () => {
  const mockJobRequirements: JobRequirements = {
    requiredSkills: ['JavaScript', 'TypeScript', 'React'],
    preferredSkills: ['Node.js', 'GraphQL'],
    minExperienceYears: 3,
    maxExperienceYears: 8,
    educationLevel: 'bachelor',
    requiredCertifications: ['AWS Certified'],
    requiredLanguages: ['English'],
  };

  const mockCandidateProfile: CandidateProfile = {
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
    experienceYears: 5,
    educationLevel: 'bachelor',
    certifications: ['AWS Certified', 'Google Cloud Certified'],
    languages: ['English', 'Spanish'],
  };

  describe('calculateBasicScore', () => {
    it('should calculate basic score', () => {
      const score = ScoringService.calculateBasicScore(
        mockCandidateProfile,
        mockJobRequirements,
      );

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return higher score for perfect match', () => {
      const perfectCandidate: CandidateProfile = {
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'GraphQL'],
        experienceYears: 5,
        educationLevel: 'bachelor',
        certifications: ['AWS Certified'],
        languages: ['English'],
      };

      const score = ScoringService.calculateBasicScore(
        perfectCandidate,
        mockJobRequirements,
      );

      expect(score).toBeGreaterThan(80);
    });

    it('should return lower score for poor match', () => {
      const poorCandidate: CandidateProfile = {
        skills: ['Python', 'Django'],
        experienceYears: 1,
        educationLevel: 'high_school',
        certifications: [],
        languages: ['French'],
      };

      const score = ScoringService.calculateBasicScore(
        poorCandidate,
        mockJobRequirements,
      );

      expect(score).toBeLessThan(50);
    });
  });

  describe('calculateWeightedScore', () => {
    it('should calculate weighted score with custom criteria', () => {
      const customCriteria: Partial<ScoringCriteria> = {
        skillsWeight: 0.6,
        experienceWeight: 0.2,
        educationWeight: 0.1,
        certificationsWeight: 0.05,
        languagesWeight: 0.05,
      };

      const result = ScoringService.calculateWeightedScore(
        mockCandidateProfile,
        mockJobRequirements,
        customCriteria,
      );

      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.normalizedScore).toBeGreaterThan(0);
      expect(result.normalizedScore).toBeLessThanOrEqual(100);
      expect(result.details).toBeDefined();
    });

    it('should use default weights when not specified', () => {
      const result = ScoringService.calculateWeightedScore(
        mockCandidateProfile,
        mockJobRequirements,
        {},
      );

      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.normalizedScore).toBeGreaterThan(0);
    });

    it('should include all score components', () => {
      const result = ScoringService.calculateWeightedScore(
        mockCandidateProfile,
        mockJobRequirements,
      );

      expect(result.skillScore).toBeDefined();
      expect(result.experienceScore).toBeDefined();
      expect(result.educationScore).toBeDefined();
      expect(result.certificationsScore).toBeDefined();
      expect(result.languagesScore).toBeDefined();
      expect(result.matchedSkills).toBeDefined();
      expect(result.missingSkills).toBeDefined();
      expect(result.extraSkills).toBeDefined();
    });

    it('should calculate higher score when skills weight is higher', () => {
      const highSkillsCriteria: Partial<ScoringCriteria> = {
        skillsWeight: 0.8,
        experienceWeight: 0.1,
        educationWeight: 0.05,
        certificationsWeight: 0.03,
        languagesWeight: 0.02,
      };

      const result = ScoringService.calculateWeightedScore(
        mockCandidateProfile,
        mockJobRequirements,
        highSkillsCriteria,
      );

      expect(result.skillScore).toBeGreaterThan(result.experienceScore);
    });
  });

  describe('normalizeScore', () => {
    it('should normalize scores to 0-100 range', () => {
      expect(ScoringService.normalizeScore(50, 100)).toBe(50);
      expect(ScoringService.normalizeScore(75, 100)).toBe(75);
      expect(ScoringService.normalizeScore(100, 100)).toBe(100);
    });

    it('should handle scores above maximum', () => {
      expect(ScoringService.normalizeScore(150, 100)).toBe(100);
    });

    it('should handle scores below zero', () => {
      expect(ScoringService.normalizeScore(-10, 100)).toBe(0);
    });

    it('should handle zero max score', () => {
      expect(ScoringService.normalizeScore(50, 0)).toBe(0);
    });

    it('should handle default max score', () => {
      expect(ScoringService.normalizeScore(50)).toBe(50);
    });
  });

  describe('matchSkills', () => {
    it('should match skills correctly', () => {
      const candidateSkills = ['JavaScript', 'TypeScript', 'Python'];
      const requiredSkills = ['JavaScript', 'React'];

      const result = ScoringService.matchSkills(
        candidateSkills,
        requiredSkills,
      );

      expect(result.matched).toContain('JavaScript');
      expect(result.missing).toContain('React');
      expect(result.extra).toContain('TypeScript');
      expect(result.extra).toContain('Python');
    });

    it('should normalize skills before matching', () => {
      const candidateSkills = ['javascript', 'reactjs'];
      const requiredSkills = ['JavaScript', 'React'];

      const result = ScoringService.matchSkills(
        candidateSkills,
        requiredSkills,
      );

      expect(result.matched).toContain('JavaScript');
      expect(result.matched).toContain('React');
    });

    it('should include preferred skills in matching', () => {
      const candidateSkills = ['JavaScript', 'Node.js'];
      const requiredSkills = ['JavaScript'];
      const preferredSkills = ['Node.js', 'GraphQL'];

      const result = ScoringService.matchSkills(
        candidateSkills,
        requiredSkills,
        preferredSkills,
      );

      expect(result.matched).toContain('JavaScript');
      expect(result.matched).toContain('Node.js');
      expect(result.matchPercentage).toBeGreaterThan(100); // Due to preferred skills bonus
    });

    it('should handle perfect skill match', () => {
      const skills = ['JavaScript', 'TypeScript'];
      const result = ScoringService.matchSkills(skills, skills);

      expect(result.matched).toHaveLength(2);
      expect(result.missing).toHaveLength(0);
      expect(result.matchPercentage).toBe(100);
    });

    it('should handle no skills match', () => {
      const candidateSkills = ['Python', 'Django'];
      const requiredSkills = ['JavaScript', 'React'];

      const result = ScoringService.matchSkills(
        candidateSkills,
        requiredSkills,
      );

      expect(result.matched).toHaveLength(0);
      expect(result.missing).toHaveLength(2);
      expect(result.matchPercentage).toBe(0);
    });

    it('should handle empty required skills', () => {
      const candidateSkills = ['JavaScript', 'React'];
      const result = ScoringService.matchSkills(candidateSkills, []);

      expect(result.matchPercentage).toBe(100);
      expect(result.extra).toHaveLength(2);
    });

    it('should handle no skills', () => {
      const result = ScoringService.matchSkills([], ['JavaScript']);

      expect(result.matched).toHaveLength(0);
      expect(result.missing).toHaveLength(1);
      expect(result.matchPercentage).toBe(0);
    });

    it('should avoid duplicate matches', () => {
      const candidateSkills = ['React', 'react', 'REACT'];
      const requiredSkills = ['React'];

      const result = ScoringService.matchSkills(
        candidateSkills,
        requiredSkills,
      );

      // Should only match React once
      expect(
        result.matched.filter((s) => s.toLowerCase() === 'react').length,
      ).toBe(1);
    });
  });

  describe('calculateBatchScores', () => {
    it('should calculate scores for multiple candidates', () => {
      const candidates = [
        { id: 'candidate-1', profile: mockCandidateProfile },
        {
          id: 'candidate-2',
          profile: { ...mockCandidateProfile, experienceYears: 2 },
        },
        {
          id: 'candidate-3',
          profile: { ...mockCandidateProfile, experienceYears: 10 },
        },
      ];

      const results = ScoringService.calculateBatchScores(
        candidates,
        mockJobRequirements,
      );

      expect(results).toHaveLength(3);
      expect(results[0].candidateId).toBe('candidate-1');
      expect(results[0].result.totalScore).toBeGreaterThan(0);
      expect(results[1].candidateId).toBe('candidate-2');
      expect(results[2].candidateId).toBe('candidate-3');
    });

    it('should use custom criteria for batch scoring', () => {
      const candidates = [{ id: 'candidate-1', profile: mockCandidateProfile }];

      const criteria: Partial<ScoringCriteria> = {
        skillsWeight: 0.7,
        experienceWeight: 0.3,
      };

      const results = ScoringService.calculateBatchScores(
        candidates,
        mockJobRequirements,
        criteria,
      );

      expect(results[0].result.totalScore).toBeGreaterThan(0);
    });

    it('should handle empty candidate list', () => {
      const results = ScoringService.calculateBatchScores(
        [],
        mockJobRequirements,
      );

      expect(results).toHaveLength(0);
    });
  });

  describe('rankCandidates', () => {
    it('should rank candidates by score', () => {
      const scores = [
        { candidateId: 'candidate-1', result: { normalizedScore: 75 } as any },
        { candidateId: 'candidate-2', result: { normalizedScore: 90 } as any },
        { candidateId: 'candidate-3', result: { normalizedScore: 60 } as any },
      ];

      const ranked = ScoringService.rankCandidates(scores);

      expect(ranked[0].candidateId).toBe('candidate-2');
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].candidateId).toBe('candidate-1');
      expect(ranked[1].rank).toBe(2);
      expect(ranked[2].candidateId).toBe('candidate-3');
      expect(ranked[2].rank).toBe(3);
    });

    it('should handle ties', () => {
      const scores = [
        { candidateId: 'candidate-1', result: { normalizedScore: 80 } as any },
        { candidateId: 'candidate-2', result: { normalizedScore: 80 } as any },
      ];

      const ranked = ScoringService.rankCandidates(scores);

      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].rank).toBe(2);
    });

    it('should not mutate original array', () => {
      const scores = [
        { candidateId: 'candidate-1', result: { normalizedScore: 75 } as any },
        { candidateId: 'candidate-2', result: { normalizedScore: 90 } as any },
      ];

      const originalOrder = [...scores];
      ScoringService.rankCandidates(scores);

      expect(scores).toEqual(originalOrder);
    });
  });

  describe('meetsThreshold', () => {
    it('should return true when score meets threshold', () => {
      expect(ScoringService.meetsThreshold(60, 60)).toBe(true);
      expect(ScoringService.meetsThreshold(75, 60)).toBe(true);
    });

    it('should return false when score is below threshold', () => {
      expect(ScoringService.meetsThreshold(59, 60)).toBe(false);
      expect(ScoringService.meetsThreshold(40, 60)).toBe(false);
    });

    it('should use default threshold of 60', () => {
      expect(ScoringService.meetsThreshold(60)).toBe(true);
      expect(ScoringService.meetsThreshold(59)).toBe(false);
    });

    it('should handle custom threshold', () => {
      expect(ScoringService.meetsThreshold(80, 75)).toBe(true);
      expect(ScoringService.meetsThreshold(74, 75)).toBe(false);
    });
  });

  describe('getScoreInterpretation', () => {
    it('should return correct interpretation for excellent match', () => {
      expect(ScoringService.getScoreInterpretation(95)).toBe('Excellent match');
      expect(ScoringService.getScoreInterpretation(90)).toBe('Excellent match');
    });

    it('should return correct interpretation for good match', () => {
      expect(ScoringService.getScoreInterpretation(85)).toBe('Good match');
      expect(ScoringService.getScoreInterpretation(75)).toBe('Good match');
    });

    it('should return correct interpretation for fair match', () => {
      expect(ScoringService.getScoreInterpretation(70)).toBe('Fair match');
      expect(ScoringService.getScoreInterpretation(60)).toBe('Fair match');
    });

    it('should return correct interpretation for poor match', () => {
      expect(ScoringService.getScoreInterpretation(50)).toBe('Poor match');
      expect(ScoringService.getScoreInterpretation(40)).toBe('Poor match');
    });

    it('should return correct interpretation for not a match', () => {
      expect(ScoringService.getScoreInterpretation(30)).toBe('Not a match');
      expect(ScoringService.getScoreInterpretation(0)).toBe('Not a match');
    });
  });

  describe('Edge Cases', () => {
    it('should handle candidate with no skills', () => {
      const candidate: CandidateProfile = {
        skills: [],
        experienceYears: 5,
      };

      const result = ScoringService.calculateWeightedScore(
        candidate,
        mockJobRequirements,
      );

      expect(result.normalizedScore).toBeGreaterThanOrEqual(0);
      expect(result.matchedSkills).toHaveLength(0);
      expect(result.missingSkills).toEqual(mockJobRequirements.requiredSkills);
    });

    it('should handle candidate with no experience', () => {
      const candidate: CandidateProfile = {
        skills: mockCandidateProfile.skills,
        experienceYears: 0,
      };

      const result = ScoringService.calculateWeightedScore(
        candidate,
        mockJobRequirements,
      );

      expect(result.normalizedScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle job with no required skills', () => {
      const requirements: JobRequirements = {
        requiredSkills: [],
        minExperienceYears: 3,
      };

      const result = ScoringService.calculateWeightedScore(
        mockCandidateProfile,
        requirements,
      );

      expect(result.normalizedScore).toBeGreaterThan(0);
    });

    it('should handle job with no experience requirement', () => {
      const requirements: JobRequirements = {
        requiredSkills: ['JavaScript'],
        minExperienceYears: 0,
      };

      const result = ScoringService.calculateWeightedScore(
        mockCandidateProfile,
        requirements,
      );

      expect(result.normalizedScore).toBeGreaterThan(0);
    });

    it('should handle perfect match scenario', () => {
      const perfectCandidate: CandidateProfile = {
        skills: mockJobRequirements.requiredSkills,
        experienceYears: mockJobRequirements.minExperienceYears,
        educationLevel: mockJobRequirements.educationLevel,
        certifications: mockJobRequirements.requiredCertifications,
        languages: mockJobRequirements.requiredLanguages,
      };

      const result = ScoringService.calculateWeightedScore(
        perfectCandidate,
        mockJobRequirements,
      );

      expect(result.missingSkills).toHaveLength(0);
      expect(result.matchedSkills.length).toBeGreaterThanOrEqual(
        mockJobRequirements.requiredSkills.length,
      );
    });

    it('should handle candidate with more experience than required', () => {
      const experiencedCandidate: CandidateProfile = {
        ...mockCandidateProfile,
        experienceYears: 15,
      };

      const result = ScoringService.calculateWeightedScore(
        experiencedCandidate,
        mockJobRequirements,
      );

      expect(result.normalizedScore).toBeGreaterThan(0);
    });

    it('should handle overqualified candidate', () => {
      const requirements: JobRequirements = {
        requiredSkills: ['JavaScript'],
        minExperienceYears: 3,
        maxExperienceYears: 5,
      };

      const overqualifiedCandidate: CandidateProfile = {
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
        experienceYears: 10,
      };

      const result = ScoringService.calculateWeightedScore(
        overqualifiedCandidate,
        requirements,
      );

      expect(result.experienceScore).toBeGreaterThan(0);
    });

    it('should handle education level matching', () => {
      const mastersCandidate: CandidateProfile = {
        ...mockCandidateProfile,
        educationLevel: 'master',
      };

      const result = ScoringService.calculateWeightedScore(
        mastersCandidate,
        mockJobRequirements,
      );

      expect(result.educationScore).toBeGreaterThan(0);
    });

    it('should handle partial education match', () => {
      const requirements: JobRequirements = {
        requiredSkills: ['JavaScript'],
        minExperienceYears: 0,
        educationLevel: 'master',
      };

      const bachelorCandidate: CandidateProfile = {
        ...mockCandidateProfile,
        educationLevel: 'bachelor',
      };

      const result = ScoringService.calculateWeightedScore(
        bachelorCandidate,
        requirements,
      );

      expect(result.educationScore).toBeGreaterThan(0);
      expect(result.educationScore).toBeLessThan(100);
    });

    it('should handle unknown education levels', () => {
      const requirements: JobRequirements = {
        requiredSkills: ['JavaScript'],
        minExperienceYears: 0,
        educationLevel: 'custom_degree',
      };

      const result = ScoringService.calculateWeightedScore(
        mockCandidateProfile,
        requirements,
      );

      expect(result.educationScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle extra certifications', () => {
      const candidateWithExtras: CandidateProfile = {
        ...mockCandidateProfile,
        certifications: [
          'AWS Certified',
          'Google Cloud Certified',
          'Azure Certified',
        ],
      };

      const result = ScoringService.calculateWeightedScore(
        candidateWithExtras,
        mockJobRequirements,
      );

      expect(result.certificationsScore).toBe(100);
    });

    it('should handle case insensitive language matching', () => {
      const candidate: CandidateProfile = {
        ...mockCandidateProfile,
        languages: ['english', 'ENGLISH', 'Spanish'],
      };

      const result = ScoringService.calculateWeightedScore(
        candidate,
        mockJobRequirements,
      );

      expect(result.languagesScore).toBe(100);
    });

    it('should handle skill normalization', () => {
      const candidate: CandidateProfile = {
        skills: ['js', 'reactjs', 'node'],
        experienceYears: 5,
      };

      const result = ScoringService.calculateWeightedScore(
        candidate,
        mockJobRequirements,
      );

      expect(result.matchedSkills.length).toBeGreaterThan(0);
    });

    it('should handle very long skill lists', () => {
      const candidate: CandidateProfile = {
        skills: Array(50).fill('Skill'),
        experienceYears: 5,
      };

      const result = ScoringService.calculateWeightedScore(
        candidate,
        mockJobRequirements,
      );

      expect(result.normalizedScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle null/undefined optional fields', () => {
      const candidate: CandidateProfile = {
        skills: ['JavaScript'],
        experienceYears: 5,
        educationLevel: undefined,
        certifications: undefined,
        languages: undefined,
      };

      const result = ScoringService.calculateWeightedScore(
        candidate,
        mockJobRequirements,
      );

      expect(result.normalizedScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Detailed Score Components', () => {
    it('should calculate accurate skill match details', () => {
      const result = ScoringService.calculateWeightedScore(
        mockCandidateProfile,
        mockJobRequirements,
      );

      expect(result.details.skillsMatch).toBeGreaterThan(0);
      expect(
        result.matchedSkills.every((skill) =>
          mockCandidateProfile.skills
            .map((s) => s.toLowerCase())
            .includes(skill.toLowerCase()),
        ),
      ).toBe(true);
    });

    it('should calculate accurate experience match details', () => {
      const result = ScoringService.calculateWeightedScore(
        mockCandidateProfile,
        mockJobRequirements,
      );

      expect(result.details.experienceMatch).toBeGreaterThan(0);
    });

    it('should calculate accurate education match details', () => {
      const result = ScoringService.calculateWeightedScore(
        mockCandidateProfile,
        mockJobRequirements,
      );

      expect(result.details.educationMatch).toBeGreaterThan(0);
    });

    it('should calculate accurate certifications match details', () => {
      const result = ScoringService.calculateWeightedScore(
        mockCandidateProfile,
        mockJobRequirements,
      );

      expect(result.details.certificationsMatch).toBeGreaterThan(0);
    });

    it('should calculate accurate languages match details', () => {
      const result = ScoringService.calculateWeightedScore(
        mockCandidateProfile,
        mockJobRequirements,
      );

      expect(result.details.languagesMatch).toBeGreaterThan(0);
    });
  });
});
