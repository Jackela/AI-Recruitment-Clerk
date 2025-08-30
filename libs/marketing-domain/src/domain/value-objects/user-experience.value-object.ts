import { ValueObject } from './base/value-object.js';
import { Rating } from '../../application/dtos/questionnaire.dto.js';

export class UserExperience extends ValueObject<{
  overallSatisfaction: Rating;
  accuracyRating: Rating;
  speedRating: Rating;
  uiRating: Rating;
  mostUsefulFeature: string;
  mainPainPoint?: string;
  improvementSuggestion?: string;
}> {
  get overallSatisfaction(): Rating { return this.props.overallSatisfaction; }
  get accuracyRating(): Rating { return this.props.accuracyRating; }
  get speedRating(): Rating { return this.props.speedRating; }
  get uiRating(): Rating { return this.props.uiRating; }
  get mostUsefulFeature(): string { return this.props.mostUsefulFeature; }
  get mainPainPoint(): string | undefined { return this.props.mainPainPoint; }
  get improvementSuggestion(): string | undefined { return this.props.improvementSuggestion; }
}
