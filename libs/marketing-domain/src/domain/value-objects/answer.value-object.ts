import { ValueObject } from './base/value-object.js';

export class Answer extends ValueObject<{
  questionId: string;
  value: string;
}> {}
