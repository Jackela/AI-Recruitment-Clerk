import { ValueObject } from './base/value-object.js';

/**
 * Represents the answer.
 */
export class Answer extends ValueObject<{
  questionId: string;
  value: string;
}> {}
