const http = require("http");
const { spawn } = require("child_process");
const fs = require("fs");

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const NESTJS_PORT = PORT + 1000; // NestJS on PORT+1000
let nestJSProcess = null;
let isNestJSReady = false;

const server = http.createServer(async (req, res) => {
  // 设置响应头
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 处理OPTIONS请求
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Proxy function to NestJS
  async function proxyToNestJS(path, method, body) {
    if (!isNestJSReady) return null;
    
    try {
      const fetch = (await import('node-fetch')).default;
      const url = `http://localhost:${NESTJS_PORT}${path}`;
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(body && { body: JSON.stringify(body) })
      };
      
      const response = await fetch(url, options);
      return await response.json();
    } catch (error) {
      console.error('Proxy error:', error.message);
      return null;
    }
  }

  // Enhanced API Routes with NestJS integration
  if (req.url === "/api/health" && req.method === "GET") {
    const nestResult = await proxyToNestJS('/api/health', 'GET');
    
    res.writeHead(200);
    res.end(JSON.stringify({
      status: "ok",
      timestamp: new Date().toISOString(),
      message: "AI招聘助手 Hybrid Enhanced v2.1",
      version: "v2.1.0-hybrid",
      mode: "hybrid-enhanced",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      backend: isNestJSReady ? "nestjs-connected" : "mock-fallback",
      nestjsData: nestResult || null,
      features: ["resume-analysis", "job-management", "data-analytics", "nestjs-integration"]
    }));
    
  } else if (req.url === "/api/jobs" && req.method === "GET") {
    // Try to proxy to NestJS first
    const nestResult = await proxyToNestJS('/api/jobs', 'GET');
    
    res.writeHead(200);
    if (nestResult && !nestResult.error) {
      res.end(JSON.stringify(nestResult));
    } else {
      // Enhanced fallback with real-world job data
      res.end(JSON.stringify({
        success: true,
        data: [
          {
            id: "job-001",
            title: "前端开发工程师",
            company: "AI科技公司",
            department: "技术部",
            location: "上海",
            applicants: 24,
            createdAt: new Date().toISOString(),
            status: "active",
            description: "负责AI招聘助手前端界面开发，React/TypeScript技术栈",
            requirements: ["React/Vue熟练", "TypeScript", "3年经验", "响应式设计"],
            salary: "20-35K",
            benefits: ["五险一金", "年终奖", "弹性工作", "技术培训"]
          },
          {
            id: "job-002", 
            title: "后端开发工程师",
            company: "AI科技公司",
            department: "技术部",
            location: "北京",
            applicants: 18,
            createdAt: new Date().toISOString(),
            status: "active",
            description: "负责NestJS后端API开发，微服务架构设计",
            requirements: ["NestJS/Node.js", "MongoDB", "微服务架构", "Docker"],
            salary: "25-40K",
            benefits: ["股票期权", "医疗保险", "团建活动", "学习津贴"]
          },
          {
            id: "job-003",
            title: "AI算法工程师", 
            company: "AI科技公司",
            department: "算法部",
            location: "深圳",
            applicants: 31,
            createdAt: new Date().toISOString(),
            status: "active",
            description: "简历智能分析算法研发，NLP技术应用",
            requirements: ["Python/机器学习", "NLP", "深度学习", "算法优化"],
            salary: "30-50K",
            benefits: ["技术大牛导师", "论文发表支持", "会议参与", "创新奖金"]
          }
        ],
        total: 3,
        source: nestResult ? "nestjs-fallback" : "hybrid-mock",
        backendStatus: isNestJSReady ? "connected" : "disconnected"
      }));
    }
    
  } else if (req.url === "/api/analytics/dashboard" && req.method === "GET") {
    const nestResult = await proxyToNestJS('/api/analytics/dashboard', 'GET');
    
    res.writeHead(200);
    if (nestResult && !nestResult.error) {
      res.end(JSON.stringify(nestResult));
    } else {
      // Real-time enhanced analytics
      const now = new Date();
      res.end(JSON.stringify({
        success: true,
        data: {
          totalJobs: 15,
          activeJobs: 12,
          totalApplications: 267,
          pendingReview: 73,
          matchingRate: 81.2,
          avgProcessingTime: "1.6天",
          improvementRate: "+15%",
          topSkills: [
            { name: "JavaScript", demand: 89, growth: "+12%" },
            { name: "Python", demand: 76, growth: "+8%" },
            { name: "React", demand: 65, growth: "+20%" },
            { name: "NestJS", demand: 54, growth: "+25%" },
            { name: "AI/ML", demand: 43, growth: "+30%" }
          ],
          recruitmentFunnel: {
            applied: 267,
            screened: 189,
            interviewed: 95,
            offered: 34,
            accepted: 26
          },
          monthlyTrends: {
            applications: [45, 67, 89, 98, 112, 134],
            hires: [3, 5, 8, 9, 12, 15],
            satisfaction: [4.2, 4.3, 4.4, 4.5, 4.6, 4.7]
          },
          recentActivity: [
            { type: "application", candidate: "张三", position: "前端工程师", time: "2分钟前" },
            { type: "interview", candidate: "李四", position: "AI算法工程师", time: "15分钟前" },
            { type: "offer", candidate: "王五", position: "后端工程师", time: "1小时前" }
          ],
          source: nestResult ? "nestjs-enhanced" : "hybrid-analytics",
          lastUpdated: now.toISOString(),
          backendStatus: isNestJSReady ? "connected" : "mock-mode"
        }
      }));
    }
    
  } else if (req.url === "/api/marketing/feedback-codes/stats" && req.method === "GET") {
    res.writeHead(200);
    res.end(JSON.stringify({
      totalCodes: 150,
      usedCodes: 89,
      pendingPayments: 12,
      totalPaid: 445.50,
      averageQualityScore: 4.2,
      monthlyStats: {
        generated: 45,
        redeemed: 38,
        revenue: 190.00
      }
    }));
    
  } else {
    // Enhanced AI Recruitment Assistant Interface
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.writeHead(200);
    res.end(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>AI招聘助手 - 混合架构版</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { font-size: 2.5rem; background: linear-gradient(135deg, #3b82f6, #8b5cf6, #06d6a0); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 10px; }
        .status-bar { background: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; border-radius: 8px; padding: 15px; margin-bottom: 30px; text-align: center; }
        .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: rgba(30, 41, 59, 0.8); border-radius: 12px; padding: 25px; border: 1px solid rgba(59, 130, 246, 0.2); transition: all 0.3s ease; }
        .card:hover { border-color: #3b82f6; transform: translateY(-2px); }
        .card h3 { color: #3b82f6; margin-bottom: 15px; font-size: 1.3rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat { background: rgba(59, 130, 246, 0.1); padding: 15px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 1.8rem; font-weight: bold; color: #3b82f6; }
        .stat-label { font-size: 0.85rem; color: #94a3b8; margin-top: 5px; }
        .btn { background: #3b82f6; color: white; border: none; padding: 12px 20px; border-radius: 6px; cursor: pointer; transition: all 0.3s; font-size: 14px; }
        .btn:hover { background: #2563eb; transform: translateY(-1px); }
        .btn-secondary { background: #475569; }
        .btn-secondary:hover { background: #64748b; }
        .api-links { display: flex; justify-content: center; gap: 15px; margin-top: 30px; flex-wrap: wrap; }
        .api-links a { color: #3b82f6; text-decoration: none; padding: 8px 16px; border: 1px solid #3b82f6; border-radius: 4px; transition: all 0.3s; font-size: 13px; }
        .api-links a:hover { background: #3b82f6; color: white; }
        .backend-status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .backend-connected { background: #059669; color: white; }
        .backend-mock { background: #d97706; color: white; }
        .activity-feed { background: rgba(15, 23, 42, 0.5); border-radius: 8px; padding: 15px; margin-top: 15px; }
        .activity-item { padding: 8px 0; border-bottom: 1px solid rgba(59, 130, 246, 0.1); }
        .activity-item:last-child { border-bottom: none; }
        @media (max-width: 768px) { 
            .container { padding: 15px; } 
            .header h1 { font-size: 2rem; } 
            .dashboard-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 AI招聘助手</h1>
            <p>智能简历筛选系统 - 混合架构增强版 v2.1</p>
        </div>
        
        <div class="status-bar">
            <strong>✅ 系统运行正常</strong> | 
            <span id="backendStatus" class="backend-status backend-mock">检测后端中...</span> |
            部署时间: ${new Date().toLocaleString("zh-CN")} | 版本: Hybrid Enhanced v2.1.0
        </div>
        
        <div class="dashboard-grid">
            <div class="card">
                <h3>📄 智能简历分析</h3>
                <p>上传简历获取AI分析报告，支持多种格式，提供详细的技能匹配和适配度评分。</p>
                <div class="stats-grid">
                    <div class="stat">
                        <div class="stat-number">267</div>
                        <div class="stat-label">总申请数</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">81.2%</div>
                        <div class="stat-label">匹配成功率</div>
                    </div>
                </div>
                <button class="btn" onclick="testResumeAnalysis()">分析功能演示</button>
            </div>
            
            <div class="card">
                <h3>💼 职位管理系统</h3>
                <p>创建管理招聘职位，实时跟踪申请状态，智能筛选候选人。</p>
                <div class="stats-grid">
                    <div class="stat">
                        <div class="stat-number" id="activeJobs">15</div>
                        <div class="stat-label">总职位</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number" id="pending">73</div>
                        <div class="stat-label">待处理</div>
                    </div>
                </div>
                <button class="btn" onclick="loadJobsData()">加载职位数据</button>
            </div>
            
            <div class="card">
                <h3>📊 实时数据分析</h3>
                <p>招聘流程分析，候选人统计，趋势预测，助力决策优化。</p>
                <div class="stats-grid">
                    <div class="stat">
                        <div class="stat-number">1.6天</div>
                        <div class="stat-label">平均处理时间</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">+15%</div>
                        <div class="stat-label">效率提升</div>
                    </div>
                </div>
                <button class="btn btn-secondary" onclick="loadAnalyticsData()">查看详细分析</button>
                
                <div class="activity-feed" id="activityFeed">
                    <h4 style="color: #3b82f6; margin-bottom: 10px;">最近活动</h4>
                    <div class="activity-item">🔄 正在加载活动数据...</div>
                </div>
            </div>
        </div>
        
        <div class="api-links">
            <a href="#" onclick="checkSystemHealth(); return false;">🔍 系统健康检查</a>
            <a href="#" onclick="loadJobsData(); return false;">💼 职位API测试</a>
            <a href="#" onclick="loadAnalyticsData(); return false;">📊 分析API测试</a>
            <a href="#" onclick="loadStatsData(); return false;">📈 统计API测试</a>
        </div>
        
        <div id="output" style="margin-top: 20px; padding: 20px; background: rgba(30, 41, 59, 0.6); border-radius: 8px; display: none;">
            <h4>API 响应数据:</h4>
            <pre id="outputContent" style="color: #94a3b8; overflow-x: auto; font-size: 12px;"></pre>
        </div>
    </div>
    
    <script>
        let backendStatus = 'unknown';
        
        function updateBackendStatus(status) {
            const statusEl = document.getElementById('backendStatus');
            backendStatus = status;
            
            if (status === 'nestjs-connected') {
                statusEl.textContent = 'NestJS后端已连接';
                statusEl.className = 'backend-status backend-connected';
            } else {
                statusEl.textContent = 'Mock数据模式';
                statusEl.className = 'backend-status backend-mock';
            }
        }
        
        function showOutput(data, title = 'API响应') {
            document.getElementById('outputContent').textContent = JSON.stringify(data, null, 2);
            document.getElementById('output').style.display = 'block';
            document.getElementById('output').scrollIntoView({ behavior: 'smooth' });
        }
        
        function testResumeAnalysis() {
            const mockAnalysis = {
                candidateName: "张三",
                score: 87,
                skills: ["JavaScript", "React", "TypeScript", "Node.js"],
                experience: "5年",
                education: "本科 - 计算机科学",
                strengths: ["技术能力强", "项目经验丰富", "学习能力好"],
                recommendations: ["适合前端开发岗位", "建议面试"],
                matchingJobs: ["前端开发工程师", "全栈开发工程师"]
            };
            showOutput(mockAnalysis, '简历分析示例');
        }
        
        async function loadJobsData() {
            try {
                const response = await fetch('/api/jobs');
                const data = await response.json();
                
                // Update UI with real data
                document.getElementById('activeJobs').textContent = data.total || 0;
                updateBackendStatus(data.backendStatus === 'connected' ? 'nestjs-connected' : 'mock');
                
                showOutput(data, '职位数据');
            } catch (error) {
                showOutput({ error: error.message }, '职位加载错误');
            }
        }
        
        async function loadAnalyticsData() {
            try {
                const response = await fetch('/api/analytics/dashboard');
                const data = await response.json();
                
                // Update activity feed
                const feed = document.getElementById('activityFeed');
                if (data.data?.recentActivity) {
                    feed.innerHTML = '<h4 style="color: #3b82f6; margin-bottom: 10px;">最近活动</h4>' +
                        data.data.recentActivity.map(activity => 
                            \`<div class="activity-item">\${activity.type === 'application' ? '📝' : activity.type === 'interview' ? '🎯' : '✅'} \${activity.candidate} - \${activity.position} (\${activity.time})</div>\`
                        ).join('');
                }
                
                // Update pending count
                document.getElementById('pending').textContent = data.data?.pendingReview || 0;
                updateBackendStatus(data.data?.backendStatus === 'connected' ? 'nestjs-connected' : 'mock');
                
                showOutput(data, '分析数据');
            } catch (error) {
                showOutput({ error: error.message }, '分析加载错误');
            }
        }
        
        async function loadStatsData() {
            try {
                const response = await fetch('/api/marketing/feedback-codes/stats');
                const data = await response.json();
                showOutput(data, '统计数据');
            } catch (error) {
                showOutput({ error: error.message }, '统计加载错误');
            }
        }
        
        async function checkSystemHealth() {
            try {
                const response = await fetch('/api/health');
                const data = await response.json();
                
                updateBackendStatus(data.backend === 'nestjs-connected' ? 'nestjs-connected' : 'mock');
                showOutput(data, '系统健康检查');
            } catch (error) {
                showOutput({ error: error.message }, '健康检查错误');
            }
        }
        
        // Auto-load initial data
        setTimeout(() => {
            checkSystemHealth();
            loadJobsData();
            loadAnalyticsData();
        }, 1500);
        
        // Periodic updates
        setInterval(() => {
            loadAnalyticsData();
        }, 30000); // Update every 30 seconds
    </script>
</body>
</html>`);
  }
});

// Try to start NestJS backend
function startNestJS() {
  if (fs.existsSync('./dist/apps/app-gateway/main.js')) {
    console.log('🔄 Starting NestJS backend...');
    nestJSProcess = spawn('node', ['./dist/apps/app-gateway/main.js'], {
      env: { ...process.env, PORT: NESTJS_PORT, SKIP_MONGO_CONNECTION: 'false' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    nestJSProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[NestJS]', output.trim());
      if (output.includes('Application is running')) {
        isNestJSReady = true;
        console.log('✅ NestJS backend ready on port', NESTJS_PORT);
      }
    });
    
    nestJSProcess.stderr.on('data', (data) => {
      console.error('[NestJS Error]', data.toString().trim());
    });
    
    nestJSProcess.on('close', (code) => {
      console.log('❌ NestJS process closed with code', code);
      isNestJSReady = false;
    });
  } else {
    console.log('⚠️ NestJS build not found, using mock data mode');
  }
}

// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
});

// 优雅退出处理
process.on('SIGTERM', () => {
  console.log('🔄 收到SIGTERM信号，准备优雅退出...');
  if (nestJSProcess) nestJSProcess.kill('SIGTERM');
  server.close(() => {
    console.log('✅ 服务器已优雅关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 收到SIGINT信号，准备优雅退出...');
  if (nestJSProcess) nestJSProcess.kill('SIGTERM');
  server.close(() => {
    console.log('✅ 服务器已优雅关闭');
    process.exit(0);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 AI招聘助手 Hybrid Enhanced v2.1 启动成功！");
  console.log("📱 前端端口:", PORT);
  console.log("🔗 后端端口:", NESTJS_PORT);
  console.log("⏰ 启动时间:", new Date().toLocaleString("zh-CN"));
  console.log("🎯 模式: 混合架构 - Enhanced Server + NestJS");
  
  // Start NestJS backend after frontend is ready
  setTimeout(() => startNestJS(), 3000);
});