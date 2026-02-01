import { ValueObject } from './base/value-object.js';
import type {
  QuestionnaireUserRole,
  CompanySize,
} from '../../application/dtos/questionnaire.dto.js';

/**
 * Represents the user profile.
 */
export class UserProfile extends ValueObject<{
  role: QuestionnaireUserRole;
  industry: string;
  companySize: CompanySize;
  location: string;
}> {
  /**
   * Performs the role operation.
   * @returns The QuestionnaireUserRole.
   */
  public get role(): QuestionnaireUserRole {
    return this.props.role;
  }
  /**
   * Performs the industry operation.
   * @returns The string value.
   */
  public get industry(): string {
    return this.props.industry;
  }
  /**
   * Performs the company size operation.
   * @returns The CompanySize.
   */
  public get companySize(): CompanySize {
    return this.props.companySize;
  }
  /**
   * Performs the location operation.
   * @returns The string value.
   */
  public get location(): string {
    return this.props.location;
  }
}
