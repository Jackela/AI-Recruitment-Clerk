const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4200;
const API_TARGET = process.env.API_TARGET || 'http://localhost:3000';

// Support both Angular 20+ (direct output) and legacy (browser subdirectory) structures
const getStaticDir = () => {
  if (process.env.STATIC_DIR) {
    // If STATIC_DIR is provided, check if it's the parent directory
    const providedPath = path.resolve(process.env.STATIC_DIR);
    const browserPath = path.join(providedPath, 'browser');

    // Check if browser subdirectory exists
    if (fs.existsSync(browserPath)) {
      console.log(`Found browser subdirectory: ${browserPath}`);
      return browserPath;
    }
    return providedPath;
  }

  // Default paths to check
  const defaultPaths = [
    path.resolve(__dirname, '..', 'dist/apps/ai-recruitment-frontend/browser'),
    path.resolve(__dirname, '..', 'dist/apps/ai-recruitment-frontend'),
  ];

  for (const p of defaultPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return defaultPaths[0]; // Return first option even if it doesn't exist
};

const STATIC_DIR = getStaticDir();
const STATIC_ROOT = path.resolve(STATIC_DIR);

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const getRequestPathname = (requestUrl) => {
  try {
    return decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  } catch {
    return null;
  }
};

const resolveStaticPath = (pathname) => {
  const filePath = path.resolve(STATIC_ROOT, `.${pathname}`);

  if (filePath !== STATIC_ROOT && !filePath.startsWith(STATIC_ROOT + path.sep)) {
    return null;
  }

  return filePath;
};

// Mock API responses for when real API is unavailable
const mockApiHandler = (req, res) => {
  const url = req.url;
  const method = req.method;

  // ===========================================
  // Health & Status
  // ===========================================

  // Health check
  if (url === '/api/health' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
    );
    return true;
  }

  // ===========================================
  // Guest endpoints
  // ===========================================

  // Guest status
  if (url === '/api/guest/status' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        isActive: true,
        sessionId: 'guest-session-123',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }),
    );
    return true;
  }

  // Guest details
  if (url === '/api/guest/details' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        id: 'guest-001',
        name: 'Guest User',
        email: 'guest@example.com',
        createdAt: '2024-01-01T00:00:00Z',
      }),
    );
    return true;
  }

  // Guest feedback code
  if (url === '/api/guest/feedback-code' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        code: 'FEEDBACK-1234',
        isRedeemed: false,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    );
    return true;
  }

  // Guest redeem
  if (url === '/api/guest/redeem' && method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        message: 'Code redeemed successfully',
        reward: 'Free analysis upgrade',
      }),
    );
    return true;
  }

  // Guest check usage
  if (url === '/api/guest/check-usage' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        usedAnalyses: 2,
        maxAnalyses: 5,
        remaining: 3,
      }),
    );
    return true;
  }

  // Guest stats
  if (url === '/api/guest/stats' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        totalGuests: 1247,
        activeGuests: 312,
        pendingFeedbackCodes: 48,
        redeemedFeedbackCodes: 196,
        lastUpdated: new Date().toISOString(),
      }),
    );
    return true;
  }

  // Guest resume analyze
  if (url === '/api/guest/resume/analyze' && method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        analysisId: 'analysis-' + Date.now(),
        status: 'completed',
        skills: ['JavaScript', 'TypeScript', 'React'],
        experience: '5 years',
      }),
    );
    return true;
  }

  // Guest resume analysis by ID
  const guestAnalysisMatch = url.match(
    /^\/api\/guest\/resume\/analysis\/(\w+)$/,
  );
  if (guestAnalysisMatch && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        id: guestAnalysisMatch[1],
        status: 'completed',
        skills: ['JavaScript', 'TypeScript', 'React'],
        experience: '5 years',
        createdAt: new Date().toISOString(),
      }),
    );
    return true;
  }

  // Guest resume demo-analysis
  if (url === '/api/guest/resume/demo-analysis' && method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        demoId: 'demo-' + Date.now(),
        status: 'completed',
        message: 'Demo analysis completed',
      }),
    );
    return true;
  }

  // ===========================================
  // Jobs endpoints
  // ===========================================

  // Jobs list
  if (url === '/api/jobs' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify([
        {
          id: '1',
          title: '高级前端开发工程师',
          description:
            '负责前端架构设计和开发工作，要求熟悉React/Vue/Angular等主流框架',
          requirements: ['JavaScript', 'TypeScript', 'React', 'Vue'],
          status: 'active',
          createdAt: '2024-01-15T08:00:00Z',
        },
        {
          id: '2',
          title: 'Java开发工程师',
          description: '负责后端服务开发，要求熟悉Spring框架和微服务架构',
          requirements: ['Java', 'Spring Boot', 'MySQL', 'Redis'],
          status: 'active',
          createdAt: '2024-01-16T09:00:00Z',
        },
      ]),
    );
    return true;
  }

  // Create job
  if (url === '/api/jobs' && method === 'POST') {
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        id: 'job-' + Date.now(),
        title: 'New Position',
        description: 'Job description',
        requirements: [],
        status: 'active',
        createdAt: new Date().toISOString(),
      }),
    );
    return true;
  }

  // Job by ID
  const jobMatch = url.match(/^\/api\/jobs\/(\w+)$/);
  if (jobMatch) {
    if (method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          id: jobMatch[1],
          title: '高级前端开发工程师',
          description:
            '负责前端架构设计和开发工作，要求熟悉React/Vue/Angular等主流框架',
          requirements: ['JavaScript', 'TypeScript', 'React', 'Vue'],
          status: 'active',
          createdAt: '2024-01-15T08:00:00Z',
        }),
      );
      return true;
    }
    if (method === 'PUT') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          id: jobMatch[1],
          title: 'Updated Position',
          description: 'Updated description',
          requirements: [],
          status: 'active',
          createdAt: '2024-01-15T08:00:00Z',
        }),
      );
      return true;
    }
    if (method === 'DELETE') {
      res.writeHead(204);
      res.end();
      return true;
    }
  }

  // ===========================================
  // Scoring endpoints
  // ===========================================

  // Gap analysis
  if (url === '/api/scoring/gap-analysis' && method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        data: {
          matchedSkills: ['aws', 'kubernetes', 'microservices', 'docker'],
          missingSkills: ['azure', 'terraform'],
          suggestedSkills: ['devops', 'ci/cd', 'monitoring'],
        },
      }),
    );
    return true;
  }

  // Gap analysis file upload
  if (url === '/api/scoring/gap-analysis-file' && method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        data: {
          matchedSkills: ['aws', 'kubernetes', 'microservices', 'docker'],
          missingSkills: ['azure', 'terraform'],
          suggestedSkills: ['devops', 'ci/cd', 'monitoring'],
        },
      }),
    );
    return true;
  }

  // ===========================================
  // Upload endpoints
  // ===========================================

  // Resume upload
  if (url === '/api/upload/resume' && method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        id: 'upload-' + Date.now(),
        filename: 'resume.pdf',
        status: 'uploaded',
        message: '简历上传成功',
      }),
    );
    return true;
  }

  // ===========================================
  // Reports endpoints
  // ===========================================

  // Reports list
  if (url === '/api/reports' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify([
        {
          id: '1',
          jobId: '1',
          candidateName: '张三',
          matchScore: 85,
          skills: ['JavaScript', 'React', 'TypeScript'],
          experience: '3年前端开发经验',
          createdAt: '2024-01-17T10:00:00Z',
        },
      ]),
    );
    return true;
  }

  // Report by ID
  const reportMatch = url.match(/^\/api\/reports\/(\w+)$/);
  if (reportMatch && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        id: reportMatch[1],
        jobId: '1',
        candidateName: '张三',
        matchScore: 85,
        skills: ['JavaScript', 'React', 'TypeScript'],
        experience: '3年前端开发经验',
        createdAt: '2024-01-17T10:00:00Z',
      }),
    );
    return true;
  }

  // Report PDF download
  const reportPdfMatch = url.match(/^\/api\/reports\/(\w+)\/pdf$/);
  if (reportPdfMatch && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/pdf' });
    res.end('PDF content placeholder');
    return true;
  }

  // Report Excel download
  const reportExcelMatch = url.match(/^\/api\/reports\/(\w+)\/excel$/);
  if (reportExcelMatch && method === 'GET') {
    res.writeHead(200, {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    res.end('Excel content placeholder');
    return true;
  }

  // ===========================================
  // Error reporting endpoints
  // ===========================================

  // Error report (user reports)
  if (url === '/api/errors/user-reports' && method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, reportId: 'err-' + Date.now() }));
    return true;
  }

  // Error report (correlation)
  if (url === '/api/errors/report' && method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, reportId: 'err-' + Date.now() }));
    return true;
  }

  // Error simulation endpoints
  if (url === '/api/error/timeout' && method === 'GET') {
    res.writeHead(408, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Request timeout' }));
    return true;
  }

  if (url === '/api/error/server' && method === 'GET') {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
    return true;
  }

  // ===========================================
  // WebSocket stats endpoint
  // ===========================================

  // WS stats
  if (url === '/api/ws/stats' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        activeConnections: 10,
        totalRequests: 1500,
        timestamp: new Date().toISOString(),
      }),
    );
    return true;
  }

  // ===========================================
  // Privacy & Marketing endpoints
  // ===========================================

  // Privacy policy
  if (url.startsWith('/api/privacy/') && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        policyVersion: '1.0',
        lastUpdated: '2024-01-01T00:00:00Z',
        accepted: true,
      }),
    );
    return true;
  }

  // Marketing campaigns
  if (url.startsWith('/api/marketing/') && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        campaigns: [],
        total: 0,
      }),
    );
    return true;
  }

  // ===========================================
  // Auth endpoints (stub for completeness)
  // ===========================================

  // Auth health
  if (url === '/api/auth/health' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return true;
  }

  // Login
  if (url === '/api/auth/login' && method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        token: 'mock-jwt-token-' + Date.now(),
        user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      }),
    );
    return true;
  }

  // Logout
  if (url === '/api/auth/logout' && method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return true;
  }

  // Register
  if (url === '/api/auth/register' && method === 'POST') {
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        token: 'mock-jwt-token-' + Date.now(),
        user: { id: 'user-1', name: 'New User', email: 'new@example.com' },
      }),
    );
    return true;
  }

  return false; // No mock response for this URL
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  if (req.url.startsWith('/api')) {
    const proxy = http.request(
      {
        hostname: API_TARGET.replace('http://', '').split(':')[0],
        port: API_TARGET.split(':')[2] || 80,
        path: req.url,
        method: req.method,
        headers: req.headers,
      },
      (proxyRes) => {
        // If API returns success, use it
        if (proxyRes.statusCode >= 200 && proxyRes.statusCode < 300) {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        } else {
          // Try mock handler for non-success responses
          proxyRes.resume(); // Drain the response
          if (!mockApiHandler(req, res)) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                error: 'API error',
                statusCode: proxyRes.statusCode,
              }),
            );
          }
        }
      },
    );
    proxy.on('error', (err) => {
      console.error(`Proxy error for ${req.url}:`, err.message);
      // Try mock handler when proxy fails
      if (!mockApiHandler(req, res)) {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'API server not available' }));
        }
      }
    });
    req.pipe(proxy, { end: true });
  } else {
    // SPA routing support: serve index.html for non-API routes
    const pathname = getRequestPathname(req.url);
    if (!pathname) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad Request');
      return;
    }

    const isFileRequest = /\.[^/]+$/.test(pathname);
    let filePath;

    if (pathname === '/' || !isFileRequest) {
      // For root or routes without file extensions, serve index.html (SPA)
      filePath = path.join(STATIC_ROOT, 'index.html');
    } else {
      // For file requests (JS, CSS, images, etc.), serve the actual file
      filePath = resolveStaticPath(pathname);
      if (!filePath) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Server Error');
        }
      } else {
        // Add CORS headers for module scripts (needed for ES modules with crossorigin="anonymous")
        const headers = { 'Content-Type': contentType };
        if (ext === '.js' || ext === '.mjs') {
          headers['Access-Control-Allow-Origin'] = '*';
        }
        res.writeHead(200, headers);
        res.end(content);
      }
    });
  }
});

server.on('error', (err) => {
  console.error('Server error:', err.message);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Proxying /api/* to ${API_TARGET}`);
  console.log(`Static directory: ${STATIC_DIR}`);

  // Verify static directory exists
  if (!fs.existsSync(STATIC_DIR)) {
    console.error(`ERROR: Static directory ${STATIC_DIR} does not exist!`);
    console.error('Checking alternative paths...');

    // Try alternative paths for Angular 20+ builds
    const alternativePaths = [
      path.resolve(__dirname, '..', 'dist/apps/ai-recruitment-frontend'),
      path.resolve(
        __dirname,
        '..',
        'dist/apps/ai-recruitment-frontend/browser',
      ),
    ];

    for (const altPath of alternativePaths) {
      if (fs.existsSync(altPath)) {
        console.log(`Found alternative path: ${altPath}`);
        console.log('Contents:', fs.readdirSync(altPath).slice(0, 10));
      }
    }

    process.exit(1);
  }

  console.log('✅ Static directory verified');
  console.log('Contents:', fs.readdirSync(STATIC_DIR).slice(0, 10));
});
