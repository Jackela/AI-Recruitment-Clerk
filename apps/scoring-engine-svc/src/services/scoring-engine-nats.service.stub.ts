export class ScoringEngineNatsService {
  async emit(_subject: string, _payload: unknown): Promise<{ success: boolean }> {
    return { success: true };
  }
  async publishScoringCompleted(_payload: unknown): Promise<{ success: boolean }> {
    return { success: true };
  }
  async publishScoringError(_jobId: string, _resumeId: string, _error: unknown): Promise<{ success: boolean }> {
    return { success: true };
  }
}

