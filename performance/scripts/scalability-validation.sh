#!/bin/bash

# AI Recruitment Clerk - Scalability Validation Script
# Tests system limits and auto-scaling trigger points for production readiness

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/../results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SCALABILITY_REPORT="${RESULTS_DIR}/scalability-report-${TIMESTAMP}.json"

# Test Configuration
BASE_URL="${BASE_URL:-http://localhost:3000/api}"
MAX_CONCURRENT_USERS="${MAX_CONCURRENT_USERS:-1500}"
RAMP_UP_DURATION="${RAMP_UP_DURATION:-10m}"
SUSTAINED_DURATION="${SUSTAINED_DURATION:-15m}"
BREAKING_POINT_TEST="${BREAKING_POINT_TEST:-true}"

# Scalability thresholds
RESPONSE_TIME_THRESHOLD=500  # ms
ERROR_RATE_THRESHOLD=1       # %
MEMORY_THRESHOLD=2048        # MB per service
CPU_THRESHOLD=80            # %

echo "🚀 AI Recruitment Clerk - Scalability Validation"
echo "================================================="
echo "Target URL: ${BASE_URL}"
echo "Max Users: ${MAX_CONCURRENT_USERS}"
echo "Test Duration: ${SUSTAINED_DURATION}"
echo "Timestamp: ${TIMESTAMP}"
echo ""

# Ensure results directory exists
mkdir -p "${RESULTS_DIR}"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check system health
check_system_health() {
    log "🔍 Checking system health before scalability testing..."
    
    # Check service availability
    if ! curl -f "${BASE_URL}/health" >/dev/null 2>&1; then
        log "❌ Service health check failed - cannot proceed with scalability testing"
        exit 1
    fi
    
    # Check Docker resources
    DOCKER_STATS=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep -E "(ai-recruitment|mongodb|nats)")
    log "📊 Current Docker resource usage:"
    echo "${DOCKER_STATS}"
    echo ""
    
    log "✅ System health check passed"
}

# Function to run baseline performance test
run_baseline_test() {
    log "📊 Running baseline performance test (50 users for 2 minutes)..."
    
    k6 run \
        --vus 50 \
        --duration 2m \
        --env BASE_URL="${BASE_URL}" \
        --out json="${RESULTS_DIR}/baseline-${TIMESTAMP}.json" \
        "${SCRIPT_DIR}/production-scale-test.js"
    
    # Extract baseline metrics
    BASELINE_P95=$(cat "${RESULTS_DIR}/baseline-${TIMESTAMP}.json" | jq -r '.metrics.http_req_duration.values["p(95)"]' 2>/dev/null || echo "0")
    BASELINE_ERROR_RATE=$(cat "${RESULTS_DIR}/baseline-${TIMESTAMP}.json" | jq -r '.metrics.http_req_failed.values.rate' 2>/dev/null || echo "0")
    
    log "📈 Baseline metrics - P95: ${BASELINE_P95}ms, Error Rate: ${BASELINE_ERROR_RATE}"
}

# Function to run gradual load ramp-up test
run_ramp_up_test() {
    log "📈 Running gradual load ramp-up test (0 → ${MAX_CONCURRENT_USERS} users)..."
    
    # Create K6 script for ramp-up testing
    cat > "${RESULTS_DIR}/ramp-up-test-${TIMESTAMP}.js" << EOF
import { check, sleep } from 'k6';
import http from 'k6/http';

export let options = {
    stages: [
        { duration: '2m', target: 100 },   // Warm-up
        { duration: '3m', target: 300 },   // Ramp to moderate load
        { duration: '3m', target: 600 },   // Ramp to high load
        { duration: '2m', target: 1000 },  // Ramp to very high load
        { duration: '2m', target: ${MAX_CONCURRENT_USERS} }, // Maximum load
        { duration: '${SUSTAINED_DURATION}', target: ${MAX_CONCURRENT_USERS} }, // Sustain max load
        { duration: '2m', target: 0 },     // Cool down
    ],
    thresholds: {
        'http_req_duration': ['p(95)<${RESPONSE_TIME_THRESHOLD}'],
        'http_req_failed': ['rate<0.0${ERROR_RATE_THRESHOLD}'],
    },
};

const BASE_URL = '${BASE_URL}';

export default function () {
    const endpoints = [
        '/health',
        '/system/status',
    ];
    
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const response = http.get(\`\${BASE_URL}\${endpoint}\`);
    
    check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < ${RESPONSE_TIME_THRESHOLD}ms': (r) => r.timings.duration < ${RESPONSE_TIME_THRESHOLD},
    });
    
    sleep(Math.random() * 2 + 1); // 1-3 seconds think time
}
EOF

    k6 run \
        --out json="${RESULTS_DIR}/ramp-up-${TIMESTAMP}.json" \
        "${RESULTS_DIR}/ramp-up-test-${TIMESTAMP}.js"
    
    log "✅ Ramp-up test completed"
}

# Function to find breaking point
run_breaking_point_test() {
    if [ "${BREAKING_POINT_TEST}" != "true" ]; then
        log "⏭️ Breaking point test disabled - skipping"
        return
    fi
    
    log "💥 Running breaking point test to find system limits..."
    
    # Start with max concurrent users and increase until failure
    CURRENT_USERS=${MAX_CONCURRENT_USERS}
    BREAKING_POINT_FOUND=false
    MAX_ATTEMPTS=5
    
    for ((attempt=1; attempt<=MAX_ATTEMPTS; attempt++)); do
        log "🔥 Testing with ${CURRENT_USERS} concurrent users (attempt ${attempt}/${MAX_ATTEMPTS})"
        
        # Create breaking point test script
        cat > "${RESULTS_DIR}/breaking-point-test-${TIMESTAMP}-${attempt}.js" << EOF
import { check, sleep } from 'k6';
import http from 'k6/http';

export let options = {
    stages: [
        { duration: '1m', target: ${CURRENT_USERS} },
        { duration: '3m', target: ${CURRENT_USERS} },
        { duration: '1m', target: 0 },
    ],
    thresholds: {
        'http_req_duration': ['p(95)<1000'], // Relaxed threshold for breaking point
        'http_req_failed': ['rate<0.05'],    // 5% error rate threshold
    },
};

const BASE_URL = '${BASE_URL}';

export default function () {
    const response = http.get(\`\${BASE_URL}/health\`);
    
    check(response, {
        'status is not 5xx': (r) => r.status < 500,
        'response received': (r) => r.status !== 0,
    });
    
    sleep(0.5); // Aggressive load
}
EOF
        
        # Run breaking point test
        if k6 run \
            --out json="${RESULTS_DIR}/breaking-point-${TIMESTAMP}-${attempt}.json" \
            "${RESULTS_DIR}/breaking-point-test-${TIMESTAMP}-${attempt}.js"; then
            
            # Test passed, increase load
            CURRENT_USERS=$((CURRENT_USERS + 300))
            log "✅ System handled ${CURRENT_USERS} users - increasing load"
        else
            # Test failed, we found the breaking point
            BREAKING_POINT_FOUND=true
            log "💥 Breaking point found at approximately ${CURRENT_USERS} concurrent users"
            break
        fi
    done
    
    if [ "${BREAKING_POINT_FOUND}" = "false" ]; then
        log "🚀 System handled maximum test load without breaking"
    fi
}

# Function to monitor system resources during tests
monitor_resources() {
    log "📊 Starting resource monitoring..."
    
    # Start background monitoring
    (
        while true; do
            TIMESTAMP_MON=$(date '+%Y-%m-%d %H:%M:%S')
            
            # Collect Docker stats
            docker stats --no-stream --format "{{.Container}},{{.CPUPerc}},{{.MemUsage}},{{.NetIO}}" | grep -E "(ai-recruitment|mongodb|nats)" > "${RESULTS_DIR}/docker-stats-${TIMESTAMP}.csv" 2>/dev/null || true
            
            # Collect system stats
            echo "${TIMESTAMP_MON},$(cat /proc/loadavg | awk '{print $1,$2,$3}')" >> "${RESULTS_DIR}/system-load-${TIMESTAMP}.csv" 2>/dev/null || true
            
            sleep 10
        done
    ) &
    
    MONITOR_PID=$!
    echo ${MONITOR_PID} > "${RESULTS_DIR}/monitor.pid"
}

# Function to stop resource monitoring
stop_monitoring() {
    if [ -f "${RESULTS_DIR}/monitor.pid" ]; then
        MONITOR_PID=$(cat "${RESULTS_DIR}/monitor.pid")
        kill ${MONITOR_PID} 2>/dev/null || true
        rm -f "${RESULTS_DIR}/monitor.pid"
        log "📊 Resource monitoring stopped"
    fi
}

# Function to analyze scalability results
analyze_results() {
    log "🔍 Analyzing scalability test results..."
    
    # Initialize report
    cat > "${SCALABILITY_REPORT}" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "test_configuration": {
        "base_url": "${BASE_URL}",
        "max_concurrent_users": ${MAX_CONCURRENT_USERS},
        "sustained_duration": "${SUSTAINED_DURATION}",
        "breaking_point_test_enabled": ${BREAKING_POINT_TEST}
    },
    "results": {
EOF
    
    # Analyze baseline results
    if [ -f "${RESULTS_DIR}/baseline-${TIMESTAMP}.json" ]; then
        BASELINE_P95=$(cat "${RESULTS_DIR}/baseline-${TIMESTAMP}.json" | jq -r '.metrics.http_req_duration.values["p(95)"]' 2>/dev/null || echo "null")
        BASELINE_ERROR_RATE=$(cat "${RESULTS_DIR}/baseline-${TIMESTAMP}.json" | jq -r '.metrics.http_req_failed.values.rate' 2>/dev/null || echo "null")
        
        cat >> "${SCALABILITY_REPORT}" << EOF
        "baseline": {
            "p95_response_time": ${BASELINE_P95},
            "error_rate": ${BASELINE_ERROR_RATE},
            "status": "$([ "${BASELINE_P95%.*}" -lt "${RESPONSE_TIME_THRESHOLD}" ] && echo "PASS" || echo "FAIL")"
        },
EOF
    fi
    
    # Analyze ramp-up results
    if [ -f "${RESULTS_DIR}/ramp-up-${TIMESTAMP}.json" ]; then
        RAMPUP_P95=$(cat "${RESULTS_DIR}/ramp-up-${TIMESTAMP}.json" | jq -r '.metrics.http_req_duration.values["p(95)"]' 2>/dev/null || echo "null")
        RAMPUP_ERROR_RATE=$(cat "${RESULTS_DIR}/ramp-up-${TIMESTAMP}.json" | jq -r '.metrics.http_req_failed.values.rate' 2>/dev/null || echo "null")
        RAMPUP_THROUGHPUT=$(cat "${RESULTS_DIR}/ramp-up-${TIMESTAMP}.json" | jq -r '.metrics.http_reqs.values.rate' 2>/dev/null || echo "null")
        
        cat >> "${SCALABILITY_REPORT}" << EOF
        "ramp_up_test": {
            "max_users_tested": ${MAX_CONCURRENT_USERS},
            "p95_response_time": ${RAMPUP_P95},
            "error_rate": ${RAMPUP_ERROR_RATE},
            "throughput": ${RAMPUP_THROUGHPUT},
            "sla_compliance": {
                "response_time": $([ "${RAMPUP_P95%.*}" -lt "${RESPONSE_TIME_THRESHOLD}" ] && echo "true" || echo "false"),
                "error_rate": $(awk "BEGIN {print (${RAMPUP_ERROR_RATE} < 0.01)}")
            }
        },
EOF
    fi
    
    # Analyze breaking point results (if available)
    BREAKING_POINT_USERS="null"
    if [ -f "${RESULTS_DIR}/breaking-point-${TIMESTAMP}-"*".json" ]; then
        # Find the last successful test
        for bp_file in "${RESULTS_DIR}/breaking-point-${TIMESTAMP}-"*".json"; do
            if [ -f "$bp_file" ]; then
                BP_ERROR_RATE=$(cat "$bp_file" | jq -r '.metrics.http_req_failed.values.rate' 2>/dev/null || echo "1")
                if awk "BEGIN {exit !(${BP_ERROR_RATE} < 0.05)}"; then
                    # Extract user count from filename
                    BREAKING_POINT_USERS=$(echo "$bp_file" | grep -o 'breaking-point-[^-]*-[0-9]*' | grep -o '[0-9]*$')
                fi
            fi
        done
    fi
    
    cat >> "${SCALABILITY_REPORT}" << EOF
        "breaking_point": {
            "estimated_max_users": ${BREAKING_POINT_USERS},
            "test_completed": $([ "${BREAKING_POINT_TEST}" = "true" ] && echo "true" || echo "false")
        }
    },
    "recommendations": {
EOF
    
    # Generate recommendations
    RECOMMENDATIONS=""
    
    if [ "${RAMPUP_P95%.*}" -gt "${RESPONSE_TIME_THRESHOLD}" ] 2>/dev/null; then
        RECOMMENDATIONS="${RECOMMENDATIONS}\"Response time exceeds SLA under load - consider performance optimization\","
    fi
    
    if awk "BEGIN {exit !(${RAMPUP_ERROR_RATE:-0} > 0.01)}"; then
        RECOMMENDATIONS="${RECOMMENDATIONS}\"Error rate exceeds acceptable threshold - investigate error sources\","
    fi
    
    if [ "${BREAKING_POINT_USERS}" != "null" ] && [ "${BREAKING_POINT_USERS}" -lt 1000 ] 2>/dev/null; then
        RECOMMENDATIONS="${RECOMMENDATIONS}\"System breaking point below target capacity - scale infrastructure\","
    fi
    
    if [ -z "${RECOMMENDATIONS}" ]; then
        RECOMMENDATIONS="\"System demonstrates good scalability characteristics\""
    else
        # Remove trailing comma
        RECOMMENDATIONS="${RECOMMENDATIONS%,}"
    fi
    
    cat >> "${SCALABILITY_REPORT}" << EOF
        "items": [${RECOMMENDATIONS}],
        "auto_scaling_triggers": {
            "cpu_threshold": "${CPU_THRESHOLD}%",
            "memory_threshold": "${MEMORY_THRESHOLD}MB",
            "response_time_threshold": "${RESPONSE_TIME_THRESHOLD}ms",
            "error_rate_threshold": "${ERROR_RATE_THRESHOLD}%"
        }
    }
}
EOF
    
    log "📊 Scalability analysis complete - report saved to ${SCALABILITY_REPORT}"
}

# Function to generate human-readable summary
generate_summary() {
    log "📋 Generating scalability test summary..."
    
    SUMMARY_FILE="${RESULTS_DIR}/scalability-summary-${TIMESTAMP}.md"
    
    cat > "${SUMMARY_FILE}" << 'EOF'
# AI Recruitment Clerk - Scalability Validation Report

## Test Overview
EOF
    
    echo "- **Test Date**: $(date)" >> "${SUMMARY_FILE}"
    echo "- **Target System**: ${BASE_URL}" >> "${SUMMARY_FILE}"
    echo "- **Maximum Concurrent Users Tested**: ${MAX_CONCURRENT_USERS}" >> "${SUMMARY_FILE}"
    echo "- **Sustained Load Duration**: ${SUSTAINED_DURATION}" >> "${SUMMARY_FILE}"
    echo "" >> "${SUMMARY_FILE}"
    
    # Extract key metrics from JSON report
    if [ -f "${SCALABILITY_REPORT}" ]; then
        BASELINE_P95=$(cat "${SCALABILITY_REPORT}" | jq -r '.results.baseline.p95_response_time // "N/A"')
        RAMPUP_P95=$(cat "${SCALABILITY_REPORT}" | jq -r '.results.ramp_up_test.p95_response_time // "N/A"')
        RAMPUP_ERROR_RATE=$(cat "${SCALABILITY_REPORT}" | jq -r '.results.ramp_up_test.error_rate // "N/A"')
        BREAKING_POINT=$(cat "${SCALABILITY_REPORT}" | jq -r '.results.breaking_point.estimated_max_users // "N/A"')
        
        cat >> "${SUMMARY_FILE}" << EOF
## Key Results

### Performance Under Load
- **Baseline P95 Response Time**: ${BASELINE_P95}ms
- **Load Test P95 Response Time**: ${RAMPUP_P95}ms
- **Load Test Error Rate**: $(awk "BEGIN {printf \"%.3f\", ${RAMPUP_ERROR_RATE:-0} * 100}")%
- **Estimated Breaking Point**: ${BREAKING_POINT} concurrent users

### SLA Compliance
- **Response Time SLA (<${RESPONSE_TIME_THRESHOLD}ms)**: $([ "${RAMPUP_P95%.*}" -lt "${RESPONSE_TIME_THRESHOLD}" ] 2>/dev/null && echo "✅ PASS" || echo "❌ FAIL")
- **Error Rate SLA (<${ERROR_RATE_THRESHOLD}%)**: $(awk "BEGIN {exit !(${RAMPUP_ERROR_RATE:-0} < 0.0${ERROR_RATE_THRESHOLD})}" && echo "✅ PASS" || echo "❌ FAIL")

### Capacity Assessment
$(if [ "${BREAKING_POINT}" != "N/A" ] && [ "${BREAKING_POINT}" -gt 1000 ] 2>/dev/null; then
    echo "✅ **PRODUCTION READY**: System can handle target load of 1000+ concurrent users"
elif [ "${BREAKING_POINT}" != "N/A" ] && [ "${BREAKING_POINT}" -gt 500 ] 2>/dev/null; then
    echo "⚠️ **SCALING REQUIRED**: System handles moderate load but may need optimization for peak traffic"
else
    echo "❌ **NOT READY**: System requires significant optimization before production deployment"
fi)

## Recommendations

EOF
        
        # Extract and format recommendations
        cat "${SCALABILITY_REPORT}" | jq -r '.recommendations.items[]' | while read -r rec; do
            echo "- $rec" >> "${SUMMARY_FILE}"
        done
    fi
    
    log "📄 Summary report generated: ${SUMMARY_FILE}"
}

# Main execution
main() {
    log "🚀 Starting AI Recruitment Clerk scalability validation..."
    
    # Pre-flight checks
    check_system_health
    
    # Start resource monitoring
    monitor_resources
    
    # Ensure cleanup happens
    trap 'stop_monitoring; log "🧹 Cleanup completed"' EXIT
    
    # Run scalability tests
    run_baseline_test
    run_ramp_up_test
    run_breaking_point_test
    
    # Analyze results
    analyze_results
    generate_summary
    
    log "✅ Scalability validation completed successfully!"
    log "📊 Results available in: ${RESULTS_DIR}"
    log "📋 Summary report: ${RESULTS_DIR}/scalability-summary-${TIMESTAMP}.md"
    log "🔍 Detailed JSON report: ${SCALABILITY_REPORT}"
}

# Check dependencies
check_dependencies() {
    command -v k6 >/dev/null 2>&1 || { echo "❌ k6 is required but not installed. Please install k6."; exit 1; }
    command -v jq >/dev/null 2>&1 || { echo "❌ jq is required but not installed. Please install jq."; exit 1; }
    command -v docker >/dev/null 2>&1 || { echo "❌ docker is required but not installed. Please install docker."; exit 1; }
}

# Entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    check_dependencies
    main "$@"
fi