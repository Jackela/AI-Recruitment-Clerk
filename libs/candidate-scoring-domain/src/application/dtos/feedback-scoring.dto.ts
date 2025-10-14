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
  qualityScore?: number; // This is the scoring-related field
  paymentAmount?: number;
  createdBy?: string;
}

/**
 * Defines the shape of the create feedback code dto.
 */
export interface CreateFeedbackCodeDto {
  code: string;
}

/**
 * Defines the shape of the mark feedback code used dto.
 */
export interface MarkFeedbackCodeUsedDto {
  code: string;
  alipayAccount: string;
  questionnaireData: any;
}

/**
 * Defines the shape of the payment request dto.
 */
export interface PaymentRequestDto {
  feedbackCode: string;
  alipayAccount: string;
  amount: number;
  qualityScore: number; // This is the scoring-related field
}

/**
 * Defines the shape of the marketing stats dto.
 */
export interface MarketingStatsDto {
  totalCodes: number;
  usedCodes: number;
  pendingPayments: number;
  totalPaid: number;
  averageQualityScore: number; // This is the scoring-related field
}
