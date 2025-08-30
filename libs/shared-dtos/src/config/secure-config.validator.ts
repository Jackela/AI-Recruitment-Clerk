import { Logger } from '@nestjs/common';

export interface SecurityValidationResult {
  isValid: boolean;
  missingVariables: string[];
  errors: string[];
}

export class SecureConfigValidator {
  private static readonly logger = new Logger(SecureConfigValidator.name);
  
  /**
   * Validates required environment variables with fail-fast behavior
   * Prevents service startup if any critical configuration is missing
   */
  static validateRequiredEnvironment(requiredVars: string[]): SecurityValidationResult {
    const missing: string[] = [];
    const errors: string[] = [];
    
    // Check each required variable
    for (const varName of requiredVars) {
      const value = process.env[varName];
      
      if (!value || value.trim() === '') {
        missing.push(varName);
        errors.push(`Missing required environment variable: ${varName}`);
      }
      
      // Security check: Reject insecure fallback values
      if (value && this.isInsecureFallbackValue(value)) {
        errors.push(`Insecure fallback detected for ${varName}. Use proper environment variable.`);
      }
    }
    
    // Log validation results
    if (errors.length > 0) {
      this.logger.error('❌ Security validation failed:');
      errors.forEach(error => this.logger.error(`   • ${error}`));
      this.logger.error('🔒 Service startup blocked for security reasons');
    } else {
      this.logger.log('✅ All required environment variables validated successfully');
    }
    
    return {
      isValid: errors.length === 0,
      missingVariables: missing,
      errors
    };
  }
  
  /**
   * Validates and returns a required environment variable
   * Throws error immediately if not found or insecure
   */
  static requireEnv(varName: string): string {
    const value = process.env[varName];
    
    if (!value || value.trim() === '') {
      const error = `🔒 SECURITY: Required environment variable '${varName}' is not set`;
      this.logger.error(error);
      throw new Error(error);
    }
    
    if (this.isInsecureFallbackValue(value)) {
      const error = `🔒 SECURITY: Environment variable '${varName}' contains insecure fallback value`;
      this.logger.error(error);
      throw new Error(error);
    }
    
    return value;
  }
  
  /**
   * Validates configuration for a specific service with detailed logging
   */
  static validateServiceConfig(serviceName: string, requiredVars: string[]): void {
    this.logger.log(`🔍 Validating configuration for ${serviceName}...`);
    
    const result = this.validateRequiredEnvironment(requiredVars);
    
    if (!result.isValid) {
      const errorMsg = `🚨 ${serviceName} configuration validation failed. Service cannot start securely.`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    this.logger.log(`🛡️  ${serviceName} configuration validated successfully`);
  }
  
  /**
   * Detects insecure fallback values that should never be used in production
   */
  static isInsecureFallbackValue(value: string): boolean {
    const insecurePatterns = [
      'your_',
      '_api_key_here',
      'fallback-',
      'change-in-production',
      'test-',
      'demo-',
      'example-',
      'placeholder'
    ];
    
    const lowerValue = value.toLowerCase();
    return insecurePatterns.some(pattern => lowerValue.includes(pattern));
  }
  
  /**
   * Production readiness check - validates all critical security configurations
   */
  static validateProductionReadiness(): SecurityValidationResult {
    const isProduction = process.env.NODE_ENV === 'production';
    const errors: string[] = [];
    
    if (isProduction) {
      // In production, all services must have proper API keys
      const criticalVars = ['GEMINI_API_KEY', 'MONGO_URL', 'JWT_SECRET'];
      
      for (const varName of criticalVars) {
        const value = process.env[varName];
        if (!value) {
          errors.push(`Production environment missing critical variable: ${varName}`);
        } else if (this.isInsecureFallbackValue(value)) {
          errors.push(`Production environment has insecure value for: ${varName}`);
        }
      }
      
      if (errors.length > 0) {
        this.logger.error('🚨 PRODUCTION SECURITY FAILURE - Service startup blocked');
        errors.forEach(error => this.logger.error(`   • ${error}`));
      }
    }
    
    return {
      isValid: errors.length === 0,
      missingVariables: [],
      errors
    };
  }
}

/**
 * Decorator for secure environment variable injection
 */
export function RequireEnv(varName: string) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    // This would be implemented with a proper DI container in a full solution
    // For now, services should use SecureConfigValidator.requireEnv() directly
  };
}