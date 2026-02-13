import type { QuestionnaireStatus } from './questionnaire.dto';
import type { QuestionSection, QualityThreshold } from './questionnaire-types.dto';

// ========================
// Controller DTOs
// ========================

/**
 * DTO for creating a new questionnaire
 */
export interface CreateQuestionnaireDto {
  title: string;
  description?: string;
  sections?: QuestionSection[];
  qualityThresholds?: QualityThreshold;
  settings?: {
    allowAnonymous?: boolean;
    requireAuthentication?: boolean;
    maxSubmissionsPerUser?: number;
    expirationDate?: string;
  };
  tags?: string[];
}

/**
 * DTO for updating an existing questionnaire
 */
export interface UpdateQuestionnaireDto {
  title?: string;
  description?: string;
  status?: QuestionnaireStatus;
  sections?: QuestionSection[];
  qualityThresholds?: QualityThreshold;
  settings?: {
    allowAnonymous?: boolean;
    requireAuthentication?: boolean;
    maxSubmissionsPerUser?: number;
    expirationDate?: string;
  };
  tags?: string[];
}

/**
 * DTO for questionnaire response/submission data
 */
export interface QuestionnaireResponseDto {
  id: string;
  questionnaireId: string;
  submittedBy: string;
  submittedAt: string;
  answers: Record<string, unknown>;
  qualityScore: number;
  completionTime: number;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    location?: string;
  };
}

/**
 * DTO for questionnaire analytics
 */
export interface QuestionnaireAnalyticsDto {
  questionnaireId: string;
  title: string;
  totalSubmissions: number;
  averageQualityScore: number;
  averageCompletionTime: number;
  completionRate: number;
  submissionsByDay: {
    date: string;
    count: number;
  }[];
  qualityDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  questionAnalytics: {
    questionId: string;
    questionText: string;
    responseRate: number;
    averageScore?: number;
    commonAnswers?: string[];
  }[];
}
