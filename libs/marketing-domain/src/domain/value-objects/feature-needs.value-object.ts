import { ValueObject } from './base/value-object.js';

/**
 * Represents the feature needs.
 */
export class FeatureNeeds extends ValueObject<{
  priorityFeatures: string[];
  integrationNeeds: string[];
}> {}
