// MongoDB性能优化脚本 - AI Recruitment系统索引创建
// 执行命令: docker exec -i ai-recruitment-mongodb mongosh --username admin --password password123 --authenticationDatabase admin ai-recruitment < performance/database-optimization.js

use('ai-recruitment');

print('🔧 开始创建AI招聘系统性能优化索引...');

// ======= 职位 (Jobs) 集合索引 =======
print('\n📋 优化Jobs集合索引...');

// 1. 文本搜索索引 (职位标题和描述全文搜索)
try {
  db.jobs.createIndex(
    { 
      title: "text", 
      description: "text", 
      "requirements.technical": "text",
      "requirements.qualifications": "text"
    },
    { 
      name: "jobs_fulltext_search",
      weights: {
        title: 10,
        description: 5,
        "requirements.technical": 8,
        "requirements.qualifications": 3
      }
    }
  );
  print('✅ 全文搜索索引创建成功');
} catch (e) {
  print('❌ 全文搜索索引创建失败:', e.message);
}

// 2. 时间排序索引 (最新职位优先)
try {
  db.jobs.createIndex({ createdAt: -1 }, { name: "jobs_created_desc" });
  print('✅ 创建时间倒序索引创建成功');
} catch (e) {
  print('❌ 时间索引创建失败:', e.message);
}

// 3. 状态查询索引 (活跃职位筛选)
try {
  db.jobs.createIndex({ status: 1, createdAt: -1 }, { name: "jobs_status_time" });
  print('✅ 状态+时间复合索引创建成功');
} catch (e) {
  print('❌ 状态索引创建失败:', e.message);
}

// 4. 公司职位索引 (按公司筛选)
try {
  db.jobs.createIndex({ company: 1, status: 1 }, { name: "jobs_company_status" });
  print('✅ 公司+状态索引创建成功');
} catch (e) {
  print('❌ 公司索引创建失败:', e.message);
}

// 5. 地理位置索引 (地点筛选)
try {
  db.jobs.createIndex({ "location.coordinates": "2dsphere" }, { name: "jobs_geo_location" });
  print('✅ 地理位置索引创建成功');
} catch (e) {
  print('❌ 地理位置索引创建失败:', e.message);
}

// 6. 薪资范围索引 (薪资筛选)
try {
  db.jobs.createIndex({ salaryMin: 1, salaryMax: 1 }, { name: "jobs_salary_range" });
  print('✅ 薪资范围索引创建成功');
} catch (e) {
  print('❌ 薪资索引创建失败:', e.message);
}

// ======= 简历 (Resumes) 集合索引 =======
print('\n📄 优化Resumes集合索引...');

// 1. 候选人简历索引
try {
  db.resumes.createIndex({ candidateId: 1, jobId: 1 }, { name: "resumes_candidate_job", unique: true });
  print('✅ 候选人+职位唯一索引创建成功');
} catch (e) {
  print('❌ 候选人索引创建失败:', e.message);
}

// 2. 简历状态和时间索引
try {
  db.resumes.createIndex({ status: 1, submittedAt: -1 }, { name: "resumes_status_time" });
  print('✅ 简历状态+时间索引创建成功');
} catch (e) {
  print('❌ 简历状态索引创建失败:', e.message);
}

// 3. 职位简历索引 (按职位查看所有简历)
try {
  db.resumes.createIndex({ jobId: 1, score: -1, submittedAt: -1 }, { name: "resumes_job_score_time" });
  print('✅ 职位+评分+时间索引创建成功');
} catch (e) {
  print('❌ 职位简历索引创建失败:', e.message);
}

// 4. 简历全文搜索索引
try {
  db.resumes.createIndex(
    { 
      "personalInfo.name": "text",
      "experience.company": "text", 
      "experience.position": "text",
      "skills": "text",
      "education.institution": "text"
    },
    { 
      name: "resumes_fulltext_search",
      weights: {
        "personalInfo.name": 10,
        "experience.position": 8,
        "skills": 7,
        "experience.company": 5,
        "education.institution": 3
      }
    }
  );
  print('✅ 简历全文搜索索引创建成功');
} catch (e) {
  print('❌ 简历搜索索引创建失败:', e.message);
}

// ======= 评分 (Scores) 集合索引 =======
print('\n🎯 优化Scores集合索引...');

// 1. 简历评分索引
try {
  db.scores.createIndex({ resumeId: 1, scoringType: 1 }, { name: "scores_resume_type" });
  print('✅ 简历评分类型索引创建成功');
} catch (e) {
  print('❌ 评分索引创建失败:', e.message);
}

// 2. 高分简历索引 (快速筛选优秀候选人)
try {
  db.scores.createIndex({ totalScore: -1, scoredAt: -1 }, { name: "scores_high_score_time" });
  print('✅ 高分简历时间索引创建成功');
} catch (e) {
  print('❌ 高分索引创建失败:', e.message);
}

// 3. 职位评分统计索引
try {
  db.scores.createIndex({ jobId: 1, totalScore: -1 }, { name: "scores_job_ranking" });
  print('✅ 职位评分排序索引创建成功');
} catch (e) {
  print('❌ 职位评分索引创建失败:', e.message);
}

// ======= 用户 (Users) 集合索引 =======
print('\n👤 优化Users集合索引...');

// 1. 邮箱唯一索引 (登录验证)
try {
  db.users.createIndex({ email: 1 }, { name: "users_email_unique", unique: true });
  print('✅ 用户邮箱唯一索引创建成功');
} catch (e) {
  print('❌ 用户邮箱索引创建失败:', e.message);
}

// 2. 用户角色和状态索引
try {
  db.users.createIndex({ role: 1, isActive: 1 }, { name: "users_role_status" });
  print('✅ 用户角色状态索引创建成功');
} catch (e) {
  print('❌ 用户角色索引创建失败:', e.message);
}

// 3. 最后登录时间索引 (活跃用户分析)
try {
  db.users.createIndex({ lastLoginAt: -1 }, { name: "users_last_login" });
  print('✅ 最后登录时间索引创建成功');
} catch (e) {
  print('❌ 登录时间索引创建失败:', e.message);
}

// ======= 报告 (Reports) 集合索引 =======
print('\n📊 优化Reports集合索引...');

// 1. 报告类型和时间索引
try {
  db.reports.createIndex({ reportType: 1, generatedAt: -1 }, { name: "reports_type_time" });
  print('✅ 报告类型时间索引创建成功');
} catch (e) {
  print('❌ 报告索引创建失败:', e.message);
}

// 2. 用户报告索引
try {
  db.reports.createIndex({ userId: 1, status: 1 }, { name: "reports_user_status" });
  print('✅ 用户报告状态索引创建成功');
} catch (e) {
  print('❌ 用户报告索引创建失败:', e.message);
}

// ======= 索引统计和验证 =======
print('\n📈 索引创建完成统计:');

const collections = ['jobs', 'resumes', 'scores', 'users', 'reports'];
collections.forEach(collectionName => {
  try {
    const indexes = db.getCollection(collectionName).getIndexes();
    print(`📋 ${collectionName}: ${indexes.length} 个索引`);
    indexes.forEach(index => {
      print(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
  } catch (e) {
    print(`❌ ${collectionName} 集合索引查询失败:`, e.message);
  }
  print('');
});

// ======= 查询性能建议 =======
print('🔍 查询性能建议:');
print('1. 使用复合索引时，将选择性高的字段放在前面');
print('2. 文本搜索使用 $text 操作符，避免正则表达式');
print('3. 分页查询使用 skip() 和 limit()，但避免大偏移量');
print('4. 使用 explain() 分析查询计划');
print('5. 定期清理过期数据，保持索引效率');

print('\n✅ AI招聘系统数据库优化完成！');