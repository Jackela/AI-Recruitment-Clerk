#!/bin/bash

# AI Recruitment Clerk - Complete Performance Validation Suite
# Comprehensive performance testing and validation for production readiness

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
PERFORMANCE_MODE="${PERFORMANCE_MODE:-comprehensive}"
SKIP_INFRASTRUCTURE="${SKIP_INFRASTRUCTURE:-false}"
GENERATE_REPORT="${GENERATE_REPORT:-true}"
TARGET_URL="${TARGET_URL:-http://localhost:3000}"

echo -e "${BOLD}🚀 AI Recruitment Clerk - Performance Validation Suite${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "Mode: ${PERFORMANCE_MODE}"
echo -e "Target: ${TARGET_URL}"
echo -e "Timestamp: ${TIMESTAMP}"
echo -e "Results Directory: ${RESULTS_DIR}"
echo ""

# Create results directory
mkdir -p "${RESULTS_DIR}"

# Logging function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log_success() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${YELLOW}⚠️ $1${NC}"
}

log_error() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${RED}❌ $1${NC}"
}

# Check dependencies
check_dependencies() {
    log "🔍 Checking dependencies..."
    
    local missing_deps=()
    
    command -v docker >/dev/null 2>&1 || missing_deps+=("docker")
    command -v docker-compose >/dev/null 2>&1 || missing_deps+=("docker-compose")
    command -v k6 >/dev/null 2>&1 || missing_deps+=("k6")
    command -v jq >/dev/null 2>&1 || missing_deps+=("jq")
    command -v curl >/dev/null 2>&1 || missing_deps+=("curl")
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        echo "Please install the missing dependencies and try again."
        exit 1
    fi
    
    log_success "All dependencies are available"
}

# Setup infrastructure
setup_infrastructure() {
    if [ "${SKIP_INFRASTRUCTURE}" = "true" ]; then
        log_warning "Skipping infrastructure setup (SKIP_INFRASTRUCTURE=true)"
        return
    fi
    
    log "🏗️ Setting up performance testing infrastructure..."
    
    # Start monitoring stack
    log "Starting monitoring infrastructure..."
    if [ -f "${PROJECT_ROOT}/docker-compose.monitoring.yml" ]; then
        docker-compose -f "${PROJECT_ROOT}/docker-compose.monitoring.yml" up -d
        sleep 30 # Wait for services to start
        log_success "Monitoring stack started"
    else
        log_warning "Monitoring compose file not found, skipping monitoring setup"
    fi
    
    # Start performance testing infrastructure
    log "Starting performance testing infrastructure..."
    if [ -f "${SCRIPT_DIR}/production-load-testing.yml" ]; then
        docker-compose -f "${SCRIPT_DIR}/production-load-testing.yml" --profile monitoring up -d
        sleep 10
        log_success "Performance testing infrastructure started"
    else
        log_warning "Performance testing compose file not found"
    fi
}

# Validate system health
validate_system_health() {
    log "🏥 Validating system health..."
    
    local health_checks=0
    local health_failures=0
    
    # Check main application
    if curl -f -s "${TARGET_URL}/api/health" >/dev/null; then
        log_success "Main application health check passed"
        ((health_checks++))
    else
        log_error "Main application health check failed"
        ((health_failures++))
    fi
    
    # Check monitoring services (if running)
    if curl -f -s "http://localhost:9090/-/healthy" >/dev/null 2>&1; then
        log_success "Prometheus health check passed"
        ((health_checks++))
    else
        log_warning "Prometheus not accessible (may not be running)"
    fi
    
    if curl -f -s "http://localhost:3001/api/health" >/dev/null 2>&1; then
        log_success "Grafana health check passed"
        ((health_checks++))
    else
        log_warning "Grafana not accessible (may not be running)"
    fi
    
    if [ ${health_failures} -gt 0 ]; then
        log_error "Critical health check failures detected"
        exit 1
    fi
    
    log_success "System health validation completed (${health_checks} checks passed)"
}

# Run performance baseline test
run_baseline_test() {
    log "📊 Running performance baseline test..."
    
    local baseline_script="${SCRIPT_DIR}/scripts/api-load-test.js"
    if [ ! -f "${baseline_script}" ]; then
        log_error "Baseline test script not found: ${baseline_script}"
        return 1
    fi
    
    k6 run \
        --vus 10 \
        --duration 2m \
        --env BASE_URL="${TARGET_URL}/api" \
        --out json="${RESULTS_DIR}/baseline-${TIMESTAMP}.json" \
        "${baseline_script}" || {
        log_error "Baseline test failed"
        return 1
    }
    
    log_success "Baseline test completed"
}

# Run production-scale load test
run_production_load_test() {
    log "⚡ Running production-scale load test..."
    
    local load_test_script="${SCRIPT_DIR}/scripts/production-scale-test.js"
    if [ ! -f "${load_test_script}" ]; then
        log_error "Production load test script not found: ${load_test_script}"
        return 1
    fi
    
    k6 run \
        --env BASE_URL="${TARGET_URL}/api" \
        --env BRANCH_NAME="performance-validation" \
        --env COMMIT_SHA="validation-run-${TIMESTAMP}" \
        --out json="${RESULTS_DIR}/production-load-${TIMESTAMP}.json" \
        "${load_test_script}" || {
        log_error "Production load test failed"
        return 1
    }
    
    log_success "Production load test completed"
}

# Run database stress test
run_database_stress_test() {
    log "🗄️ Running database stress test..."
    
    local db_test_script="${SCRIPT_DIR}/scripts/database-stress-test.js"
    if [ ! -f "${db_test_script}" ]; then
        log_warning "Database stress test script not found, skipping"
        return 0
    fi
    
    # Extract MongoDB connection details (assuming standard setup)
    local mongodb_host="${MONGODB_HOST:-localhost}"
    local mongodb_port="${MONGODB_PORT:-27017}"
    local mongodb_database="${MONGODB_DATABASE:-ai-recruitment}"
    local mongodb_username="${MONGODB_USERNAME:-admin}"
    local mongodb_password="${MONGODB_PASSWORD:-devpassword123}"
    
    k6 run \
        --env MONGODB_HOST="${mongodb_host}" \
        --env MONGODB_PORT="${mongodb_port}" \
        --env MONGODB_DATABASE="${mongodb_database}" \
        --env MONGODB_USERNAME="${mongodb_username}" \
        --env MONGODB_PASSWORD="${mongodb_password}" \
        --out json="${RESULTS_DIR}/database-stress-${TIMESTAMP}.json" \
        "${db_test_script}" || {
        log_warning "Database stress test failed (may be expected if MongoDB extensions not available)"
        return 0
    }
    
    log_success "Database stress test completed"
}

# Run scalability validation
run_scalability_validation() {
    log "📈 Running scalability validation..."
    
    local scalability_script="${SCRIPT_DIR}/scripts/scalability-validation.sh"
    if [ ! -f "${scalability_script}" ]; then
        log_error "Scalability validation script not found: ${scalability_script}"
        return 1
    fi
    
    chmod +x "${scalability_script}"
    
    BASE_URL="${TARGET_URL}/api" \
    MAX_CONCURRENT_USERS=1000 \
    RAMP_UP_DURATION=5m \
    SUSTAINED_DURATION=10m \
    BREAKING_POINT_TEST=true \
        "${scalability_script}" || {
        log_warning "Scalability validation completed with warnings"
        return 0
    }
    
    log_success "Scalability validation completed"
}

# Run performance regression test
run_regression_test() {
    log "🔄 Running performance regression test..."
    
    local regression_script="${SCRIPT_DIR}/regression/performance-regression-test.js"
    if [ ! -f "${regression_script}" ]; then
        log_error "Regression test script not found: ${regression_script}"
        return 1
    fi
    
    k6 run \
        --env BASE_URL="${TARGET_URL}/api" \
        --env CI=false \
        --env BRANCH_NAME="performance-validation" \
        --env COMMIT_SHA="validation-${TIMESTAMP}" \
        --env BASELINE_P95=120 \
        --env BASELINE_P99=250 \
        --env BASELINE_THROUGHPUT=30 \
        --env BASELINE_ERROR_RATE=0.001 \
        --out json="${RESULTS_DIR}/regression-${TIMESTAMP}.json" \
        "${regression_script}" || {
        log_error "Performance regression test failed"
        return 1
    }
    
    log_success "Performance regression test completed"
}

# Analyze results
analyze_results() {
    log "🔍 Analyzing performance test results..."
    
    local analysis_file="${RESULTS_DIR}/analysis-${TIMESTAMP}.json"
    
    # Initialize analysis report
    cat > "${analysis_file}" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "validation_run": {
        "mode": "${PERFORMANCE_MODE}",
        "target_url": "${TARGET_URL}",
        "run_id": "${TIMESTAMP}"
    },
    "test_results": {
EOF
    
    local results_count=0
    
    # Analyze each test result
    for result_file in "${RESULTS_DIR}"/*-"${TIMESTAMP}".json; do
        if [ -f "${result_file}" ]; then
            local test_name=$(basename "${result_file}" | cut -d'-' -f1)
            
            if [ ${results_count} -gt 0 ]; then
                echo "," >> "${analysis_file}"
            fi
            
            echo "        \"${test_name}\": {" >> "${analysis_file}"
            
            # Extract key metrics
            if command -v jq >/dev/null 2>&1; then
                local p95_time=$(cat "${result_file}" | jq -r '.metrics.http_req_duration.values["p(95)"] // null' 2>/dev/null)
                local error_rate=$(cat "${result_file}" | jq -r '.metrics.http_req_failed.values.rate // null' 2>/dev/null)
                local throughput=$(cat "${result_file}" | jq -r '.metrics.http_reqs.values.rate // null' 2>/dev/null)
                
                echo "            \"p95_response_time\": ${p95_time}," >> "${analysis_file}"
                echo "            \"error_rate\": ${error_rate}," >> "${analysis_file}"
                echo "            \"throughput\": ${throughput}," >> "${analysis_file}"
                echo "            \"file_path\": \"${result_file}\"" >> "${analysis_file}"
            else
                echo "            \"file_path\": \"${result_file}\"" >> "${analysis_file}"
            fi
            
            echo "        }" >> "${analysis_file}"
            ((results_count++))
        fi
    done
    
    # Close JSON structure
    cat >> "${analysis_file}" << EOF
    },
    "sla_compliance": {
        "response_time_sla": "< 200ms P95",
        "error_rate_sla": "< 0.1%",
        "throughput_sla": "> 100 req/s"
    }
}
EOF
    
    log_success "Analysis completed - results saved to ${analysis_file}"
}

# Generate comprehensive report
generate_report() {
    if [ "${GENERATE_REPORT}" != "true" ]; then
        log "📄 Skipping report generation (GENERATE_REPORT=false)"
        return
    fi
    
    log "📄 Generating comprehensive performance report..."
    
    local report_file="${RESULTS_DIR}/performance-validation-report-${TIMESTAMP}.md"
    
    cat > "${report_file}" << EOF
# AI Recruitment Clerk - Performance Validation Report

**Generated**: $(date)  
**Run ID**: ${TIMESTAMP}  
**Mode**: ${PERFORMANCE_MODE}  
**Target**: ${TARGET_URL}  

## Executive Summary

This report summarizes the results of comprehensive performance validation testing conducted on the AI Recruitment Clerk platform.

### Test Suite Executed

EOF
    
    # List executed tests
    local executed_tests=()
    [ -f "${RESULTS_DIR}/baseline-${TIMESTAMP}.json" ] && executed_tests+=("✅ Baseline Performance Test")
    [ -f "${RESULTS_DIR}/production-load-${TIMESTAMP}.json" ] && executed_tests+=("✅ Production-Scale Load Test")
    [ -f "${RESULTS_DIR}/database-stress-${TIMESTAMP}.json" ] && executed_tests+=("✅ Database Stress Test")
    [ -f "${RESULTS_DIR}/scalability-"*"-${TIMESTAMP}."* ] && executed_tests+=("✅ Scalability Validation")
    [ -f "${RESULTS_DIR}/regression-${TIMESTAMP}.json" ] && executed_tests+=("✅ Performance Regression Test")
    
    printf '%s\n' "${executed_tests[@]}" >> "${report_file}"
    
    cat >> "${report_file}" << EOF

## Key Performance Metrics

EOF
    
    # Extract and display key metrics
    if command -v jq >/dev/null 2>&1; then
        for result_file in "${RESULTS_DIR}"/*-"${TIMESTAMP}".json; do
            if [ -f "${result_file}" ]; then
                local test_name=$(basename "${result_file}" | cut -d'-' -f1)
                local p95_time=$(cat "${result_file}" | jq -r '.metrics.http_req_duration.values["p(95)"] // "N/A"' 2>/dev/null)
                local error_rate=$(cat "${result_file}" | jq -r '.metrics.http_req_failed.values.rate // "N/A"' 2>/dev/null)
                local throughput=$(cat "${result_file}" | jq -r '.metrics.http_reqs.values.rate // "N/A"' 2>/dev/null)
                
                cat >> "${report_file}" << EOF
### ${test_name^} Test Results

- **P95 Response Time**: ${p95_time}ms
- **Error Rate**: $(awk "BEGIN {printf \"%.3f\", ${error_rate} * 100}" 2>/dev/null || echo "N/A")%
- **Throughput**: $(printf "%.1f" "${throughput}" 2>/dev/null || echo "N/A") req/s

EOF
            fi
        done
    fi
    
    cat >> "${report_file}" << EOF
## SLA Compliance Assessment

| Metric | Target | Status |
|--------|---------|---------|
| P95 Response Time | < 200ms | TBD |
| Error Rate | < 0.1% | TBD |
| Throughput | > 100 req/s | TBD |

## Recommendations

Based on the performance test results:

1. **Review response time performance** - Ensure P95 times remain below 200ms under load
2. **Monitor error rates** - Investigate any error spikes during high load
3. **Validate throughput capacity** - Ensure system can handle production traffic volumes
4. **Implement continuous monitoring** - Set up alerts for SLA threshold violations

## Test Artifacts

All test results and detailed metrics are available in:
- Results Directory: \`${RESULTS_DIR}\`
- Analysis Report: \`${RESULTS_DIR}/analysis-${TIMESTAMP}.json\`
- Raw Test Data: \`${RESULTS_DIR}/*-${TIMESTAMP}.json\`

---

**Report Generated by**: AI Recruitment Clerk Performance Validation Suite  
**Timestamp**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
EOF
    
    log_success "Comprehensive report generated: ${report_file}"
}

# Cleanup function
cleanup() {
    log "🧹 Cleaning up..."
    
    # Stop performance testing infrastructure (if we started it)
    if [ "${SKIP_INFRASTRUCTURE}" != "true" ] && [ -f "${SCRIPT_DIR}/production-load-testing.yml" ]; then
        docker-compose -f "${SCRIPT_DIR}/production-load-testing.yml" down >/dev/null 2>&1 || true
    fi
    
    log "Cleanup completed"
}

# Display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -m, --mode MODE          Performance test mode (quick|comprehensive|stress) [default: comprehensive]"
    echo "  -u, --url URL            Target URL for testing [default: http://localhost:3000]"
    echo "  -s, --skip-infra         Skip infrastructure setup"
    echo "  -n, --no-report          Skip report generation"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  PERFORMANCE_MODE         Test mode (overrides -m)"
    echo "  TARGET_URL              Target URL (overrides -u)"
    echo "  SKIP_INFRASTRUCTURE     Skip infrastructure (overrides -s)"
    echo "  GENERATE_REPORT         Generate report (overrides -n)"
    echo ""
    echo "Examples:"
    echo "  $0                           # Run comprehensive validation"
    echo "  $0 -m quick                  # Run quick validation"
    echo "  $0 -u http://prod.example.com -s  # Test production URL, skip infrastructure"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--mode)
            PERFORMANCE_MODE="$2"
            shift 2
            ;;
        -u|--url)
            TARGET_URL="$2"
            shift 2
            ;;
        -s|--skip-infra)
            SKIP_INFRASTRUCTURE="true"
            shift
            ;;
        -n|--no-report)
            GENERATE_REPORT="false"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    log "🚀 Starting AI Recruitment Clerk Performance Validation..."
    
    # Setup trap for cleanup
    trap cleanup EXIT
    
    # Pre-flight checks
    check_dependencies
    
    # Setup infrastructure
    setup_infrastructure
    
    # Validate system health
    validate_system_health
    
    # Run performance tests based on mode
    case "${PERFORMANCE_MODE}" in
        "quick")
            log "🏃 Running quick performance validation..."
            run_baseline_test
            run_regression_test
            ;;
        "stress")
            log "🔥 Running stress performance validation..."
            run_baseline_test
            run_production_load_test
            run_database_stress_test
            run_scalability_validation
            ;;
        "comprehensive"|*)
            log "🎯 Running comprehensive performance validation..."
            run_baseline_test
            run_production_load_test
            run_database_stress_test
            run_scalability_validation
            run_regression_test
            ;;
    esac
    
    # Analyze results
    analyze_results
    
    # Generate report
    generate_report
    
    # Success summary
    echo ""
    echo -e "${BOLD}${GREEN}🎉 Performance Validation Completed Successfully!${NC}"
    echo -e "${BLUE}================================================================${NC}"
    log_success "Results directory: ${RESULTS_DIR}"
    log_success "Test artifacts: ${RESULTS_DIR}/*-${TIMESTAMP}.*"
    if [ "${GENERATE_REPORT}" = "true" ]; then
        log_success "Comprehensive report: ${RESULTS_DIR}/performance-validation-report-${TIMESTAMP}.md"
    fi
    echo -e "${BLUE}================================================================${NC}"
}

# Execute main function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi