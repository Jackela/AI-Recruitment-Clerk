#!/usr/bin/env node
/**
 * ESLint问题统计脚本
 * 统计剩余的ESLint问题
 */

import { readFileSync, readdirSync, statSync } from 'fs';
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

// 问题统计
const stats = {
  totalFiles: 0,
  explicitMemberAccessibility: 0, // 缺少public修饰符
  noUnusedVars: 0, // 未使用变量
  noEmptyFunction: 0, // 空函数
  noExplicitAny: 0, // 使用any
  consistentTypeImports: 0, // type imports
  filesWithIssues: [],
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
 * 统计文件中的问题
 */
function analyzeFile(filePath) {
  try {
    stats.totalFiles++;
    const content = readFileSync(filePath, 'utf-8');
    let fileIssues = 0;

    // 跳过测试文件和spec文件
    if (filePath.includes('.spec.ts') || filePath.includes('.test.ts')) {
      return;
    }

    // 统计explicit-member-accessibility问题
    // 查找类中缺少修饰符的方法
    const lines = content.split('\n');
    let inClass = false;
    let classBraceCount = 0;

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
      if (inClass) {
        // 匹配缺少修饰符的方法
        const methodMatch = line.match(
          /^(\s+)(?!(?:public|private|protected|readonly|abstract|static|get|set|constructor|if|switch|while|for|catch|try|else)\b)(async\s+)?([a-zA-Z_]\w*)(\s*\([^)]*\))((?:\s*:\s*[^{;]+)?)(\s*[{;])/,
        );

        if (methodMatch && !line.includes('//') && !line.includes('*')) {
          const prevLines = lines.slice(Math.max(0, i - 5), i).join('\n');
          const isInterface = /interface\s+\w+\s*[^{]*\{/.test(prevLines);

          if (!isInterface) {
            stats.explicitMemberAccessibility++;
            fileIssues++;
          }
        }
      }
    }

    // 统计未使用变量（简单检测）
    const unusedVarRegex = /^\s*(const|let|var)\s+(\w+)\s*=\s*.+?;?\s*$/gm;
    let match;
    while ((match = unusedVarRegex.exec(content)) !== null) {
      const varName = match[2];
      const usageRegex = new RegExp(`\\b${varName}\\b`, 'g');
      const usages = [...content.matchAll(usageRegex)];
      if (usages.length <= 1) {
        stats.noUnusedVars++;
        fileIssues++;
      }
    }

    // 统计空函数
    const emptyFunctionRegex =
      /\{\s*\/\/\s*(?:TODO|FIXME|implement|complete|empty)/gi;
    const emptyMatches = content.match(emptyFunctionRegex);
    if (emptyMatches) {
      stats.noEmptyFunction += emptyMatches.length;
      fileIssues += emptyMatches.length;
    }

    // 统计any使用
    const anyRegex = /:\s*any\b/g;
    const anyMatches = content.match(anyRegex);
    if (anyMatches) {
      stats.noExplicitAny += anyMatches.length;
      fileIssues += anyMatches.length;
    }

    if (fileIssues > 0) {
      stats.filesWithIssues.push({ file: filePath, issues: fileIssues });
    }
  } catch (error) {
    console.error(`Error analyzing ${filePath}: ${error.message}`);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('📊 ESLint Issues Analysis');
  console.log('=========================\n');

  const startTime = Date.now();

  // 获取所有TypeScript文件
  const allFiles = [];
  for (const dir of targetDirs) {
    const files = getTsFiles(dir);
    allFiles.push(...files);
  }

  console.log(`Found ${allFiles.length} TypeScript files to analyze\n`);

  // 分析每个文件
  for (const file of allFiles) {
    analyzeFile(file);
  }

  const duration = (Date.now() - startTime) / 1000;

  console.log('=========================');
  console.log('📈 Statistics');
  console.log('=========================');
  console.log(`Total files analyzed: ${stats.totalFiles}`);
  console.log(`Files with issues: ${stats.filesWithIssues.length}`);
  console.log('');
  console.log('Issue breakdown:');
  console.log(
    `  - explicit-member-accessibility: ${stats.explicitMemberAccessibility}`,
  );
  console.log(`  - no-unused-vars: ${stats.noUnusedVars}`);
  console.log(`  - no-empty-function: ${stats.noEmptyFunction}`);
  console.log(`  - no-explicit-any: ${stats.noExplicitAny}`);
  console.log(`  - consistent-type-imports: ${stats.consistentTypeImports}`);
  console.log('');
  console.log(
    `Total estimated issues: ${stats.explicitMemberAccessibility + stats.noUnusedVars + stats.noEmptyFunction + stats.noExplicitAny + stats.consistentTypeImports}`,
  );
  console.log(`Duration: ${duration.toFixed(2)}s`);

  // 显示问题最多的文件
  console.log('\n=========================');
  console.log('📁 Files with most issues');
  console.log('=========================');
  const topFiles = stats.filesWithIssues
    .sort((a, b) => b.issues - a.issues)
    .slice(0, 20);

  for (const { file, issues } of topFiles) {
    console.log(`  ${issues} issues: ${file}`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
