import { ValueObject } from './base/value-object.js';
import type {
  ScreeningMethod,
  Rating,
} from '../../application/dtos/questionnaire.dto.js';

/**
 * Represents the business value.
 */
export class BusinessValue extends ValueObject<{
  currentScreeningMethod: ScreeningMethod;
  timeSpentPerResume: number;
  resumesPerWeek: number;
  timeSavingPercentage: number;
  willingnessToPayMonthly: number;
  recommendLikelihood: Rating;
}> {
  /**
   * Performs the current screening method operation.
   * @returns The ScreeningMethod.
   */
  get currentScreeningMethod(): ScreeningMethod {
    return this.props.currentScreeningMethod;
  }
  /**
   * Performs the time spent per resume operation.
   * @returns The number value.
   */
  get timeSpentPerResume(): number {
    return this.props.timeSpentPerResume;
  }
  /**
   * Performs the resumes per week operation.
   * @returns The number value.
   */
  get resumesPerWeek(): number {
    return this.props.resumesPerWeek;
  }
  /**
   * Performs the time saving percentage operation.
   * @returns The number value.
   */
  get timeSavingPercentage(): number {
    return this.props.timeSavingPercentage;
  }
  /**
   * Performs the willingness to pay monthly operation.
   * @returns The number value.
   */
  get willingnessToPayMonthly(): number {
    return this.props.willingnessToPayMonthly;
  }
  /**
   * Performs the recommend likelihood operation.
   * @returns The Rating.
   */
  get recommendLikelihood(): Rating {
    return this.props.recommendLikelihood;
  }
}
