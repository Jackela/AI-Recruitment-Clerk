export class NatsClient {
  async publish(_subject: string, _data: unknown): Promise<void> {
    // no-op stub for tests
  }
  async emit(_subject: string, _data: unknown): Promise<{ success: boolean }> {
    return Promise.resolve({ success: true });
  }
  async publishScoringCompleted(_payload: unknown): Promise<{ success: boolean }> {
    return Promise.resolve({ success: true });
  }
  async publishScoringError(_jobId: string, _resumeId: string, _error: unknown): Promise<{ success: boolean }> {
    return Promise.resolve({ success: true });
  }
  async request<T = unknown>(_subject: string, _data?: unknown): Promise<T> {
    return Promise.resolve(undefined as unknown as T);
  }
  subscribe(_subject: string, _handler: (msg: unknown) => void): { unsubscribe: () => void } {
    return { unsubscribe: () => void 0 };
  }
  close(): void {
    // no-op
  }
}
