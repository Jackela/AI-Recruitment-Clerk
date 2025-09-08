export type NatsPublishResult = { success: boolean; messageId?: string; error?: string };

export class NatsClient {
  async publish(_subject: string, _payload: unknown): Promise<NatsPublishResult> {
    return { success: true };
  }
  async emit(_subject: string, _payload: unknown): Promise<NatsPublishResult> {
    return { success: true };
  }
}
