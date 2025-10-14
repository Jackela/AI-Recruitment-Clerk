/**
 * Represents the nats client.
 */
export class NatsClient {
  /**
   * Performs the publish operation.
   * @param _subject - The subject.
   * @param _data - The data.
   * @returns A promise that resolves when the operation completes.
   */
  async publish(_subject: string, _data: unknown): Promise<void> {
    // no-op stub for tests
  }
  /**
   * Performs the emit operation.
   * @param _subject - The subject.
   * @param _data - The data.
   * @returns A promise that resolves to { success: boolean }.
   */
  async emit(_subject: string, _data: unknown): Promise<{ success: boolean }> {
    return Promise.resolve({ success: true });
  }
  /**
   * Performs the publish scoring completed operation.
   * @param _payload - The payload.
   * @returns A promise that resolves to { success: boolean }.
   */
  async publishScoringCompleted(
    _payload: unknown,
  ): Promise<{ success: boolean }> {
    return Promise.resolve({ success: true });
  }
  /**
   * Performs the publish scoring error operation.
   * @param _jobId - The job id.
   * @param _resumeId - The resume id.
   * @param _error - The error.
   * @returns A promise that resolves to { success: boolean }.
   */
  async publishScoringError(
    _jobId: string,
    _resumeId: string,
    _error: unknown,
  ): Promise<{ success: boolean }> {
    return Promise.resolve({ success: true });
  }
  /**
   * Performs the request operation.
   * @param _subject - The subject.
   * @param _data - The data.
   * @returns A promise that resolves to T.
   */
  async request<T = unknown>(_subject: string, _data?: unknown): Promise<T> {
    return Promise.resolve(undefined as unknown as T);
  }
  /**
   * Performs the subscribe operation.
   * @param _subject - The subject.
   * @param _handler - The handler.
   * @returns The { unsubscribe: () => void }.
   */
  subscribe(
    _subject: string,
    _handler: (msg: unknown) => void,
  ): { unsubscribe: () => void } {
    return { unsubscribe: () => void 0 };
  }
  /**
   * Performs the close operation.
   */
  close(): void {
    // no-op
  }
}
