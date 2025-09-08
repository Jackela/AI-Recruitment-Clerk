export class NatsClient {
  async publish(_subject: string, _data: unknown): Promise<void> {
    // no-op stub for tests
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

