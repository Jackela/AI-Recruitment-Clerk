#!/bin/bash
# Simple API Performance Benchmark Script

echo "🚀 AI Recruitment API 性能基准测试"
echo "=================================="

API_BASE="http://localhost:3000/api"
RESULTS_FILE="performance/results/baseline-$(date +%Y%m%d-%H%M%S).json"

# 创建结果文件
echo "{" > $RESULTS_FILE
echo '  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",' >> $RESULTS_FILE
echo '  "test_type": "baseline",' >> $RESULTS_FILE
echo '  "results": {' >> $RESULTS_FILE

echo "📊 测试1: API健康检查响应时间"
health_times=()
for i in {1..10}; do
    start_time=$(date +%s%3N)
    response=$(curl -s -w "%{http_code}" -o /dev/null "$API_BASE/health")
    end_time=$(date +%s%3N)
    duration=$((end_time - start_time))
    health_times+=($duration)
    echo "  请求 $i: ${duration}ms (HTTP $response)"
done

# 计算平均响应时间
health_avg=$(echo "${health_times[@]}" | awk '{s+=$1} END {print s/NR}')
echo "  平均响应时间: ${health_avg}ms"

echo '    "health_check": {' >> $RESULTS_FILE
echo "      \"average_ms\": $health_avg," >> $RESULTS_FILE
echo "      \"samples\": [$(IFS=,; echo "${health_times[*]}")]" >> $RESULTS_FILE
echo '    },' >> $RESULTS_FILE

echo ""
echo "📊 测试2: Swagger API文档响应"
docs_times=()
for i in {1..5}; do
    start_time=$(date +%s%3N)
    response=$(curl -s -w "%{http_code}" -o /dev/null "$API_BASE/docs")
    end_time=$(date +%s%3N)
    duration=$((end_time - start_time))
    docs_times+=($duration)
    echo "  请求 $i: ${duration}ms (HTTP $response)"
done

docs_avg=$(echo "${docs_times[@]}" | awk '{s+=$1} END {print s/NR}')
echo "  平均响应时间: ${docs_avg}ms"

echo '    "api_docs": {' >> $RESULTS_FILE
echo "      \"average_ms\": $docs_avg," >> $RESULTS_FILE
echo "      \"samples\": [$(IFS=,; echo "${docs_times[*]}")]" >> $RESULTS_FILE
echo '    }' >> $RESULTS_FILE

echo '  }' >> $RESULTS_FILE
echo '}' >> $RESULTS_FILE

echo ""
echo "✅ 基准测试完成！结果保存在: $RESULTS_FILE"
echo "📈 健康检查平均响应: ${health_avg}ms"
echo "📊 API文档平均响应: ${docs_avg}ms"