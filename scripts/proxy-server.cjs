const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4200;
const API_TARGET = process.env.API_TARGET || 'http://localhost:3000';

// Support both Angular 20+ (direct output) and legacy (browser subdirectory) structures
const STATIC_DIR =
  process.env.STATIC_DIR ||
  path.resolve(__dirname, '..', 'dist/apps/ai-recruitment-frontend/browser');

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
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      },
    );
    proxy.on('error', (err) => {
      console.error(`Proxy error for ${req.url}:`, err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway: API server not available');
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
