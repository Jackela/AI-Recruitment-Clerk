/**
 * Contract for embedding providers capable of turning text into semantic vectors.
 */
export interface IEmbeddingProvider {
  /**
   * Generates a semantic embedding vector for the supplied text.
   * @param text - The text to embed.
   * @returns Promise resolving to an array of numbers representing the embedding.
   */
  createEmbedding(text: string): Promise<number[]>;
}

/**
 * Injection token used to resolve an embedding provider implementation.
 */
export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');
