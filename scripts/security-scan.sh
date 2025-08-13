#!/bin/bash
# AI Recruitment Clerk - Comprehensive Security Scan Script
# This script runs various security scans and tests for the application

set -e

echo "🔐 Starting comprehensive security scan for AI Recruitment Clerk..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Initialize counters
TESTS_PASSED=0
TESTS_FAILED=0
WARNINGS=0

# Function to update counters
test_passed() {
    ((TESTS_PASSED++))
    print_success "$1"
}

test_failed() {
    ((TESTS_FAILED++))
    print_error "$1"
}

test_warning() {
    ((WARNINGS++))
    print_warning "$1"
}

print_status "Security Scan Started at $(date)"
echo "=================================================="

# 1. Check for hardcoded secrets
print_status "1. Scanning for hardcoded secrets and credentials..."

if command -v grep &> /dev/null; then
    SECRET_PATTERNS=(
        "password.*=.*['\"][^'\"]*['\"]"
        "secret.*=.*['\"][^'\"]*['\"]"
        "key.*=.*['\"][^'\"]*['\"]"
        "token.*=.*['\"][^'\"]*['\"]"
        "api_key.*=.*['\"][^'\"]*['\"]"
        "AWS_ACCESS_KEY"
        "GOOGLE_API_KEY"
        "MONGODB_PASSWORD.*=.*['\"][^'\"]*['\"]"
    )
    
    SECRETS_FOUND=false
    for pattern in "${SECRET_PATTERNS[@]}"; do
        if grep -r -i --exclude-dir=node_modules --exclude-dir=.git --exclude="*.log" "$pattern" . | grep -v "test" | grep -v "spec" | grep -v "example" | grep -v ".template" | grep -v ".env.example" > /dev/null; then
            test_failed "Potential hardcoded secret found: $pattern"
            SECRETS_FOUND=true
        fi
    done
    
    if [ "$SECRETS_FOUND" = false ]; then
        test_passed "No hardcoded secrets found"
    fi
else
    test_warning "grep not available - skipping secret scan"
fi

# 2. Check dependencies for vulnerabilities
print_status "2. Scanning dependencies for known vulnerabilities..."

if [ -f "package.json" ]; then
    if command -v npm &> /dev/null; then
        if npm audit --audit-level high 2>/dev/null; then
            test_passed "No high-severity vulnerabilities in dependencies"
        else
            test_failed "High-severity vulnerabilities found in dependencies"
            echo "Run 'npm audit fix' to address these issues"
        fi
    else
        test_warning "npm not available - skipping dependency scan"
    fi
else
    test_warning "package.json not found - skipping dependency scan"
fi

# 3. Check for secure configurations
print_status "3. Checking security configurations..."

# Check Docker configuration
if [ -f "docker-compose.production.yml" ]; then
    if grep -q "password123\|weak-password\|admin:admin" docker-compose.production.yml; then
        test_failed "Weak or default passwords found in Docker configuration"
    else
        test_passed "Docker production configuration looks secure"
    fi
else
    test_warning "docker-compose.production.yml not found"
fi

# Check environment template
if [ -f ".env.production.template" ]; then
    if grep -q "CHANGE_THIS\|your_.*_here\|SECURE_.*_32_CHARS" .env.production.template; then
        test_passed "Environment template contains placeholder values"
    else
        test_warning "Environment template may contain actual secrets"
    fi
else
    test_warning ".env.production.template not found"
fi

# Check for .env files in repo
if [ -f ".env" ] || [ -f ".env.production" ] || [ -f ".env.local" ]; then
    test_warning "Environment files found in repository - ensure they're in .gitignore"
else
    test_passed "No environment files found in repository"
fi

# 4. Check TypeScript/JavaScript security patterns
print_status "4. Scanning for insecure coding patterns..."

if command -v grep &> /dev/null; then
    INSECURE_PATTERNS=(
        "eval\s*\("
        "innerHTML\s*="
        "document\.write\s*\("
        "dangerouslySetInnerHTML"
        "process\.env\." # Should be accessed via ConfigService
        "console\.log.*password"
        "console\.log.*secret"
        "console\.log.*token"
    )
    
    PATTERNS_FOUND=false
    for pattern in "${INSECURE_PATTERNS[@]}"; do
        if grep -r -E --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=dist "$pattern" src/ 2>/dev/null; then
            test_warning "Potentially insecure pattern found: $pattern"
            PATTERNS_FOUND=true
        fi
    done
    
    if [ "$PATTERNS_FOUND" = false ]; then
        test_passed "No insecure coding patterns found"
    fi
fi

# 5. Check file permissions
print_status "5. Checking file permissions..."

# Check for overly permissive files
if find . -type f -perm /o+w -not -path "./node_modules/*" -not -path "./.git/*" | head -1 | grep -q .; then
    test_warning "World-writable files found - review permissions"
    find . -type f -perm /o+w -not -path "./node_modules/*" -not -path "./.git/*" | head -5
else
    test_passed "No world-writable files found"
fi

# Check for executable scripts
EXECUTABLE_SCRIPTS=$(find . -name "*.sh" -executable -not -path "./node_modules/*" -not -path "./.git/*" | wc -l)
if [ "$EXECUTABLE_SCRIPTS" -gt 0 ]; then
    test_passed "Found $EXECUTABLE_SCRIPTS executable scripts"
else
    test_warning "No executable scripts found - may need to set execute permissions"
fi

# 6. Run security unit tests
print_status "6. Running security-focused unit tests..."

if [ -f "package.json" ] && command -v npm &> /dev/null; then
    if npm test -- --testPathPattern=security 2>/dev/null; then
        test_passed "Security unit tests passed"
    else
        test_failed "Security unit tests failed or not found"
    fi
else
    test_warning "Cannot run security unit tests - npm or package.json not available"
fi

# 7. Check for SSL/TLS configuration
print_status "7. Checking SSL/TLS configuration..."

if grep -r "ssl\|tls\|https" docker-compose.production.yml 2>/dev/null | grep -v "#" > /dev/null; then
    test_passed "SSL/TLS configuration found in production"
else
    test_warning "No SSL/TLS configuration found - ensure HTTPS is configured at reverse proxy level"
fi

# 8. Check for security headers middleware
print_status "8. Checking for security middleware implementation..."

SECURITY_MIDDLEWARE=(
    "SecurityHeadersMiddleware"
    "CsrfProtectionMiddleware"
    "RateLimitMiddleware"
    "helmet"
)

MIDDLEWARE_FOUND=false
for middleware in "${SECURITY_MIDDLEWARE[@]}"; do
    if grep -r "$middleware" src/ 2>/dev/null > /dev/null; then
        MIDDLEWARE_FOUND=true
        break
    fi
done

if [ "$MIDDLEWARE_FOUND" = true ]; then
    test_passed "Security middleware implementation found"
else
    test_failed "No security middleware implementation found"
fi

# 9. Check for authentication and authorization
print_status "9. Checking authentication and authorization implementation..."

AUTH_PATTERNS=(
    "JwtAuthGuard"
    "passport"
    "@UseGuards"
    "authorization"
)

AUTH_FOUND=false
for pattern in "${AUTH_PATTERNS[@]}"; do
    if grep -r "$pattern" src/ 2>/dev/null > /dev/null; then
        AUTH_FOUND=true
        break
    fi
done

if [ "$AUTH_FOUND" = true ]; then
    test_passed "Authentication/authorization implementation found"
else
    test_failed "No authentication/authorization implementation found"
fi

# 10. Check for input validation
print_status "10. Checking input validation implementation..."

VALIDATION_PATTERNS=(
    "class-validator"
    "@IsEmail"
    "@IsString"
    "@Length"
    "ValidationPipe"
)

VALIDATION_FOUND=false
for pattern in "${VALIDATION_PATTERNS[@]}"; do
    if grep -r "$pattern" src/ 2>/dev/null > /dev/null; then
        VALIDATION_FOUND=true
        break
    fi
done

if [ "$VALIDATION_FOUND" = true ]; then
    test_passed "Input validation implementation found"
else
    test_failed "No input validation implementation found"
fi

# 11. Check for logging security
print_status "11. Checking logging security..."

# Check for potential sensitive data in logs
if grep -r --include="*.ts" --include="*.js" "logger.*password\|logger.*secret\|logger.*token" src/ 2>/dev/null; then
    test_failed "Potential sensitive data logging found"
else
    test_passed "No sensitive data logging patterns found"
fi

# 12. Generate security report
print_status "12. Generating security report..."

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="security_scan_report_${TIMESTAMP}.txt"

cat > "$REPORT_FILE" << EOF
AI Recruitment Clerk - Security Scan Report
Generated: $(date)
==========================================

SUMMARY:
- Tests Passed: $TESTS_PASSED
- Tests Failed: $TESTS_FAILED  
- Warnings: $WARNINGS
- Overall Status: $([ $TESTS_FAILED -eq 0 ] && echo "PASS" || echo "FAIL")

RECOMMENDATIONS:
$([ $TESTS_FAILED -gt 0 ] && echo "- Address all failed security tests before production deployment")
$([ $WARNINGS -gt 0 ] && echo "- Review and address security warnings")
- Regularly update dependencies to patch security vulnerabilities
- Implement comprehensive security monitoring and alerting
- Conduct periodic penetration testing
- Review and update security policies and procedures

NEXT STEPS:
1. Fix all critical security issues (failed tests)
2. Review and address warnings  
3. Run automated security tests in CI/CD pipeline
4. Schedule regular security reviews
5. Monitor security alerts and incidents

For detailed security testing, run:
npm test -- --testPathPattern=security --verbose
EOF

print_success "Security report generated: $REPORT_FILE"

# Summary
echo ""
echo "=================================================="
echo "Security Scan Summary"
echo "=================================================="
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo "Warnings: $WARNINGS"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    print_success "✅ Security scan completed successfully!"
    echo "All critical security checks passed. Review warnings if any."
    exit 0
else
    print_error "❌ Security scan failed!"
    echo "Critical security issues found. Address failed tests before production."
    exit 1
fi