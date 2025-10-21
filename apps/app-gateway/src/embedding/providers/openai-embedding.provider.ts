import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { IEmbeddingProvider } from '../interfaces/embedding-provider.interface';

/**
 * Provider that delegates embedding generation to an external API (OpenAI by default).
 */
@Injectable()
export class OpenAIEmbeddingProvider implements IEmbeddingProvider {
  private readonly logger = new Logger(OpenAIEmbeddingProvider.name);
  private readonly apiUrl: string;
  private readonly model: string;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl =
      this.configService.get<string>('OPENAI_EMBEDDING_API_URL') ??
      'https://api.openai.com/v1/embeddings';
    this.model =
      this.configService.get<string>('OPENAI_EMBEDDING_MODEL') ??
      'text-embedding-3-small';
    this.maxRetries = Number(
      this.configService.get<number>('OPENAI_EMBEDDING_MAX_RETRIES') ?? 3,
    );
    this.retryDelayMs = Number(
      this.configService.get<number>('OPENAI_EMBEDDING_RETRY_DELAY_MS') ?? 250,
    );
  }

  /**
   * Generates an embedding for the provided text.
   * @param text - The text to embed.
   */
  async createEmbedding(text: string): Promise<number[]> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      this.logger.error(
        'OPENAI_API_KEY is not configured — cannot generate embeddings.',
      );
      throw new Error('Embedding provider misconfiguration');
    }

    const payload = { input: text, model: this.model };
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };

    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.post(this.apiUrl, payload, { headers }),
        );

        const embedding = response?.data?.data?.[0]?.embedding;

        if (!Array.isArray(embedding)) {
          throw new Error('Embedding response missing data array.');
        }

        return embedding;
      } catch (error) {
        lastError = error;

        const message = this.describeError(error);
        this.logger.warn(
          `Embedding request attempt ${attempt}/${this.maxRetries} failed: ${message}`,
        );

        if (attempt === this.maxRetries) {
          break;
        }

        await this.delay(this.retryDelayMs * attempt);
      }
    }

    const failureReason = lastError instanceof Error ? lastError.message : '';
    throw new Error(
      `Failed to create embedding after ${this.maxRetries} attempts. ${failureReason}`,
    );
  }

  private describeError(error: unknown): string {
    if ((error as AxiosError)?.isAxiosError) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const statusText = axiosError.response?.statusText;
      const responseData = axiosError.response?.data;
      return `status=${status} ${statusText ?? ''} message=${
        axiosError.message
      } response=${JSON.stringify(responseData)}`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
