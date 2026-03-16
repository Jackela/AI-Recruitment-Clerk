import type { APIRequestContext } from '@playwright/test';
import { request } from '@playwright/test';
import { getTestEnvironment } from './environment';

export interface CleanupResult {
  usersDeleted: number;
  jobsDeleted: number;
  resumesDeleted: number;
  errors: string[];
}

export async function cleanupTestData(): Promise<CleanupResult> {
  const result: CleanupResult = {
    usersDeleted: 0,
    jobsDeleted: 0,
    resumesDeleted: 0,
    errors: [],
  };

  const env = getTestEnvironment();
  let apiContext: APIRequestContext | null = null;

  try {
    apiContext = await request.newContext({
      baseURL: env.apiUrl,
    });

    await Promise.all([
      cleanupTestUsers(apiContext, result),
      cleanupTestJobs(apiContext, result),
      cleanupTestResumes(apiContext, result),
    ]);
  } catch (error) {
    result.errors.push(
      `Cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    if (apiContext) {
      await apiContext.dispose();
    }
  }

  return result;
}

async function cleanupTestUsers(
  apiContext: APIRequestContext,
  result: CleanupResult,
): Promise<void> {
  try {
    const response = await apiContext.delete('/api/test/cleanup/users', {
      data: {
        pattern: '*@test.com',
        exclude: ['admin@test.com', 'hr@test.com'],
      },
    });

    if (response.ok()) {
      const data = await response.json();
      result.usersDeleted = data.deleted || 0;
    } else {
      result.errors.push(`Failed to cleanup users: ${response.status()}`);
    }
  } catch (error) {
    result.errors.push(
      `Error cleaning users: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function cleanupTestJobs(
  apiContext: APIRequestContext,
  result: CleanupResult,
): Promise<void> {
  try {
    const response = await apiContext.delete('/api/test/cleanup/jobs', {
      data: {
        prefix: '[TEST]',
      },
    });

    if (response.ok()) {
      const data = await response.json();
      result.jobsDeleted = data.deleted || 0;
    } else {
      result.errors.push(`Failed to cleanup jobs: ${response.status()}`);
    }
  } catch (error) {
    result.errors.push(
      `Error cleaning jobs: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function cleanupTestResumes(
  apiContext: APIRequestContext,
  result: CleanupResult,
): Promise<void> {
  try {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

    const response = await apiContext.delete('/api/test/cleanup/resumes', {
      data: {
        uploadedBefore: twentyFourHoursAgo,
        pattern: 'test-*-resume.pdf',
      },
    });

    if (response.ok()) {
      const data = await response.json();
      result.resumesDeleted = data.deleted || 0;
    } else {
      result.errors.push(`Failed to cleanup resumes: ${response.status()}`);
    }
  } catch (error) {
    result.errors.push(
      `Error cleaning resumes: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function cleanupByTestId(testId: string): Promise<void> {
  const env = getTestEnvironment();
  const apiContext = await request.newContext({
    baseURL: env.apiUrl,
  });

  try {
    await apiContext.post('/api/test/cleanup/by-test-id', {
      data: { testId },
    });
  } finally {
    await apiContext.dispose();
  }
}

export async function cleanupOlderThan(hours: number): Promise<CleanupResult> {
  const result: CleanupResult = {
    usersDeleted: 0,
    jobsDeleted: 0,
    resumesDeleted: 0,
    errors: [],
  };

  const env = getTestEnvironment();
  const apiContext = await request.newContext({
    baseURL: env.apiUrl,
  });

  try {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;

    const [usersRes, jobsRes, resumesRes] = await Promise.all([
      apiContext.delete('/api/test/cleanup/users', {
        data: { createdBefore: cutoffTime },
      }),
      apiContext.delete('/api/test/cleanup/jobs', {
        data: { createdBefore: cutoffTime },
      }),
      apiContext.delete('/api/test/cleanup/resumes', {
        data: { uploadedBefore: cutoffTime },
      }),
    ]);

    if (usersRes.ok()) {
      const data = await usersRes.json();
      result.usersDeleted = data.deleted || 0;
    }
    if (jobsRes.ok()) {
      const data = await jobsRes.json();
      result.jobsDeleted = data.deleted || 0;
    }
    if (resumesRes.ok()) {
      const data = await resumesRes.json();
      result.resumesDeleted = data.deleted || 0;
    }
  } catch (error) {
    result.errors.push(
      `Batch cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    await apiContext.dispose();
  }

  return result;
}
