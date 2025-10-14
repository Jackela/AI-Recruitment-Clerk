import { ValueObject } from './base/value-object.js';
import { Rating } from '../../application/dtos/questionnaire.dto.js';

/**
 * Represents the user experience.
 */
export class UserExperience extends ValueObject<{
  overallSatisfaction: Rating;
  accuracyRating: Rating;
  speedRating: Rating;
  uiRating: Rating;
  mostUsefulFeature: string;
  mainPainPoint?: string;
  improvementSuggestion?: string;
}> {
  /**
   * Performs the overall satisfaction operation.
   * @returns The Rating.
   */
  get overallSatisfaction(): Rating {
    return this.props.overallSatisfaction;
  }
  /**
   * Performs the accuracy rating operation.
   * @returns The Rating.
   */
  get accuracyRating(): Rating {
    return this.props.accuracyRating;
  }
  /**
   * Performs the speed rating operation.
   * @returns The Rating.
   */
  get speedRating(): Rating {
    return this.props.speedRating;
  }
  /**
   * Performs the ui rating operation.
   * @returns The Rating.
   */
  get uiRating(): Rating {
    return this.props.uiRating;
  }
  /**
   * Performs the most useful feature operation.
   * @returns The string value.
   */
  get mostUsefulFeature(): string {
    return this.props.mostUsefulFeature;
  }
  /**
   * Performs the main pain point operation.
   * @returns The string | undefined.
   */
  get mainPainPoint(): string | undefined {
    return this.props.mainPainPoint;
  }
  /**
   * Performs the improvement suggestion operation.
   * @returns The string | undefined.
   */
  get improvementSuggestion(): string | undefined {
    return this.props.improvementSuggestion;
  }
}
