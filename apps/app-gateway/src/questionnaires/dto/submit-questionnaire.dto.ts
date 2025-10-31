export interface SubmitQuestionnaireDto {
  answers?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
}
