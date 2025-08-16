/**
 * @file Production Security Validator
 * @description Validates security configuration at application startup
 * Critical security check to prevent weak credentials in production
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface SecurityValidationResult {
  isValid: boolean;
  issues: string[];
  score: number; // 0-100 security score
}

@Injectable()
export class ProductionSecurityValidator {
  private readonly logger = new Logger(ProductionSecurityValidator.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Validates all security-critical configuration
   * Exits process if critical issues found in production
   */
  validateSecurityConfiguration(): SecurityValidationResult {
    const issues: string[] = [];
    let score = 100;

    // Validate JWT secrets
    const jwtValidation = this.validateJwtSecrets();
    issues.push(...jwtValidation.issues);
    score -= jwtValidation.penaltyPoints;

    // Validate encryption configuration
    const encryptionValidation = this.validateEncryptionConfig();
    issues.push(...encryptionValidation.issues);
    score -= encryptionValidation.penaltyPoints;

    // Validate database credentials
    const dbValidation = this.validateDatabaseSecurity();
    issues.push(...dbValidation.issues);
    score -= dbValidation.penaltyPoints;

    // Validate external API security
    const apiValidation = this.validateExternalApiSecurity();
    issues.push(...apiValidation.issues);
    score -= apiValidation.penaltyPoints;

    // Validate production environment settings
    const envValidation = this.validateEnvironmentSecurity();
    issues.push(...envValidation.issues);
    score -= envValidation.penaltyPoints;

    const result: SecurityValidationResult = {
      isValid: issues.length === 0,
      issues,
      score: Math.max(0, score)
    };

    this.logValidationResults(result);
    
    // In production, exit if critical issues found
    if (process.env.NODE_ENV === 'production' && !result.isValid) {
      this.logger.error('🚨 SECURITY VALIDATION FAILED - Application cannot start');
      this.logger.error('Issues found:', issues);
      throw new Error('Production security validation failed');
    }

    return result;
  }

  private validateJwtSecrets(): { issues: string[]; penaltyPoints: number } {
    const issues: string[] = [];
    let penalty = 0;

    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    // Check for default/weak JWT secret
    if (!jwtSecret || jwtSecret.length < 32) {
      issues.push('JWT_SECRET is too short (minimum 32 characters required)');
      penalty += 30;
    }

    if (jwtSecret?.includes('change-in-production') || jwtSecret?.includes('default')) {
      issues.push('JWT_SECRET contains default/placeholder value');
      penalty += 50;
    }

    if (!refreshSecret || refreshSecret.length < 32) {
      issues.push('JWT_REFRESH_SECRET is too short (minimum 32 characters required)');
      penalty += 30;
    }

    if (refreshSecret?.includes('change-in-production') || refreshSecret?.includes('default')) {
      issues.push('JWT_REFRESH_SECRET contains default/placeholder value');
      penalty += 50;
    }

    // Check secret entropy (randomness)
    if (jwtSecret && !this.hasGoodEntropy(jwtSecret)) {
      issues.push('JWT_SECRET has low entropy (appears non-random)');
      penalty += 20;
    }

    return { issues, penaltyPoints: penalty };
  }

  private validateEncryptionConfig(): { issues: string[]; penaltyPoints: number } {
    const issues: string[] = [];
    let penalty = 0;

    const encryptionKey = this.configService.get<string>('ENCRYPTION_MASTER_KEY');

    if (!encryptionKey) {
      issues.push('ENCRYPTION_MASTER_KEY is not configured');
      penalty += 50;
      return { issues, penaltyPoints: penalty };
    }

    // Check for proper hex format (AES-256 requires 64 hex characters)
    if (!/^[a-f0-9]{64}$/i.test(encryptionKey)) {
      issues.push('ENCRYPTION_MASTER_KEY must be exactly 64 hexadecimal characters for AES-256');
      penalty += 40;
    }

    // Check for default/placeholder values
    if (encryptionKey.includes('change-me') || encryptionKey.includes('default')) {
      issues.push('ENCRYPTION_MASTER_KEY contains default/placeholder value');
      penalty += 50;
    }

    // Additional entropy check for encryption key
    if (encryptionKey.length === 64 && !this.hasGoodEntropy(encryptionKey)) {
      issues.push('ENCRYPTION_MASTER_KEY has low entropy (appears non-random)');
      penalty += 30;
    }

    return { issues, penaltyPoints: penalty };
  }

  private validateDatabaseSecurity(): { issues: string[]; penaltyPoints: number } {
    const issues: string[] = [];
    let penalty = 0;

    const mongoUrl = this.configService.get<string>('MONGODB_URL') || 
                     this.configService.get<string>('MONGO_URL');

    if (!mongoUrl) {
      issues.push('Database connection URL is not configured');
      penalty += 30;
      return { issues, penaltyPoints: penalty };
    }

    // Check for default/weak database credentials
    if (mongoUrl.includes('devpassword') || mongoUrl.includes('password123')) {
      issues.push('Database URL contains default/weak password');
      penalty += 40;
    }

    // Check for localhost in production
    if (process.env.NODE_ENV === 'production' && mongoUrl.includes('localhost')) {
      issues.push('Database URL points to localhost in production environment');
      penalty += 20;
    }

    // Check for missing authentication
    if (!mongoUrl.includes('@') && !mongoUrl.includes('authSource')) {
      issues.push('Database URL appears to have no authentication configured');
      penalty += 30;
    }

    return { issues, penaltyPoints: penalty };
  }

  private validateExternalApiSecurity(): { issues: string[]; penaltyPoints: number } {
    const issues: string[] = [];
    let penalty = 0;

    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!geminiKey) {
      issues.push('GEMINI_API_KEY is not configured - AI features will not work');
      penalty += 20;
    } else if (geminiKey.includes('your_') || geminiKey.includes('placeholder')) {
      issues.push('GEMINI_API_KEY contains placeholder value');
      penalty += 30;
    } else if (geminiKey.length < 20) {
      issues.push('GEMINI_API_KEY appears too short to be valid');
      penalty += 20;
    }

    return { issues, penaltyPoints: penalty };
  }

  private validateEnvironmentSecurity(): { issues: string[]; penaltyPoints: number } {
    const issues: string[] = [];
    let penalty = 0;

    const nodeEnv = this.configService.get<string>('NODE_ENV');
    
    // Check for debug settings in production
    if (nodeEnv === 'production') {
      const debugRoutes = this.configService.get<string>('ENABLE_DEBUG_ROUTES');
      if (debugRoutes === 'true') {
        issues.push('Debug routes are enabled in production environment');
        penalty += 30;
      }

      const swagger = this.configService.get<string>('ENABLE_SWAGGER');
      if (swagger === 'true') {
        issues.push('Swagger documentation is enabled in production (consider disabling)');
        penalty += 10;
      }

      const mockServices = this.configService.get<string>('MOCK_EXTERNAL_SERVICES');
      if (mockServices === 'true') {
        issues.push('External services are mocked in production environment');
        penalty += 20;
      }
    }

    // Check CORS configuration
    const corsOrigin = this.configService.get<string>('CORS_ORIGIN');
    if (corsOrigin === '*') {
      issues.push('CORS is configured to allow all origins (security risk)');
      penalty += 25;
    }

    return { issues, penaltyPoints: penalty };
  }

  private hasGoodEntropy(value: string): boolean {
    // Enhanced entropy check for different string types
    const length = value.length;
    const lowerValue = value.toLowerCase();
    
    // Check for obvious patterns first
    const badPatterns = [
      /(.)\1{4,}/, // 5+ repeated characters (aaaaa)
      /123456|abcdef|qwerty/i, // Common sequences
      /000000|111111|aaaaaa/i, // Obvious repetition
      /password|secret|default|change/i // Common words
    ];

    if (badPatterns.some(pattern => pattern.test(value))) {
      return false;
    }
    
    // For hex strings (encryption keys), use different entropy logic
    if (/^[a-f0-9]+$/i.test(value)) {
      // Hex strings should have good distribution of hex characters
      const charCounts: { [key: string]: number } = {};
      
      for (const char of lowerValue) {
        charCounts[char] = (charCounts[char] || 0) + 1;
      }
      
      // Check if any character appears too frequently (more than 25% of length)
      const maxFrequency = length * 0.25;
      return !Object.values(charCounts).some(count => count > maxFrequency);
    }
    
    // For non-hex strings, use character diversity check
    const uniqueChars = new Set(lowerValue).size;
    return uniqueChars >= length * 0.3; // Lowered threshold for realistic randomness
  }

  private logValidationResults(result: SecurityValidationResult): void {
    if (result.isValid) {
      this.logger.log(`✅ Security validation passed - Score: ${result.score}/100`);
    } else {
      this.logger.warn(`⚠️  Security validation issues found - Score: ${result.score}/100`);
      result.issues.forEach(issue => this.logger.warn(`   • ${issue}`));
    }
  }

  /**
   * Generates secure random secrets for development/testing
   */
  generateSecureSecrets(): { [key: string]: string } {
    return {
      JWT_SECRET: crypto.randomBytes(64).toString('hex'),
      JWT_REFRESH_SECRET: crypto.randomBytes(64).toString('hex'),
      ENCRYPTION_MASTER_KEY: crypto.randomBytes(32).toString('hex'),
      DATABASE_PASSWORD: crypto.randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]/g, ''),
    };
  }
}