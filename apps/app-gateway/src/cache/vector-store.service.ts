import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisConnectionService } from './redis-connection.service';
import { SchemaFieldTypes, VectorAlgorithms } from 'redis';

type VectorSearchResult = { cacheKey: string; similarity: number };

/**
 * Encapsulates Redis vector operations backed by RediSearch.
 */
@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);
  private readonly indexName: string;
  private readonly keyPrefix: string;
  private readonly vectorField: string;
  private readonly distanceMetric: string;
  private readonly vectorDimensions: number;
  private indexEnsured = false;

  constructor(
    private readonly redisConnectionService: RedisConnectionService,
    private readonly configService: ConfigService,
  ) {
    this.indexName =
      this.configService.get<string>('SEMANTIC_CACHE_INDEX_NAME') ??
      'idx:semantic_cache';
    this.keyPrefix =
      this.configService.get<string>('SEMANTIC_CACHE_KEY_PREFIX') ??
      'semantic:cache:';
    this.vectorField =
      this.configService.get<string>('SEMANTIC_CACHE_VECTOR_FIELD') ??
      'embedding';
    this.distanceMetric =
      this.configService.get<string>('SEMANTIC_CACHE_DISTANCE_METRIC') ??
      'COSINE';
    this.vectorDimensions = Number.parseInt(
      this.configService.get<string>('SEMANTIC_CACHE_VECTOR_DIMS') ?? '1536',
      10,
    );
  }

  /**
   * Ensures the RediSearch vector index exists.
   */
  async createIndex(): Promise<void> {
    const client = await this.getClient();
    if (!client) {
      this.logger.warn(
        'Redis client unavailable — skipping vector index creation.',
      );
      return;
    }

    if (this.indexEnsured) {
      return;
    }

    try {
      await client.ft.info(this.indexName);
      this.indexEnsured = true;
      return;
    } catch (error) {
      const message =
        error instanceof Error ? error.message.toLowerCase() : '';
      if (!message.includes('unknown index name')) {
        this.logger.warn(
          `Failed to read vector index info, attempting to recreate: ${message}`,
        );
      }
    }

    try {
      await client.ft.create(
        this.indexName,
        {
          cacheKey: {
            type: SchemaFieldTypes.TAG,
          },
          [this.vectorField]: {
            type: SchemaFieldTypes.VECTOR,
            ALGORITHM: VectorAlgorithms.HNSW,
            TYPE: 'FLOAT32',
            DIM: this.vectorDimensions,
            DISTANCE_METRIC: this.distanceMetric,
            INITIAL_CAP: 1000,
          } as any,
        },
        {
          ON: 'HASH',
          PREFIX: [this.keyPrefix],
        } as any,
      );
      this.indexEnsured = true;
      this.logger.log(`Redis vector index ${this.indexName} created.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Index already exists')) {
        this.indexEnsured = true;
        this.logger.debug(`Vector index ${this.indexName} already exists.`);
        return;
      }
      this.logger.error(
        `Failed to create vector index ${this.indexName}: ${message}`,
      );
      throw error;
    }
  }

  /**
   * Adds or replaces a vector entry associated with a cache key.
   */
  async addVector(key: string, vector: number[]): Promise<void> {
    const client = await this.getClient();
    if (!client) {
      this.logger.warn('Redis client unavailable — skipping vector upsert.');
      return;
    }

    try {
      await this.createIndex();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Unable to ensure vector index before upsert: ${message}`);
      return;
    }
    const redisKey = `${this.keyPrefix}${key}`;
    const vectorBuffer = this.vectorToBuffer(vector);

    await client.hSet(redisKey, {
      cacheKey: key,
      [this.vectorField]: vectorBuffer,
      updatedAt: Date.now().toString(),
    });
  }

  /**
   * Finds similar cache keys given a query vector and similarity threshold.
   * @param vector - Query vector.
   * @param threshold - Minimum similarity (0-1) to consider a match.
   * @param count - Maximum number of results to return.
   */
  async findSimilar(
    vector: number[],
    threshold: number,
    count: number,
  ): Promise<VectorSearchResult[]> {
    const client = await this.getClient();
    if (!client) {
      this.logger.warn('Redis client unavailable — skipping vector search.');
      return [];
    }

    try {
      await this.createIndex();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Unable to ensure vector index before search: ${message}`);
      return [];
    }
    const vectorBlob = this.vectorToBuffer(vector);

    const knnQuery = `*=>[KNN ${Math.max(count, 1)} @${this.vectorField} $vector_param AS vector_score]`;
    const args: (string | number | Buffer)[] = [
      'FT.SEARCH',
      this.indexName,
      knnQuery,
      'PARAMS',
      '2',
      'vector_param',
      vectorBlob,
      'RETURN',
      '2',
      'cacheKey',
      'vector_score',
      'SORTBY',
      'vector_score',
      'DIALECT',
      '2',
    ];

    try {
      const rawResult = await client.sendCommand(args);
      return this.parseVectorSearch(rawResult, threshold);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Vector similarity search failed: ${message}`);
      return [];
    }
  }

  private async getClient(): Promise<any | null> {
    const client = this.redisConnectionService.getRedisClient();
    return client ?? null;
  }

  private parseVectorSearch(
    rawResult: unknown,
    threshold: number,
  ): VectorSearchResult[] {
    if (!Array.isArray(rawResult) || rawResult.length <= 1) {
      return [];
    }

    const matches: VectorSearchResult[] = [];

    for (let i = 1; i < rawResult.length; i += 2) {
      const entryKey = this.asString(rawResult[i]);
      const rawFields = rawResult[i + 1];
      if (!Array.isArray(rawFields)) {
        continue;
      }
      const fieldMap = this.arrayToObject(rawFields);
      const cacheKey =
        fieldMap.cacheKey ?? this.stripPrefix(entryKey ?? '', this.keyPrefix);

      const scoreValue = fieldMap.vector_score ?? '1';
      const distance = Number.parseFloat(scoreValue);
      if (!Number.isFinite(distance)) {
        continue;
      }

      const similarity = this.distanceToSimilarity(distance);
      if (similarity >= threshold && cacheKey) {
        matches.push({ cacheKey, similarity });
      }
    }

    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  private vectorToBuffer(vector: number[]): Buffer {
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error('Vector payload must be a non-empty array.');
    }
    const buffer = Buffer.allocUnsafe(vector.length * 4);
    vector.forEach((value, index) => {
      const v = Number(value);
      buffer.writeFloatLE(Number.isFinite(v) ? v : 0, index * 4);
    });
    return buffer;
  }

  private arrayToObject(fields: unknown[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      const key = this.asString(fields[i]);
      const value = this.asString(fields[i + 1]);
      if (key) {
        result[key] = value ?? '';
      }
    }
    return result;
  }

  private asString(value: unknown): string {
    if (value === undefined || value === null) {
      return '';
    }
    if (Buffer.isBuffer(value)) {
      return value.toString('utf8');
    }
    return String(value);
  }

  private stripPrefix(value: string, prefix: string): string {
    return value.startsWith(prefix) ? value.slice(prefix.length) : value;
  }

  private distanceToSimilarity(distance: number): number {
    // COSINE distance is 0.0 (identical) to 2.0 (opposite).
    const similarity = 1 - distance;
    return Math.max(-1, Math.min(1, similarity));
  }
}
