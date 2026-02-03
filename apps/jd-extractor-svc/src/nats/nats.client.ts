/* eslint-disable @typescript-eslint/no-explicit-any */
export type NatsPublishResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

/**
 * Represents the nats client.
 */
export class NatsClient {
  /**
   * Performs the publish operation.
   * @param _subject - The subject.
   * @param _payload - The payload.
   * @returns A promise that resolves to NatsPublishResult.
   */
  public async publish(
    _subject: string,
    _payload: unknown,
  ): Promise<NatsPublishResult> {
    return { success: true };
  }
  /**
   * Performs the emit operation.
   * @param _subject - The subject.
   * @param _payload - The payload.
   * @returns A promise that resolves to NatsPublishResult.
   */
  public async emit(_subject: string, _payload: unknown): Promise<NatsPublishResult> {
    return { success: true };
  }
  /**
   * Performs the publish processing error operation.
   * @param _jobId - The job id.
   * @param _error - The error.
   * @returns A promise that resolves to NatsPublishResult.
   */
  public async publishProcessingError(
    _jobId: string,
    _error: Error,
  ): Promise<NatsPublishResult> {
    return { success: true };
  }
  /**
   * Performs the publish analysis extracted operation.
   * @param _event - The event.
   * @returns A promise that resolves to NatsPublishResult.
   */
  public async publishAnalysisExtracted(_event: any): Promise<NatsPublishResult> {
    return { success: true };
  }
}
