import { SkillsTaxonomy } from './skills-taxonomy';

describe('SkillsTaxonomy', () => {
  describe('normalizeSkill', () => {
    it('should normalize exact matches', () => {
      expect(SkillsTaxonomy.normalizeSkill('JavaScript')).toBe('JavaScript');
      expect(SkillsTaxonomy.normalizeSkill('TypeScript')).toBe('TypeScript');
    });

    it('should normalize synonyms', () => {
      expect(SkillsTaxonomy.normalizeSkill('js')).toBe('JavaScript');
      expect(SkillsTaxonomy.normalizeSkill('javascript')).toBe('JavaScript');
      expect(SkillsTaxonomy.normalizeSkill('JS')).toBe('JavaScript');
      expect(SkillsTaxonomy.normalizeSkill('ts')).toBe('TypeScript');
    });

    it('should handle partial matches', () => {
      expect(SkillsTaxonomy.normalizeSkill('reactjs')).toBe('React');
      expect(SkillsTaxonomy.normalizeSkill('nodejs')).toBe('Node.js');
    });

    it('should capitalize unknown skills', () => {
      expect(SkillsTaxonomy.normalizeSkill('unknown-skill')).toBe(
        'Unknown-skill',
      );
      expect(SkillsTaxonomy.normalizeSkill('custom skill')).toBe(
        'Custom Skill',
      );
    });

    it('should handle special cases', () => {
      expect(SkillsTaxonomy.normalizeSkill('html')).toBe('HTML');
      expect(SkillsTaxonomy.normalizeSkill('css')).toBe('CSS');
      expect(SkillsTaxonomy.normalizeSkill('sql')).toBe('SQL');
      expect(SkillsTaxonomy.normalizeSkill('api')).toBe('API');
    });

    it('should handle empty input', () => {
      expect(SkillsTaxonomy.normalizeSkill('')).toBe('');
    });

    it('should handle null/undefined gracefully', () => {
      expect(SkillsTaxonomy.normalizeSkill(null as any)).toBe('');
      expect(SkillsTaxonomy.normalizeSkill(undefined as any)).toBe('');
    });

    it('should trim whitespace', () => {
      expect(SkillsTaxonomy.normalizeSkill('  JavaScript  ')).toBe(
        'JavaScript',
      );
      expect(SkillsTaxonomy.normalizeSkill('  js  ')).toBe('JavaScript');
    });
  });

  describe('getSkillInfo', () => {
    it('should return skill info for known skills', () => {
      const info = SkillsTaxonomy.getSkillInfo('JavaScript');

      expect(info).not.toBeNull();
      expect(info!.category).toBe('Programming Languages');
      expect(info!.subcategory).toBe('Frontend');
      expect(info!.weight).toBe(1.0);
    });

    it('should return info for synonyms', () => {
      const info = SkillsTaxonomy.getSkillInfo('js');

      expect(info).not.toBeNull();
      expect(info!.category).toBe('Programming Languages');
    });

    it('should return null for unknown skills', () => {
      const info = SkillsTaxonomy.getSkillInfo('unknown-skill-xyz');

      expect(info).toBeNull();
    });

    it('should return correct info for different categories', () => {
      const reactInfo = SkillsTaxonomy.getSkillInfo('React');
      const awsInfo = SkillsTaxonomy.getSkillInfo('AWS');
      const postgresInfo = SkillsTaxonomy.getSkillInfo('PostgreSQL');

      expect(reactInfo!.category).toBe('Frameworks & Libraries');
      expect(awsInfo!.category).toBe('Cloud & DevOps');
      expect(postgresInfo!.category).toBe('Databases');
    });
  });

  describe('getRelatedSkills', () => {
    it('should return related skills for known skills', () => {
      const related = SkillsTaxonomy.getRelatedSkills('JavaScript');

      expect(related).toContain('TypeScript');
      expect(related).toContain('React');
      expect(related.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown skills', () => {
      const related = SkillsTaxonomy.getRelatedSkills('unknown-skill');

      expect(related).toEqual([]);
    });

    it('should return related skills for synonyms', () => {
      const related = SkillsTaxonomy.getRelatedSkills('js');

      expect(related.length).toBeGreaterThan(0);
    });
  });

  describe('calculateSkillScore', () => {
    it('should calculate score for skills', () => {
      const skills = ['JavaScript', 'TypeScript', 'React'];
      const score = SkillsTaxonomy.calculateSkillScore(skills);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle empty skills array', () => {
      const score = SkillsTaxonomy.calculateSkillScore([]);

      expect(score).toBe(0);
    });

    it('should handle duplicate skills', () => {
      const skills = ['JavaScript', 'javascript', 'JS', 'js'];
      const score = SkillsTaxonomy.calculateSkillScore(skills);

      // Should not count duplicates
      expect(score).toBeLessThan(40);
    });

    it('should cap score at 100', () => {
      const skills = Array(50).fill('JavaScript');
      const score = SkillsTaxonomy.calculateSkillScore(skills);

      expect(score).toBe(100);
    });

    it('should assign default weight for unknown skills', () => {
      const skills = ['unknown-skill-1', 'unknown-skill-2'];
      const score = SkillsTaxonomy.calculateSkillScore(skills);

      expect(score).toBeGreaterThan(0);
    });

    it('should weight skills by category', () => {
      const programmingSkills = ['JavaScript', 'TypeScript'];
      const softSkills = ['Leadership', 'Communication'];

      const programmingScore =
        SkillsTaxonomy.calculateSkillScore(programmingSkills);
      const softScore = SkillsTaxonomy.calculateSkillScore(softSkills);

      // Programming skills typically have higher weights
      expect(programmingScore).toBeGreaterThan(softScore);
    });
  });

  describe('groupSkillsByCategory', () => {
    it('should group skills by category', () => {
      const skills = ['JavaScript', 'React', 'PostgreSQL', 'AWS'];
      const groups = SkillsTaxonomy.groupSkillsByCategory(skills);

      expect(groups['Programming Languages']).toContain('JavaScript');
      expect(groups['Frameworks & Libraries']).toContain('React');
      expect(groups['Databases']).toContain('PostgreSQL');
      expect(groups['Cloud & DevOps']).toContain('AWS');
    });

    it('should handle unknown skills', () => {
      const skills = ['JavaScript', 'unknown-skill'];
      const groups = SkillsTaxonomy.groupSkillsByCategory(skills);

      expect(groups['Programming Languages']).toContain('JavaScript');
      expect(groups['Other']).toContain('Unknown-skill');
    });

    it('should handle empty array', () => {
      const groups = SkillsTaxonomy.groupSkillsByCategory([]);

      expect(Object.keys(groups)).toHaveLength(0);
    });

    it('should deduplicate skills within categories', () => {
      const skills = ['JavaScript', 'js', 'JS', 'React'];
      const groups = SkillsTaxonomy.groupSkillsByCategory(skills);

      expect(groups['Programming Languages']).toHaveLength(1);
      expect(groups['Frameworks & Libraries']).toHaveLength(1);
    });
  });

  describe('suggestRelatedSkills', () => {
    it('should suggest related skills', () => {
      const skills = ['JavaScript'];
      const suggestions = SkillsTaxonomy.suggestRelatedSkills(skills);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('TypeScript');
    });

    it('should respect max suggestions limit', () => {
      const skills = ['JavaScript', 'React'];
      const suggestions = SkillsTaxonomy.suggestRelatedSkills(skills, 3);

      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should not suggest skills already possessed', () => {
      const skills = ['JavaScript', 'TypeScript'];
      const suggestions = SkillsTaxonomy.suggestRelatedSkills(skills);

      expect(suggestions).not.toContain('JavaScript');
      expect(suggestions).not.toContain('TypeScript');
    });

    it('should handle empty skills array', () => {
      const suggestions = SkillsTaxonomy.suggestRelatedSkills([]);

      expect(suggestions).toEqual([]);
    });
  });

  describe('fuzzyMatchSkill', () => {
    it('should match similar skill names', () => {
      const match = SkillsTaxonomy.fuzzyMatchSkill('JavScript', 0.7);
      expect(match).toBe('JavaScript');
    });

    it('should return null for low similarity', () => {
      const match = SkillsTaxonomy.fuzzyMatchSkill('xyz', 0.8);
      expect(match).toBeNull();
    });

    it('should use custom threshold', () => {
      const matchHigh = SkillsTaxonomy.fuzzyMatchSkill('JavScript', 0.9);
      const matchLow = SkillsTaxonomy.fuzzyMatchSkill('JavScript', 0.5);

      expect(matchHigh).toBeNull();
      expect(matchLow).toBe('JavaScript');
    });

    it('should handle empty input', () => {
      expect(SkillsTaxonomy.fuzzyMatchSkill('')).toBeNull();
    });

    it('should match typos', () => {
      const match = SkillsTaxonomy.fuzzyMatchSkill('Reeact', 0.8);
      expect(match).toBe('React');
    });
  });

  describe('getCategories', () => {
    it('should return all categories', () => {
      const categories = SkillsTaxonomy.getCategories();

      expect(categories.length).toBeGreaterThan(0);
      expect(categories.some((c) => c.name === 'Programming Languages')).toBe(
        true,
      );
      expect(categories.some((c) => c.name === 'Databases')).toBe(true);
    });

    it('should return category weights', () => {
      const categories = SkillsTaxonomy.getCategories();
      const programmingCategory = categories.find(
        (c) => c.name === 'Programming Languages',
      );

      expect(programmingCategory!.weight).toBe(1.0);
    });

    it('should return category subcategories', () => {
      const categories = SkillsTaxonomy.getCategories();
      const programmingCategory = categories.find(
        (c) => c.name === 'Programming Languages',
      );

      expect(programmingCategory!.subcategories).toContain('Frontend');
      expect(programmingCategory!.subcategories).toContain('Backend');
    });
  });

  describe('getSkillsByCategory', () => {
    it('should return skills for category', () => {
      const skills = SkillsTaxonomy.getSkillsByCategory(
        'Programming Languages',
      );

      expect(skills.length).toBeGreaterThan(0);
      expect(skills).toContain('JavaScript');
      expect(skills).toContain('TypeScript');
    });

    it('should return empty array for unknown category', () => {
      const skills = SkillsTaxonomy.getSkillsByCategory('Unknown Category');

      expect(skills).toEqual([]);
    });

    it('should return skills for different categories', () => {
      const dbSkills = SkillsTaxonomy.getSkillsByCategory('Databases');
      const cloudSkills = SkillsTaxonomy.getSkillsByCategory('Cloud & DevOps');

      expect(dbSkills).toContain('PostgreSQL');
      expect(cloudSkills).toContain('AWS');
    });
  });

  describe('Edge Cases', () => {
    it('should handle skills with special characters', () => {
      const normalized = SkillsTaxonomy.normalizeSkill('C#');
      expect(normalized).toBe('C#');
    });

    it('should handle skills with dots', () => {
      const normalized = SkillsTaxonomy.normalizeSkill('node.js');
      expect(normalized).toBe('Node.js');
    });

    it('should handle skills with plus signs', () => {
      const normalized = SkillsTaxonomy.normalizeSkill('c++');
      expect(normalized).toBe('C++');
    });

    it('should handle numeric versions in skill names', () => {
      const normalized = SkillsTaxonomy.normalizeSkill('python3');
      expect(normalized).toBe('Python');
    });

    it('should handle very long skill names', () => {
      const longSkill = 'a'.repeat(100);
      const normalized = SkillsTaxonomy.normalizeSkill(longSkill);
      expect(normalized).toBe('A' + 'a'.repeat(99));
    });

    it('should handle skills with multiple words', () => {
      const normalized = SkillsTaxonomy.normalizeSkill('spring boot');
      expect(normalized).toBe('Spring Boot');
    });
  });

  describe('Comprehensive Skill Set', () => {
    it('should handle all major programming languages', () => {
      const languages = [
        'JavaScript',
        'Python',
        'Java',
        'C#',
        'Go',
        'Rust',
        'PHP',
      ];
      const scores = languages.map((lang) => SkillsTaxonomy.getSkillInfo(lang));

      expect(scores.every((s) => s !== null)).toBe(true);
    });

    it('should handle all major frameworks', () => {
      const frameworks = [
        'React',
        'Vue.js',
        'Angular',
        'Django',
        'Spring Boot',
      ];
      const scores = frameworks.map((fw) => SkillsTaxonomy.getSkillInfo(fw));

      expect(scores.every((s) => s !== null)).toBe(true);
    });

    it('should handle all major databases', () => {
      const databases = ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis'];
      const scores = databases.map((db) => SkillsTaxonomy.getSkillInfo(db));

      expect(scores.every((s) => s !== null)).toBe(true);
    });

    it('should handle all major cloud platforms', () => {
      const clouds = ['AWS', 'Azure', 'Google Cloud'];
      const scores = clouds.map((c) => SkillsTaxonomy.getSkillInfo(c));

      expect(scores.every((s) => s !== null)).toBe(true);
    });
  });
});
