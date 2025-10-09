#!/usr/bin/env node
"use strict";

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOTS = ['apps', 'libs'];
const TS_PATTERN = /.ts$/;

function collectFiles(dir, results) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, results);
    } else if (entry.isFile() && shouldProcess(entry.name)) {
      results.push(fullPath);
    }
  }
}

function shouldProcess(name) {
  if (!TS_PATTERN.test(name)) return false;
  if (name.endsWith('.d.ts')) return false;
  const lowered = name.toLowerCase();
  if (lowered.endsWith('.spec.ts') || lowered.endsWith('.test.ts')) return false;
  if (lowered.endsWith('.stories.ts')) return false;
  return true;
}

function splitWords(identifier) {
  if (!identifier) return [];
  const sanitized = identifier
    .replace(/[_\-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
  return sanitized.split(/\s+/).filter(Boolean);
}

function formatTitle(words) {
  return words
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower.length <= 2) {
        return lower.toUpperCase();
      }
      if (lower === 'id') return 'ID';
      if (lower === 'api') return 'API';
      if (lower === 'url') return 'URL';
      if (lower === 'dto') return 'DTO';
      if (lower === 'llm') return 'LLM';
      if (lower === 'nats') return 'NATS';
      if (lower === 'ip') return 'IP';
      if (lower === 'pdf') return 'PDF';
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function formatLower(words) {
  return words.map((word) => word.toLowerCase()).join(' ');
}

function describeClass(name) {
  const words = splitWords(name);
  if (!words.length) return 'Represents this class.';
  const title = formatTitle(words);
  const subjectWords = words.slice(0, -1);
  const subject = subjectWords.length ? formatLower(subjectWords) : title.toLowerCase();
  if (name.endsWith('Service')) {
    return `Provides ${subject || 'service'} functionality.`;
  }
  if (name.endsWith('Controller')) {
    return `Exposes endpoints for ${subject || 'the controller'}.`;
  }
  if (name.endsWith('Module')) {
    return `Configures the ${subject || 'application'} module.`;
  }
  if (name.endsWith('Repository')) {
    return `Manages persistence for ${subject || 'the repository'}.`;
  }
  if (name.endsWith('Guard')) {
    return `Implements the ${subject || 'guard'} guard logic.`;
  }
  if (name.endsWith('ValueObject')) {
    return `Represents the ${subject || 'value'} value object.`;
  }
  if (name.endsWith('Event')) {
    return `Represents the ${title.toLowerCase()} event.`;
  }
  if (name.endsWith('Dto') || name.endsWith('DTO')) {
    return `Describes the ${subject || 'data'} data transfer object.`;
  }
  return `Represents the ${title.toLowerCase()}.`;
}

function describeInterface(name) {
  const words = splitWords(name);
  if (!words.length) return 'Defines the contract for this interface.';
  const title = formatTitle(words);
  return `Defines the shape of the ${title.toLowerCase()}.`;
}

function describeFunction(name) {
  const words = splitWords(name);
  if (!words.length) return 'Executes the operation.';
  const verb = words[0].toLowerCase();
  const rest = words.slice(1);
  const restLower = formatLower(rest);
  switch (verb) {
    case 'get':
      return `Retrieves ${restLower || 'the value'}.`;
    case 'set':
      return `Sets ${restLower || 'the value'}.`;
    case 'create':
      return `Creates ${restLower || 'the entity'}.`;
    case 'update':
      return `Updates ${restLower || 'the entity'}.`;
    case 'delete':
    case 'remove':
      return `Removes ${restLower || 'the entity'}.`;
    case 'calculate':
      return `Calculates ${restLower || 'the result'}.`;
    case 'build':
      return `Builds ${restLower || 'the result'}.`;
    case 'load':
      return `Loads ${restLower || 'the data'}.`;
    case 'handle':
      return `Handles ${restLower || 'the operation'}.`;
    case 'resolve':
      return `Resolves ${restLower || 'the request'}.`;
    case 'map':
      return `Maps ${restLower || 'the values'}.`;
    case 'validate':
      return `Validates ${restLower || 'the data'}.`;
    case 'generate':
      return `Generates ${restLower || 'the result'}.`;
    default:
      return `Performs the ${formatLower(words)} operation.`;
  }
}

function describeMethod(name) {
  if (name === 'constructor') {
    return 'Initializes the class instance.';
  }
  return describeFunction(name);
}

function describeParameter(name) {
  const words = splitWords(name);
  if (!words.length) return `The ${name} parameter.`;
  const title = formatTitle(words);
  return `The ${title.toLowerCase()}.`;
}

function describeReturn(typeText) {
  if (!typeText) {
    return 'The result of the operation.';
  }
  const trimmed = typeText.trim();
  if (!trimmed || trimmed === 'void') {
    return null;
  }
  if (trimmed === 'Promise<void>') {
    return 'A promise that resolves when the operation completes.';
  }
  const promiseMatch = trimmed.match(/^Promise\s*<(.+)>$/);
  if (promiseMatch) {
    const inner = promiseMatch[1].trim();
    return `A promise that resolves to ${describeType(inner)}.`;
  }
  return `The ${describeType(trimmed)}.`;
}

function describeType(typeText) {
  const trimmed = typeText.trim();
  if (!trimmed) {
    return 'resulting value';
  }
  const lower = trimmed.toLowerCase();
  if (lower === 'string' || lower === 'number' || lower === 'boolean') {
    return `${lower} value`;
  }
  if (lower === 'void') {
    return 'resulting value';
  }
  if (lower.endsWith('[]')) {
    const inner = trimmed.slice(0, -2);
    return `an array of ${describeType(inner)}`;
  }
  return trimmed.replace(/\s+/g, ' ');
}

function hasJsDoc(node, sourceText) {
  if (node.jsDoc && node.jsDoc.length > 0) {
    return true;
  }
  const fullStart = node.getFullStart();
  if (fullStart < 0) {
    return false;
  }
  const commentRanges = ts.getLeadingCommentRanges(sourceText, fullStart);
  if (!commentRanges) {
    return false;
  }
  return commentRanges.some((range) => {
    const commentText = sourceText.slice(range.pos, range.end);
    return commentText.startsWith('/**');
  });
}

function isExported(node) {
  const flags = ts.getCombinedModifierFlags(node);
  if (flags & ts.ModifierFlags.Export) {
    return true;
  }
  return false;
}

function hasModifier(node, kind) {
  return !!node.modifiers && node.modifiers.some((mod) => mod.kind === kind);
}

function isPublic(node) {
  if (hasModifier(node, ts.SyntaxKind.PrivateKeyword) || hasModifier(node, ts.SyntaxKind.ProtectedKeyword)) {
    return false;
  }
  return true;
}

function getLineStart(text, pos) {
  let index = pos;
  while (index > 0) {
    const ch = text[index - 1];
    if (ch === '\n') {
      break;
    }
    if (ch === '\r') {
      if (index > 1 && text[index - 2] === '\n') {
        index -= 1;
      }
      break;
    }
    index -= 1;
  }
  return index;
}

function getIndentation(text, pos) {
  const lineStart = getLineStart(text, pos);
  const line = text.slice(lineStart, pos);
  const match = line.match(/^[ \t]*/);
  return match ? match[0] : '';
}

function buildDocComment(indent, lines) {
  const sanitized = lines.filter(Boolean);
  if (!sanitized.length) {
    return null;
  }
  const docLines = sanitized.map((line) => line.replace(/\s+$/g, ''));
  const pieces = [];
  pieces.push(`${indent}/**`);
  for (const line of docLines) {
    pieces.push(`${indent} * ${line}`);
  }
  pieces.push(`${indent} */`);
  return pieces.join('\n') + '\n';
}

function getReturnType(node, sourceFile) {
  if (node.type) {
    return node.type.getText(sourceFile);
  }
  return null;
}

function buildParamLines(parameters, sourceFile) {
  const lines = [];
  for (const param of parameters) {
    const name = ts.isIdentifier(param.name) ? param.name.text : param.name.getText(sourceFile);
    lines.push(`@param ${name} - ${describeParameter(name)}`);
  }
  return lines;
}

function processFile(filePath) {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const edits = [];

  function enqueueDoc(node, descriptionLines) {
    const start = node.getStart(sourceFile);
    const lineStart = getLineStart(sourceText, start);
    const indent = getIndentation(sourceText, start);
    const docText = buildDocComment(indent, descriptionLines);
    if (!docText) {
      return;
    }
    edits.push({ pos: lineStart, text: docText });
  }

  function processClass(node) {
    if (!node.name) return;
    if (!isExported(node)) return;
    if (!hasJsDoc(node, sourceText)) {
      enqueueDoc(node, [describeClass(node.name.text)]);
    }
    for (const member of node.members) {
      processClassElement(member, node.name.text);
    }
  }

  function processClassElement(member, className) {
    if (!isPublic(member)) {
      return;
    }
    if (ts.isConstructorDeclaration(member)) {
      if (!hasJsDoc(member, sourceText)) {
        const paramLines = buildParamLines(member.parameters, sourceFile);
        const lines = [
          `Initializes a new instance of the ${formatTitle(splitWords(className))}.`,
          ...paramLines,
        ];
        enqueueDoc(member, lines);
      }
      return;
    }
    if (ts.isMethodDeclaration(member) || ts.isGetAccessor(member) || ts.isSetAccessor(member)) {
      if (!hasJsDoc(member, sourceText)) {
        const name = member.name && ts.isIdentifier(member.name) ? member.name.text : 'method';
        const paramLines = buildParamLines(member.parameters || [], sourceFile);
        const lines = [describeMethod(name), ...paramLines];
        if (!ts.isSetAccessor(member)) {
          const returnType = getReturnType(member, sourceFile);
          const returnLine = describeReturn(returnType);
          if (returnLine) {
            lines.push(`@returns ${returnLine}`);
          }
        }
        enqueueDoc(member, lines);
      }
      return;
    }
    if (ts.isPropertyDeclaration(member) && member.initializer && (ts.isArrowFunction(member.initializer) || ts.isFunctionExpression(member.initializer))) {
      if (!hasJsDoc(member, sourceText)) {
        const name = member.name && ts.isIdentifier(member.name) ? member.name.text : 'member';
        const func = member.initializer;
        const paramLines = buildParamLines(func.parameters || [], sourceFile);
        const lines = [describeMethod(name), ...paramLines];
        const returnType = member.type ? member.type.getText(sourceFile) : func.type ? func.type.getText(sourceFile) : null;
        const returnLine = describeReturn(returnType);
        if (returnLine) {
          lines.push(`@returns ${returnLine}`);
        }
        enqueueDoc(member, lines);
      }
    }
  }

  function processFunction(node) {
    if (!isExported(node)) return;
    if (!node.name) return;
    if (!hasJsDoc(node, sourceText)) {
      const paramLines = buildParamLines(node.parameters || [], sourceFile);
      const returnType = getReturnType(node, sourceFile);
      const returnLine = describeReturn(returnType);
      const lines = [describeFunction(node.name.text), ...paramLines];
      if (returnLine) {
        lines.push(`@returns ${returnLine}`);
      }
      enqueueDoc(node, lines);
    }
  }

  function processInterface(node) {
    if (!isExported(node)) return;
    if (!node.name) return;
    if (!hasJsDoc(node, sourceText)) {
      enqueueDoc(node, [describeInterface(node.name.text)]);
    }
  }

  ts.forEachChild(sourceFile, function visit(node) {
    if (ts.isClassDeclaration(node)) {
      processClass(node);
    } else if (ts.isInterfaceDeclaration(node)) {
      processInterface(node);
    } else if (ts.isFunctionDeclaration(node)) {
      processFunction(node);
    }
    ts.forEachChild(node, visit);
  });

  if (!edits.length) {
    return false;
  }

  edits.sort((a, b) => b.pos - a.pos);
  let updatedText = sourceText;
  for (const edit of edits) {
    updatedText = updatedText.slice(0, edit.pos) + edit.text + updatedText.slice(edit.pos);
  }
  fs.writeFileSync(filePath, updatedText, 'utf8');
  return true;
}

function main() {
  const files = [];
  for (const root of ROOTS) {
    if (!fs.existsSync(root)) continue;
    collectFiles(root, files);
  }
  let updated = 0;
  for (const file of files) {
    if (processFile(file)) {
      updated += 1;
    }
  }
  console.log(`Processed ${files.length} files. Updated ${updated} files.`);
}

main();
