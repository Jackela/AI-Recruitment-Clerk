#!/bin/bash

# AI Recruitment 缓存优化后性能基准测试
# 对比缓存前后的API响应时间

echo "🚀 AI Recruitment - 缓存优化后性能测试"
echo "========================================"
echo "测试时间: $(date)"
echo ""

# API基地址
API_BASE="http://localhost:3000/api"

# 测试结果文件
RESULT_FILE="performance/results/cache-optimized-$(date +%Y%m%d-%H%M%S).json"

# 创建结果目录
mkdir -p performance/results

echo "📊 开始API响应时间测试..."
echo ""

# 健康检查端点测试 (应该有缓存效果)
echo "测试 /health 端点 (缓存优化)..."
health_times=()
for i in {1..10}; do
    start_time=$(date +%s%3N)
    curl -s "$API_BASE/health" > /dev/null 2>&1
    end_time=$(date +%s%3N)
    response_time=$((end_time - start_time))
    health_times+=($response_time)
    echo "  请求 $i: ${response_time}ms"
    sleep 0.5
done

# 计算平均值
health_sum=0
for time in "${health_times[@]}"; do
    health_sum=$((health_sum + time))
done
health_avg=$((health_sum / ${#health_times[@]}))

echo ""
echo "API文档端点测试 (静态内容)..."
docs_times=()
for i in {1..5}; do
    start_time=$(date +%s%3N)
    curl -s "$API_BASE/docs" > /dev/null 2>&1
    end_time=$(date +%s%3N)
    response_time=$((end_time - start_time))
    docs_times+=($response_time)
    echo "  请求 $i: ${response_time}ms"
    sleep 0.5
done

# 计算平均值
docs_sum=0
for time in "${docs_times[@]}"; do
    docs_sum=$((docs_sum + time))
done
docs_avg=$((docs_sum / ${#docs_times[@]}))

echo ""
echo "🎯 测试结果汇总:"
echo "========================================"
echo "健康检查 /health:"
echo "  平均响应时间: ${health_avg}ms"
echo "  响应时间范围: ${health_times[*]}ms"
echo ""
echo "API文档 /docs:"
echo "  平均响应时间: ${docs_avg}ms" 
echo "  响应时间范围: ${docs_times[*]}ms"
echo ""

# 生成JSON结果
cat > "$RESULT_FILE" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "test_type": "cache_optimized",
  "optimization_phase": "Phase 2 - Caching Layer",
  "results": {
    "health_check": {
      "average_ms": $health_avg,
      "samples": [$(IFS=,; echo "${health_times[*]}")]
    },
    "api_docs": {
      "average_ms": $docs_avg,
      "samples": [$(IFS=,; echo "${docs_times[*]}")]
    }
  },
  "cache_configuration": {
    "redis_enabled": true,
    "redis_host": "localhost:6379",
    "cache_ttl_seconds": 300,
    "fallback_memory_cache": true
  }
}
EOF

echo "📁 结果已保存到: $RESULT_FILE"

# 与基线对比
BASELINE_FILE="performance/results/baseline-20250811-010200.json"
if [ -f "$BASELINE_FILE" ]; then
    echo ""
    echo "📈 与基线性能对比:"
    echo "========================================"
    
    # 读取基线数据
    baseline_health=$(jq -r '.results.health_check.average_ms' "$BASELINE_FILE")
    baseline_docs=$(jq -r '.results.api_docs.average_ms' "$BASELINE_FILE")
    
    # 计算改进百分比
    health_improvement=$(echo "scale=1; ($baseline_health - $health_avg) * 100 / $baseline_health" | bc -l)
    docs_improvement=$(echo "scale=1; ($baseline_docs - $docs_avg) * 100 / $baseline_docs" | bc -l)
    
    echo "健康检查端点:"
    echo "  基线: ${baseline_health}ms → 缓存后: ${health_avg}ms"
    echo "  性能提升: ${health_improvement}%"
    echo ""
    echo "API文档端点:"
    echo "  基线: ${baseline_docs}ms → 缓存后: ${docs_avg}ms"  
    echo "  性能提升: ${docs_improvement}%"
else
    echo ""
    echo "⚠️  未找到基线文件进行对比"
fi

echo ""
echo "✅ 缓存优化性能测试完成!"