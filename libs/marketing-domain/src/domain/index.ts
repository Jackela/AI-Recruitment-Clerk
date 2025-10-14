// Marketing Research Domain Layer

// Aggregates
export * from './aggregates/questionnaire.aggregate.js';

// Value Objects
export * from './value-objects/questionnaire-id.value-object.js';
export * from './value-objects/questionnaire-template.value-object.js';
export * from './value-objects/questionnaire-submission.value-object.js';
export * from './value-objects/submission-quality.value-object.js';
export * from './value-objects/submission-metadata.value-object.js';
export * from './value-objects/user-profile.value-object.js';
export * from './value-objects/user-experience.value-object.js';
export * from './value-objects/business-value.value-object.js';
export * from './value-objects/feature-needs.value-object.js';
export * from './value-objects/optional-info.value-object.js';
export * from './value-objects/quality-score.value-object.js';
export * from './value-objects/submission-summary.value-object.js';
export * from './value-objects/answer.value-object.js';
export * from './value-objects/quality-metrics.value-object.js';
export * from './value-objects/questionnaire-validation-result.value-object.js';

// Domain Services
export * from './domain-services/questionnaire.domain-service.js';
export * from './domain-services/questionnaire.rules.js';

// Domain Events
export * from './domain-events/questionnaire-submitted.event.js';
export * from './domain-events/high-quality-submission.event.js';
export * from './domain-events/questionnaire-validation-failed.event.js';
export * from './domain-events/base/domain-event.js';

// Legacy exports (maintain compatibility)
export * from './aggregates/index.js';
export * from './value-objects/index.js';
export * from './domain-services/index.js';
export * from './domain-events/index.js';
export * from './entities/index.js';
