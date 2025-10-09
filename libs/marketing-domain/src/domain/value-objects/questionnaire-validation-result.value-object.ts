/**
 * Represents the questionnaire validation result.
 */
export class QuestionnaireValidationResult {
  /**
   * Initializes a new instance of the Questionnaire Validation Result.
   * @param isValid - The is valid.
   * @param errors - The errors.
   */
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[]
  ) {}
}
