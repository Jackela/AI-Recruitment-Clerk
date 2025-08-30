/**
 * Candidate Scoring Domain - Feedback Scoring DTOs
 * Moved from libs/shared-dtos/src/models/feedback-code.dto.ts
 */

export interface FeedbackCodeDto {
  id?: string;
  code: string;
  generatedAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  alipayAccount?: string;
  questionnaireData?: any;
  paymentStatus: 'pending' | 'paid' | 'rejected';
  qualityScore?: number;  // This is the scoring-related field
  paymentAmount?: number;
  createdBy?: string;
}

export interface CreateFeedbackCodeDto {
  code: string;
}

export interface MarkFeedbackCodeUsedDto {
  code: string;
  alipayAccount: string;
  questionnaireData: any;
}

export interface PaymentRequestDto {
  feedbackCode: string;
  alipayAccount: string;
  amount: number;
  qualityScore: number;  // This is the scoring-related field
}

export interface MarketingStatsDto {
  totalCodes: number;
  usedCodes: number;
  pendingPayments: number;
  totalPaid: number;
  averageQualityScore: number;  // This is the scoring-related field
}