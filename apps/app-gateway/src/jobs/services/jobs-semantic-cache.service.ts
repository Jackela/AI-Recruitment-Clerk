import { Injectable, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { CacheService, SemanticCacheOptions } from '../../cache/cache.service';
import type { JobDocument } from '../../schemas/job.schema';
import type { UserDto } from '@ai-recruitment-clerk/user-management-domain';

type JobUpdateStatus =
  | 'processing'
  | 'completed'
  | 'failed'
  | 'active'
  | 'draft'
  | 'closed';

export interface SemanticJobCacheEntry {
  cacheKey: string;
  jobId: string;
  jobTitle: string;
  organizationId?: string;
  status: JobUpdateStatus;
  extractedKeywords: string[];
  jdExtractionConfidence: number;
  jdProcessedAt: string;
  source: 'semantic-cache';
  semanticSimilarity?: number;
  lastUsedAt?: string;
}

export interface SemanticCacheConfig {
  enabled: boolean;
  threshold: number;
  ttlMs: number;
  maxResults: number;
}

export interface JobReuseResult {
  reused: boolean;
  jobId?: string;
}

/**
 * Service for managing semantic cache operations for jobs.
 * Handles cache lookup, reuse validation, and registration of cache entries.
 */
@Injectable()
export class JobsSemanticCacheService {
  private readonly logger = new Logger(JobsSemanticCacheService.name);
  private readonly config: SemanticCacheConfig;

  constructor(
    private readonly cacheService: CacheService,
    configService: ConfigService,
  ) {
    this.config = {
      enabled:
        (configService.get<string>('SEMANTIC_CACHE_ENABLED') ?? 'true') !==
        'false',
      threshold: this.normalizeThreshold(
        configService.get<string | number>(
          'SEMANTIC_CACHE_SIMILARITY_THRESHOLD',
        ),
      ),
      ttlMs: this.normalizePositiveNumber(
        configService.get<string | number>('SEMANTIC_CACHE_TTL_MS'),
        1000 * 60 * 60 * 24,
      ),
      maxResults: Math.max(
        1,
        Math.floor(
          this.normalizePositiveNumber(
            configService.get<string | number>('SEMANTIC_CACHE_MAX_RESULTS'),
            5,
          ),
        ),
      ),
    };
  }

  /**
   * Checks if semantic cache is enabled.
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Attempts to create a job using cached semantic analysis.
   * @param jdText - The job description text
   * @param user - The user creating the job
   * @returns The cache entry if found and valid, null otherwise
   */
  public async tryGetSemanticCache(
    jdText: string,
    user: UserDto,
  ): Promise<SemanticJobCacheEntry | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const cacheEntry =
        await this.cacheService.wrapSemantic<SemanticJobCacheEntry | null>(
          jdText,
          async () => null,
          this.buildSemanticCacheOptions(),
        );

      if (cacheEntry && this.canReuseSemanticEntry(cacheEntry, user)) {
        return cacheEntry;
      }

      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Semantic cache lookup failed for JD reuse (fallback to pipeline): ${message}`,
      );
      return null;
    }
  }

  /**
   * Checks if a semantic cache entry can be reused.
   */
  public canReuseSemanticEntry(
    entry: SemanticJobCacheEntry,
    user: UserDto,
  ): boolean {
    if (!entry || entry.status !== 'completed') {
      return false;
    }

    if (
      !Array.isArray(entry.extractedKeywords) ||
      entry.extractedKeywords.length === 0
    ) {
      return false;
    }

    if (
      entry.organizationId &&
      user.organizationId &&
      entry.organizationId !== user.organizationId
    ) {
      this.logger.debug(
        `Semantic cache entry ${entry.jobId} belongs to organization ${entry.organizationId}, skipping reuse for ${user.organizationId}`,
      );
      return false;
    }

    return true;
  }

  /**
   * Refreshes a semantic cache entry's lastUsedAt timestamp.
   */
  public async refreshSemanticCacheEntry(
    entry: SemanticJobCacheEntry,
  ): Promise<void> {
    if (!entry.cacheKey) {
      return;
    }
    const payload = {
      ...entry,
      lastUsedAt: new Date().toISOString(),
    };
    try {
      await this.cacheService.set(entry.cacheKey, payload, {
        ttl: this.config.ttlMs,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to refresh semantic cache entry ${entry.cacheKey}: ${message}`,
      );
    }
  }

  /**
   * Registers a new semantic cache entry for a completed job analysis.
   */
  public async registerSemanticCacheEntry(
    job: JobDocument,
    extractedKeywords: string[],
    confidence: number,
  ): Promise<void> {
    if (
      !this.config.enabled ||
      !job ||
      typeof job.description !== 'string'
    ) {
      return;
    }

    const jobId = this.getJobId(job);
    if (!jobId) {
      return;
    }

    const cacheKey = this.cacheService.generateKey('semantic', 'job', jobId);
    const payload: SemanticJobCacheEntry = {
      cacheKey,
      jobId,
      jobTitle: job.title,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      organizationId: (job as any).organizationId,
      status: 'completed',
      extractedKeywords,
      jdExtractionConfidence: confidence,
      jdProcessedAt: new Date().toISOString(),
      source: 'semantic-cache',
    };

    try {
      await this.cacheService.wrapSemantic<SemanticJobCacheEntry>(
        job.description,
        async () => payload,
        this.buildSemanticCacheOptions({
          cacheKey,
          forceRefresh: true,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to register semantic cache entry for job ${jobId}: ${message}`,
      );
    }
  }

  /**
   * Gets the job ID from a job document.
   */
  public getJobId(job: JobDocument | null | undefined): string {
    if (!job) {
      return '';
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawId = (job as any)._id ?? (job as any).id;
    if (rawId && typeof rawId === 'object' && typeof rawId.toString === 'function') {
      return rawId.toString();
    }
    return typeof rawId === 'string' ? rawId : '';
  }

  /**
   * Builds semantic cache options with optional overrides.
   */
  public buildSemanticCacheOptions(
    overrides: Partial<SemanticCacheOptions> = {},
  ): SemanticCacheOptions {
    return {
      ttl: this.config.ttlMs,
      similarityThreshold: this.config.threshold,
      maxResults: this.config.maxResults,
      ...overrides,
    };
  }

  private normalizeThreshold(value: string | number | undefined): number {
    const numeric = this.normalizePositiveNumber(value, 0.92);
    return Math.min(Math.max(numeric, 0), 1);
  }

  private normalizePositiveNumber(
    value: string | number | undefined,
    fallback: number,
  ): number {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return fallback;
  }
}
