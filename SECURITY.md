# Security Policy

## Supported Versions

We actively support security updates for the following versions of AI Recruitment Clerk:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in AI Recruitment Clerk, please report it to us responsibly.

### How to Report

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report security issues to:

- **Email**: security@ai-recruitment-clerk.com
- **Subject Line**: [SECURITY] Brief description of the vulnerability
- **PGP Key**: Available at [keybase.io/ai-recruitment-clerk](keybase.io/ai-recruitment-clerk) (optional)

### What to Include

Please provide as much information as possible:

1. **Vulnerability Type**: What kind of vulnerability is it? (e.g., XSS, SQL injection, authentication bypass)
2. **Location**: Where is the vulnerability? (file paths, URLs, specific components)
3. **Description**: A clear description of the vulnerability
4. **Impact**: What could an attacker do with this vulnerability?
5. **Steps to Reproduce**: Detailed steps to reproduce the vulnerability
6. **Proof of Concept**: If possible, provide a minimal proof of concept
7. **Suggested Fix**: If you have ideas on how to fix it, please share

### Response Timeline

- **Initial Response**: Within 24 hours of receiving your report
- **Status Update**: Within 72 hours with our initial assessment
- **Resolution**: We aim to resolve critical vulnerabilities within 7 days
- **Disclosure**: We will coordinate with you on responsible disclosure timing

### Recognition

We believe in recognizing security researchers who help us keep our platform secure:

- **Hall of Fame**: Security researchers who report valid vulnerabilities will be listed in our Hall of Fame (with permission)
- **CVE Assignment**: For significant vulnerabilities, we will work with you to obtain a CVE identifier
- **Bug Bounty**: While we don't currently have a formal bug bounty program, we may provide rewards for exceptional findings

## Security Best Practices

### For Developers

- **Authentication**: Always use strong, unique passwords and enable MFA
- **Code Review**: All security-related changes must be reviewed by at least two developers
- **Dependencies**: Regularly update dependencies and monitor for vulnerabilities
- **Secrets**: Never commit secrets, API keys, or credentials to the repository
- **Environment**: Use environment variables for all configuration

### For Users

- **Strong Passwords**: Use strong, unique passwords for your account
- **Multi-Factor Authentication**: Enable MFA when available
- **Keep Updated**: Keep your browser and any client applications updated
- **Report Issues**: Report any suspicious activity or potential security issues
- **Secure Environment**: Use the application only in secure, trusted environments

### For Administrators

- **Regular Updates**: Keep the application and all dependencies updated
- **Security Monitoring**: Monitor security logs and set up appropriate alerting
- **Access Control**: Implement principle of least privilege for all users
- **Backup Strategy**: Maintain secure, regularly tested backups
- **Network Security**: Use HTTPS/TLS for all communications
- **Security Training**: Ensure all team members receive security training

## Security Features

### Current Security Measures

- **Authentication**: JWT-based authentication with secure token management
- **Multi-Factor Authentication**: Support for TOTP, SMS, and email-based MFA
- **Rate Limiting**: Advanced rate limiting with suspicious activity detection
- **CSRF Protection**: Comprehensive CSRF protection middleware
- **Security Headers**: Implementation of security headers (HSTS, CSP, X-Frame-Options, etc.)
- **Input Validation**: Strict input validation and sanitization
- **SQL Injection Prevention**: Use of parameterized queries and ORM
- **XSS Prevention**: Output encoding and Content Security Policy
- **Session Security**: Secure session management with proper cookie settings
- **Password Security**: Bcrypt hashing with salt rounds
- **File Upload Security**: File type validation and virus scanning
- **Dependency Scanning**: Regular dependency vulnerability scanning
- **Security Monitoring**: Comprehensive security event logging and monitoring

### Planned Security Enhancements

- **Security Audit Logging**: Enhanced audit logging for all security events
- **Intrusion Detection**: Advanced intrusion detection and prevention
- **Vulnerability Scanning**: Automated vulnerability scanning in CI/CD
- **Penetration Testing**: Regular third-party penetration testing
- **Security Training**: Ongoing security training for all team members

## Dependency Vulnerability Exceptions

The following dependency vulnerabilities are currently documented and accepted. All are in transitive dependencies (not directly used by the application).

### Current Vulnerability Status (as of 2026-02-03)

- **Critical**: 0
- **High**: 38
- **Moderate**: 6
- **Low**: 2
- **Total**: 46 vulnerabilities

### Risk Assessment and Remediation Plan

1. **Angular Dependencies (@angular/*, @angular-devkit/*)**
   - **Vulnerabilities**: Several high-severity XSS and XSRF issues
   - **Risk**: Low - These are in development tooling, not runtime code
   - **Status**: Will be addressed with next major Angular upgrade
   - **Target**: Q2 2026

2. **AWS SDK (@aws-sdk/*)**
   - **Vulnerabilities**: Configuration and XML parsing issues
   - **Risk**: Medium - AWS SDK used for optional SES email service
   - **Mitigation**: Email service disabled by default; only enabled with explicit configuration
   - **Target**: Q2 2026

3. **Nx Build Tooling (@nx/*)**
   - **Vulnerabilities**: Express/body-parser issues in dev server
   - **Risk**: Very Low - Only affects local development, not production
   - **Status**: Tracking Nx releases; will update when safe
   - **Target**: Q1 2026

4. **Semantic Release Dependencies**
   - **Vulnerabilities**: tar, lodash, yargs-parser issues
   - **Risk**: Low - Only affects release automation, not application runtime
   - **Status**: Will update with next major Semantic Release version
   - **Target**: Q2 2026

5. **MCP SDK (@modelcontextprotocol/sdk)**
   - **Vulnerabilities**: DNS rebinding and ReDoS
   - **Risk**: Low - Development tool for AI agent integration
   - **Mitigation**: Not exposed to external networks
   - **Target**: Q1 2026

### Why These Are Accepted

1. **Transitive Dependencies**: All vulnerabilities are in dependencies of dependencies
2. **Development-Time Only**: Many only affect local development, not production runtime
3. **Disabled Features**: Some affected services are disabled by default
4. **No Exploitation Path**: Current architecture prevents exploitation of these issues
5. **Major Version Changes**: Fixes require major version upgrades that need testing

### Ongoing Monitoring

- Dependency scans run in CI via `npm audit` and `scripts/dependency-gate.mjs`
- Releases blocked if new critical vulnerabilities are introduced
- Quarterly reviews of vulnerability backlog
- Prioritized remediation based on risk and exploitability

### Remediation Timeline

| Priority | Count | Target Date |
|----------|-------|-------------|
| Critical | 0 | N/A |
| High | 38 | Q2 2026 |
| Moderate | 6 | Q3 2026 |
| Low | 2 | Q4 2026 |

For the latest vulnerability status, run: `npm audit`

## Security Configuration

### Production Security Checklist

- [ ] All environment variables properly configured
- [ ] HTTPS/TLS enabled with valid certificates
- [ ] Security headers properly configured
- [ ] Rate limiting enabled and configured
- [ ] MFA enabled for all admin accounts
- [ ] Security monitoring and alerting configured
- [ ] Regular security backups verified
- [ ] All default credentials changed
- [ ] Unnecessary services disabled
- [ ] Security patches applied

### Security Headers

The application implements the following security headers:

- **Strict-Transport-Security**: Enforces HTTPS connections
- **Content-Security-Policy**: Prevents XSS and injection attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-XSS-Protection**: Enables browser XSS protection
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Controls browser features and APIs

## Incident Response

### Security Incident Types

1. **Data Breach**: Unauthorized access to sensitive data
2. **Service Disruption**: DDoS attacks or service availability issues
3. **Malware**: Detection of malicious software or code
4. **Insider Threat**: Malicious or negligent insider activity
5. **Social Engineering**: Phishing or other social engineering attacks

### Response Process

1. **Detection**: Identify and confirm security incident
2. **Containment**: Isolate affected systems and prevent further damage
3. **Assessment**: Determine scope and impact of the incident
4. **Eradication**: Remove the threat and fix vulnerabilities
5. **Recovery**: Restore systems and monitor for additional issues
6. **Lessons Learned**: Document incident and improve security measures

## Contact

For security-related questions or concerns:

- **Email**: security@ai-recruitment-clerk.com
- **Response Time**: Within 24-48 hours
- **Emergency**: For critical security issues affecting production systems

## Updates

This security policy is reviewed and updated regularly. Last updated: $(date +"%Y-%m-%d")

---

**Note**: This security policy applies to the AI Recruitment Clerk application and its related infrastructure. For questions about this policy, please contact our security team.