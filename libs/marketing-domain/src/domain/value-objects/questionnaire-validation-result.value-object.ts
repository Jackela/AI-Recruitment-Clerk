export class QuestionnaireValidationResult {
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[]
  ) {}
}
