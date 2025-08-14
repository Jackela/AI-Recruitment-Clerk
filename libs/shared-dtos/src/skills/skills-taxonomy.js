"use strict";
/**
 * Comprehensive skills taxonomy for resume parsing and normalization
 * Includes skill hierarchies, synonyms, and standardization mappings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillsTaxonomy = void 0;
class SkillsTaxonomy {
    /**
     * Normalize a skill name to its canonical form
     */
    static normalizeSkill(skillName) {
        if (!skillName || typeof skillName !== 'string') {
            return '';
        }
        const cleanSkill = skillName.trim().toLowerCase();
        // Find exact match first
        const exactMatch = this.SKILL_MAPPINGS.find(mapping => mapping.canonical.toLowerCase() === cleanSkill ||
            mapping.synonyms.some(syn => syn.toLowerCase() === cleanSkill));
        if (exactMatch) {
            return exactMatch.canonical;
        }
        // Try partial matching for common variations
        const partialMatch = this.SKILL_MAPPINGS.find(mapping => mapping.synonyms.some(syn => cleanSkill.includes(syn.toLowerCase()) || syn.toLowerCase().includes(cleanSkill)));
        if (partialMatch) {
            return partialMatch.canonical;
        }
        // Return capitalized original if no match found
        return this.capitalizeSkill(skillName.trim());
    }
    /**
     * Get skill category and weight
     */
    static getSkillInfo(skillName) {
        const normalized = this.normalizeSkill(skillName);
        const mapping = this.SKILL_MAPPINGS.find(m => m.canonical === normalized);
        if (mapping) {
            return {
                category: mapping.category,
                subcategory: mapping.subcategory,
                weight: mapping.weight
            };
        }
        return null;
    }
    /**
     * Get related skills for a given skill
     */
    static getRelatedSkills(skillName) {
        const normalized = this.normalizeSkill(skillName);
        const mapping = this.SKILL_MAPPINGS.find(m => m.canonical === normalized);
        return mapping?.relatedSkills || [];
    }
    /**
     * Calculate skill score based on category weights and importance
     */
    static calculateSkillScore(skills) {
        if (!skills || skills.length === 0)
            return 0;
        let totalScore = 0;
        const processedSkills = new Set();
        for (const skill of skills) {
            const normalized = this.normalizeSkill(skill);
            if (processedSkills.has(normalized))
                continue;
            processedSkills.add(normalized);
            const skillInfo = this.getSkillInfo(normalized);
            if (skillInfo) {
                totalScore += skillInfo.weight;
            }
            else {
                // Default weight for unrecognized skills
                totalScore += 0.5;
            }
        }
        return Math.min(100, totalScore * 10); // Scale to 0-100
    }
    /**
     * Group skills by category
     */
    static groupSkillsByCategory(skills) {
        const groups = {};
        for (const skill of skills) {
            const normalized = this.normalizeSkill(skill);
            const skillInfo = this.getSkillInfo(normalized);
            const category = skillInfo?.category || 'Other';
            if (!groups[category]) {
                groups[category] = [];
            }
            if (!groups[category].includes(normalized)) {
                groups[category].push(normalized);
            }
        }
        return groups;
    }
    /**
     * Suggest missing skills based on existing skills
     */
    static suggestRelatedSkills(skills, maxSuggestions = 5) {
        const suggestions = new Set();
        const existingSkills = new Set(skills.map(s => this.normalizeSkill(s)));
        for (const skill of skills) {
            const relatedSkills = this.getRelatedSkills(skill);
            for (const related of relatedSkills) {
                if (!existingSkills.has(related)) {
                    suggestions.add(related);
                }
            }
        }
        return Array.from(suggestions).slice(0, maxSuggestions);
    }
    /**
     * Perform fuzzy matching for skill names
     */
    static fuzzyMatchSkill(input, threshold = 0.8) {
        if (!input || typeof input !== 'string')
            return null;
        const cleanInput = input.trim().toLowerCase();
        let bestMatch = null;
        let bestScore = 0;
        for (const mapping of this.SKILL_MAPPINGS) {
            // Check canonical name
            const canonicalScore = this.calculateSimilarity(cleanInput, mapping.canonical.toLowerCase());
            if (canonicalScore > bestScore && canonicalScore >= threshold) {
                bestScore = canonicalScore;
                bestMatch = mapping.canonical;
            }
            // Check synonyms
            for (const synonym of mapping.synonyms) {
                const synonymScore = this.calculateSimilarity(cleanInput, synonym.toLowerCase());
                if (synonymScore > bestScore && synonymScore >= threshold) {
                    bestScore = synonymScore;
                    bestMatch = mapping.canonical;
                }
            }
        }
        return bestMatch;
    }
    /**
     * Calculate string similarity using Levenshtein distance
     */
    static calculateSimilarity(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        if (len1 === 0)
            return len2 === 0 ? 1 : 0;
        if (len2 === 0)
            return 0;
        const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));
        for (let i = 0; i <= len1; i++)
            matrix[i][0] = i;
        for (let j = 0; j <= len2; j++)
            matrix[0][j] = j;
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(matrix[i - 1][j] + 1, // deletion
                matrix[i][j - 1] + 1, // insertion
                matrix[i - 1][j - 1] + cost // substitution
                );
            }
        }
        const maxLen = Math.max(len1, len2);
        return 1 - matrix[len1][len2] / maxLen;
    }
    /**
     * Capitalize skill name properly
     */
    static capitalizeSkill(skill) {
        // Handle special cases
        const specialCases = {
            'html': 'HTML',
            'css': 'CSS',
            'sql': 'SQL',
            'api': 'API',
            'rest': 'REST',
            'graphql': 'GraphQL',
            'json': 'JSON',
            'xml': 'XML',
            'http': 'HTTP',
            'https': 'HTTPS',
            'tcp': 'TCP',
            'ip': 'IP',
            'dns': 'DNS',
            'aws': 'AWS',
            'gcp': 'GCP',
            'ci/cd': 'CI/CD',
            'devops': 'DevOps'
        };
        const lower = skill.toLowerCase();
        if (specialCases[lower]) {
            return specialCases[lower];
        }
        // Default capitalization
        return skill.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    }
    /**
     * Get all available skill categories
     */
    static getCategories() {
        return [...this.SKILL_CATEGORIES];
    }
    /**
     * Get skills by category
     */
    static getSkillsByCategory(categoryName) {
        return this.SKILL_MAPPINGS
            .filter(mapping => mapping.category === categoryName)
            .map(mapping => mapping.canonical);
    }
}
exports.SkillsTaxonomy = SkillsTaxonomy;
SkillsTaxonomy.SKILL_CATEGORIES = [
    {
        name: 'Programming Languages',
        weight: 1.0,
        subcategories: ['Frontend', 'Backend', 'Mobile', 'Data Science', 'Systems']
    },
    {
        name: 'Frameworks & Libraries',
        weight: 0.9,
        subcategories: ['Web Frameworks', 'Mobile Frameworks', 'Testing Frameworks', 'UI Libraries']
    },
    {
        name: 'Databases',
        weight: 0.8,
        subcategories: ['SQL', 'NoSQL', 'Cloud Databases', 'In-Memory']
    },
    {
        name: 'Cloud & DevOps',
        weight: 0.85,
        subcategories: ['Cloud Platforms', 'CI/CD', 'Containerization', 'Monitoring']
    },
    {
        name: 'Tools & IDE',
        weight: 0.7,
        subcategories: ['IDEs', 'Version Control', 'Project Management', 'Design Tools']
    },
    {
        name: 'Soft Skills',
        weight: 0.6,
        subcategories: ['Leadership', 'Communication', 'Problem Solving', 'Project Management']
    }
];
SkillsTaxonomy.SKILL_MAPPINGS = [
    // Programming Languages - Frontend
    {
        canonical: 'JavaScript',
        synonyms: ['js', 'javascript', 'JS', 'ECMAScript', 'es6', 'es2015', 'es2020'],
        category: 'Programming Languages',
        subcategory: 'Frontend',
        weight: 1.0,
        relatedSkills: ['TypeScript', 'Node.js', 'React', 'Vue.js']
    },
    {
        canonical: 'TypeScript',
        synonyms: ['ts', 'typescript', 'TS'],
        category: 'Programming Languages',
        subcategory: 'Frontend',
        weight: 1.0,
        relatedSkills: ['JavaScript', 'Angular', 'React', 'Node.js']
    },
    {
        canonical: 'HTML',
        synonyms: ['html', 'HTML5', 'html5', 'HyperText Markup Language'],
        category: 'Programming Languages',
        subcategory: 'Frontend',
        weight: 0.8,
        relatedSkills: ['CSS', 'JavaScript', 'Web Development']
    },
    {
        canonical: 'CSS',
        synonyms: ['css', 'CSS3', 'css3', 'Cascading Style Sheets', 'styling'],
        category: 'Programming Languages',
        subcategory: 'Frontend',
        weight: 0.8,
        relatedSkills: ['HTML', 'SASS', 'LESS', 'Bootstrap']
    },
    // Programming Languages - Backend
    {
        canonical: 'Python',
        synonyms: ['python', 'py', 'Python3', 'python3'],
        category: 'Programming Languages',
        subcategory: 'Backend',
        weight: 1.0,
        relatedSkills: ['Django', 'Flask', 'FastAPI', 'Pandas', 'NumPy']
    },
    {
        canonical: 'Java',
        synonyms: ['java', 'Java8', 'Java11', 'Java17', 'OpenJDK'],
        category: 'Programming Languages',
        subcategory: 'Backend',
        weight: 1.0,
        relatedSkills: ['Spring', 'Spring Boot', 'Maven', 'Gradle']
    },
    {
        canonical: 'C#',
        synonyms: ['c#', 'csharp', 'C-Sharp', 'dotnet', '.NET'],
        category: 'Programming Languages',
        subcategory: 'Backend',
        weight: 1.0,
        relatedSkills: ['ASP.NET', '.NET Core', 'Entity Framework']
    },
    {
        canonical: 'Node.js',
        synonyms: ['nodejs', 'node', 'Node', 'node.js'],
        category: 'Programming Languages',
        subcategory: 'Backend',
        weight: 0.95,
        relatedSkills: ['JavaScript', 'Express.js', 'npm', 'NestJS']
    },
    {
        canonical: 'PHP',
        synonyms: ['php', 'PHP7', 'PHP8', 'php7', 'php8'],
        category: 'Programming Languages',
        subcategory: 'Backend',
        weight: 0.9,
        relatedSkills: ['Laravel', 'Symfony', 'WordPress', 'MySQL']
    },
    {
        canonical: 'Go',
        synonyms: ['go', 'golang', 'Go language', 'Golang'],
        category: 'Programming Languages',
        subcategory: 'Backend',
        weight: 0.95,
        relatedSkills: ['Docker', 'Kubernetes', 'gRPC']
    },
    {
        canonical: 'Rust',
        synonyms: ['rust', 'Rust language'],
        category: 'Programming Languages',
        subcategory: 'Systems',
        weight: 0.9,
        relatedSkills: ['WebAssembly', 'Systems Programming']
    },
    // Frameworks & Libraries - Web
    {
        canonical: 'React',
        synonyms: ['react', 'reactjs', 'React.js', 'ReactJS'],
        category: 'Frameworks & Libraries',
        subcategory: 'Web Frameworks',
        weight: 1.0,
        relatedSkills: ['JavaScript', 'TypeScript', 'JSX', 'Redux', 'Next.js']
    },
    {
        canonical: 'Vue.js',
        synonyms: ['vue', 'vuejs', 'Vue', 'vue.js'],
        category: 'Frameworks & Libraries',
        subcategory: 'Web Frameworks',
        weight: 0.9,
        relatedSkills: ['JavaScript', 'TypeScript', 'Nuxt.js', 'Vuex']
    },
    {
        canonical: 'Angular',
        synonyms: ['angular', 'angularjs', 'Angular2+', 'angular2', 'ng'],
        category: 'Frameworks & Libraries',
        subcategory: 'Web Frameworks',
        weight: 0.95,
        relatedSkills: ['TypeScript', 'RxJS', 'Angular CLI']
    },
    {
        canonical: 'Express.js',
        synonyms: ['express', 'expressjs', 'express.js'],
        category: 'Frameworks & Libraries',
        subcategory: 'Web Frameworks',
        weight: 0.85,
        relatedSkills: ['Node.js', 'JavaScript', 'REST API']
    },
    {
        canonical: 'NestJS',
        synonyms: ['nestjs', 'nest', 'nest.js'],
        category: 'Frameworks & Libraries',
        subcategory: 'Web Frameworks',
        weight: 0.8,
        relatedSkills: ['Node.js', 'TypeScript', 'Express.js']
    },
    // Backend Frameworks
    {
        canonical: 'Spring Boot',
        synonyms: ['spring boot', 'springboot', 'Spring-Boot'],
        category: 'Frameworks & Libraries',
        subcategory: 'Web Frameworks',
        weight: 0.95,
        relatedSkills: ['Java', 'Spring', 'Maven', 'Gradle']
    },
    {
        canonical: 'Django',
        synonyms: ['django', 'Django REST'],
        category: 'Frameworks & Libraries',
        subcategory: 'Web Frameworks',
        weight: 0.9,
        relatedSkills: ['Python', 'Django REST Framework', 'PostgreSQL']
    },
    {
        canonical: 'Flask',
        synonyms: ['flask', 'Flask-RESTful'],
        category: 'Frameworks & Libraries',
        subcategory: 'Web Frameworks',
        weight: 0.85,
        relatedSkills: ['Python', 'SQLAlchemy', 'Jinja2']
    },
    {
        canonical: 'Laravel',
        synonyms: ['laravel', 'Laravel Framework'],
        category: 'Frameworks & Libraries',
        subcategory: 'Web Frameworks',
        weight: 0.85,
        relatedSkills: ['PHP', 'Eloquent', 'Artisan', 'Blade']
    },
    // Databases - SQL
    {
        canonical: 'PostgreSQL',
        synonyms: ['postgres', 'postgresql', 'psql', 'Postgres'],
        category: 'Databases',
        subcategory: 'SQL',
        weight: 0.9,
        relatedSkills: ['SQL', 'Database Design', 'pgAdmin']
    },
    {
        canonical: 'MySQL',
        synonyms: ['mysql', 'My SQL', 'MariaDB'],
        category: 'Databases',
        subcategory: 'SQL',
        weight: 0.85,
        relatedSkills: ['SQL', 'Database Design', 'phpMyAdmin']
    },
    {
        canonical: 'SQL Server',
        synonyms: ['sql server', 'mssql', 'Microsoft SQL Server', 'MSSQL'],
        category: 'Databases',
        subcategory: 'SQL',
        weight: 0.85,
        relatedSkills: ['SQL', 'T-SQL', 'SSMS']
    },
    {
        canonical: 'Oracle Database',
        synonyms: ['oracle', 'oracle db', 'Oracle SQL'],
        category: 'Databases',
        subcategory: 'SQL',
        weight: 0.8,
        relatedSkills: ['SQL', 'PL/SQL', 'Oracle SQL Developer']
    },
    // Databases - NoSQL
    {
        canonical: 'MongoDB',
        synonyms: ['mongodb', 'mongo', 'Mongo DB'],
        category: 'Databases',
        subcategory: 'NoSQL',
        weight: 0.9,
        relatedSkills: ['NoSQL', 'Mongoose', 'Atlas']
    },
    {
        canonical: 'Redis',
        synonyms: ['redis', 'Redis Cache'],
        category: 'Databases',
        subcategory: 'In-Memory',
        weight: 0.8,
        relatedSkills: ['Caching', 'Session Management']
    },
    {
        canonical: 'Elasticsearch',
        synonyms: ['elasticsearch', 'elastic search', 'Elastic'],
        category: 'Databases',
        subcategory: 'NoSQL',
        weight: 0.8,
        relatedSkills: ['Search Engine', 'Kibana', 'Logstash']
    },
    // Cloud & DevOps
    {
        canonical: 'AWS',
        synonyms: ['aws', 'amazon web services', 'Amazon AWS'],
        category: 'Cloud & DevOps',
        subcategory: 'Cloud Platforms',
        weight: 1.0,
        relatedSkills: ['EC2', 'S3', 'Lambda', 'RDS', 'CloudFormation']
    },
    {
        canonical: 'Azure',
        synonyms: ['azure', 'microsoft azure', 'Azure Cloud'],
        category: 'Cloud & DevOps',
        subcategory: 'Cloud Platforms',
        weight: 0.95,
        relatedSkills: ['Azure Functions', 'Azure DevOps', 'ARM Templates']
    },
    {
        canonical: 'Google Cloud',
        synonyms: ['gcp', 'google cloud platform', 'google cloud', 'GCP'],
        category: 'Cloud & DevOps',
        subcategory: 'Cloud Platforms',
        weight: 0.9,
        relatedSkills: ['Compute Engine', 'Cloud Functions', 'BigQuery']
    },
    {
        canonical: 'Docker',
        synonyms: ['docker', 'containerization', 'Docker Container'],
        category: 'Cloud & DevOps',
        subcategory: 'Containerization',
        weight: 0.95,
        relatedSkills: ['Kubernetes', 'Container Orchestration', 'Docker Compose']
    },
    {
        canonical: 'Kubernetes',
        synonyms: ['kubernetes', 'k8s', 'K8s', 'kube'],
        category: 'Cloud & DevOps',
        subcategory: 'Containerization',
        weight: 0.9,
        relatedSkills: ['Docker', 'Container Orchestration', 'Helm']
    },
    // Version Control & Tools
    {
        canonical: 'Git',
        synonyms: ['git', 'version control', 'source control'],
        category: 'Tools & IDE',
        subcategory: 'Version Control',
        weight: 0.9,
        relatedSkills: ['GitHub', 'GitLab', 'Bitbucket']
    },
    {
        canonical: 'GitHub',
        synonyms: ['github', 'GitHub Actions', 'github.com'],
        category: 'Tools & IDE',
        subcategory: 'Version Control',
        weight: 0.8,
        relatedSkills: ['Git', 'CI/CD', 'Pull Requests']
    },
    // Soft Skills
    {
        canonical: 'Leadership',
        synonyms: ['leadership', 'team lead', 'team leader', 'leading teams'],
        category: 'Soft Skills',
        subcategory: 'Leadership',
        weight: 0.8,
        relatedSkills: ['Project Management', 'Mentoring', 'Team Building']
    },
    {
        canonical: 'Communication',
        synonyms: ['communication', 'verbal communication', 'written communication', 'presentation'],
        category: 'Soft Skills',
        subcategory: 'Communication',
        weight: 0.7,
        relatedSkills: ['Public Speaking', 'Technical Writing', 'Documentation']
    },
    {
        canonical: 'Problem Solving',
        synonyms: ['problem solving', 'analytical thinking', 'critical thinking', 'troubleshooting'],
        category: 'Soft Skills',
        subcategory: 'Problem Solving',
        weight: 0.8,
        relatedSkills: ['Debugging', 'Analysis', 'Root Cause Analysis']
    }
];
SkillsTaxonomy.SKILL_HIERARCHY = [
    {
        category: 'Programming Languages',
        subcategories: {
            'Frontend': {
                skills: ['JavaScript', 'TypeScript', 'HTML', 'CSS', 'SASS', 'LESS'],
                weight: 1.0
            },
            'Backend': {
                skills: ['Python', 'Java', 'C#', 'Node.js', 'PHP', 'Go', 'Ruby'],
                weight: 1.0
            },
            'Mobile': {
                skills: ['Swift', 'Kotlin', 'Java', 'Dart', 'React Native', 'Flutter'],
                weight: 0.9
            },
            'Data Science': {
                skills: ['Python', 'R', 'SQL', 'Scala', 'Julia'],
                weight: 0.95
            }
        }
    },
    {
        category: 'Frameworks & Libraries',
        subcategories: {
            'Web Frameworks': {
                skills: ['React', 'Vue.js', 'Angular', 'Express.js', 'NestJS', 'Spring Boot', 'Django', 'Flask', 'Laravel'],
                weight: 0.95
            },
            'Mobile Frameworks': {
                skills: ['React Native', 'Flutter', 'Xamarin', 'Ionic'],
                weight: 0.85
            },
            'Testing Frameworks': {
                skills: ['Jest', 'Mocha', 'Cypress', 'Selenium', 'JUnit', 'pytest'],
                weight: 0.8
            }
        }
    }
];
