import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import type {
  OpenApiComponents,
  OpenApiDocument,
  CompiledSchemaValidator,
} from '@ai-recruitment-clerk/types';

/**
 * Load an OpenAPI schema from a YAML or JSON file
 * @param fileRelPath - Relative path to the schema file
 * @returns The parsed OpenAPI document
 */
export function loadOpenApiSchema(fileRelPath: string): OpenApiDocument {
  const p = join(process.cwd(), fileRelPath);
  const doc = yaml.load(readFileSync(p, 'utf8')) as OpenApiDocument;
  return doc;
}

/**
 * Compile an OpenAPI schema component for validation
 * @param components - OpenAPI components containing schemas
 * @param name - Name of the schema to compile
 * @returns A compiled Ajv validator function
 * @throws Error if the schema is not found
 */
export function compileSchema(
  components: OpenApiComponents | undefined,
  name: string,
): CompiledSchemaValidator {
  const schema = components?.schemas?.[name];
  if (!schema) {
    throw new Error(`Schema ${name} not found in components`);
  }
  const ajv = new Ajv({ strict: false });
  return ajv.compile(schema);
}
