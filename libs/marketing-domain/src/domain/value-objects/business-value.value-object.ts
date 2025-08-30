import { ValueObject } from './base/value-object.js';
import { ScreeningMethod, Rating } from '../../application/dtos/questionnaire.dto.js';

export class BusinessValue extends ValueObject<{
  currentScreeningMethod: ScreeningMethod;
  timeSpentPerResume: number;
  resumesPerWeek: number;
  timeSavingPercentage: number;
  willingnessToPayMonthly: number;
  recommendLikelihood: Rating;
}> {
  get currentScreeningMethod(): ScreeningMethod { return this.props.currentScreeningMethod; }
  get timeSpentPerResume(): number { return this.props.timeSpentPerResume; }
  get resumesPerWeek(): number { return this.props.resumesPerWeek; }
  get timeSavingPercentage(): number { return this.props.timeSavingPercentage; }
  get willingnessToPayMonthly(): number { return this.props.willingnessToPayMonthly; }
  get recommendLikelihood(): Rating { return this.props.recommendLikelihood; }
}
