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
  public get currentScreeningMethod(): ScreeningMethod {
    return this.props.currentScreeningMethod;
  }
  /**
   * Performs the time spent per resume operation.
   * @returns The number value.
   */
  public get timeSpentPerResume(): number {
    return this.props.timeSpentPerResume;
  }
  /**
   * Performs the resumes per week operation.
   * @returns The number value.
   */
  public get resumesPerWeek(): number {
    return this.props.resumesPerWeek;
  }
  /**
   * Performs the time saving percentage operation.
   * @returns The number value.
   */
  public get timeSavingPercentage(): number {
    return this.props.timeSavingPercentage;
  }
  /**
   * Performs the willingness to pay monthly operation.
   * @returns The number value.
   */
  public get willingnessToPayMonthly(): number {
    return this.props.willingnessToPayMonthly;
  }
  /**
   * Performs the recommend likelihood operation.
   * @returns The Rating.
   */
  public get recommendLikelihood(): Rating {
    return this.props.recommendLikelihood;
  }
}
