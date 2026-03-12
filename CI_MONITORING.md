# 📊 CI Monitoring & Reporting

This document describes the CI monitoring and reporting features implemented for the AI Recruitment Clerk project.

## Overview

The CI monitoring system provides real-time visibility into test metrics, trends, and quality gates. It includes:

- ⏱️ **Test Duration Trends** - Track test execution time over time
- ⚠️ **Failure Rate Monitoring** - Alert when failure rate exceeds thresholds
- 📊 **Coverage Trends** - Monitor code coverage with Codecov integration
- 💬 **Slack Notifications** - Get alerts on CI failures
- 💬 **PR Comments** - Automatic test results in pull requests
- 📈 **Dashboard** - Visual monitoring interface

## Components

### 1. GitHub Actions Workflows

#### `.github/workflows/ci-monitoring.yml`

The main monitoring workflow that runs after CI completes:

- **test-metrics**: Collects and analyzes test results
- **coverage-badge**: Generates coverage badge for README
- **slack-notification**: Sends alerts on failure
- **pr-comment**: Comments test results on pull requests

#### `.github/workflows/ci.yml`

Updated with test duration tracking and Codecov integration.

#### `.github/workflows/coverage.yml`

Dedicated coverage workflow with PR commenting.

### 2. Monitoring Scripts

#### `scripts/ci-monitor.ts`

TypeScript utility for analyzing test results:

```bash
# Analyze test results
npx ts-node scripts/ci-monitor.ts analyze

# Check failure rate threshold
npx ts-node scripts/ci-monitor.ts check-failure-rate

# Generate test report
npx ts-node scripts/ci-monitor.ts report
```

### 3. Monitoring Dashboard

#### `monitoring-dashboard.html`

Interactive dashboard with:

- Real-time test metrics
- Duration trends chart
- Coverage trends chart
- Failure rate visualization
- Status indicators and alerts

To view the dashboard:

```bash
# Open in browser
open monitoring-dashboard.html

# Or serve with a local server
npx serve monitoring-dashboard.html
```

## Configuration

### Environment Variables

Add these to your `.env` file or GitHub Secrets:

```bash
# Required for coverage reporting
CODECOV_TOKEN=your_codecov_token

# Required for Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Optional: Custom metrics API
METRICS_API_URL=https://api.example.com/metrics
METRICS_API_KEY=your_api_key

# Test thresholds
COVERAGE_THRESHOLD=70
FAILURE_RATE_THRESHOLD=0.1  # 10%
```

### GitHub Secrets

Set these in your repository settings:

1. **CODECOV_TOKEN** - Get from [codecov.io](https://codecov.io)
2. **SLACK_WEBHOOK_URL** - Create in Slack app settings
3. **METRICS_API_URL** (optional) - Your custom metrics endpoint
4. **METRICS_API_KEY** (optional) - API key for metrics endpoint

## Features

### 1. Test Duration Tracking

Every CI run records test duration and uploads metrics:

```yaml
- name: ⏱️ Calculate Test Duration
  id: duration
  run: |
    TEST_END_TIME=$(date +%s)
    DURATION=$((TEST_END_TIME - TEST_START_TIME))
    echo "duration=$DURATION" >> $GITHUB_OUTPUT
```

Duration data is stored as artifacts for 30 days.

### 2. Failure Rate Monitoring

The system checks failure rates against a 10% threshold:

```typescript
const FAILURE_RATE_THRESHOLD = 0.1;

if (failureRate > FAILURE_RATE_THRESHOLD) {
  console.error('⚠️ Test failure rate is high:', failureRate);
  process.exit(1);
}
```

### 3. Coverage Reporting

Coverage is uploaded to Codecov on every run:

```yaml
- name: 📊 Upload Coverage to Codecov
  uses: codecov/codecov-action@v5
  with:
    files: ./coverage/lcov.info
    flags: unittests
    name: ai-recruitment-clerk
```

### 4. Slack Notifications

Slack is notified when CI fails:

```yaml
- name: 💬 Notify Slack on Failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    channel: '#ci-alerts'
```

### 5. PR Comments

Test results are automatically commented on pull requests:

```markdown
🧪 **CI Test Results**

| Metric           | Value     |
| ---------------- | --------- |
| **Status**       | ✅ Passed |
| **Duration**     | 245s      |
| **Failure Rate** | 0.00%     |
```

## Usage

### Viewing Metrics

1. **GitHub Actions**: Check the "CI Monitoring" workflow runs
2. **Dashboard**: Open `monitoring-dashboard.html` in a browser
3. **Codecov**: Visit [codecov.io/gh/your-org/your-repo](https://codecov.io)
4. **Artifacts**: Download metrics from workflow artifacts

### Adding Custom Metrics

To add custom metrics, modify `scripts/ci-monitor.ts`:

```typescript
// Add to the metrics object
const customMetric = {
  project: PROJECT_NAME,
  timestamp: new Date().toISOString(),
  customField: yourValue,
};

// Upload to your API
await uploadMetrics(metrics, coverage);
```

### Setting Up Slack Notifications

1. Create a Slack app at [api.slack.com/apps](https://api.slack.com/apps)
2. Add "Incoming Webhooks" feature
3. Create a webhook for your channel
4. Add the webhook URL to GitHub Secrets as `SLACK_WEBHOOK_URL`

### Setting Up Codecov

1. Sign up at [codecov.io](https://codecov.io) with your GitHub account
2. Add your repository
3. Copy the token to GitHub Secrets as `CODECOV_TOKEN`
4. Coverage reports will upload automatically

## Metrics Format

Metrics are stored in JSON format:

```json
{
  "project": "ai-recruitment-clerk",
  "timestamp": "2026-03-12T10:00:00Z",
  "tests": {
    "total": 150,
    "passed": 148,
    "failed": 2,
    "skipped": 0,
    "duration": 245,
    "failureRate": 0.0133
  },
  "coverage": {
    "lines": 78.5,
    "statements": 80.2,
    "functions": 75.1,
    "branches": 72.3
  },
  "metadata": {
    "commit": "abc123",
    "branch": "main",
    "runId": "123456789"
  }
}
```

## Troubleshooting

### Metrics Not Uploading

Check that:

- `METRICS_API_URL` is set correctly in secrets
- The API endpoint accepts POST requests
- The API key has proper permissions

### Slack Notifications Not Working

Verify:

- `SLACK_WEBHOOK_URL` is correct
- The webhook is active in Slack
- The channel exists and bot has access

### Coverage Not Showing

Ensure:

- `CODECOV_TOKEN` is set in GitHub Secrets
- Coverage files are being generated
- The upload step is not skipped

## Future Enhancements

- [ ] Grafana/Prometheus integration
- [ ] Custom alerting rules
- [ ] Test flakiness detection
- [ ] Performance regression detection
- [ ] Integration with Jira for failed test tickets

## Contributing

To add new monitoring features:

1. Update the workflow files in `.github/workflows/`
2. Add utility functions to `scripts/ci-monitor.ts`
3. Update the dashboard in `monitoring-dashboard.html`
4. Document the changes in this file

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Codecov GitHub Action](https://github.com/codecov/codecov-action)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
