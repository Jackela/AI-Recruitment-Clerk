// AI 招聘助手 - MongoDB 初始化脚本
// 创建数据库、集合和初始配置

print('🚀 初始化 AI 招聘助手数据库...');

// 切换到目标数据库
db = db.getSiblingDB('ai-recruitment');

// 创建应用用户（如果不存在）
try {
  db.createUser({
    user: 'ai-recruitment-app',
    pwd: 'secure-app-password-123',
    roles: [
      {
        role: 'readWrite',
        db: 'ai-recruitment'
      }
    ]
  });
  print('✅ 应用用户创建完成');
} catch (error) {
  if (error.code === 51003) {
    print('ℹ️  应用用户已存在，跳过创建');
  } else {
    print('❌ 用户创建失败:', error.message);
  }
}

// 创建集合和索引
print('📋 创建集合和索引...');

// 用户集合
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ organizationId: 1 });
db.users.createIndex({ status: 1 });
db.users.createIndex({ createdAt: 1 });
print('✅ users 集合索引创建完成');

// 简历集合  
db.resumes.createIndex({ userId: 1 });
db.resumes.createIndex({ status: 1 });
db.resumes.createIndex({ createdAt: 1 });
db.resumes.createIndex({ 'skills.name': 1 });
db.resumes.createIndex({ 'experience.title': 1 });
// 兼容现有索引
db.resumes.createIndex({ "jobId": 1 });
db.resumes.createIndex({ "uploadedAt": -1 });
print('✅ resumes 集合索引创建完成');

// 职位描述集合
db.jobDescriptions.createIndex({ userId: 1 });
db.jobDescriptions.createIndex({ organizationId: 1 });
db.jobDescriptions.createIndex({ status: 1 });
db.jobDescriptions.createIndex({ 'requirements.skills': 1 });
db.jobDescriptions.createIndex({ createdAt: 1 });
// 兼容现有 jobs 集合
db.jobs.createIndex({ "id": 1 }, { unique: true });
db.jobs.createIndex({ "status": 1 });
db.jobs.createIndex({ "createdAt": -1 });
print('✅ jobDescriptions/jobs 集合索引创建完成');

// 评分记录集合
db.scores.createIndex({ resumeId: 1 });
db.scores.createIndex({ jobDescriptionId: 1 });
db.scores.createIndex({ userId: 1 });
db.scores.createIndex({ totalScore: -1 });
db.scores.createIndex({ createdAt: 1 });
// 兼容现有分析结果
db.analysis_results.createIndex({ "jobId": 1 });
db.analysis_results.createIndex({ "resumeId": 1 });
db.analysis_results.createIndex({ "score": -1 });
print('✅ scores/analysis_results 集合索引创建完成');

// 报告集合
db.reports.createIndex({ userId: 1 });
db.reports.createIndex({ type: 1 });
db.reports.createIndex({ status: 1 });
db.reports.createIndex({ createdAt: 1 });
// 兼容现有报告索引
db.reports.createIndex({ "jobId": 1 });
db.reports.createIndex({ "createdAt": -1 });
print('✅ reports 集合索引创建完成');

// 组织集合
db.organizations.createIndex({ name: 1 }, { unique: true });
db.organizations.createIndex({ status: 1 });
print('✅ organizations 集合索引创建完成');

// 反馈集合
db.feedbacks.createIndex({ userId: 1 });
db.feedbacks.createIndex({ type: 1 });
db.feedbacks.createIndex({ status: 1 });
db.feedbacks.createIndex({ createdAt: 1 });
print('✅ feedbacks 集合索引创建完成');

// 审计日志集合
db.auditLogs.createIndex({ userId: 1 });
db.auditLogs.createIndex({ action: 1 });
db.auditLogs.createIndex({ timestamp: 1 });
db.auditLogs.createIndex({ ipAddress: 1 });
print('✅ auditLogs 集合索引创建完成');

// 插入系统配置
try {
  db.systemConfig.insertOne({
    _id: 'app-config',
    version: '1.0.0',
    features: {
      resumeParsing: true,
      scoring: true,
      reporting: true,
      marketing: true
    },
    limits: {
      freeUsageLimit: 5,
      maxFileSize: 10485760, // 10MB
      supportedFormats: ['pdf', 'doc', 'docx']
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });
  print('✅ 系统配置插入完成');
} catch (error) {
  if (error.code === 11000) {
    print('ℹ️  系统配置已存在，跳过插入');
  } else {
    print('❌ 系统配置插入失败:', error.message);
  }
}

// 创建默认组织
try {
  const defaultOrg = db.organizations.findOne({ name: '默认组织' });
  if (!defaultOrg) {
    db.organizations.insertOne({
      name: '默认组织',
      type: 'default',
      status: 'active',
      settings: {
        allowSelfRegistration: true,
        defaultRole: 'user'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    print('✅ 默认组织创建完成');
  } else {
    print('ℹ️  默认组织已存在，跳过创建');
  }
} catch (error) {
  print('❌ 默认组织创建失败:', error.message);
}

print('🎉 AI 招聘助手数据库初始化完成！');

// 显示数据库状态
print('📊 数据库状态:');
print('数据库名称:', db.getName());
print('集合数量:', db.getCollectionNames().length);
print('集合列表:', db.getCollectionNames().join(', '));

// 显示索引统计
db.getCollectionNames().forEach(function(collectionName) {
  try {
    var indexCount = db.getCollection(collectionName).getIndexes().length;
    print('  - ' + collectionName + ': ' + indexCount + ' 个索引');
  } catch (error) {
    print('  - ' + collectionName + ': 索引查询失败');
  }
});