#!/usr/bin/env bash
# =============================================================================
# Claude Code Cleanup Hook - Gentle Process Management
# =============================================================================
# 不杀 node 进程，只清理端口和测试相关进程

# 清理常见开发端口，但不强杀 node 进程
echo "🧹 Cleaning up development ports..."

# 清理测试和开发端口（如果没有活动连接）
ports=(3000 3001 4200 5173 9229 27017 6379)
for port in "${ports[@]}"; do
    if command -v npx >/dev/null 2>&1; then
        npx --yes kill-port $port >/dev/null 2>&1 || true
    fi
done

# 只清理测试相关的进程，不影响正常的 node 进程
echo "🧪 Cleaning test-related processes..."

# 清理 Jest 相关进程
pkill -f "jest" >/dev/null 2>&1 || true

# 清理 Playwright 相关进程
pkill -f "playwright" >/dev/null 2>&1 || true

# 清理 test runner 相关进程
pkill -f "vitest" >/dev/null 2>&1 || true

# 清理临时测试服务器（通过特定端口识别）
if command -v lsof >/dev/null 2>&1; then
    # 只清理明确是测试用的端口进程
    for test_port in 0; do  # 使用端口 0 表示随机端口，避免杀掉正常服务
        lsof -ti:$test_port 2>/dev/null | xargs -r kill -TERM 2>/dev/null || true
    done
fi

# 清理过期的临时文件
echo "🗑️  Cleaning temporary files..."
rm -rf /tmp/jest_* 2>/dev/null || true
rm -rf /tmp/playwright_* 2>/dev/null || true

echo "✅ Cleanup completed - node processes preserved"