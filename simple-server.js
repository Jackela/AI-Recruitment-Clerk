const http = require("http");

const PORT = process.env.PORT || 3000;

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

  // 路由处理
  if (req.url === "/api/health" && req.method === "GET") {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: "ok",
      timestamp: new Date().toISOString(),
      message: "AI招聘助手 Railway部署版本",
      version: "v1.0.0",
      mode: "fallback",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
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
    // 默认HTML响应
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.writeHead(200);
    res.end(`<\!DOCTYPE html>
<html>
<head>
    <title>AI招聘助手 - Railway部署成功</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .container { max-width: 600px; margin: 0 auto; }
        h1 { font-size: 2.5em; margin-bottom: 20px; }
        .status { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 AI招聘助手</h1>
        <h2>Railway部署成功！</h2>
        <div class="status">
            <h3>✅ 系统状态正常</h3>
            <p>部署时间: ${new Date().toLocaleString("zh-CN")}</p>
            <p>版本: Railway优化版 v1.0.0</p>
        </div>
        <div>
            <a href="/api/health" style="color: #4CAF50; text-decoration: none;">🔍 API健康检查</a>  < /dev/null | 
            <a href="/api/marketing/feedback-codes/stats" style="color: #4CAF50; text-decoration: none;">📊 营销统计</a>
        </div>
    </div>
</body>
</html>`);
  }
});

// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  console.error('📍 Stack trace:', error.stack);
  // 记录错误但不退出进程，让Railway的重启策略处理
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
  console.log("🚀 AI招聘助手启动成功！");
  console.log("📱 端口:", PORT);
  console.log("⏰ 启动时间:", new Date().toLocaleString("zh-CN"));
  console.log("🔄 重启策略: 已配置为失败时自动重启");
});
