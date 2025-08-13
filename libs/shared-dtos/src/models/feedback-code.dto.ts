export interface FeedbackCodeDto {
  id?: string;
  code: string;
  generatedAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  alipayAccount?: string;
  questionnaireData?: any;
  paymentStatus: 'pending' | 'paid' | 'rejected';
  qualityScore?: number;
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
  qualityScore: number;
}

export interface MarketingStatsDto {
  totalCodes: number;
  usedCodes: number;
  pendingPayments: number;
  totalPaid: number;
  averageQualityScore: number;
}