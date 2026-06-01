#!/usr/bin/env node
/**
 * ESLint自动修复脚本 - 改进版
 * 专门用于修复explicit-member-accessibility问题
 * 修复脚本可能造成的语法错误
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
 * 修复错误的"public if"语法
 */
function fixPublicIfSyntax(content, filePath) {
  // 查找并移除错误的 "public if(" 和 "public if "
  const wrongSyntax = /\bpublic\s+if\s*[\({]/g;
  let fixed = content;
  let fixCount = 0;

  if (wrongSyntax.test(content)) {
    fixed = content.replace(/\bpublic\s+if\s*([\({])/g, 'if $1');
    const matches = content.match(wrongSyntax);
    fixCount = matches ? matches.length : 0;
  }

  return { content: fixed, fixCount };
}

/**
 * 修复explicit-member-accessibility问题
 * 为类成员方法添加public修饰符（除了构造函数和已有修饰符的）
 */
function fixExplicitMemberAccessibility(content, filePath) {
  let fixed = content;
  let fixCount = 0;

  // 排除测试文件
  if (filePath.includes('.spec.ts') || filePath.includes('.test.ts')) {
    return { content, fixCount };
  }

  // 查找类定义并修复其中的方法
  // 使用更精确的正则表达式，避免误匹配
  const lines = content.split('\n');
  const newLines = [];
  let inClass = false;
  let classBraceCount = 0;
  let lastLineWasDecorator = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // 检测是否进入类定义
    if (/^\s*class\s+\w+/.test(trimmedLine)) {
      inClass = true;
      classBraceCount =
        (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
    } else if (inClass) {
      classBraceCount +=
        (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      if (classBraceCount <= 0) {
        inClass = false;
      }
    }

    // 在类内部时，检查是否需要添加public
    if (inClass && !lastLineWasDecorator) {
      // 匹配需要添加public的方法签名
      // 格式: async? methodName(params): returnType { 或 async? methodName(params) {
      const methodMatch = line.match(
        /^(\s+)(?!(?:public|private|protected|readonly|abstract|static|get|set|constructor|if|switch|while|for|catch)\b)(async\s+)?([a-zA-Z_]\w*)(\s*\([^)]*\))((?:\s*:\s*[^{;]+)?)(\s*[{;])/,
      );

      if (methodMatch && !line.includes('//')) {
        const [
          fullMatch,
          indent,
          asyncKeyword,
          methodName,
          params,
          returnType,
          terminator,
        ] = methodMatch;

        // 检查是否在接口中（接口不需要public）
        const prevLines = lines.slice(0, i).join('\n');
        const isInterface = /interface\s+\w+\s*[^{]*\{[^}]*$/.test(
          prevLines.substring(
            prevLines.lastIndexOf('\n', prevLines.length - line.length - 1),
          ),
        );

        if (!isInterface) {
          const async = asyncKeyword || '';
          newLines.push(
            `${indent}public ${async}${methodName}${params}${returnType}${terminator}`,
          );
          fixCount++;
          continue;
        }
      }
    }

    // 检测装饰器
    lastLineWasDecorator = /^\s*@\w+/.test(trimmedLine);

    newLines.push(line);
  }

  return { content: newLines.join('\n'), fixCount };
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

    // 首先修复错误的语法
    const syntaxResult = fixPublicIfSyntax(content, filePath);
    content = syntaxResult.content;
    totalFixes += syntaxResult.fixCount;

    // 应用修复规则
    const accessibilityResult = fixExplicitMemberAccessibility(
      content,
      filePath,
    );
    content = accessibilityResult.content;
    totalFixes += accessibilityResult.fixCount;

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
  console.log('🔧 ESLint Auto-Fix Script v2');
  console.log('=============================\n');

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

  console.log('\n=============================');
  console.log('📊 Summary');
  console.log('=============================');
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
