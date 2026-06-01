#!/usr/bin/env node
/**
 * Health Check Script for E2E Frontend Server
 *
 * This script performs comprehensive health checks on the frontend server
 * before running E2E tests. It verifies:
 * 1. HTTP connectivity (200 status)
 * 2. Angular app content (arc-root/app-root element)
 * 3. Proper bootstrap indicators
 *
 * Usage:
 *   node scripts/health-check-server.mjs [url] [options]
 *
 * Options:
 *   --timeout <ms>     Total timeout in milliseconds (default: 90000)
 *   --interval <ms>    Retry interval in milliseconds (default: 2000)
 *   --verbose          Enable verbose logging
 */

import http from 'http';

const DEFAULT_URL = 'http://localhost:4200';
const DEFAULT_TIMEOUT = 90000; // 90 seconds for production builds
const DEFAULT_INTERVAL = 2000; // 2 seconds between retries

// Parse arguments
const args = process.argv.slice(2);
let url = DEFAULT_URL;
let timeout = DEFAULT_TIMEOUT;
let interval = DEFAULT_INTERVAL;
let verbose = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--timeout' && args[i + 1]) {
    timeout = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--interval' && args[i + 1]) {
    interval = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--verbose') {
    verbose = true;
  } else if (!args[i].startsWith('--')) {
    url = args[i];
  }
}

const log = (msg) => console.log(`[health-check] ${msg}`);
const logVerbose = (msg) => verbose && log(msg);
const logError = (msg) => console.error(`[health-check] ❌ ${msg}`);
const logSuccess = (msg) => console.log(`[health-check] ✅ ${msg}`);
const logWarning = (msg) => console.warn(`[health-check] ⚠️  ${msg}`);

/**
 * Check if the response contains Angular app indicators
 */
function verifyAngularApp(content) {
  const hasAppRoot =
    content.includes('<app-root') || content.includes('arc-root');
  const hasAngularIndicator =
    content.includes('ng-version') ||
    content.includes('_ngcontent') ||
    content.includes('data-ng-version');
  const hasHtmlStructure =
    content.includes('<!DOCTYPE html>') || content.includes('<html');

  return {
    hasAppRoot,
    hasAngularIndicator,
    hasHtmlStructure,
    isValid: hasAppRoot && hasHtmlStructure,
  };
}

/**
 * Perform HTTP health check
 */
function checkHealth(targetUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname || '/',
      method: 'GET',
      timeout: 5000, // Individual request timeout
      headers: {
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    };

    logVerbose(`Checking ${targetUrl}...`);

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const statusCode = res.statusCode;
        const angularCheck = verifyAngularApp(data);

        resolve({
          statusCode,
          data,
          angularCheck,
          success: statusCode === 200 && angularCheck.isValid,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Main health check with retries
 */
async function performHealthCheck() {
  log(`Starting health check for ${url}`);
  log(`Timeout: ${timeout}ms, Interval: ${interval}ms`);

  const startTime = Date.now();
  let attempt = 0;
  let lastError = null;
  let lastResponse = null;

  while (Date.now() - startTime < timeout) {
    attempt++;

    try {
      logVerbose(`Attempt ${attempt}...`);
      const result = await checkHealth(url);
      lastResponse = result;

      if (result.success) {
        const elapsed = Date.now() - startTime;
        logSuccess(
          `Server is healthy after ${attempt} attempts (${elapsed}ms)`,
        );
        logSuccess(`Status: ${result.statusCode}`);
        logSuccess(
          `Angular app detected: ${result.angularCheck.hasAppRoot ? 'yes' : 'no'}`,
        );
        logVerbose(`Content length: ${result.data.length} bytes`);
        process.exit(0);
      } else {
        if (result.statusCode !== 200) {
          logWarning(`HTTP ${result.statusCode} received (expected 200)`);
        }
        if (!result.angularCheck.hasAppRoot) {
          logWarning('Angular app root element not found in response');
          logVerbose(`Response preview: ${result.data.substring(0, 200)}...`);
        }
        if (!result.angularCheck.hasHtmlStructure) {
          logWarning('Invalid HTML structure');
        }
      }
    } catch (error) {
      lastError = error;
      logVerbose(`Attempt ${attempt} failed: ${error.message}`);
    }

    // Wait before retry
    if (Date.now() - startTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  // Timeout exceeded
  const elapsed = Date.now() - startTime;
  logError(`Health check failed after ${attempt} attempts (${elapsed}ms)`);
  logError(`URL: ${url}`);

  if (lastError) {
    logError(`Last error: ${lastError.message}`);
  }

  if (lastResponse) {
    logError(`Last response status: ${lastResponse.statusCode}`);
    if (!lastResponse.angularCheck.hasAppRoot) {
      logError('Response did not contain Angular app root element');
      logError(`Response preview: ${lastResponse.data.substring(0, 500)}`);
    }
  }

  log('');
  log('Troubleshooting steps:');
  log('  1. Verify the frontend has been built: npm run build');
  log('  2. Check if the server is running on the correct port');
  log(
    '  3. Ensure the server is serving the built files from dist/apps/ai-recruitment-frontend/browser',
  );
  log('  4. Check server logs for errors');
  log('  5. Try accessing the URL manually in a browser');

  process.exit(1);
}

// Run health check
performHealthCheck().catch((error) => {
  logError(`Unexpected error: ${error.message}`);
  process.exit(1);
});
