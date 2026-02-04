/**
 * Pipes index
 *
 * Exports all NestJS pipes provided by infrastructure-shared.
 */

export {
  DtoValidationPipe,
  createDtoValidationPipe,
  type DtoValidationPipeOptions,
  type FormattedValidationError,
} from './dto-validation.pipe.js';
