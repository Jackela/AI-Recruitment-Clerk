#!/usr/bin/env node
/**
 * Generate Validation Report
 *
 * This script reads all test result files and generates a comprehensive
 * validation report in both JSON and Markdown formats.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_DIR = resolve(__dirname, '..');
const OUTPUT_DIR = resolve(BASE_DIR, 'reports');

const TEST_RESULTS = {
  unit: {
    path: 'artifacts/coverage-report/coverage-summary.json',
    name: '单元测试',
    icon: '🧪',
  },
  ai: {
    path: 'artifacts/ai-validation-report/ai-validation-report.json',
    name: 'AI验证',
    icon: '🤖',
  },
  visual: {
    path: 'artifacts/visual-regression-report/results.json',
    name: '视觉回归',
    icon: '👁️',
  },
  performance: {
    path: 'artifacts/performance-report/performance-results.json',
    name: '性能测试',
    icon: '⚡',
  },
  accessibility: {
    path: 'artifacts/accessibility-report/accessibility-results.json',
    name: '可访问性',
    icon: '♿',
  },
  comprehensive: {
    path: 'artifacts/comprehensive-validation-report/validation-report.json',
    name: '综合验证',
    icon: '✅',
  },
};

function readJson(filePath) {
  const fullPath = resolve(BASE_DIR, filePath);
  if (!existsSync(fullPath)) {
    console.warn(`⚠️  文件不存在: ${filePath}`);
    return null;
  }
  try {
    const content = readFileSync(fullPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ 读取失败: ${filePath} - ${error.message}`);
    return null;
  }
}

function calculateSummary(results) {
  let totalTests = 0;
  let passed = 0;
  let failed = 0;
  let warnings = 0;
  let hasFailed = false;
  let hasWarning = false;

  Object.entries(results).forEach(([key, data]) => {
    if (!data) return;

    if (data.summary) {
      totalTests += data.summary.totalTests || 0;
      passed += data.summary.passed || 0;
      failed += data.summary.failed || 0;
      warnings += data.summary.warnings || 0;
    }

    if (typeof data.total === 'number') {
      totalTests += data.total || 0;
      passed += data.passed || 0;
      failed += data.failed || 0;
    }

    if (data.totalChecks !== undefined) {
      totalTests += data.totalChecks || 0;
      passed += data.passed || 0;
      failed += data.failed || 0;
    }

    if (data.status === 'failed' || data.success === false) {
      hasFailed = true;
    } else if (
      data.status === 'warning' ||
      (data.warnings && data.warnings.length > 0)
    ) {
      hasWarning = true;
    }
  });

  let status = 'passed';
  if (hasFailed || failed > 0) {
    status = 'failed';
  } else if (hasWarning || warnings > 0) {
    status = 'warning';
  }

  return { status, totalTests, passed, failed, warnings };
}

function processUnitTests(data) {
  if (!data) return { status: 'skipped', summary: null };

  const coverage = data.total || {};
  return {
    status: coverage.lines?.pct >= 80 ? 'passed' : 'warning',
    summary: {
      lines: coverage.lines || {},
      statements: coverage.statements || {},
      functions: coverage.functions || {},
      branches: coverage.branches || {},
    },
    coveragePercentage: coverage.lines?.pct || 0,
  };
}

function processAIValidation(data) {
  if (!data) return { status: 'skipped', summary: null };

  return {
    status: data.status || 'unknown',
    summary: {
      totalValidations: data.totalValidations || 0,
      passed: data.passed || 0,
      failed: data.failed || 0,
      issues: data.issues || [],
    },
    modelAccuracy: data.modelAccuracy || null,
  };
}

function processVisualRegression(data) {
  if (!data) return { status: 'skipped', summary: null };

  const total = data.total || 0;
  const failed = data.failed || 0;

  return {
    status: failed === 0 ? 'passed' : 'failed',
    summary: {
      totalSnapshots: total,
      passed: data.passed || 0,
      failed: failed,
      newSnapshots: data.new || 0,
      updatedSnapshots: data.updated || 0,
    },
    failedTests: data.failedTests || [],
  };
}

function processPerformance(data) {
  if (!data) return { status: 'skipped', summary: null };

  const metrics = data.metrics || {};
  const thresholds = data.thresholds || {};

  let status = 'passed';
  const violations = [];

  Object.entries(metrics).forEach(([metric, value]) => {
    const threshold = thresholds[metric];
    if (threshold && value > threshold) {
      status = 'failed';
      violations.push({
        metric,
        value,
        threshold,
        difference: (((value - threshold) / threshold) * 100).toFixed(2),
      });
    }
  });

  return {
    status,
    summary: {
      metrics,
      thresholds,
      violations,
    },
    score: data.score || null,
  };
}

function processAccessibility(data) {
  if (!data) return { status: 'skipped', summary: null };

  const violations = data.violations || [];
  const warnings = data.warnings || [];

  let status = 'passed';
  if (
    violations.some((v) => v.impact === 'critical' || v.impact === 'serious')
  ) {
    status = 'failed';
  } else if (violations.length > 0 || warnings.length > 0) {
    status = 'warning';
  }

  return {
    status,
    summary: {
      violations: violations.length,
      warnings: warnings.length,
      score: data.score || 0,
      criticalIssues: violations.filter((v) => v.impact === 'critical').length,
    },
    details: {
      violations: violations.slice(0, 10),
      warnings: warnings.slice(0, 10),
    },
  };
}

function processComprehensiveValidation(data) {
  if (!data) return { status: 'skipped', summary: null };

  return {
    status: data.status || 'unknown',
    summary: {
      totalChecks: data.totalChecks || 0,
      passed: data.passed || 0,
      failed: data.failed || 0,
      categories: data.categories || {},
    },
    recommendations: data.recommendations || [],
  };
}

function generateRecommendations(details) {
  const recommendations = [];

  if (details.unit?.coveragePercentage < 80) {
    recommendations.push({
      priority: 'high',
      category: '覆盖率',
      message: `单元测试覆盖率仅为 ${details.unit.coveragePercentage}%，建议提升至 80% 以上`,
    });
  }

  if (details.ai?.status === 'failed') {
    recommendations.push({
      priority: 'high',
      category: 'AI验证',
      message: 'AI验证存在失败项，请检查模型输出是否符合预期',
    });
  }

  if (details.visual?.status === 'failed') {
    recommendations.push({
      priority: 'medium',
      category: '视觉回归',
      message: `发现 ${details.visual.summary.failed} 个视觉回归问题，请审查UI变更`,
    });
  }

  if (details.performance?.status === 'failed') {
    const violations = details.performance.summary.violations;
    recommendations.push({
      priority: 'high',
      category: '性能',
      message: `性能测试未通过: ${violations.map((v) => v.metric).join(', ')} 超出阈值`,
    });
  }

  if (details.accessibility?.status === 'failed') {
    recommendations.push({
      priority: 'high',
      category: '可访问性',
      message: `发现 ${details.accessibility.summary.criticalIssues} 个关键可访问性问题`,
    });
  } else if (details.accessibility?.status === 'warning') {
    recommendations.push({
      priority: 'medium',
      category: '可访问性',
      message: '存在可访问性警告，建议优化以提升用户体验',
    });
  }

  if (details.comprehensive?.recommendations) {
    recommendations.push(...details.comprehensive.recommendations);
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function generateMarkdown(report) {
  const { timestamp, summary, details, recommendations } = report;

  const statusEmoji = {
    passed: '✅',
    failed: '❌',
    warning: '⚠️',
    skipped: '⏭️',
    unknown: '❓',
  };

  let md = `# 验证报告\n\n`;
  md += `**生成时间**: ${new Date(timestamp).toLocaleString('zh-CN')}\n\n`;

  md += `## 总体概览\n\n`;
  md += `| 指标 | 数值 |\n`;
  md += `|------|------|\n`;
  md += `| 状态 | ${statusEmoji[summary.status]} ${summary.status.toUpperCase()} |\n`;
  md += `| 总测试数 | ${summary.totalTests} |\n`;
  md += `| 通过 | ${summary.passed} |\n`;
  md += `| 失败 | ${summary.failed} |\n`;
  md += `| 警告 | ${summary.warnings} |\n\n`;

  md += `## 详细结果\n\n`;

  Object.entries(TEST_RESULTS).forEach(([key, config]) => {
    const detail = details[key];
    if (!detail) return;

    md += `### ${config.icon} ${config.name}\n\n`;
    md += `**状态**: ${statusEmoji[detail.status]} ${detail.status.toUpperCase()}\n\n`;

    if (detail.summary) {
      md += `**摘要**:\n\n`;
      md += `\`\`\`json\n`;
      md += JSON.stringify(detail.summary, null, 2);
      md += `\n\`\`\`\n\n`;
    }

    if (key === 'unit' && detail.coveragePercentage !== undefined) {
      md += `**覆盖率**: ${detail.coveragePercentage}%\n\n`;
      if (detail.coveragePercentage < 80) {
        md += `⚠️ 覆盖率低于 80% 的建议阈值\n\n`;
      }
    }

    if (key === 'performance' && detail.summary?.violations?.length > 0) {
      md += `**性能违规**:\n\n`;
      md += `| 指标 | 当前值 | 阈值 | 超出比例 |\n`;
      md += `|------|--------|------|----------|\n`;
      detail.summary.violations.forEach((v) => {
        md += `| ${v.metric} | ${v.value} | ${v.threshold} | +${v.difference}% |\n`;
      });
      md += `\n`;
    }

    if (key === 'accessibility' && detail.details?.violations?.length > 0) {
      md += `**可访问性问题** (显示前10个):\n\n`;
      md += `| 影响级别 | 描述 | 元素 |\n`;
      md += `|----------|------|------|\n`;
      detail.details.violations.forEach((v) => {
        md += `| ${v.impact || 'N/A'} | ${v.description || 'N/A'} | \`${v.target || 'N/A'}\` |\n`;
      });
      md += `\n`;
    }

    md += `---\n\n`;
  });

  if (recommendations.length > 0) {
    md += `## 改进建议\n\n`;
    recommendations.forEach((rec, index) => {
      const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' };
      md += `${index + 1}. ${priorityEmoji[rec.priority]} **[${rec.category}]** ${rec.message}\n`;
    });
    md += `\n`;
  }

  md += `## 结论\n\n`;
  if (summary.status === 'passed') {
    md += '✅ 所有验证项目均已通过，代码质量良好，可以部署。\n';
  } else if (summary.status === 'warning') {
    md += '⚠️ 存在警告项，建议审查但不阻塞部署。\n';
  } else {
    md += '❌ 验证未通过，请修复上述问题后再进行部署。\n';
  }

  return md;
}

function ensureDirectory(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

async function main() {
  console.log('🔄 正在生成验证报告...\n');

  ensureDirectory(OUTPUT_DIR);

  const results = {};
  Object.entries(TEST_RESULTS).forEach(([key, config]) => {
    results[key] = readJson(config.path);
  });

  const summary = calculateSummary(results);

  const details = {
    unit: processUnitTests(results.unit),
    ai: processAIValidation(results.ai),
    visual: processVisualRegression(results.visual),
    performance: processPerformance(results.performance),
    accessibility: processAccessibility(results.accessibility),
    comprehensive: processComprehensiveValidation(results.comprehensive),
  };

  const recommendations = generateRecommendations(details);

  const report = {
    timestamp: new Date().toISOString(),
    summary,
    details,
    recommendations,
    metadata: {
      version: '1.0.0',
      generatedBy: 'generate-validation-report.js',
    },
  };

  const jsonPath = resolve(OUTPUT_DIR, 'VALIDATION_REPORT.json');
  const mdPath = resolve(OUTPUT_DIR, 'VALIDATION_REPORT.md');

  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`✅ JSON报告已生成: ${jsonPath}`);

  const markdown = generateMarkdown(report);
  writeFileSync(mdPath, markdown);
  console.log(`✅ Markdown报告已生成: ${mdPath}`);

  console.log('\n📊 报告摘要:');
  console.log(`   状态: ${summary.status.toUpperCase()}`);
  console.log(`   总计: ${summary.totalTests} 项测试`);
  console.log(`   通过: ${summary.passed}`);
  console.log(`   失败: ${summary.failed}`);
  console.log(`   警告: ${summary.warnings}`);

  if (recommendations.length > 0) {
    console.log(`\n💡 改进建议: ${recommendations.length} 条`);
  }

  if (summary.status === 'failed') {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ 生成报告失败:', error.message);
  process.exit(1);
});
