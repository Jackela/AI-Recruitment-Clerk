const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "AI招聘助手 Railway部署版本"
  });
});

app.get("/api/marketing/feedback-codes/stats", (req, res) => {
  res.json({
    totalCodes: 100,
    usedCodes: 25,
    pendingPayments: 5,
    totalPaid: 125.00,
    averageQualityScore: 3.8
  });
});

app.post("/api/marketing/feedback-codes/record", (req, res) => {
  const { code } = req.body;
  res.json({
    success: true,
    data: {
      id: Date.now().toString(),
      code: code,
      generatedAt: new Date().toISOString()
    }
  });
});

app.get("*", (req, res) => {
  res.send(`<\!DOCTYPE html>
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
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 AI招聘助手启动成功！`);
  console.log(`📱 端口: ${PORT}`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString("zh-CN")}`);
});

module.exports = app;
