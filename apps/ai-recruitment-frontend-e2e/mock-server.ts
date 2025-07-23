import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Mock data
const mockJobs = [
  {
    id: '1',
    title: '高级前端开发工程师',
    description: '负责前端架构设计和开发工作，要求熟悉React/Vue/Angular等主流框架',
    requirements: ['JavaScript', 'TypeScript', 'React', 'Vue'],
    status: 'active',
    createdAt: '2024-01-15T08:00:00Z'
  },
  {
    id: '2', 
    title: 'Java开发工程师',
    description: '负责后端服务开发，要求熟悉Spring框架和微服务架构',
    requirements: ['Java', 'Spring Boot', 'MySQL', 'Redis'],
    status: 'active',
    createdAt: '2024-01-16T09:00:00Z'
  }
];

const mockReports = [
  {
    id: '1',
    jobId: '1',
    candidateName: '张三',
    matchScore: 85,
    skills: ['JavaScript', 'React', 'TypeScript'],
    experience: '3年前端开发经验',
    createdAt: '2024-01-17T10:00:00Z'
  }
];

// Request handlers
export const handlers = [
  // Health check
  http.get('http://localhost:3000/api/health', () => {
    return HttpResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }),

  // Jobs endpoints
  http.get('http://localhost:3000/api/jobs', () => {
    return HttpResponse.json(mockJobs);
  }),

  http.get('http://localhost:3000/api/jobs/:id', ({ params }) => {
    const job = mockJobs.find(j => j.id === params.id);
    if (!job) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(job);
  }),

  http.post('http://localhost:3000/api/jobs', async ({ request }) => {
    const body = await request.json() as any;
    const newJob = {
      id: String(mockJobs.length + 1),
      title: body.title || '新岗位',
      description: body.description || '岗位描述',
      requirements: body.requirements || [],
      status: 'active',
      createdAt: new Date().toISOString()
    };
    mockJobs.push(newJob);
    return HttpResponse.json(newJob, { status: 201 });
  }),

  http.put('http://localhost:3000/api/jobs/:id', async ({ params, request }) => {
    const jobIndex = mockJobs.findIndex(j => j.id === params.id);
    if (jobIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    const body = await request.json() as any;
    mockJobs[jobIndex] = { ...mockJobs[jobIndex], ...body };
    return HttpResponse.json(mockJobs[jobIndex]);
  }),

  http.delete('http://localhost:3000/api/jobs/:id', ({ params }) => {
    const jobIndex = mockJobs.findIndex(j => j.id === params.id);
    if (jobIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    mockJobs.splice(jobIndex, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // Reports endpoints
  http.get('http://localhost:3000/api/reports', () => {
    return HttpResponse.json(mockReports);
  }),

  http.get('http://localhost:3000/api/reports/:id', ({ params }) => {
    const report = mockReports.find(r => r.id === params.id);
    if (!report) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(report);
  }),

  // File upload endpoint
  http.post('http://localhost:3000/api/upload/resume', () => {
    return HttpResponse.json({
      id: 'upload-' + Date.now(),
      filename: 'resume.pdf',
      status: 'uploaded',
      message: '简历上传成功'
    });
  }),

  // Error simulation endpoints
  http.get('http://localhost:3000/api/error/timeout', () => {
    return new HttpResponse(null, { status: 408 });
  }),

  http.get('http://localhost:3000/api/error/server', () => {
    return new HttpResponse(null, { status: 500 });
  }),

  // Catch-all for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`);
    return new HttpResponse(null, { status: 404 });
  })
];

// Create and configure the server
export const mockServer = setupServer(...handlers);

// Server control functions
export function startMockServer() {
  mockServer.listen({
    onUnhandledRequest: 'warn'
  });
  console.log('🚀 Mock API server started for E2E testing');
}

export function stopMockServer() {
  mockServer.close();
  console.log('🛑 Mock API server stopped');
}

export function resetMockServer() {
  mockServer.resetHandlers();
  // Reset mock data to initial state
  mockJobs.splice(0, mockJobs.length, 
    {
      id: '1',
      title: '高级前端开发工程师',
      description: '负责前端架构设计和开发工作，要求熟悉React/Vue/Angular等主流框架',
      requirements: ['JavaScript', 'TypeScript', 'React', 'Vue'],
      status: 'active',
      createdAt: '2024-01-15T08:00:00Z'
    },
    {
      id: '2', 
      title: 'Java开发工程师',
      description: '负责后端服务开发，要求熟悉Spring框架和微服务架构',
      requirements: ['Java', 'Spring Boot', 'MySQL', 'Redis'],
      status: 'active',
      createdAt: '2024-01-16T09:00:00Z'
    }
  );
  console.log('🔄 Mock data reset to initial state');
}