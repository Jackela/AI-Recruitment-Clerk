#!/bin/bash

# Visual Regression 基线截图更新脚本
# 使用方法: ./update-snapshots.sh

echo "🚀 开始更新 Visual Regression 基线截图..."

# 1. 确保前端已构建并运行
echo "📦 检查前端服务..."
if ! curl -s http://localhost:4200 > /dev/null; then
    echo "❌ 错误: 前端服务未在 http://localhost:4200 运行"
    echo "请先运行: npm run build && npm start"
    exit 1
fi

echo "✅ 前端服务运行正常"

# 2. 更新基线截图
echo "📸 正在更新基线截图..."
cd apps/ai-recruitment-frontend-e2e

# 运行 visual 测试并更新截图
E2E_SKIP_WEBSERVER=true \
PLAYWRIGHT_BASE_URL=http://localhost:4200 \
npx playwright test src/visual/ --update-snapshots --project=chromium

if [ $? -eq 0 ]; then
    echo "✅ 基线截图更新成功！"
    echo ""
    echo "📁 新的基线截图位置:"
    find src/visual -name "*.png" -path "*__snapshots__*" | head -10
else
    echo "❌ 截图更新失败，请检查测试输出"
    exit 1
fi

echo ""
echo "🎉 Visual Regression 修复完成！"
