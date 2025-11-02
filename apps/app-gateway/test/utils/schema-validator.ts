import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import Ajv from 'ajv';

export function loadOpenApiSchema(fileRelPath: string) {
  const p = join(process.cwd(), fileRelPath);
  const doc = yaml.load(readFileSync(p, 'utf8')) as any;
  return doc;
}

export function compileSchema(components: any, name: string) {
  const schema = components?.schemas?.[name];
  if (!schema) throw new Error(`Schema ${name} not found in components`);
  const ajv = new Ajv({ strict: false });
  return ajv.compile(schema);
}

