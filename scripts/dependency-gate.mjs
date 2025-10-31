#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

const auditPath = resolve(process.env.AUDIT_FILE ?? 'data/security/dependency-inventory.json');
const remediationDocPath = resolve(process.env.REMEDIATION_DOC ?? 'docs/security/dependency-remediation.md');
const outputPath = resolve(process.env.OUTPUT_FILE ?? 'data/security/release-gate-summary.json');

function parseAuditFile(path) {
  if (!existsSync(path)) {
    throw new Error(`Audit file not found at ${path}. Run npm audit --json first.`);
  }

  const raw = readFileSync(path, 'utf8');
  const audit = JSON.parse(raw);

  const metadata = audit.metadata?.vulnerabilities ?? {};
  const totals = {
    critical: Number(metadata.critical ?? 0),
    high: Number(metadata.high ?? 0),
    moderate: Number(metadata.moderate ?? 0),
    low: Number(metadata.low ?? 0),
  };

  const findings = [];
  const vulnerabilities = audit.vulnerabilities ?? {};
  for (const [pkg, details] of Object.entries(vulnerabilities)) {
    const severity = String(details.severity ?? '').toLowerCase();
    if (!['critical', 'high', 'moderate'].includes(severity)) {
      continue;
    }

    const via = Array.isArray(details.via) ? details.via : [];
    const advisories = via
      .map((entry) => (typeof entry === 'string' ? { title: entry } : entry))
      .map((entry) => ({
        id: entry.source ?? entry.url ?? null,
        title: entry.title ?? entry.source ?? 'Unknown advisory',
        url: entry.url ?? null,
      }));

    findings.push({
      package: pkg,
      version: details.version ?? 'unknown',
      severity,
      fixAvailable: details.fixAvailable ?? null,
      range: details.range ?? null,
      advisories,
    });
  }

  return { totals, findings };
}

function parseRemediationOwners(path) {
  if (!existsSync(path)) {
    return new Map();
  }

  const text = readFileSync(path, 'utf8');
  const sectionMatch = text.split('## Remediation Decisions')[1];
  if (!sectionMatch) {
    return new Map();
  }

  const section = sectionMatch.split('\n##')[0];
  const regex = /-\s*`?([^`\n]+?)`?\s*-\s*Owner:\s*([^\n]+)/g;
  const owners = new Map();

  let match;
  while ((match = regex.exec(section)) !== null) {
    const identifier = match[1].trim();
    const owner = match[2].trim();
    owners.set(identifier.toLowerCase(), owner);
  }

  return owners;
}

function enrichFindings(findings, ownerMap) {
  return findings.map((finding) => {
    const keys = [
      `${finding.package}@${finding.version}`.toLowerCase(),
      finding.package.toLowerCase(),
      ...(finding.advisories ?? []).map((advisory) =>
        String(advisory.id ?? '')
          .trim()
          .toLowerCase()
      ),
    ];

    const owner =
      keys
        .map((key) => ownerMap.get(key))
        .find((value) => Boolean(value)) ?? null;

    return { ...finding, owner };
  });
}

function ensureOutputDir(path) {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    throw new Error(`Output directory ${dir} does not exist. Create it before running the gate.`);
  }
}

function main() {
  try {
    const { totals, findings } = parseAuditFile(auditPath);
    const ownerMap = parseRemediationOwners(remediationDocPath);
    const enrichedFindings = enrichFindings(findings, ownerMap);

    const status =
      totals.critical > 0 || totals.high > 0 || totals.moderate > 0 ? 'blocked' : 'clear';

    const summary = {
      generatedAt: new Date().toISOString(),
      status,
      totals,
      findings: enrichedFindings,
    };

    ensureOutputDir(outputPath);
    writeFileSync(outputPath, JSON.stringify(summary, null, 2));

    console.log(`Release gate summary written to ${outputPath}`);
    if (status === 'blocked') {
      console.log('Deployment is blocked due to outstanding vulnerabilities:');
      enrichedFindings.forEach((finding) => {
        console.log(
          ` - ${finding.package}@${finding.version} (${finding.severity}) ` +
            `${finding.owner ? `→ Owner: ${finding.owner}` : '→ Owner: Unassigned'}`
        );
      });
      process.exitCode = 1;
    } else {
      console.log('No blocking vulnerabilities detected. Release may proceed.');
    }
  } catch (error) {
    console.error(`dependency-gate failed: ${error.message}`);
    process.exit(1);
  }
}

main();
