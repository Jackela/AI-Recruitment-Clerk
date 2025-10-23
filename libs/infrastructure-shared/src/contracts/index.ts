// Contract Programming Infrastructure
// Centralized exports for contract programming and validation utilities

// Design by Contract decorators and validators (from shared-dtos)
export {
  ContractViolationError,
  Requires,
  Ensures,
  Invariant,
  ContractValidators,
  ContractTestUtils,
} from '@ai-recruitment-clerk/shared-dtos';

// API contract validation helpers (from api-contracts)
export {
  ContractValidator,
  type ValidationResult,
  type ContractComparisonResult,
} from '@ai-recruitment-clerk/api-contracts';
