/**
 * Test Utility Type Definitions
 *
 * Types for test utilities, schema validation, and testing infrastructure.
 */

/**
 * OpenAPI Schema Components
 * Represents the components section of an OpenAPI/Swagger specification
 */
export interface OpenApiComponents {
  /** Reusable schemas for request/response validation */
  schemas?: Record<string, OpenApiSchema>;
  /** Reusable security schemes */
  securitySchemes?: Record<string, unknown>;
  /** Reusable response definitions */
  responses?: Record<string, unknown>;
  /** Reusable parameter definitions */
  parameters?: Record<string, unknown>;
  /** Reusable examples */
  examples?: Record<string, unknown>;
  /** Reusable request bodies */
  requestBodies?: Record<string, unknown>;
}

/**
 * OpenAPI Schema Definition
 * Represents a JSON Schema definition as used in OpenAPI components
 */
export interface OpenApiSchema {
  /** Schema type (object, array, string, number, etc.) */
  type?: string;
  /** Schema description */
  description?: string;
  /** Required properties */
  required?: string[];
  /** Object properties */
  properties?: Record<string, OpenApiSchema>;
  /** Array items schema */
  items?: OpenApiSchema;
  /** Enum values */
  enum?: unknown[];
  /** Schema format */
  format?: string;
  /** Reference to another schema ($ref) */
  $ref?: string;
  /** Additional properties */
  additionalProperties?: boolean | OpenApiSchema;
  /** All of schema (composition) */
  allOf?: OpenApiSchema[];
  /** Any of schema (composition) */
  anyOf?: OpenApiSchema[];
  /** One of schema (composition) */
  oneOf?: OpenApiSchema[];
  /** Minimum value for numbers */
  minimum?: number;
  /** Maximum value for numbers */
  maximum?: number;
  /** Minimum length for strings/arrays */
  minLength?: number;
  /** Maximum length for strings/arrays */
  maxLength?: number;
  /** Pattern for string validation */
  pattern?: string;
  /** Example value */
  example?: unknown;
  /** Default value */
  default?: unknown;
  /** Whether null is allowed */
  nullable?: boolean;
  /** Additional schema properties */
  [key: string]: unknown;
}

/**
 * OpenAPI Document
 * Root structure of an OpenAPI/Swagger specification
 */
export interface OpenApiDocument {
  /** OpenAPI version (e.g., "3.0.0") */
  openapi?: string;
  /** Swagger version (e.g., "2.0") */
  swagger?: string;
  /** API information */
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  /** OpenAPI components */
  components?: OpenApiComponents;
  /** Swagger definitions (v2) */
  definitions?: Record<string, OpenApiSchema>;
  /** API paths */
  paths?: Record<string, unknown>;
  /** Additional properties */
  [key: string]: unknown;
}

/**
 * YAML Load Result
 * Type for the result of parsing a YAML file
 */
export type YamlLoadResult = OpenApiDocument | Record<string, unknown> | unknown;

/**
 * Compiled Schema Validator
 * Type for Ajv compiled schema validator
 */
export type CompiledSchemaValidator = {
  (data: unknown): boolean | Promise<unknown>;
  errors?: null | Array<{
    keyword?: string;
    dataPath?: string;
    schemaPath?: string;
    params?: Record<string, unknown>;
    message?: string;
  }>;
};
