#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import YAML from 'js-yaml';
import Ajv from 'ajv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '../../..');
const remediationPath = path.join(workspaceRoot, 'specs/001-audit-architecture/remediation.yaml');
const schemaPath = path.join(workspaceRoot, 'specs/001-audit-architecture/schemas/remediation.schema.json');

function loadYaml(file) {
  return YAML.load(readFileSync(file, 'utf8'));
}

function validateSchema(doc, schema) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const valid = validate(doc);
  if (!valid) {
    console.error('[governance] Remediation backlog failed schema validation');
    for (const err of validate.errors ?? []) {
      console.error(` - ${err.instancePath || '(root)'} ${err.message}`);
    }
    process.exit(1);
  }
}

function ensureHighSeverityCoverage(doc) {
  const entries = doc.remediations ?? [];
  const highSeverity = entries.filter((item) => item.severity === 'high');
  const missingFields = highSeverity.filter((item) => !item.owner || !item.dueDate);
  if (missingFields.length > 0) {
    console.error('[governance] High severity remediations must include owner and dueDate:');
    missingFields.forEach((item) => console.error(` - ${item.id} (${item.findingId}) missing owner/dueDate`));
    process.exit(1);
  }
  console.log(`[governance] High severity coverage: ${highSeverity.length} entries with owners and due dates.`);
}

function main() {
  const doc = loadYaml(remediationPath);
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  validateSchema(doc, schema);
  ensureHighSeverityCoverage(doc);
  console.log('[governance] Remediation backlog schema validation passed');
}

try {
  main();
} catch (err) {
  console.error('[governance] Failed to validate remediation backlog');
  console.error(err);
  process.exit(1);
}
