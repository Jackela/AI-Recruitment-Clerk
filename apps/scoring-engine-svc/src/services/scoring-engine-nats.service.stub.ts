/**
 * Provides scoring engine nats functionality.
 */
export class ScoringEngineNatsService {
  /**
   * Performs the emit operation.
   * @param _subject - The subject.
   * @param _payload - The payload.
   * @returns A promise that resolves to { success: boolean }.
   */
  public async emit(
    _subject: string,
    _payload: unknown,
  ): Promise<{ success: boolean }> {
    return { success: true };
  }
  /**
   * Performs the publish scoring completed operation.
   * @param _payload - The payload.
   * @returns A promise that resolves to { success: boolean }.
   */
  public async publishScoringCompleted(
    _payload: unknown,
  ): Promise<{ success: boolean }> {
    return { success: true };
  }
  /**
   * Performs the publish scoring error operation.
   * @param _jobId - The job id.
   * @param _resumeId - The resume id.
   * @param _error - The error.
   * @returns A promise that resolves to { success: boolean }.
   */
  public async publishScoringError(
    _jobId: string,
    _resumeId: string,
    _error: unknown,
  ): Promise<{ success: boolean }> {
    return { success: true };
  }
}
