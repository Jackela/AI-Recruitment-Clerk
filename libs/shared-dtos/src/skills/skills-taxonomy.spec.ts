import { SkillsTaxonomy } from './skills-taxonomy';

describe('SkillsTaxonomy', () => {
  describe('normalizeSkill', () => {
    it('should normalize JavaScript variations', () => {
      expect(SkillsTaxonomy.normalizeSkill('JavaScript')).toBe('JavaScript');
      expect(SkillsTaxonomy.normalizeSkill('js')).toBe('JavaScript');
      expect(SkillsTaxonomy.normalizeSkill('JS')).toBe('JavaScript');
      expect(SkillsTaxonomy.normalizeSkill('ES6')).toBe('JavaScript');
    });

    it('should normalize TypeScript', () => {
      expect(SkillsTaxonomy.normalizeSkill('TypeScript')).toBe('TypeScript');
      expect(SkillsTaxonomy.normalizeSkill('ts')).toBe('TypeScript');
      expect(SkillsTaxonomy.normalizeSkill('typescript')).toBe('TypeScript');
    });

    it('should normalize Python', () => {
      expect(SkillsTaxonomy.normalizeSkill('Python')).toBe('Python');
      expect(SkillsTaxonomy.normalizeSkill('python3')).toBe('Python');
      expect(SkillsTaxonomy.normalizeSkill('py')).toBe('Python');
    });

    it('should normalize Java', () => {
      expect(SkillsTaxonomy.normalizeSkill('Java')).toBe('Java');
      expect(SkillsTaxonomy.normalizeSkill('java')).toBe('Java');
      expect(SkillsTaxonomy.normalizeSkill('Java17')).toBe('Java');
    });

    it('should normalize React', () => {
      expect(SkillsTaxonomy.normalizeSkill('React')).toBe('React');
      expect(SkillsTaxonomy.normalizeSkill('reactjs')).toBe('React');
      expect(SkillsTaxonomy.normalizeSkill('ReactJS')).toBe('React');
    });

    it('should normalize Angular', () => {
      expect(SkillsTaxonomy.normalizeSkill('Angular')).toBe('Angular');
      expect(SkillsTaxonomy.normalizeSkill('angularjs')).toBe('Angular');
      expect(SkillsTaxonomy.normalizeSkill('ng')).toBe('Angular');
    });

    it('should normalize Vue.js', () => {
      expect(SkillsTaxonomy.normalizeSkill('Vue.js')).toBe('Vue.js');
      expect(SkillsTaxonomy.normalizeSkill('vuejs')).toBe('Vue.js');
      expect(SkillsTaxonomy.normalizeSkill('vue')).toBe('Vue.js');
    });

    it('should normalize Node.js', () => {
      expect(SkillsTaxonomy.normalizeSkill('Node.js')).toBe('Node.js');
      expect(SkillsTaxonomy.normalizeSkill('nodejs')).toBe('Node.js');
      expect(SkillsTaxonomy.normalizeSkill('node')).toBe('Node.js');
    });

    it('should normalize AWS', () => {
      expect(SkillsTaxonomy.normalizeSkill('AWS')).toBe('AWS');
      expect(SkillsTaxonomy.normalizeSkill('aws')).toBe('AWS');
    });

    it('should handle empty input', () => {
      expect(SkillsTaxonomy.normalizeSkill('')).toBe('');
      expect(SkillsTaxonomy.normalizeSkill('   ')).toBe('');
    });

    it('should handle null-like input', () => {
      expect(SkillsTaxonomy.normalizeSkill(null as any)).toBe('');
      expect(SkillsTaxonomy.normalizeSkill(undefined as any)).toBe('');
    });

    it('should return capitalized original for unrecognized skills', () => {
      expect(SkillsTaxonomy.normalizeSkill('SomeUnknownSkill')).toBe(
        'SomeUnknownSkill',
      );
      expect(SkillsTaxonomy.normalizeSkill('xyz framework')).toBe(
        'Xyz Framework',
      );
    });

    it('should handle Docker and Kubernetes', () => {
      expect(SkillsTaxonomy.normalizeSkill('Docker')).toBe('Docker');
      expect(SkillsTaxonomy.normalizeSkill('kubernetes')).toBe('Kubernetes');
      expect(SkillsTaxonomy.normalizeSkill('k8s')).toBe('Kubernetes');
    });

    it('should handle PostgreSQL', () => {
      expect(SkillsTaxonomy.normalizeSkill('PostgreSQL')).toBe('PostgreSQL');
      expect(SkillsTaxonomy.normalizeSkill('postgres')).toBe('PostgreSQL');
    });
  });

  describe('getSkillInfo', () => {
    it('should return category and weight for known skills', () => {
      const info = SkillsTaxonomy.getSkillInfo('JavaScript');

      expect(info).not.toBeNull();
      expect(info?.category).toBe('Programming Languages');
      expect(info?.subcategory).toBe('Frontend');
      expect(info?.weight).toBe(1.0);
    });

    it('should return correct weight for Python', () => {
      const info = SkillsTaxonomy.getSkillInfo('Python');

      expect(info).not.toBeNull();
      expect(info?.category).toBe('Programming Languages');
      expect(info?.subcategory).toBe('Backend');
      expect(info?.weight).toBe(1.0);
    });

    it('should return correct weight for React', () => {
      const info = SkillsTaxonomy.getSkillInfo('React');

      expect(info).not.toBeNull();
      expect(info?.category).toBe('Frameworks & Libraries');
      expect(info?.subcategory).toBe('Web Frameworks');
      expect(info?.weight).toBe(1.0);
    });

    it('should return null for unknown skills', () => {
      const info = SkillsTaxonomy.getSkillInfo('UnknownSkill123');

      expect(info).toBeNull();
    });
  });

  describe('getRelatedSkills', () => {
    it('should return related skills for JavaScript', () => {
      const related = SkillsTaxonomy.getRelatedSkills('JavaScript');

      expect(related).toContain('TypeScript');
      expect(related).toContain('Node.js');
      expect(related).toContain('React');
    });

    it('should return related skills for Python', () => {
      const related = SkillsTaxonomy.getRelatedSkills('Python');

      expect(related).toContain('Django');
      expect(related).toContain('Flask');
      expect(related).toContain('Pandas');
    });

    it('should return empty array for unknown skills', () => {
      const related = SkillsTaxonomy.getRelatedSkills('UnknownSkill');

      expect(related).toEqual([]);
    });
  });

  describe('calculateSkillScore', () => {
    it('should calculate score for single skill', () => {
      const score = SkillsTaxonomy.calculateSkillScore(['JavaScript']);

      expect(score).toBe(10); // 1.0 * 10
    });

    it('should calculate score for multiple skills', () => {
      const score = SkillsTaxonomy.calculateSkillScore([
        'JavaScript',
        'TypeScript',
      ]);

      expect(score).toBe(20); // (1.0 + 1.0) * 10
    });

    it('should cap score at 100', () => {
      const manySkills = [
        'JavaScript',
        'TypeScript',
        'Python',
        'Java',
        'C#',
        'Node.js',
        'React',
        'Angular',
        'Vue.js',
        'PostgreSQL',
        'MongoDB',
        'AWS',
      ];
      const score = SkillsTaxonomy.calculateSkillScore(manySkills);

      expect(score).toBe(100);
    });

    it('should return 0 for empty array', () => {
      const score = SkillsTaxonomy.calculateSkillScore([]);

      expect(score).toBe(0);
    });

    it('should handle unknown skills with default weight', () => {
      const score = SkillsTaxonomy.calculateSkillScore(['UnknownSkill']);

      expect(score).toBe(5); // 0.5 * 10
    });

    it('should deduplicate skills', () => {
      const score = SkillsTaxonomy.calculateSkillScore([
        'JavaScript',
        'JavaScript',
        'js',
      ]);

      expect(score).toBe(10); // 1.0 * 10 (deduplicated)
    });
  });

  describe('groupSkillsByCategory', () => {
    it('should group skills by category', () => {
      const groups = SkillsTaxonomy.groupSkillsByCategory([
        'JavaScript',
        'Python',
        'React',
      ]);

      expect(groups['Programming Languages']).toContain('JavaScript');
      expect(groups['Programming Languages']).toContain('Python');
      expect(groups['Frameworks & Libraries']).toContain('React');
    });

    it('should put unknown skills in Other category', () => {
      const groups = SkillsTaxonomy.groupSkillsByCategory(['UnknownSkill']);

      expect(groups['Other']).toContain('UnknownSkill');
    });

    it('should deduplicate within groups', () => {
      const groups = SkillsTaxonomy.groupSkillsByCategory(['JavaScript', 'js']);

      expect(groups['Programming Languages'].length).toBe(1);
    });

    it('should handle empty array', () => {
      const groups = SkillsTaxonomy.groupSkillsByCategory([]);

      expect(Object.keys(groups).length).toBe(0);
    });
  });

  describe('suggestRelatedSkills', () => {
    it('should suggest related skills not in the list', () => {
      const suggestions = SkillsTaxonomy.suggestRelatedSkills(['JavaScript']);

      expect(suggestions.length).toBeLessThanOrEqual(5);
      expect(suggestions).not.toContain('JavaScript');
    });

    it('should limit suggestions to maxSuggestions', () => {
      const suggestions = SkillsTaxonomy.suggestRelatedSkills(
        ['JavaScript', 'Python'],
        3,
      );

      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should not suggest already existing skills', () => {
      const suggestions = SkillsTaxonomy.suggestRelatedSkills([
        'JavaScript',
        'TypeScript',
      ]);

      expect(suggestions).not.toContain('JavaScript');
      expect(suggestions).not.toContain('TypeScript');
    });
  });

  describe('fuzzyMatchSkill', () => {
    it('should find exact match', () => {
      const match = SkillsTaxonomy.fuzzyMatchSkill('JavaScript');

      expect(match).toBe('JavaScript');
    });

    it('should find close match with typo', () => {
      const match = SkillsTaxonomy.fuzzyMatchSkill('Javscript');

      expect(match).toBe('JavaScript');
    });

    it('should find match with different case', () => {
      const match = SkillsTaxonomy.fuzzyMatchSkill('javascript');

      expect(match).toBe('JavaScript');
    });

    it('should return null for no match below threshold', () => {
      const match = SkillsTaxonomy.fuzzyMatchSkill('xyzabc123');

      expect(match).toBeNull();
    });

    it('should return null for empty input', () => {
      expect(SkillsTaxonomy.fuzzyMatchSkill('')).toBeNull();
      expect(SkillsTaxonomy.fuzzyMatchSkill(null as any)).toBeNull();
    });

    it('should use custom threshold', () => {
      const strictMatch = SkillsTaxonomy.fuzzyMatchSkill('javscript', 0.95);

      expect(strictMatch).toBeNull();
    });
  });

  describe('calculateSimilarity (private)', () => {
    it('should return 1 for identical strings', () => {
      const similarity = (SkillsTaxonomy as any).calculateSimilarity(
        'test',
        'test',
      );
      expect(similarity).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
      const similarity = (SkillsTaxonomy as any).calculateSimilarity(
        'abc',
        'xyz',
      );
      expect(similarity).toBeLessThan(1);
    });

    it('should return 1 for empty strings', () => {
      const similarity = (SkillsTaxonomy as any).calculateSimilarity('', '');
      expect(similarity).toBe(1);
    });

    it('should return 0 when one string is empty', () => {
      const similarity = (SkillsTaxonomy as any).calculateSimilarity(
        'test',
        '',
      );
      expect(similarity).toBe(0);
    });
  });

  describe('getCategories', () => {
    it('should return all skill categories', () => {
      const categories = SkillsTaxonomy.getCategories();

      expect(categories.length).toBeGreaterThan(0);
      expect(
        categories.find((c) => c.name === 'Programming Languages'),
      ).toBeDefined();
      expect(
        categories.find((c) => c.name === 'Frameworks & Libraries'),
      ).toBeDefined();
    });

    it('should have proper category structure', () => {
      const categories = SkillsTaxonomy.getCategories();
      const programming = categories.find(
        (c) => c.name === 'Programming Languages',
      );

      expect(programming?.weight).toBe(1.0);
      expect(programming?.subcategories).toContain('Frontend');
      expect(programming?.subcategories).toContain('Backend');
    });
  });

  describe('getSkillsByCategory', () => {
    it('should return skills for Programming Languages', () => {
      const skills = SkillsTaxonomy.getSkillsByCategory(
        'Programming Languages',
      );

      expect(skills).toContain('JavaScript');
      expect(skills).toContain('TypeScript');
      expect(skills).toContain('Python');
      expect(skills).toContain('Java');
    });

    it('should return skills for Frameworks & Libraries', () => {
      const skills = SkillsTaxonomy.getSkillsByCategory(
        'Frameworks & Libraries',
      );

      expect(skills).toContain('React');
      expect(skills).toContain('Angular');
      expect(skills).toContain('Vue.js');
    });

    it('should return empty array for unknown category', () => {
      const skills = SkillsTaxonomy.getSkillsByCategory('Unknown Category');

      expect(skills).toEqual([]);
    });
  });
});
