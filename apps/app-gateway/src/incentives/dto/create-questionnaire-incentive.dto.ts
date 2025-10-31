export interface CreateQuestionnaireIncentiveDto {
  questionnaireId: string;
  qualityScore?: number;
  contactInfo?: {
    email?: string;
    phone?: string;
    wechat?: string;
    alipay?: string;
  };
  userIP?: string;
  businessValue?: Record<string, unknown>;
  incentiveType?: string;
  metadata?: Record<string, unknown>;
}
