#!/usr/bin/env node
/**
 * ESLint自动修复脚本 - 版本3
 * 修复"public return"和"public if"等错误语法
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// 需要处理的目录
const targetDirs = ['apps', 'libs'];
const excludeDirs = [
  'node_modules',
  'dist',
  '.nx',
  'coverage',
  'test-results',
  'e2e',
];

// 统计信息
const stats = {
  totalFiles: 0,
  fixedFiles: 0,
  totalFixes: 0,
  errors: [],
};

/**
 * 递归获取所有.ts文件
 */
function getTsFiles(dir, files = []) {
  try {
    const items = readdirSync(dir);
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        if (!excludeDirs.some((exclude) => fullPath.includes(exclude))) {
          getTsFiles(fullPath, files);
        }
      } else if (extname(item) === '.ts' && !item.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // 忽略权限错误等
  }
  return files;
}

/**
 * 修复错误的"public"语法
 */
function fixPublicSyntax(content, filePath) {
  let fixed = content;
  let fixCount = 0;

  // 修复 "public if" > "if"
  const wrongIf = /\bpublic\s+if\s*([\({])/g;
  if (wrongIf.test(content)) {
    fixed = fixed.replace(wrongIf, 'if $1');
    fixCount += (content.match(wrongIf) || []).length;
  }

  // 修复 "public return" > "return"
  const wrongReturn = /\bpublic\s+return\b/g;
  if (wrongReturn.test(content)) {
    fixed = fixed.replace(wrongReturn, 'return');
    fixCount += (content.match(wrongReturn) || []).length;
  }

  // 修复 "public throw" > "throw"
  const wrongThrow = /\bpublic\s+throw\b/g;
  if (wrongThrow.test(content)) {
    fixed = fixed.replace(wrongThrow, 'throw');
    fixCount += (content.match(wrongThrow) || []).length;
  }

  // 修复 "public await" > "await"
  const wrongAwait = /\bpublic\s+await\s+([a-zA-Z_])/g;
  if (wrongAwait.test(content)) {
    fixed = fixed.replace(wrongAwait, 'await $1');
    fixCount += (content.match(wrongAwait) || []).length;
  }

  // 修复 "public const" > "const"
  const wrongConst = /\bpublic\s+const\s+([a-zA-Z_])/g;
  if (wrongConst.test(content)) {
    fixed = fixed.replace(wrongConst, 'const $1');
    fixCount += (content.match(wrongConst) || []).length;
  }

  // 修复 "public let" > "let"
  const wrongLet = /\bpublic\s+let\s+([a-zA-Z_])/g;
  if (wrongLet.test(content)) {
    fixed = fixed.replace(wrongLet, 'let $1');
    fixCount += (content.match(wrongLet) || []).length;
  }

  // 修复 "public switch" > "switch"
  const wrongSwitch = /\bpublic\s+switch\s*\(/g;
  if (wrongSwitch.test(content)) {
    fixed = fixed.replace(wrongSwitch, 'switch(');
    fixCount += (content.match(wrongSwitch) || []).length;
  }

  // 修复 "public for" > "for"
  const wrongFor = /\bpublic\s+for\s*\(/g;
  if (wrongFor.test(content)) {
    fixed = fixed.replace(wrongFor, 'for(');
    fixCount += (content.match(wrongFor) || []).length;
  }

  // 修复 "public while" > "while"
  const wrongWhile = /\bpublic\s+while\s*\(/g;
  if (wrongWhile.test(content)) {
    fixed = fixed.replace(wrongWhile, 'while(');
    fixCount += (content.match(wrongWhile) || []).length;
  }

  // 修复 "public catch" > "catch"
  const wrongCatch = /\bpublic\s+catch\s*\(/g;
  if (wrongCatch.test(content)) {
    fixed = fixed.replace(wrongCatch, 'catch(');
    fixCount += (content.match(wrongCatch) || []).length;
  }

  return { content: fixed, fixCount };
}

/**
 * 处理单个文件
 */
function processFile(filePath) {
  try {
    stats.totalFiles++;
    let content = readFileSync(filePath, 'utf-8');
    let originalContent = content;
    let totalFixes = 0;

    // 修复public语法错误
    const syntaxResult = fixPublicSyntax(content, filePath);
    content = syntaxResult.content;
    totalFixes += syntaxResult.fixCount;

    // 如果内容有变化，写回文件
    if (content !== originalContent) {
      writeFileSync(filePath, content, 'utf-8');
      stats.fixedFiles++;
      stats.totalFixes += totalFixes;
      console.log(`✅ Fixed ${totalFixes} issues in ${filePath}`);
    }
  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🔧 ESLint Auto-Fix Script v3');
  console.log('==============================\n');

  const startTime = Date.now();

  // 获取所有TypeScript文件
  const allFiles = [];
  for (const dir of targetDirs) {
    const files = getTsFiles(dir);
    allFiles.push(...files);
  }

  console.log(`Found ${allFiles.length} TypeScript files to process\n`);

  // 处理每个文件
  for (const file of allFiles) {
    processFile(file);
  }

  const duration = (Date.now() - startTime) / 1000;

  console.log('\n==============================');
  console.log('📊 Summary');
  console.log('==============================');
  console.log(`Total files processed: ${stats.totalFiles}`);
  console.log(`Files fixed: ${stats.fixedFiles}`);
  console.log(`Total fixes applied: ${stats.totalFixes}`);
  console.log(`Errors: ${stats.errors.length}`);
  console.log(`Duration: ${duration.toFixed(2)}s`);

  if (stats.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    stats.errors.forEach(({ file, error }) => {
      console.log(`  - ${file}: ${error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All done!');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
