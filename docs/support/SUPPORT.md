# Support

## How to Get Help

### Documentation

Start by checking the comprehensive documentation in the [`docs/`](./docs/) directory:

- **[README.md](./README.md)** - Project overview and quick start guide
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines and development workflow
- **[SECURITY.md](./SECURITY.md)** - Security policy and vulnerability reporting
- **[DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md)** - Development environment setup
- **[TECHNICAL_ARCHITECTURE.md](./docs/TECHNICAL_ARCHITECTURE.md)** - Technical implementation details
- **[RUNBOOK.md](./docs/RUNBOOK.md)** - Production operations and incident response

### Getting Help

For questions, issues, or contributions:

| Type | Channel | Response Time |
|------|---------|---------------|
| 🐛 **Bug Reports** | [GitHub Issues](../../issues) | 2-3 business days |
| 💡 **Feature Requests** | [GitHub Issues](../../issues) | 1 week |
| ❓ **Questions** | [GitHub Discussions](../../discussions) | 2-3 business days |
| 🔒 **Security Issues** | security@ai-recruitment-clerk.com | Within 24 hours |

### Issue Reporting

When creating an issue, please use the appropriate template:

- **Bug Report**: Use the [Bug Report template](./.github/ISSUE_TEMPLATE/bug_report.yml)
- **Feature Request**: Use the [Feature Request template](./.github/ISSUE_TEMPLATE/feature_request.yml)
- **Operations Task**: Use the [Operations Task template](./.github/ISSUE_TEMPLATE/ops_task.yml)

### Community Guidelines

- Be respectful and constructive in all interactions
- Search existing issues before creating new ones
- Provide minimal reproducible examples for bugs
- Include environment details (OS, Node version, etc.)
- Follow the [Code of Conduct](./CODE_OF_CONDUCT.md)

### Development Support

For developers working on this project:

1. **Setup Issues**: Check [DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md)
2. **Architecture Questions**: Review [TECHNICAL_ARCHITECTURE.md](./docs/TECHNICAL_ARCHITECTURE.md)
3. **API Documentation**: See [api_spec.openapi.yml](./specs/api_spec.openapi.yml)
4. **Testing**: Run `npm run test` and `npm run test:e2e`

### Enterprise Support

For enterprise support, custom integrations, or consulting:

- 📧 **Email**: support@ai-recruitment-clerk.com
- 📱 **Slack**: Community workspace (invite-only)
- ⏰ **Response Time**: 1 business day

### Useful Resources

- **Project Website**: [Coming Soon]
- **Documentation Hub**: [docs/DOCUMENTATION_INDEX.md](./docs/DOCUMENTATION_INDEX.md)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)
- **Migration Guides**: [docs/guides/](./docs/guides/)

### Troubleshooting Common Issues

#### Docker Issues
```bash
# Check Docker status
docker info

# Rebuild containers
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

#### Build Failures
```bash
# Clean build artifacts
npx nx reset

# Reinstall dependencies
npm ci --legacy-peer-deps

# Run type check
npm run typecheck
```

#### Test Failures
```bash
# Run specific test
npx nx test <project-name>

# Run with coverage
npx nx test <project-name> --coverage

# Run E2E tests
npm run test:e2e
```

### Service Health Endpoints

| Service | Health Check URL |
|---------|------------------|
| API Gateway | http://localhost:3000/api/health |
| Frontend | http://localhost:4200 |
| NATS Monitor | http://localhost:8222 |

### Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

**Last Updated**: 2026-02-03
