import { ValueObject } from './base/value-object.js';

export class FeatureNeeds extends ValueObject<{
  priorityFeatures: string[];
  integrationNeeds: string[];
}> {}
