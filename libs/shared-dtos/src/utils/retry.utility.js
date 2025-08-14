"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = exports.RetryUtility = void 0;
exports.Retry = Retry;
exports.WithCircuitBreaker = WithCircuitBreaker;
const common_1 = require("@nestjs/common");
class RetryUtility {
    /**
     * Retry an operation with exponential backoff and jitter
     */
    static async withExponentialBackoff(operation, options = {}) {
        const config = {
            maxAttempts: 3,
            baseDelayMs: 1000,
            maxDelayMs: 30000,
            backoffMultiplier: 2,
            jitterMs: 1000,
            retryIf: (error) => this.isRetriableError(error),
            ...options
        };
        let lastError;
        for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
            try {
                this.logger.debug(`Attempting operation (attempt ${attempt}/${config.maxAttempts})`);
                return await operation();
            }
            catch (error) {
                lastError = error;
                // Don't retry on last attempt or if error is not retriable
                if (attempt === config.maxAttempts || !config.retryIf(error)) {
                    this.logger.error(`Operation failed after ${attempt} attempts: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
                    throw error;
                }
                // Calculate delay with exponential backoff and jitter
                const exponentialDelay = Math.min(config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1), config.maxDelayMs);
                const jitter = Math.random() * config.jitterMs;
                const totalDelay = exponentialDelay + jitter;
                this.logger.warn(`Operation failed (attempt ${attempt}), retrying in ${totalDelay.toFixed(0)}ms: ${error instanceof Error ? error.message : String(error)}`);
                await this.delay(totalDelay);
            }
        }
        throw lastError;
    }
    /**
     * Determines if an error is retriable based on common patterns
     */
    static isRetriableError(error) {
        // Network errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return true;
        }
        // HTTP errors that are typically retriable
        if (error.status && (error.status === 408 || // Request Timeout
            error.status === 429 || // Too Many Requests
            error.status === 502 || // Bad Gateway
            error.status === 503 || // Service Unavailable
            error.status === 504 // Gateway Timeout
        )) {
            return true;
        }
        // Database connection errors
        if (error.message && (error.message.includes('connection') ||
            error.message.includes('timeout') ||
            error.message.includes('ENOTFOUND'))) {
            return true;
        }
        // External API errors
        if (error.name === 'GoogleGenerativeAIError' && error.status >= 500) {
            return true;
        }
        return false;
    }
    /**
     * Simple delay utility
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.RetryUtility = RetryUtility;
RetryUtility.logger = new common_1.Logger(RetryUtility.name);
/**
 * Circuit Breaker implementation for preventing cascade failures
 */
class CircuitBreaker {
    constructor(name, options) {
        this.name = name;
        this.options = options;
        this.failures = 0;
        this.lastFailureTime = 0;
        this.state = 'CLOSED';
    }
    static getInstance(name, options) {
        if (!this.instances.has(name)) {
            this.instances.set(name, new CircuitBreaker(name, options));
        }
        return this.instances.get(name);
    }
    async execute(operation) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.options.recoveryTimeout) {
                this.state = 'HALF_OPEN';
                // Circuit breaker moving to HALF_OPEN state
            }
            else {
                throw new Error(`Circuit breaker ${this.name} is OPEN`);
            }
        }
        try {
            const result = await operation();
            if (this.state === 'HALF_OPEN') {
                this.reset();
                // Circuit breaker moving to CLOSED state
            }
            return result;
        }
        catch (error) {
            this.recordFailure();
            throw error;
        }
    }
    recordFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= this.options.failureThreshold) {
            this.state = 'OPEN';
            // Circuit breaker opened after failures
        }
    }
    reset() {
        this.failures = 0;
        this.state = 'CLOSED';
    }
    getState() {
        return this.state;
    }
    getFailures() {
        return this.failures;
    }
}
exports.CircuitBreaker = CircuitBreaker;
CircuitBreaker.logger = new common_1.Logger(CircuitBreaker.name);
CircuitBreaker.instances = new Map();
/**
 * Decorator for automatic retry with circuit breaker
 */
function Retry(options = {}) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            return RetryUtility.withExponentialBackoff(() => originalMethod.apply(this, args), options);
        };
        return descriptor;
    };
}
/**
 * Decorator for circuit breaker protection
 */
function WithCircuitBreaker(name, options = {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitoringPeriod: 60000
}) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        const circuitBreaker = CircuitBreaker.getInstance(`${target.constructor.name}.${propertyKey}.${name}`, options);
        descriptor.value = async function (...args) {
            return circuitBreaker.execute(() => originalMethod.apply(this, args));
        };
        return descriptor;
    };
}
