/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * API Mock Responses
 */

export interface MockJobResponse {
  jobId: string;
  message: string;
}

export interface MockJob {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  resumeCount: number;
}

export const MOCK_JOB_RESPONSE: MockJobResponse = {
  jobId: 'test-job-123',
  message: 'Job received and is being processed.',
};

export const MOCK_JOBS_LIST: MockJob[] = [
  {
    id: 'test-job-123',
    title: '高级前端工程师',
    status: 'completed',
    createdAt: new Date().toISOString(),
    resumeCount: 0,
  },
  {
    id: 'test-job-456',
    title: '后端开发工程师',
    status: 'active',
    createdAt: new Date().toISOString(),
    resumeCount: 5,
  },
];

/**
 * API Mock Handlers
 */

export function createJobMockHandler(status = 202) {
  return async (route: {
    fulfill: (options: {
      status: number;
      contentType: string;
      body: string;
    }) => Promise<void>;
  }) => {
    console.log('📡 API Call intercepted: POST /jobs');
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_JOB_RESPONSE),
    });
  };
}

export function getJobsMockHandler() {
  return async (route: {
    fulfill: (options: {
      status: number;
      contentType: string;
      body: string;
    }) => Promise<void>;
  }) => {
    console.log('📡 API Call intercepted: GET /jobs');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_JOBS_LIST),
    });
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function setupJobsApiMocking(page: {
  route: (
    pattern: string,
    handler: (route: any) => Promise<void>,
  ) => Promise<void>;
}): Promise<void> {
  return page.route('**/jobs', async (route: any) => {
    const method = route.request().method();

    if (method === 'POST') {
      await createJobMockHandler()(route);
    } else if (method === 'GET') {
      await getJobsMockHandler()(route);
    } else {
      await route.continue();
    }
  });
}
