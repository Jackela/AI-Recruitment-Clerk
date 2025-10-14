// 结果类
/**
 * Represents the incentive validation result.
 */
export class IncentiveValidationResult {
  /**
   * Initializes a new instance of the Incentive Validation Result.
   * @param isValid - The is valid.
   * @param errors - The errors.
   */
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[],
  ) {}
}
