const http = require("http");

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = http.createServer((req, res) => {
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

  // Enhanced API Routes
  if (req.url === "/api/health" && req.method === "GET") {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: "ok",
      timestamp: new Date().toISOString(),
      message: "AI招聘助手 Enhanced v2.0",
      version: "v2.0.0-enhanced",
      mode: "enhanced",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      features: ["resume-analysis", "job-management", "data-analytics"]
    }));
  } else if (req.url === "/api/jobs" && req.method === "GET") {
    res.writeHead(200);
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
          status: "active"
        },
        {
          id: "job-002", 
          title: "后端开发工程师",
          company: "AI科技公司",
          department: "技术部",
          location: "北京",
          applicants: 18,
          createdAt: new Date().toISOString(),
          status: "active"
        }
      ],
      total: 2
    }));
  } else if (req.url === "/api/analytics/dashboard" && req.method === "GET") {
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      data: {
        totalJobs: 12,
        activeJobs: 8,
        totalApplications: 156,
        pendingReview: 48,
        matchingRate: 76.5,
        avgProcessingTime: "2.3天",
        topSkills: ["JavaScript", "Python", "React", "Node.js", "TypeScript"],
        recruitmentFunnel: {
          applied: 156,
          screened: 89,
          interviewed: 32,
          offered: 12,
          accepted: 8
        }
      }
    }));
  } else if (req.url === "/api/marketing/feedback-codes/stats" && req.method === "GET") {
    res.writeHead(200);
    res.end(JSON.stringify({
      totalCodes: 100,
      usedCodes: 25,
      pendingPayments: 5,
      totalPaid: 125.00,
      averageQualityScore: 3.8
    }));
  } else if (req.url === "/api/marketing/feedback-codes/record" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          data: {
            id: Date.now().toString(),
            code: data.code,
            generatedAt: new Date().toISOString()
          }
        }));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  } else {
    // Enhanced AI Recruitment Assistant Interface
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.writeHead(200);
    res.end(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>AI招聘助手 - 智能简历筛选系统</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { font-size: 2.5rem; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 10px; }
        .status-bar { background: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; border-radius: 8px; padding: 15px; margin-bottom: 30px; text-align: center; }
        .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: rgba(30, 41, 59, 0.8); border-radius: 12px; padding: 25px; border: 1px solid rgba(59, 130, 246, 0.2); transition: all 0.3s ease; }
        .card:hover { border-color: #3b82f6; transform: translateY(-2px); }
        .card h3 { color: #3b82f6; margin-bottom: 15px; font-size: 1.3rem; }
        .upload-area { border: 2px dashed #475569; border-radius: 8px; padding: 40px 20px; text-align: center; margin: 20px 0; transition: all 0.3s; cursor: pointer; }
        .upload-area:hover { border-color: #3b82f6; background: rgba(59, 130, 246, 0.05); }
        .btn { background: #3b82f6; color: white; border: none; padding: 12px 20px; border-radius: 6px; cursor: pointer; transition: all 0.3s; font-size: 14px; }
        .btn:hover { background: #2563eb; transform: translateY(-1px); }
        .btn-secondary { background: #475569; }
        .btn-secondary:hover { background: #64748b; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat { background: rgba(59, 130, 246, 0.1); padding: 15px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 1.8rem; font-weight: bold; color: #3b82f6; }
        .stat-label { font-size: 0.85rem; color: #94a3b8; margin-top: 5px; }
        .api-links { display: flex; justify-content: center; gap: 20px; margin-top: 30px; flex-wrap: wrap; }
        .api-links a { color: #3b82f6; text-decoration: none; padding: 8px 16px; border: 1px solid #3b82f6; border-radius: 4px; transition: all 0.3s; }
        .api-links a:hover { background: #3b82f6; color: white; }
        .loading { display: none; }
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
            <p>智能简历筛选与分析系统 - Railway企业增强版</p>
        </div>
        
        <div class="status-bar">
            <strong>✅ 系统运行正常</strong> | 部署时间: ${new Date().toLocaleString("zh-CN")} | 版本: Enhanced v2.0.0
        </div>
        
        <div class="dashboard-grid">
            <div class="card">
                <h3>📄 智能简历分析</h3>
                <p>上传简历文件，获取AI驱动的智能分析报告，包括技能匹配、经验评估、适配度评分等。</p>
                <div class="upload-area" onclick="handleUploadClick()">
                    <div style="font-size: 3rem; margin-bottom: 10px;">📎</div>
                    <p>点击上传简历文件</p>
                    <small style="color: #94a3b8;">支持 PDF, DOC, DOCX 格式</small>
                </div>
                <button class="btn" onclick="demoAnalysis()">查看分析示例</button>
            </div>
            
            <div class="card">
                <h3>💼 职位管理系统</h3>
                <p>创建和管理招聘职位，设置筛选条件，跟踪申请状态，优化招聘流程。</p>
                <div class="stats-grid">
                    <div class="stat">
                        <div class="stat-number" id="activeJobs">12</div>
                        <div class="stat-label">活跃职位</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number" id="totalApps">156</div>
                        <div class="stat-label">总申请数</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number" id="pending">48</div>
                        <div class="stat-label">待审核</div>
                    </div>
                </div>
                <button class="btn" onclick="loadJobs()">管理职位</button>
            </div>
            
            <div class="card">
                <h3>📊 数据分析面板</h3>
                <p>查看招聘数据、候选人统计、匹配度分析等关键指标，提升招聘决策效率。</p>
                <div class="stats-grid">
                    <div class="stat">
                        <div class="stat-number">76.5%</div>
                        <div class="stat-label">匹配成功率</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">2.3</div>
                        <div class="stat-label">平均处理天数</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">89%</div>
                        <div class="stat-label">筛选通过率</div>
                    </div>
                </div>
                <button class="btn btn-secondary" onclick="loadAnalytics()">查看详细数据</button>
            </div>
        </div>
        
        <div class="api-links">
            <a href="/api/health" onclick="checkHealth(); return false;">🔍 系统健康检查</a>
            <a href="/api/jobs" onclick="loadJobsAPI(); return false;">💼 职位API</a>
            <a href="/api/analytics/dashboard" onclick="loadDashboardAPI(); return false;">📊 分析API</a>
            <a href="/api/marketing/feedback-codes/stats" onclick="loadStatsAPI(); return false;">📈 统计数据</a>
        </div>
        
        <div id="output" style="margin-top: 20px; padding: 20px; background: rgba(30, 41, 59, 0.6); border-radius: 8px; display: none;">
            <h4>API 响应:</h4>
            <pre id="outputContent" style="color: #94a3b8; overflow-x: auto;"></pre>
        </div>
    </div>
    
    <script>
        function handleUploadClick() {
            alert('📎 简历上传功能\\n\\n演示模式中，完整功能开发中...\\n\\n将支持:\\n• AI关键词提取\\n• 技能匹配分析\\n• 经验评估\\n• 适配度评分\\n• 推荐排名');
        }
        
        function demoAnalysis() {
            showOutput({
                "analysis": "简历分析示例",
                "candidate": "张三",
                "score": 85,
                "skills": ["JavaScript", "React", "Node.js"],
                "experience": "3年",
                "match": "高度匹配",
                "recommendation": "推荐面试"
            });
        }
        
        function loadJobs() {
            fetch('/api/jobs')
                .then(res => res.json())
                .then(data => {
                    showOutput(data);
                })
                .catch(err => {
                    showOutput({ error: "API调用失败", details: err.message });
                });
        }
        
        function loadAnalytics() {
            fetch('/api/analytics/dashboard')
                .then(res => res.json())
                .then(data => {
                    showOutput(data);
                })
                .catch(err => {
                    showOutput({ error: "分析数据加载失败", details: err.message });
                });
        }
        
        function checkHealth() {
            fetch('/api/health')
                .then(res => res.json())
                .then(data => {
                    showOutput(data);
                    updateStatus(data.status === 'ok');
                })
                .catch(err => {
                    showOutput({ error: "健康检查失败", details: err.message });
                });
        }
        
        function loadJobsAPI() { loadJobs(); }
        function loadDashboardAPI() { loadAnalytics(); }
        function loadStatsAPI() {
            fetch('/api/marketing/feedback-codes/stats')
                .then(res => res.json())
                .then(data => showOutput(data))
                .catch(err => showOutput({ error: "统计数据加载失败", details: err.message }));
        }
        
        function showOutput(data) {
            document.getElementById('outputContent').textContent = JSON.stringify(data, null, 2);
            document.getElementById('output').style.display = 'block';
            document.getElementById('output').scrollIntoView({ behavior: 'smooth' });
        }
        
        function updateStatus(isHealthy) {
            const statusBar = document.querySelector('.status-bar');
            if (isHealthy) {
                statusBar.innerHTML = '<strong>✅ 系统运行正常</strong> | 最后检查: ' + new Date().toLocaleString("zh-CN") + ' | API响应正常';
            } else {
                statusBar.innerHTML = '<strong>⚠️ 系统状态异常</strong> | 请检查API连接';
                statusBar.style.background = 'rgba(239, 68, 68, 0.1)';
                statusBar.style.borderColor = '#ef4444';
            }
        }
        
        // Auto-check API health on load
        setTimeout(checkHealth, 1000);
    </script>
</body>
</html>`);
  }
});

// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  console.error('📍 Stack trace:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  console.error('📍 Promise:', promise);
});

// 优雅退出处理
process.on('SIGTERM', () => {
  console.log('🔄 收到SIGTERM信号，准备优雅退出...');
  server.close(() => {
    console.log('✅ 服务器已优雅关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 收到SIGINT信号，准备优雅退出...');
  server.close(() => {
    console.log('✅ 服务器已优雅关闭');
    process.exit(0);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 AI招聘助手 Enhanced v2.0 启动成功！");
  console.log("📱 端口:", PORT);
  console.log("⏰ 启动时间:", new Date().toLocaleString("zh-CN"));
  console.log("🔄 重启策略: 已配置为失败时自动重启");
  console.log("✨ 功能: 智能简历分析、职位管理、数据分析");
});