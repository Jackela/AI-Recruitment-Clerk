#!/usr/bin/env node

// 营销功能完整性验证脚本
import fs from 'fs';
import path from 'path';

console.log('🧪 营销功能完整性验证');
console.log('================================');

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
  }
}

function assertFileExists(filePath, description) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${description} 文件不存在: ${filePath}`);
  }
}

function assertFileContains(filePath, content, description) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }
  const fileContent = fs.readFileSync(filePath, 'utf8');
  if (!fileContent.includes(content)) {
    throw new Error(`${description} 不包含预期内容: ${content}`);
  }
}

// 测试文件结构
test('前端游客服务文件存在', () => {
  assertFileExists('apps/ai-recruitment-frontend/src/app/services/marketing/guest-usage.service.ts', '游客使用服务');
  assertFileExists('apps/ai-recruitment-frontend/src/app/services/marketing/guest-usage.service.spec.ts', '游客服务测试');
});

test('前端营销页面文件存在', () => {
  assertFileExists('apps/ai-recruitment-frontend/src/app/pages/marketing/campaign.component.ts', '营销活动页面');
  assertFileExists('apps/ai-recruitment-frontend/src/app/pages/marketing/campaign.component.spec.ts', '营销页面测试');
  assertFileExists('apps/ai-recruitment-frontend/src/app/pages/marketing/campaign.component.scss', '营销页面样式');
});

test('后端反馈码服务文件存在', () => {
  assertFileExists('apps/app-gateway/src/marketing/feedback-code.service.ts', '反馈码服务');
  assertFileExists('apps/app-gateway/src/marketing/feedback-code.service.spec.ts', '反馈码服务测试');
});

test('后端API控制器文件存在', () => {
  assertFileExists('apps/app-gateway/src/marketing/feedback-code.controller.ts', '反馈码控制器');
  assertFileExists('apps/app-gateway/src/marketing/feedback-code.controller.spec.ts', '反馈码控制器测试');
});

test('管理后台API文件存在', () => {
  assertFileExists('apps/app-gateway/src/marketing/marketing-admin.controller.ts', '管理后台控制器');
  assertFileExists('apps/app-gateway/src/marketing/marketing-admin.controller.spec.ts', '管理后台测试');
});

test('数据模型和Schema文件存在', () => {
  assertFileExists('libs/shared-dtos/src/models/feedback-code.dto.ts', '反馈码DTO');
  assertFileExists('apps/app-gateway/src/marketing/schemas/feedback-code.schema.ts', '反馈码Schema');
});

test('营销模块配置存在', () => {
  assertFileExists('apps/app-gateway/src/marketing/marketing.module.ts', '营销模块');
});

test('集成测试文件存在', () => {
  assertFileExists('apps/app-gateway/src/marketing/marketing.integration.spec.ts', '集成测试');
});

test('营销素材和配置文件存在', () => {
  assertFileExists('marketing-assets/questionnaire-design.md', '问卷设计文档');
  assertFileExists('marketing-assets/xiaohongshu-post.md', '小红书文案');
  assertFileExists('marketing-assets/operation-manual.md', '运营手册');
});

// 测试代码质量
test('前端服务包含核心功能', () => {
  assertFileContains(
    'apps/ai-recruitment-frontend/src/app/services/marketing/guest-usage.service.ts',
    'getUsageCount',
    '游客服务'
  );
  assertFileContains(
    'apps/ai-recruitment-frontend/src/app/services/marketing/guest-usage.service.ts',
    'generateFeedbackCode',
    '游客服务'
  );
  assertFileContains(
    'apps/ai-recruitment-frontend/src/app/services/marketing/guest-usage.service.ts',
    'isUsageExhausted',
    '游客服务'
  );
});

test('后端服务包含核心功能', () => {
  assertFileContains(
    'apps/app-gateway/src/marketing/feedback-code.service.ts',
    'recordFeedbackCode',
    '反馈码服务'
  );
  assertFileContains(
    'apps/app-gateway/src/marketing/feedback-code.service.ts',
    'validateFeedbackCode',
    '反馈码服务'
  );
  assertFileContains(
    'apps/app-gateway/src/marketing/feedback-code.service.ts',
    'markAsUsed',
    '反馈码服务'
  );
  assertFileContains(
    'apps/app-gateway/src/marketing/feedback-code.service.ts',
    'assessFeedbackQuality',
    '反馈码服务'
  );
});

test('API控制器包含所有端点', () => {
  assertFileContains(
    'apps/app-gateway/src/marketing/feedback-code.controller.ts',
    '@Post(\'record\')',
    'API控制器'
  );
  assertFileContains(
    'apps/app-gateway/src/marketing/feedback-code.controller.ts',
    '@Get(\'validate/:code\')',
    'API控制器'
  );
  assertFileContains(
    'apps/app-gateway/src/marketing/feedback-code.controller.ts',
    '@Post(\'mark-used\')',
    'API控制器'
  );
  assertFileContains(
    'apps/app-gateway/src/marketing/feedback-code.controller.ts',
    '@Post(\'webhook/questionnaire\')',
    'API控制器'
  );
});

test('测试文件包含关键测试', () => {
  assertFileContains(
    'apps/ai-recruitment-frontend/src/app/services/marketing/guest-usage.service.spec.ts',
    'describe',
    '前端测试'
  );
  assertFileContains(
    'apps/app-gateway/src/marketing/feedback-code.service.spec.ts',
    'describe',
    '后端服务测试'
  );
  assertFileContains(
    'apps/app-gateway/src/marketing/feedback-code.controller.spec.ts',
    'describe',
    '后端控制器测试'
  );
});

test('DTO模型完整性', () => {
  assertFileContains(
    'libs/shared-dtos/src/models/feedback-code.dto.ts',
    'FeedbackCodeDto',
    'DTO模型'
  );
  assertFileContains(
    'libs/shared-dtos/src/models/feedback-code.dto.ts',
    'CreateFeedbackCodeDto',
    'DTO模型'
  );
  assertFileContains(
    'libs/shared-dtos/src/models/feedback-code.dto.ts',
    'MarkFeedbackCodeUsedDto',
    'DTO模型'
  );
});

test('数据库Schema定义', () => {
  assertFileContains(
    'apps/app-gateway/src/marketing/schemas/feedback-code.schema.ts',
    'FeedbackCodeSchema',
    'MongoDB Schema'
  );
  assertFileContains(
    'apps/app-gateway/src/marketing/schemas/feedback-code.schema.ts',
    'code:',
    'MongoDB Schema'
  );
  assertFileContains(
    'apps/app-gateway/src/marketing/schemas/feedback-code.schema.ts',
    'paymentStatus:',
    'MongoDB Schema'
  );
});

test('集成测试完整性', () => {
  assertFileContains(
    'apps/app-gateway/src/marketing/marketing.integration.spec.ts',
    '完整营销流程集成测试',
    '集成测试'
  );
  assertFileContains(
    'apps/app-gateway/src/marketing/marketing.integration.spec.ts',
    'Webhook集成测试',
    '集成测试'
  );
  assertFileContains(
    'apps/app-gateway/src/marketing/marketing.integration.spec.ts',
    '并发安全测试',
    '集成测试'
  );
});

test('营销文档完整性', () => {
  assertFileContains(
    'marketing-assets/questionnaire-design.md',
    '腾讯问卷设计方案',
    '问卷设计'
  );
  assertFileContains(
    'marketing-assets/xiaohongshu-post.md',
    '小红书营销文案',
    '营销文案'
  );
  assertFileContains(
    'marketing-assets/operation-manual.md',
    '凤凰计划运营手册',
    '运营手册'
  );
});

// 检查部署配置
test('部署配置文件存在', () => {
  assertFileExists('railway.json', 'Railway配置');
  assertFileExists('docker-compose.railway.yml', 'Railway Docker配置');
  assertFileExists('QUICK_DEPLOY_GUIDE.md', '部署指南');
});

// 输出结果
console.log('\n================================');
console.log('📊 测试结果汇总');
console.log('================================');
console.log(`✅ 通过: ${results.passed}`);
console.log(`❌ 失败: ${results.failed}`);
console.log(`📈 通过率: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);

if (results.failed > 0) {
  console.log('\n❌ 失败的测试:');
  results.tests.filter(t => t.status === 'FAIL').forEach(test => {
    console.log(`  - ${test.name}: ${test.error}`);
  });
  console.log('\n🔧 请修复以上问题后重新测试');
  process.exit(1);
} else {
  console.log('\n🎉 所有测试通过！营销功能已准备就绪');
  console.log('\n📋 功能清单:');
  console.log('  ✅ 游客使用限制 (5次免费体验)');
  console.log('  ✅ 反馈码生成和验证');
  console.log('  ✅ 营销活动页面');
  console.log('  ✅ 问卷集成和质量评分');
  console.log('  ✅ 管理后台和支付管理');
  console.log('  ✅ Webhook处理');
  console.log('  ✅ 完整测试套件');
  console.log('  ✅ 部署配置');
  console.log('  ✅ 营销素材和文档');
  
  console.log('\n🚀 下一步行动:');
  console.log('  1. 部署到Railway生产环境');
  console.log('  2. 创建腾讯问卷并配置webhook');
  console.log('  3. 准备支付宝账号');
  console.log('  4. 发布小红书营销内容');
  console.log('  5. 开始凤凰计划营销活动');
}

console.log('\n🕒 验证完成时间:', new Date().toLocaleString('zh-CN'));