#!/usr/bin/env node
/**
 * ESLint修复撤销脚本
 * 撤销在非方法定义位置错误添加的public修饰符
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
 * 撤销错误添加的public
 * 修复在方法体内部、if语句中等位置错误添加的public
 */
function revertWrongPublic(content, filePath) {
  let fixed = content;
  let fixCount = 0;
  const originalContent = content;

  // 修复方法体内部的 "public functionCall(...)" > "functionCall(...)"
  // 这些情况通常出现在：赋值、if语句、其他函数调用等内部
  const lines = content.split('\n');
  const newLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let fixedLine = line;

    // 在方法体内部，查找 "public identifier(" 或 "public identifier<"
    // 排除方法定义行（通常是在类级别）
    const methodBodyPublicRegex = /^(\s+)public\s+([a-zA-Z_]\w*)\s*(\(|\[|<)/;
    const match = line.match(methodBodyPublicRegex);

    if (match) {
      const indent = match[1];
      const identifier = match[2];
      const rest = match[3];

      // 检查这是否真的在方法体内部（通过缩进和上下文判断）
      // 如果缩进大于4个空格（即2个缩进级别以上），很可能在方法内部
      if (indent.length >= 4) {
        // 检查是否可能是方法定义（通过查看前面几行）
        let isMethodDefinition = false;
        for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
          const prevLine = lines[j].trim();
          // 如果前一行是注释，继续向上看
          if (
            prevLine.startsWith('//') ||
            prevLine.startsWith('*') ||
            prevLine.startsWith('/*')
          ) {
            continue;
          }
          // 如果前一行包含 { 或 }，可能是块的开始或结束
          if (prevLine.includes('{') || prevLine.includes('}')) {
            // 检查缩进级别
            const prevIndent = lines[j].match(/^(\s*)/)?.[1]?.length || 0;
            if (prevIndent < indent.length - 2) {
              // 这确实是在方法体内部
              break;
            }
          }
          // 如果前面几行都是方法定义的模式，则可能是方法定义
          if (
            /^\s*(public|private|protected|async)?\s*[a-zA-Z_]\w*\s*\(/.test(
              lines[j],
            )
          ) {
            isMethodDefinition = true;
            break;
          }
        }

        if (!isMethodDefinition) {
          // 这是函数调用，不是方法定义，移除public
          fixedLine = `${indent}${identifier}${rest}${line.substring(match[0].length)}`;
          fixCount++;
        }
      }
    }

    newLines.push(fixedLine);
  }

  fixed = newLines.join('\n');

  // 额外的修复规则
  // 修复 "public await" > "await"
  if (/\bpublic\s+await\b/.test(fixed)) {
    const before = fixed;
    fixed = fixed.replace(/\bpublic\s+await\b/g, 'await');
    fixCount += (before.match(/\bpublic\s+await\b/g) || []).length;
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

    // 撤销错误的public
    const result = revertWrongPublic(content, filePath);
    content = result.content;
    totalFixes += result.fixCount;

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
  console.log('🔧 Reverting Wrong Public Modifiers');
  console.log('====================================\n');

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

  console.log('\n====================================');
  console.log('📊 Summary');
  console.log('====================================');
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
