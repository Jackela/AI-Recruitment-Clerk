import { Inject, Injectable, Logger } from '@nestjs/common';
import { EMBEDDING_PROVIDER } from './interfaces/embedding-provider.interface';
import type { IEmbeddingProvider } from './interfaces/embedding-provider.interface';

/**
 * Application-level facade around the configured embedding provider.
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(
    @Inject(EMBEDDING_PROVIDER)
    private readonly embeddingProvider: IEmbeddingProvider,
  ) {}

  /**
   * Delegates embedding generation to the configured provider with basic logging.
   * @param text - Arbitrary text content.
   */
  async createEmbedding(text: string): Promise<number[]> {
    this.logger.debug('Generating embedding for text payload.');
    return this.embeddingProvider.createEmbedding(text);
  }
}
