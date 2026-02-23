// Infrastructure Shared Base Interfaces

/**
 * Defines the shape of the base entity.
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Defines the shape of the pagination options.
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Defines the shape of the pagination result.
 */
export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Defines the shape of the exception filter config.
 */
export interface ExceptionFilterConfig {
  enableCorrelation?: boolean;
  enableLogging?: boolean;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  serviceName?: string;
}

/**
 * Defines the shape of the execution host.
 */
export interface ExecutionHost {
  switchToHttp(): Record<string, unknown>;
  getArgs(): unknown[];
}
