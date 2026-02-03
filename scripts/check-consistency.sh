#!/bin/bash

echo "🔍 AI Recruitment Clerk - 项目一致性检查"
echo "========================================"

# 检查 Nx 工作空间配置
echo ""
echo "📋 检查 Nx 工作空间..."
if npx nx show projects > /dev/null 2>&1; then
    echo "✅ Nx 工作空间配置有效"
    echo "发现项目数量: $(npx nx show projects | wc -l)"
else
    echo "❌ Nx 工作空间配置有问题"
fi

# 检查所有 Dockerfile
echo ""
echo "🐳 检查 Dockerfile..."
dockerfile_count=$(find apps -name "Dockerfile" 2>/dev/null | wc -l)
echo "发现 Dockerfile 数量: $dockerfile_count"

if [ $dockerfile_count -eq 6 ]; then
    echo "✅ 所有服务都已容器化"
else
    echo "⚠️ 预期 6 个 Dockerfile，实际发现 $dockerfile_count 个"
fi

# 检查 docker-compose.yml
echo ""
echo "🏗️ 检查 Docker Compose 配置..."
if docker-compose config --quiet 2>/dev/null; then
    echo "✅ docker-compose.yml 语法正确"
else
    echo "❌ docker-compose.yml 语法有问题"
fi

# 检查启动脚本
echo ""
echo "🚀 检查启动脚本..."
scripts=("scripts/start-system.sh" "scripts/validate-system.sh" "scripts/run-e2e-tests.sh")
for script in "${scripts[@]}"; do
    if [ -f "$script" ] && [ -x "$script" ]; then
        echo "✅ $script 存在且可执行"
    else
        echo "❌ $script 缺失或不可执行"
    fi
done

# 检查关键配置文件
echo ""
echo "⚙️ 检查配置文件..."
config_files=("package.json" "nx.json" "tsconfig.base.json" ".gitignore")
for file in "${config_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 存在"
    else
        echo "❌ $file 缺失"
    fi
done

# 检查文档完整性
echo ""
echo "📚 检查文档完整性..."
docs=("README.md" "DEPLOYMENT_GUIDE.md" "SYSTEM_INTEGRATION_REPORT.md")
for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        echo "✅ $doc 存在"
    else
        echo "❌ $doc 缺失"
    fi
done

# 检查 .gitignore 中的项目
echo ""
echo "🙈 检查是否有不应该提交的文件..."
ignored_paths=("node_modules" "dist" "coverage" "test-results" "playwright-report")
found_ignored=false
for path in "${ignored_paths[@]}"; do
    if [ -e "$path" ]; then
        echo "⚠️ 发现应该被忽略的路径: $path"
        found_ignored=true
    fi
done

if [ "$found_ignored" = false ]; then
    echo "✅ 没有发现应该被忽略的文件/目录"
fi

# 检查环境配置
echo ""
echo "🔧 检查环境配置..."
if [ -f ".env.example" ]; then
    echo "✅ .env.example 模板存在"
else
    echo "❌ .env.example 模板缺失"
fi

if [ -f ".env" ]; then
    echo "✅ .env 文件存在"
else
    echo "⚠️ .env 文件不存在（需要从模板创建）"
fi

echo ""
echo "========================================"
echo "🎯 一致性检查完成"
echo ""