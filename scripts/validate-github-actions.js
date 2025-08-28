#!/usr/bin/env node

/**
 * GitHub Actions 配置验证脚本
 * 验证工作流配置的正确性和最佳实践
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class GitHubActionsValidator {
  constructor() {
    this.results = {
      workflows: [],
      issues: [],
      recommendations: [],
      score: 0
    };
  }

  // 验证YAML文件格式
  validateYamlSyntax(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = yaml.load(content);
      return { valid: true, content: parsed };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // 验证工作流结构
  validateWorkflowStructure(workflow, filename) {
    const issues = [];
    const recommendations = [];

    // 检查必需字段
    if (!workflow.name) {
      issues.push(`${filename}: 缺少工作流名称`);
    }

    if (!workflow.on) {
      issues.push(`${filename}: 缺少触发条件`);
    }

    if (!workflow.jobs || Object.keys(workflow.jobs).length === 0) {
      issues.push(`${filename}: 缺少作业定义`);
    }

    // 检查安全最佳实践
    if (workflow.on && workflow.on.pull_request) {
      recommendations.push(`${filename}: 建议限制PR工作流的权限`);
    }

    // 检查超时设置
    let hasTimeouts = false;
    if (workflow.jobs) {
      Object.entries(workflow.jobs).forEach(([jobName, job]) => {
        if (job['timeout-minutes']) {
          hasTimeouts = true;
        }
      });
    }

    if (!hasTimeouts) {
      recommendations.push(`${filename}: 建议为作业设置超时时间`);
    }

    return { issues, recommendations };
  }

  // 验证CI/CD最佳实践
  validateCICDBestPractices(workflow, filename) {
    const recommendations = [];

    // 检查缓存使用
    let usesCache = false;
    if (workflow.jobs) {
      Object.values(workflow.jobs).forEach(job => {
        if (job.steps) {
          job.steps.forEach(step => {
            if (step.uses && step.uses.includes('setup-node')) {
              if (step.with && step.with.cache) {
                usesCache = true;
              }
            }
          });
        }
      });
    }

    if (!usesCache) {
      recommendations.push(`${filename}: 建议使用Node.js缓存加速构建`);
    }

    // 检查并行作业
    if (workflow.jobs && Object.keys(workflow.jobs).length > 1) {
      let hasParallelJobs = false;
      Object.values(workflow.jobs).forEach(job => {
        if (!job.needs || job.needs.length === 0) {
          hasParallelJobs = true;
        }
      });

      if (hasParallelJobs) {
        recommendations.push(`${filename}: 良好实践 - 使用并行作业提升效率`);
      }
    }

    // 检查环境变量安全
    let hasSecretManagement = false;
    if (workflow.jobs) {
      Object.values(workflow.jobs).forEach(job => {
        if (job.steps) {
          job.steps.forEach(step => {
            if (step.env) {
              Object.values(step.env).forEach(value => {
                if (typeof value === 'string' && value.includes('${{')) {
                  hasSecretManagement = true;
                }
              });
            }
          });
        }
      });
    }

    if (!hasSecretManagement) {
      recommendations.push(`${filename}: 建议使用GitHub Secrets管理敏感信息`);
    }

    return recommendations;
  }

  // 验证特定于项目的配置
  validateProjectSpecificConfig(workflow, filename) {
    const issues = [];
    const recommendations = [];

    // 检查Node.js版本
    let nodeVersion = null;
    if (workflow.jobs) {
      Object.values(workflow.jobs).forEach(job => {
        if (job.steps) {
          job.steps.forEach(step => {
            if (step.uses && step.uses.includes('setup-node')) {
              if (step.with && step.with['node-version']) {
                nodeVersion = step.with['node-version'];
              }
            }
          });
        }
      });
    }

    if (!nodeVersion) {
      issues.push(`${filename}: 未指定Node.js版本`);
    } else if (nodeVersion !== '20' && nodeVersion !== '${{ env.NODE_VERSION }}') {
      recommendations.push(`${filename}: 建议使用Node.js 20作为标准版本`);
    }

    // 检查数据库服务
    let hasDatabase = false;
    if (workflow.jobs) {
      Object.values(workflow.jobs).forEach(job => {
        if (job.services && (job.services.mongodb || job.services.redis)) {
          hasDatabase = true;
        }
      });
    }

    if (filename.includes('ci') && !hasDatabase) {
      recommendations.push(`${filename}: 建议在CI中包含数据库服务进行集成测试`);
    }

    return { issues, recommendations };
  }

  // 计算配置质量得分
  calculateScore(totalIssues, totalRecommendations) {
    const baseScore = 100;
    const issueDeduction = totalIssues * 10;
    const recommendationDeduction = totalRecommendations * 2;
    
    return Math.max(0, baseScore - issueDeduction - recommendationDeduction);
  }

  // 验证所有工作流文件
  validateWorkflows() {
    const workflowsDir = path.join(process.cwd(), '.github', 'workflows');
    
    if (!fs.existsSync(workflowsDir)) {
      this.results.issues.push('未找到.github/workflows目录');
      return this.results;
    }

    const workflowFiles = fs.readdirSync(workflowsDir).filter(file => 
      file.endsWith('.yml') || file.endsWith('.yaml')
    );

    if (workflowFiles.length === 0) {
      this.results.issues.push('未找到工作流配置文件');
      return this.results;
    }

    console.log(`🔍 发现 ${workflowFiles.length} 个工作流文件`);

    workflowFiles.forEach(filename => {
      console.log(`\n📋 验证工作流: ${filename}`);
      
      const filePath = path.join(workflowsDir, filename);
      const yamlValidation = this.validateYamlSyntax(filePath);

      const workflowResult = {
        filename,
        valid: yamlValidation.valid,
        issues: [],
        recommendations: []
      };

      if (!yamlValidation.valid) {
        workflowResult.issues.push(`YAML语法错误: ${yamlValidation.error}`);
        this.results.issues.push(`${filename}: ${yamlValidation.error}`);
      } else {
        // 验证工作流结构
        const structureValidation = this.validateWorkflowStructure(yamlValidation.content, filename);
        workflowResult.issues.push(...structureValidation.issues);
        workflowResult.recommendations.push(...structureValidation.recommendations);

        // 验证CI/CD最佳实践
        const cicdRecommendations = this.validateCICDBestPractices(yamlValidation.content, filename);
        workflowResult.recommendations.push(...cicdRecommendations);

        // 验证项目特定配置
        const projectValidation = this.validateProjectSpecificConfig(yamlValidation.content, filename);
        workflowResult.issues.push(...projectValidation.issues);
        workflowResult.recommendations.push(...projectValidation.recommendations);

        this.results.issues.push(...workflowResult.issues);
        this.results.recommendations.push(...workflowResult.recommendations);
      }

      this.results.workflows.push(workflowResult);
      
      // 输出验证结果
      if (workflowResult.issues.length === 0) {
        console.log(`✅ ${filename}: 配置正确`);
      } else {
        console.log(`❌ ${filename}: 发现 ${workflowResult.issues.length} 个问题`);
        workflowResult.issues.forEach(issue => console.log(`   - ${issue}`));
      }

      if (workflowResult.recommendations.length > 0) {
        console.log(`💡 ${filename}: ${workflowResult.recommendations.length} 个改进建议`);
        workflowResult.recommendations.forEach(rec => console.log(`   - ${rec}`));
      }
    });

    // 计算总体得分
    this.results.score = this.calculateScore(
      this.results.issues.length,
      this.results.recommendations.length
    );

    return this.results;
  }

  // 生成验证报告
  generateReport() {
    const results = this.validateWorkflows();
    
    const report = `# 🔍 GitHub Actions 配置验证报告

**验证时间**: ${new Date().toLocaleString('zh-CN')}
**配置质量得分**: ${results.score}/100

## 📊 验证摘要

| 指标 | 数量 | 状态 |
|------|------|------|
| 工作流文件 | ${results.workflows.length} | ${results.workflows.length > 0 ? '✅' : '❌'} |
| 配置问题 | ${results.issues.length} | ${results.issues.length === 0 ? '✅' : '⚠️'} |
| 改进建议 | ${results.recommendations.length} | ${results.recommendations.length < 5 ? '✅' : '💡'} |
| 总体评价 | ${results.score >= 80 ? '优秀' : results.score >= 60 ? '良好' : '需改进'} | ${results.score >= 80 ? '✅' : results.score >= 60 ? '⚠️' : '❌'} |

## 📋 工作流详情

${results.workflows.map(workflow => `
### ${workflow.filename}

- **配置状态**: ${workflow.valid ? '✅ 有效' : '❌ 无效'}
- **问题数量**: ${workflow.issues.length}
- **建议数量**: ${workflow.recommendations.length}

${workflow.issues.length > 0 ? `
**🔴 发现问题**:
${workflow.issues.map(issue => `- ${issue}`).join('\n')}
` : ''}

${workflow.recommendations.length > 0 ? `
**💡 改进建议**:
${workflow.recommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}
`).join('')}

## 🎯 总体建议

${results.score >= 90 ? `
🎉 **配置优秀**: GitHub Actions配置非常完善，符合最佳实践。

建议：
- 继续保持当前配置质量
- 定期更新依赖版本
- 监控工作流执行性能
` : results.score >= 70 ? `
✅ **配置良好**: GitHub Actions配置基本完善，有少量改进空间。

建议：
- 解决发现的配置问题
- 采纳相关改进建议
- 优化工作流执行效率
` : `
⚠️ **需要改进**: GitHub Actions配置存在一些问题，建议优化。

优先处理：
1. 修复配置问题
2. 实施安全最佳实践
3. 优化构建流程
4. 添加必要的测试步骤
`}

## 🔧 最佳实践检查清单

- [${results.workflows.some(w => w.filename.includes('ci')) ? '✅' : '❌'}] CI/CD流水线配置
- [${results.workflows.some(w => w.filename.includes('deploy')) ? '✅' : '❌'}] 部署工作流配置
- [${results.recommendations.some(r => r.includes('缓存')) ? '❌' : '✅'}] 构建缓存优化
- [${results.recommendations.some(r => r.includes('超时')) ? '❌' : '✅'}] 作业超时设置
- [${results.recommendations.some(r => r.includes('并行')) ? '❌' : '✅'}] 并行作业配置
- [${results.recommendations.some(r => r.includes('Secrets')) ? '❌' : '✅'}] 安全信息管理

---

**验证完成时间**: ${new Date().toLocaleString('zh-CN')}
**工具版本**: GitHub Actions Validator v1.0
`;

    const reportPath = path.join(process.cwd(), 'GITHUB_ACTIONS_VALIDATION_REPORT.md');
    fs.writeFileSync(reportPath, report);
    
    console.log(`\n📋 验证报告已生成: ${reportPath}`);
    console.log(`🏆 配置质量得分: ${results.score}/100`);
    
    return reportPath;
  }
}

// 运行验证
if (require.main === module) {
  const validator = new GitHubActionsValidator();
  
  try {
    validator.generateReport();
    console.log('\n🎉 GitHub Actions配置验证完成!');
  } catch (error) {
    console.error('❌ 验证过程出错:', error);
    process.exit(1);
  }
}

module.exports = GitHubActionsValidator;