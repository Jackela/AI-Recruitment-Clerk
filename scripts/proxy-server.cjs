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

// Mock API responses for when real API is unavailable
const mockApiHandler = (req, res) => {
  const url = req.url;

  // Health check
  if (url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
    );
    return true;
  }

  // Guest statistics
  if (url === '/api/guest/stats') {
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

  // Jobs list
  if (url === '/api/jobs' && req.method === 'GET') {
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

  // Job by ID
  const jobMatch = url.match(/^\/api\/jobs\/(\w+)$/);
  if (jobMatch && req.method === 'GET') {
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

  // Gap analysis
  if (url === '/api/scoring/gap-analysis' && req.method === 'POST') {
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
  if (url === '/api/scoring/gap-analysis-file' && req.method === 'POST') {
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

  // Resume upload
  if (url === '/api/upload/resume' && req.method === 'POST') {
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

  // Reports
  if (url === '/api/reports' && req.method === 'GET') {
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
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(STATIC_DIR, filePath);

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
        res.writeHead(200, { 'Content-Type': contentType });
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
