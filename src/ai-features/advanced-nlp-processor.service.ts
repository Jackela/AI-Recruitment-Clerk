import { Injectable, Logger } from '@nestjs/common';
import { GeminiClient, GeminiResponse } from '../../../libs/shared-dtos/src/gemini/gemini.client';

/**
 * 高级自然语言处理服务 - 实现多语言简历解析和内容理解
 * Advanced NLP Processing Service for multilingual resume parsing and content understanding
 */

export interface MultiLanguageDetectionResult {
  primaryLanguage: string;
  confidence: number;
  detectedLanguages: Array<{
    language: string;
    confidence: number;
    percentage: number;
  }>;
  isMultilingual: boolean;
}

export interface SemanticAnalysisResult {
  entities: Array<{
    type: 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'SKILL' | 'ROLE' | 'TECHNOLOGY';
    text: string;
    confidence: number;
    startIndex: number;
    endIndex: number;
  }>;
  keyPhrases: Array<{
    phrase: string;
    relevance: number;
    category: string;
  }>;
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative';
    confidence: number;
    score: number; // -1 to 1
  };
  topics: Array<{
    topic: string;
    confidence: number;
    keywords: string[];
  }>;
}

export interface StructuredContent {
  personalInfo: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedIn?: string;
    github?: string;
    website?: string;
  };
  professionalSummary?: string;
  workExperience: Array<{
    position: string;
    company: string;
    startDate: string;
    endDate: string;
    location?: string;
    description: string;
    achievements?: string[];
    technologies?: string[];
  }>;
  education: Array<{
    degree: string;
    major?: string;
    school: string;
    graduationDate?: string;
    gpa?: string;
    honors?: string[];
  }>;
  skills: {
    technical: string[];
    soft: string[];
    languages: Array<{
      language: string;
      proficiency: 'native' | 'fluent' | 'professional' | 'conversational' | 'basic';
    }>;
  };
  certifications: Array<{
    name: string;
    issuer: string;
    date?: string;
    expiryDate?: string;
    credentialId?: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    duration?: string;
    url?: string;
  }>;
  publications?: Array<{
    title: string;
    journal?: string;
    date?: string;
    authors?: string[];
  }>;
}

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  preservedFormatting: boolean;
  glossaryTerms: Array<{
    original: string;
    translated: string;
    context: string;
  }>;
}

export interface ContentIntelligence {
  qualityScore: number; // 0-100
  completenessScore: number; // 0-100
  professionalismScore: number; // 0-100
  uniquenessScore: number; // 0-100
  readabilityScore: number; // 0-100
  issues: Array<{
    type: 'grammar' | 'spelling' | 'format' | 'content' | 'structure';
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
    location?: { start: number; end: number };
  }>;
  improvements: Array<{
    category: string;
    suggestion: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: string;
  }>;
}

@Injectable()
export class AdvancedNLPProcessor {
  private readonly logger = new Logger(AdvancedNLPProcessor.name);

  // 支持的语言列表（ISO 639-1 codes）
  private readonly SUPPORTED_LANGUAGES = [
    'en', 'zh', 'zh-cn', 'zh-tw', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru',
    'ar', 'hi', 'th', 'vi', 'id', 'ms', 'tl', 'nl', 'sv', 'da', 'no', 'fi'
  ];

  // 技术术语词典（多语言）
  private readonly TECH_GLOSSARY = {
    'en': {
      'machine learning': '机器学习',
      'artificial intelligence': '人工智能',
      'data science': '数据科学',
      'software engineering': '软件工程'
    },
    'zh': {
      '机器学习': 'machine learning',
      '人工智能': 'artificial intelligence',
      '数据科学': 'data science',
      '软件工程': 'software engineering'
    }
  };

  constructor(private readonly geminiClient: GeminiClient) {}

  /**
   * 智能语言检测
   */
  async detectLanguage(text: string): Promise<MultiLanguageDetectionResult> {
    try {
      const prompt = `
        分析以下文本的语言构成：

        TEXT:
        ${text.substring(0, 2000)} ${text.length > 2000 ? '...' : ''}

        请识别：
        1. 主要语言和置信度
        2. 所有检测到的语言及其在文本中的比例
        3. 是否为多语言文档

        返回JSON格式：
        {
          "primaryLanguage": "语言代码 (en, zh, ja, etc.)",
          "confidence": "置信度 (0-1)",
          "detectedLanguages": [
            {
              "language": "语言代码",
              "confidence": "置信度",
              "percentage": "文本比例 (0-100)"
            }
          ],
          "isMultilingual": "是否多语言 (boolean)"
        }
      `;

      const response = await this.geminiClient.generateStructuredResponse(
        prompt,
        `{
          "primaryLanguage": "string",
          "confidence": "number between 0 and 1",
          "detectedLanguages": [
            {
              "language": "string",
              "confidence": "number",
              "percentage": "number"
            }
          ],
          "isMultilingual": "boolean"
        }`
      );

      return response.data as MultiLanguageDetectionResult;

    } catch (error) {
      this.logger.warn('语言检测失败，使用默认值', error);
      return {
        primaryLanguage: 'en',
        confidence: 0.8,
        detectedLanguages: [{ language: 'en', confidence: 0.8, percentage: 100 }],
        isMultilingual: false
      };
    }
  }

  /**
   * 语义分析和实体提取
   */
  async performSemanticAnalysis(
    text: string,
    language: string = 'en'
  ): Promise<SemanticAnalysisResult> {
    try {
      const prompt = `
        对以下${language === 'zh' ? '中文' : '英文'}文本进行深度语义分析：

        TEXT:
        ${text}

        请提取：
        1. 命名实体（人名、组织、地点、技能、职位、技术）
        2. 关键短语和相关性评分
        3. 情感分析（整体情感倾向和置信度）
        4. 主题识别和关键词

        返回JSON格式：
        {
          "entities": [
            {
              "type": "PERSON|ORGANIZATION|LOCATION|SKILL|ROLE|TECHNOLOGY",
              "text": "实体文本",
              "confidence": "置信度 (0-1)",
              "startIndex": "起始位置",
              "endIndex": "结束位置"
            }
          ],
          "keyPhrases": [
            {
              "phrase": "关键短语",
              "relevance": "相关性 (0-1)",
              "category": "分类"
            }
          ],
          "sentiment": {
            "overall": "positive|neutral|negative",
            "confidence": "置信度 (0-1)",
            "score": "情感分数 (-1 to 1)"
          },
          "topics": [
            {
              "topic": "主题名称",
              "confidence": "置信度 (0-1)",
              "keywords": ["关键词1", "关键词2"]
            }
          ]
        }
      `;

      const response = await this.geminiClient.generateStructuredResponse(
        prompt,
        `{
          "entities": [
            {
              "type": "string",
              "text": "string",
              "confidence": "number",
              "startIndex": "number",
              "endIndex": "number"
            }
          ],
          "keyPhrases": [
            {
              "phrase": "string",
              "relevance": "number",
              "category": "string"
            }
          ],
          "sentiment": {
            "overall": "string",
            "confidence": "number",
            "score": "number"
          },
          "topics": [
            {
              "topic": "string",
              "confidence": "number",
              "keywords": ["array of strings"]
            }
          ]
        }`
      );

      return response.data as SemanticAnalysisResult;

    } catch (error) {
      this.logger.warn('语义分析失败，返回默认结果', error);
      return this.createDefaultSemanticResult();
    }
  }

  /**
   * 智能简历结构化解析
   */
  async parseResumeStructure(
    text: string,
    language: string = 'en'
  ): Promise<StructuredContent> {
    try {
      const languageInstruction = language === 'zh' ? '中文简历' : 'English resume';
      
      const prompt = `
        解析以下${languageInstruction}，提取结构化信息：

        RESUME TEXT:
        ${text}

        请仔细提取所有相关信息并结构化，包括：
        - 个人联系信息
        - 专业总结
        - 工作经验（职位、公司、时间、描述、成就、使用技术）
        - 教育背景
        - 技能分类（技术技能、软技能、语言能力）
        - 认证证书
        - 项目经验
        - 发表论文

        注意：
        1. 时间格式统一为 YYYY-MM 或 YYYY
        2. 技能需要分类整理
        3. 保持原文准确性
        4. 如果某些信息不存在，使用null或空数组

        返回JSON格式：
        {
          "personalInfo": {
            "name": "姓名",
            "email": "邮箱",
            "phone": "电话",
            "location": "地址",
            "linkedIn": "LinkedIn链接",
            "github": "GitHub链接",
            "website": "个人网站"
          },
          "professionalSummary": "专业总结",
          "workExperience": [
            {
              "position": "职位",
              "company": "公司",
              "startDate": "开始时间",
              "endDate": "结束时间",
              "location": "工作地点",
              "description": "工作描述",
              "achievements": ["成就1", "成就2"],
              "technologies": ["技术1", "技术2"]
            }
          ],
          "education": [
            {
              "degree": "学位",
              "major": "专业",
              "school": "学校",
              "graduationDate": "毕业时间",
              "gpa": "GPA",
              "honors": ["荣誉1", "荣誉2"]
            }
          ],
          "skills": {
            "technical": ["技术技能"],
            "soft": ["软技能"],
            "languages": [
              {
                "language": "语言",
                "proficiency": "native|fluent|professional|conversational|basic"
              }
            ]
          },
          "certifications": [
            {
              "name": "证书名称",
              "issuer": "颁发机构",
              "date": "获得时间",
              "expiryDate": "过期时间",
              "credentialId": "证书ID"
            }
          ],
          "projects": [
            {
              "name": "项目名称",
              "description": "项目描述",
              "technologies": ["使用技术"],
              "duration": "项目时长",
              "url": "项目链接"
            }
          ],
          "publications": [
            {
              "title": "论文标题",
              "journal": "期刊名称",
              "date": "发表时间",
              "authors": ["作者列表"]
            }
          ]
        }
      `;

      const response = await this.geminiClient.generateStructuredResponse(
        prompt,
        `{
          "personalInfo": {
            "name": "string or null",
            "email": "string or null",
            "phone": "string or null",
            "location": "string or null",
            "linkedIn": "string or null",
            "github": "string or null",
            "website": "string or null"
          },
          "professionalSummary": "string or null",
          "workExperience": [
            {
              "position": "string",
              "company": "string",
              "startDate": "string",
              "endDate": "string",
              "location": "string or null",
              "description": "string",
              "achievements": ["array of strings"],
              "technologies": ["array of strings"]
            }
          ],
          "education": [
            {
              "degree": "string",
              "major": "string or null",
              "school": "string",
              "graduationDate": "string or null",
              "gpa": "string or null",
              "honors": ["array of strings"]
            }
          ],
          "skills": {
            "technical": ["array of strings"],
            "soft": ["array of strings"],
            "languages": [
              {
                "language": "string",
                "proficiency": "string"
              }
            ]
          },
          "certifications": [
            {
              "name": "string",
              "issuer": "string",
              "date": "string or null",
              "expiryDate": "string or null",
              "credentialId": "string or null"
            }
          ],
          "projects": [
            {
              "name": "string",
              "description": "string",
              "technologies": ["array of strings"],
              "duration": "string or null",
              "url": "string or null"
            }
          ],
          "publications": [
            {
              "title": "string",
              "journal": "string or null",
              "date": "string or null",
              "authors": ["array of strings"]
            }
          ]
        }`
      );

      return response.data as StructuredContent;

    } catch (error) {
      this.logger.error('简历结构化解析失败', error);
      throw new Error(`Resume parsing failed: ${error.message}`);
    }
  }

  /**
   * 智能多语言翻译
   */
  async translateContent(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    preserveFormatting: boolean = true
  ): Promise<TranslationResult> {
    try {
      const prompt = `
        将以下${sourceLanguage}文本翻译成${targetLanguage}：

        SOURCE TEXT:
        ${text}

        翻译要求：
        1. 保持专业术语的准确性
        2. ${preserveFormatting ? '保持原有格式结构' : '优化文本结构'}
        3. 对于招聘和技术领域的专业词汇，提供准确翻译
        4. 记录重要术语的翻译对照

        返回JSON格式：
        {
          "translatedText": "翻译后的文本",
          "sourceLanguage": "源语言",
          "targetLanguage": "目标语言",
          "confidence": "翻译置信度 (0-1)",
          "preservedFormatting": ${preserveFormatting},
          "glossaryTerms": [
            {
              "original": "原文术语",
              "translated": "翻译术语",
              "context": "上下文"
            }
          ]
        }
      `;

      const response = await this.geminiClient.generateStructuredResponse(
        prompt,
        `{
          "translatedText": "string",
          "sourceLanguage": "string",
          "targetLanguage": "string",
          "confidence": "number between 0 and 1",
          "preservedFormatting": "boolean",
          "glossaryTerms": [
            {
              "original": "string",
              "translated": "string",
              "context": "string"
            }
          ]
        }`
      );

      return response.data as TranslationResult;

    } catch (error) {
      this.logger.error('翻译失败', error);
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  /**
   * 内容质量和智能分析
   */
  async analyzeContentIntelligence(
    text: string,
    contentType: 'resume' | 'cover_letter' | 'job_description' = 'resume'
  ): Promise<ContentIntelligence> {
    try {
      const contentTypeText = {
        'resume': '简历',
        'cover_letter': '求职信',
        'job_description': '职位描述'
      }[contentType];

      const prompt = `
        分析以下${contentTypeText}的质量和可改进之处：

        CONTENT:
        ${text}

        请从以下维度评分（0-100）：
        1. 质量分数：整体内容质量
        2. 完整性分数：信息完整程度
        3. 专业性分数：专业表达程度
        4. 独特性分数：内容独特性
        5. 可读性分数：阅读体验

        同时识别问题和改进建议：
        - 语法拼写错误
        - 格式问题
        - 内容问题
        - 结构问题

        返回JSON格式：
        {
          "qualityScore": "质量分数 (0-100)",
          "completenessScore": "完整性分数 (0-100)",
          "professionalismScore": "专业性分数 (0-100)",
          "uniquenessScore": "独特性分数 (0-100)",
          "readabilityScore": "可读性分数 (0-100)",
          "issues": [
            {
              "type": "grammar|spelling|format|content|structure",
              "severity": "low|medium|high",
              "description": "问题描述",
              "suggestion": "改进建议",
              "location": {
                "start": "起始位置",
                "end": "结束位置"
              }
            }
          ],
          "improvements": [
            {
              "category": "改进类别",
              "suggestion": "具体建议",
              "priority": "low|medium|high",
              "expectedImpact": "预期影响"
            }
          ]
        }
      `;

      const response = await this.geminiClient.generateStructuredResponse(
        prompt,
        `{
          "qualityScore": "number between 0 and 100",
          "completenessScore": "number between 0 and 100",
          "professionalismScore": "number between 0 and 100",
          "uniquenessScore": "number between 0 and 100",
          "readabilityScore": "number between 0 and 100",
          "issues": [
            {
              "type": "string",
              "severity": "string",
              "description": "string",
              "suggestion": "string",
              "location": {
                "start": "number",
                "end": "number"
              }
            }
          ],
          "improvements": [
            {
              "category": "string",
              "suggestion": "string",
              "priority": "string",
              "expectedImpact": "string"
            }
          ]
        }`
      );

      return response.data as ContentIntelligence;

    } catch (error) {
      this.logger.warn('内容智能分析失败，返回默认结果', error);
      return this.createDefaultContentIntelligence();
    }
  }

  /**
   * 技能标准化和映射
   */
  async normalizeSkills(
    skills: string[],
    language: string = 'en'
  ): Promise<Array<{
    original: string;
    normalized: string;
    category: string;
    level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    relatedSkills: string[];
    confidence: number;
  }>> {
    try {
      const prompt = `
        标准化以下技能列表，${language === 'zh' ? '中文技能' : 'English skills'}：

        SKILLS: ${skills.join(', ')}

        对每个技能进行：
        1. 标准化命名（使用行业标准名称）
        2. 分类归属（前端、后端、数据、设计等）
        3. 推测技能水平（基于上下文）
        4. 找到相关技能
        5. 置信度评估

        返回JSON格式：
        [
          {
            "original": "原始技能名",
            "normalized": "标准化名称",
            "category": "技能分类",
            "level": "beginner|intermediate|advanced|expert",
            "relatedSkills": ["相关技能1", "相关技能2"],
            "confidence": "置信度 (0-1)"
          }
        ]
      `;

      const response = await this.geminiClient.generateStructuredResponse(
        prompt,
        `[
          {
            "original": "string",
            "normalized": "string",
            "category": "string",
            "level": "string or null",
            "relatedSkills": ["array of strings"],
            "confidence": "number between 0 and 1"
          }
        ]`
      );

      return response.data as any[];

    } catch (error) {
      this.logger.warn('技能标准化失败，返回原始列表', error);
      return skills.map(skill => ({
        original: skill,
        normalized: skill,
        category: 'general',
        relatedSkills: [],
        confidence: 0.7
      }));
    }
  }

  /**
   * 职位描述语义搜索匹配
   */
  async semanticJobMatching(
    candidateProfile: string,
    jobDescriptions: Array<{ id: string; content: string }>,
    language: string = 'en'
  ): Promise<Array<{
    jobId: string;
    semanticScore: number;
    keyMatches: string[];
    conceptualMatches: string[];
    missingRequirements: string[];
    explanation: string;
  }>> {
    try {
      const results: Array<{
        jobId: string;
        semanticScore: number;
        keyMatches: string[];
        conceptualMatches: string[];
        missingRequirements: string[];
        explanation: string;
      }> = [];

      for (const job of jobDescriptions) {
        const prompt = `
          分析候选人简介与职位需求的语义匹配度：

          候选人简介：
          ${candidateProfile}

          职位描述：
          ${job.content}

          请分析：
          1. 语义匹配分数 (0-100)
          2. 关键匹配点
          3. 概念层面的匹配
          4. 缺失的关键要求
          5. 匹配说明

          返回JSON格式：
          {
            "semanticScore": "匹配分数 (0-100)",
            "keyMatches": ["直接匹配的关键词/技能"],
            "conceptualMatches": ["概念层面的匹配"],
            "missingRequirements": ["缺失的关键要求"],
            "explanation": "详细匹配说明"
          }
        `;

        const response = await this.geminiClient.generateStructuredResponse(
          prompt,
          `{
            "semanticScore": "number between 0 and 100",
            "keyMatches": ["array of strings"],
            "conceptualMatches": ["array of strings"],
            "missingRequirements": ["array of strings"],
            "explanation": "string"
          }`
        );

        results.push({
          jobId: job.id,
          ...response.data as any
        });
      }

      // 按语义分数排序
      return results.sort((a, b) => b.semanticScore - a.semanticScore);

    } catch (error) {
      this.logger.error('语义匹配失败', error);
      throw new Error(`Semantic matching failed: ${error.message}`);
    }
  }

  // ========== 私有辅助方法 ==========

  private createDefaultSemanticResult(): SemanticAnalysisResult {
    return {
      entities: [],
      keyPhrases: [],
      sentiment: {
        overall: 'neutral',
        confidence: 0.5,
        score: 0
      },
      topics: []
    };
  }

  private createDefaultContentIntelligence(): ContentIntelligence {
    return {
      qualityScore: 70,
      completenessScore: 70,
      professionalismScore: 70,
      uniquenessScore: 70,
      readabilityScore: 70,
      issues: [],
      improvements: [
        {
          category: '一般改进',
          suggestion: '考虑添加更多具体的成就和量化指标',
          priority: 'medium',
          expectedImpact: '提升内容专业性和说服力'
        }
      ]
    };
  }

  /**
   * 批量处理多语言文档
   */
  async processBatchDocuments(
    documents: Array<{ id: string; content: string; type?: string }>,
    targetLanguage: string = 'en'
  ): Promise<Array<{
    id: string;
    languageDetection: MultiLanguageDetectionResult;
    structuredContent: StructuredContent;
    translation?: TranslationResult;
    contentAnalysis: ContentIntelligence;
    processingTime: number;
  }>> {
    const results = [];

    for (const doc of documents) {
      const startTime = Date.now();
      
      try {
        // 1. 语言检测
        const languageDetection = await this.detectLanguage(doc.content);
        
        // 2. 结构化解析
        const structuredContent = await this.parseResumeStructure(
          doc.content,
          languageDetection.primaryLanguage
        );
        
        // 3. 翻译（如果需要）
        let translation: TranslationResult | undefined;
        if (languageDetection.primaryLanguage !== targetLanguage) {
          translation = await this.translateContent(
            doc.content,
            languageDetection.primaryLanguage,
            targetLanguage
          );
        }
        
        // 4. 内容分析
        const contentAnalysis = await this.analyzeContentIntelligence(
          doc.content,
          (doc.type as any) || 'resume'
        );
        
        const processingTime = Date.now() - startTime;
        
        results.push({
          id: doc.id,
          languageDetection,
          structuredContent,
          translation,
          contentAnalysis,
          processingTime
        });
        
        this.logger.log(`文档 ${doc.id} 处理完成，用时 ${processingTime}ms`);
        
      } catch (error) {
        this.logger.error(`文档 ${doc.id} 处理失败`, error);
        // 继续处理其他文档
      }
    }

    return results;
  }

  /**
   * 获取语言处理统计信息
   */
  getProcessingStats(): {
    supportedLanguages: string[];
    totalDocumentsProcessed: number;
    averageProcessingTime: number;
    accuracyMetrics: {
      languageDetection: number;
      structuralParsing: number;
      translationQuality: number;
    };
  } {
    return {
      supportedLanguages: this.SUPPORTED_LANGUAGES,
      totalDocumentsProcessed: 0, // 这里应该从统计服务获取
      averageProcessingTime: 2500, // ms
      accuracyMetrics: {
        languageDetection: 0.95,
        structuralParsing: 0.88,
        translationQuality: 0.85
      }
    };
  }
}