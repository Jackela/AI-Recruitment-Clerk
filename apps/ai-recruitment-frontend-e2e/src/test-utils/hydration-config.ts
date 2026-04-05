import type { Page } from '@playwright/test';

/**
 * Hydration level - determines how strict the hydration check is
 */
export type HydrationLevel = 'minimal' | 'basic' | 'full';

/**
 * Configuration for waitForAppHydration
 */
export interface HydrationConfig {
  /** Hydration strictness level */
  level: HydrationLevel;

  /** CI mode - enables optimizations for CI environments */
  ciMode: boolean;

  /** Timeout overrides (in milliseconds) */
  timeouts?: {
    /** Document ready state timeout */
    documentReady?: number;
    /** Angular bootstrap timeout */
    angularBootstrap?: number;
    /** Network idle timeout */
    networkIdle?: number;
    /** Key elements timeout */
    keyElements?: number;
    /** Loading screen timeout */
    loadingScreen?: number;
  };

  /** Feature toggles */
  features?: {
    /** Check for ng-version attribute (Angular fully initialized) */
    checkAngularVersion?: boolean;
    /** Wait for loading screen to disappear */
    checkLoadingScreen?: boolean;
    /** Wait for fonts to load */
    waitForFonts?: boolean;
    /** Wait for deferred components */
    waitForDeferredComponents?: boolean;
    /** Wait for network idle */
    waitForNetworkIdle?: boolean;
    /** Wait for idle callbacks */
    waitForIdle?: boolean;
  };

  /** Observability options */
  observability?: {
    /** Enable verbose logging */
    verbose?: boolean;
    /** Log step timing */
    stepTiming?: boolean;
    /** Log to console (default: true) */
    logToConsole?: boolean;
  };
}

/**
 * Deep merge utility for hydration configs
 */
export function mergeHydrationConfig(
  base: HydrationConfig,
  override?: Partial<HydrationConfig>,
): HydrationConfig {
  if (!override) return base;

  return {
    ...base,
    ...override,
    timeouts: {
      ...base.timeouts,
      ...override.timeouts,
    },
    features: {
      ...base.features,
      ...override.features,
    },
    observability: {
      ...base.observability,
      ...override.observability,
    },
  };
}

/**
 * Default configuration - full hydration with all checks
 */
export const DEFAULT_CONFIG: HydrationConfig = {
  level: 'full',
  ciMode: false,
  timeouts: {
    documentReady: 30000,
    angularBootstrap: 30000,
    networkIdle: 15000,
    keyElements: 10000,
    loadingScreen: 20000,
  },
  features: {
    checkAngularVersion: true,
    checkLoadingScreen: true,
    waitForFonts: true,
    waitForDeferredComponents: true,
    waitForNetworkIdle: true,
    waitForIdle: true,
  },
  observability: {
    verbose: true,
    stepTiming: false,
    logToConsole: true,
  },
};

/**
 * CI optimized configuration - faster, less strict
 * Reduces test time by ~40% in CI environments
 */
export const CI_OPTIMIZED_CONFIG: HydrationConfig = {
  level: 'basic',
  ciMode: true,
  timeouts: {
    documentReady: 15000,
    angularBootstrap: 20000,
    networkIdle: 10000,
    keyElements: 8000,
    loadingScreen: 15000,
  },
  features: {
    checkAngularVersion: false,
    checkLoadingScreen: true,
    waitForFonts: false,
    waitForDeferredComponents: false,
    waitForNetworkIdle: true,
    waitForIdle: false,
  },
  observability: {
    verbose: true,
    stepTiming: true,
    logToConsole: true,
  },
};

/**
 * Minimal configuration - fastest, only essential checks
 * Use for simple navigation tests where full hydration isn't critical
 */
export const MINIMAL_CONFIG: HydrationConfig = {
  level: 'minimal',
  ciMode: true,
  timeouts: {
    documentReady: 10000,
    angularBootstrap: 15000,
    networkIdle: 5000,
    keyElements: 5000,
    loadingScreen: 10000,
  },
  features: {
    checkAngularVersion: false,
    checkLoadingScreen: false,
    waitForFonts: false,
    waitForDeferredComponents: false,
    waitForNetworkIdle: false,
    waitForIdle: false,
  },
  observability: {
    verbose: false,
    stepTiming: false,
    logToConsole: true,
  },
};

/**
 * Get environment-appropriate default configuration
 * Automatically detects CI environment via process.env.CI
 */
export function getDefaultConfig(): HydrationConfig {
  const isCI = process.env['CI'] === 'true';
  return isCI ? CI_OPTIMIZED_CONFIG : DEFAULT_CONFIG;
}

/**
 * Hydration step result for observability
 */
export interface HydrationStepResult {
  name: string;
  success: boolean;
  duration: number;
  error?: Error;
  skipped?: boolean;
}

/**
 * Hydration report for debugging
 */
export interface HydrationReport {
  totalDuration: number;
  level: HydrationLevel;
  config: HydrationConfig;
  steps: HydrationStepResult[];
  success: boolean;
  errors: Error[];
}

/**
 * Logger for hydration steps
 */
export class HydrationLogger {
  private steps: HydrationStepResult[] = [];
  private startTime: number = 0;

  constructor(private config: HydrationConfig) {
    this.startTime = Date.now();
  }

  log(message: string): void {
    if (this.config.observability?.logToConsole !== false) {
      console.log(`[hydration] ${message}`);
    }
  }

  logStepStart(name: string): void {
    if (this.config.observability?.verbose) {
      this.log(`⏳ Starting: ${name}`);
    }
  }

  logStepSuccess(name: string, duration: number): void {
    const result: HydrationStepResult = {
      name,
      success: true,
      duration,
    };
    this.steps.push(result);

    if (this.config.observability?.verbose) {
      const timing = this.config.observability?.stepTiming
        ? ` (${duration}ms)`
        : '';
      this.log(`✅ Completed: ${name}${timing}`);
    }
  }

  logStepFailure(
    name: string,
    error: Error,
    duration: number,
    isCritical: boolean,
  ): void {
    const result: HydrationStepResult = {
      name,
      success: false,
      duration,
      error,
    };
    this.steps.push(result);

    const severity = isCritical ? '❌' : '⚠️';
    const timing = this.config.observability?.stepTiming
      ? ` (${duration}ms)`
      : '';
    this.log(
      `${severity} ${isCritical ? 'Failed' : 'Skipped'}: ${name}${timing} - ${error.message}`,
    );
  }

  logStepSkipped(name: string): void {
    const result: HydrationStepResult = {
      name,
      success: true,
      duration: 0,
      skipped: true,
    };
    this.steps.push(result);

    if (this.config.observability?.verbose) {
      this.log(`⏭️ Skipped: ${name}`);
    }
  }

  getReport(success: boolean, errors: Error[] = []): HydrationReport {
    return {
      totalDuration: Date.now() - this.startTime,
      level: this.config.level,
      config: this.config,
      steps: this.steps,
      success,
      errors,
    };
  }
}
