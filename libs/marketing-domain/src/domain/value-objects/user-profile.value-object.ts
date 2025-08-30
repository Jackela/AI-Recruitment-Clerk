import { ValueObject } from './base/value-object.js';
import { QuestionnaireUserRole, CompanySize } from '../../application/dtos/questionnaire.dto.js';

export class UserProfile extends ValueObject<{
  role: QuestionnaireUserRole;
  industry: string;
  companySize: CompanySize;
  location: string;
}> {
  get role(): QuestionnaireUserRole { return this.props.role; }
  get industry(): string { return this.props.industry; }
  get companySize(): CompanySize { return this.props.companySize; }
  get location(): string { return this.props.location; }
}
