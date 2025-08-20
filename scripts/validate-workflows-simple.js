#!/usr/bin/env node
/**
 * GitHub Actions工作流简单验证脚本
 * 无外部依赖，基础验证功能
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 GitHub Actions工作流验证器');
console.log('='.repeat(50));

// 检查workflows目录
const workflowsDir = path.join(process.cwd(), '.github', 'workflows');
if (!fs.existsSync(workflowsDir)) {
  console.log('❌ .github/workflows目录不存在');
  process.exit(1);
}

// 获取所有工作流文件
const workflowFiles = fs.readdirSync(workflowsDir)
  .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));

console.log(`📁 找到 ${workflowFiles.length} 个工作流文件:`);
workflowFiles.forEach(file => console.log(`  - ${file}`));
console.log('');

// 验证每个文件
let totalErrors = 0;
let totalWarnings = 0;

workflowFiles.forEach(filename => {
  console.log(`🔍 验证: ${filename}`);
  
  try {
    const filePath = path.join(workflowsDir, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    
    let errors = 0;
    let warnings = 0;
    
    // 基本结构检查
    if (!content.includes('name:')) {
      console.log('  ⚠️ 建议添加工作流名称');
      warnings++;
    }
    
    if (!content.includes('on:')) {
      console.log('  ❌ 缺少触发条件 (on)');
      errors++;
    }
    
    if (!content.includes('jobs:')) {
      console.log('  ❌ 缺少作业定义 (jobs)');
      errors++;
    }
    
    // 检查npm脚本
    const npmScripts = ['test', 'test:ci', 'lint', 'typecheck'];
    npmScripts.forEach(script => {
      if (content.includes(`npm run ${script}`)) {
        console.log(`  ✅ 使用npm脚本: ${script}`);
      }
    });
    
    // 检查关键文件引用
    const requiredFiles = [
      'scripts/generate-test-report.js',
      'package.json',
      'jest.config.js'
    ];
    
    requiredFiles.forEach(file => {
      if (content.includes(file)) {
        const fullPath = path.join(process.cwd(), file);
        if (fs.existsSync(fullPath)) {
          console.log(`  ✅ 文件存在: ${file}`);
        } else {
          console.log(`  ❌ 文件不存在: ${file}`);
          errors++;
        }
      }
    });
    
    // 检查常见Actions
    const actions = content.match(/uses: ([\w\/-]+@v?\d*)/g);
    if (actions) {
      console.log(`  📦 使用了 ${actions.length} 个GitHub Actions`);
    }
    
    totalErrors += errors;
    totalWarnings += warnings;
    
    if (errors === 0) {
      console.log(`  ✅ ${filename} 验证通过`);
    } else {
      console.log(`  ❌ ${filename} 有 ${errors} 个错误`);
    }
    
  } catch (error) {
    console.log(`  ❌ ${filename} 读取失败: ${error.message}`);
    totalErrors++;
  }
  
  console.log('');
});

// 生成总体报告
console.log('📊 验证总结');
console.log('='.repeat(30));
console.log(`📁 工作流文件: ${workflowFiles.length}`);
console.log(`❌ 总错误数: ${totalErrors}`);
console.log(`⚠️ 总警告数: ${totalWarnings}`);

// 检查关键npm脚本
console.log('');
console.log('🔍 检查npm脚本可用性:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const scripts = packageJson.scripts || {};
  
  ['test', 'test:ci', 'lint', 'typecheck'].forEach(script => {
    if (scripts[script]) {
      console.log(`  ✅ ${script}: ${scripts[script]}`);
    } else {
      console.log(`  ❌ ${script}: 未定义`);
      totalErrors++;
    }
  });
} catch (error) {
  console.log('  ❌ 无法读取package.json');
  totalErrors++;
}

// 生成报告文件
const report = {
  timestamp: new Date().toISOString(),
  files: workflowFiles.length,
  errors: totalErrors,
  warnings: totalWarnings,
  status: totalErrors === 0 ? 'PASS' : 'FAIL'
};

fs.writeFileSync('workflow-validation-report.json', JSON.stringify(report, null, 2));

console.log('');
console.log('📄 验证报告已保存到: workflow-validation-report.json');

// 最终状态
if (totalErrors === 0) {
  console.log('🎉 所有工作流验证通过！CI/CD系统已准备就绪。');
  process.exit(0);
} else {
  console.log('❌ 工作流验证失败，需要修复错误后重试。');
  process.exit(1);
}