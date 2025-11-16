/**
 * 多代理安全修复 - 密钥管理服务
 * 基于安全专家和DevOps专家的一致建议
 * 功能: 统一密钥管理、验证、轮换
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import { getConfig } from '@ai-recruitment-clerk/configuration';

/**
 * Defines the shape of the secret validation result.
 */
export interface SecretValidationResult {
  isValid: boolean;
  issues: string[];
  score: number;
  recommendations: string[];
}

/**
 * Provides secrets manager functionality.
 */
@Injectable()
export class SecretsManagerService implements OnModuleInit {
  private readonly logger = new Logger(SecretsManagerService.name);
  private readonly config = getConfig();
  // Reserved for caching implementation
  // private secretsCache: Map<string, { value: string; lastRotated: Date }> = new Map();

  /**
   * Performs the on module init operation.
   * @returns The result of the operation.
   */
  async onModuleInit() {
    this.logger.log('🔑 初始化密钥管理服务...');

    // 启动时验证所有关键密钥
    const validationResult = this.validateAllSecrets();

    if (!validationResult.isValid) {
      this.logger.error('🚨 密钥验证失败！');
      validationResult.issues.forEach((issue) =>
        this.logger.error(`   • ${issue}`),
      );

      if (this.config.env.isProduction) {
        throw new Error('Production environment requires valid secrets');
      }
    } else {
      this.logger.log(
        `✅ 密钥验证通过 - 安全评分: ${validationResult.score}/100`,
      );
    }
  }

  /**
   * 验证所有关键密钥
   */
  validateAllSecrets(): SecretValidationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // 验证JWT密钥
    const jwtValidation = this.validateJwtSecret();
    if (!jwtValidation.isValid) {
      issues.push(...jwtValidation.issues);
      score -= 25;
    }

    // 验证数据库密钥
    const dbValidation = this.validateDatabaseSecrets();
    if (!dbValidation.isValid) {
      issues.push(...dbValidation.issues);
      score -= 20;
    }

    // 验证API密钥
    const apiValidation = this.validateApiKeys();
    if (!apiValidation.isValid) {
      issues.push(...apiValidation.issues);
      score -= 15;
    }

    // 验证CORS配置
    const corsValidation = this.validateCorsConfiguration();
    if (!corsValidation.isValid) {
      issues.push(...corsValidation.issues);
      score -= 20;
    }

    // 验证加密配置
    const encryptionValidation = this.validateEncryptionKeys();
    if (!encryptionValidation.isValid) {
      issues.push(...encryptionValidation.issues);
      score -= 20;
    }

    // 生成建议
    if (score < 90) {
      recommendations.push('建议立即更新弱密钥配置');
    }
    if (score < 70) {
      recommendations.push('建议实施密钥轮换策略');
    }
    if (score < 50) {
      recommendations.push(
        '建议使用专业密钥管理服务 (如AWS KMS, HashiCorp Vault)',
      );
    }

    return {
      isValid: score >= 70, // 70分以上认为可接受
      issues,
      score: Math.max(0, score),
      recommendations,
    };
  }

  /**
   * 验证JWT密钥强度
   */
  private validateJwtSecret(): SecretValidationResult {
    const jwtSecret = this.config.auth.jwt.secret;
    const issues: string[] = [];

    if (!jwtSecret) {
      issues.push('JWT_SECRET 未配置');
      return { isValid: false, issues, score: 0, recommendations: [] };
    }

    // 检查密钥长度
    if (jwtSecret.length < 32) {
      issues.push('JWT_SECRET 长度不足32字符，存在安全风险');
    }

    // 检查密钥复杂度
    if (
      jwtSecret === 'your-secret-key' ||
      jwtSecret === 'secret' ||
      jwtSecret === '123456'
    ) {
      issues.push('JWT_SECRET 使用默认值，必须修改');
    }

    // 检查熵值
    const entropy = this.calculateEntropy(jwtSecret);
    if (entropy < 4.0) {
      issues.push(
        `JWT_SECRET 熵值过低 (${entropy.toFixed(2)}/5.0)，建议使用更复杂的密钥`,
      );
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: issues.length === 0 ? 100 : Math.max(0, 100 - issues.length * 25),
      recommendations: [],
    };
  }

  /**
   * 验证数据库连接密钥
   */
  private validateDatabaseSecrets(): SecretValidationResult {
    const mongoUrl = this.config.database.url;
    const redisUrl =
      this.config.cache.redis.url ||
      this.config.cache.redis.privateUrl ||
      (this.config.cache.redis.host && this.config.cache.redis.port
        ? `redis://${this.config.cache.redis.host}:${this.config.cache.redis.port}`
        : undefined);
    const issues: string[] = [];

    // 检查MongoDB连接字符串
    if (!mongoUrl) {
      issues.push('MONGODB_URL 未配置');
    } else if (
      mongoUrl.includes('localhost') &&
      this.config.env.isProduction
    ) {
      issues.push('生产环境不应使用localhost MongoDB连接');
    } else if (
      !mongoUrl.includes('authSource') &&
      !mongoUrl.includes('localhost')
    ) {
      issues.push('MongoDB连接字符串缺少authSource参数');
    }

    // 检查Redis连接
    if (!redisUrl) {
      issues.push('REDIS_URL 未配置');
    } else if (
      redisUrl === 'redis://localhost:6379' &&
      this.config.env.isProduction
    ) {
      issues.push('生产环境不应使用默认Redis连接');
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: issues.length === 0 ? 100 : Math.max(0, 100 - issues.length * 30),
      recommendations: [],
    };
  }

  /**
   * 验证API密钥
   */
  private validateApiKeys(): SecretValidationResult {
    const geminiKey = this.config.integrations.gemini.apiKey;
    const openaiKey = this.config.integrations.openai.apiKey;
    const issues: string[] = [];

    if (!geminiKey || geminiKey === 'your-gemini-api-key-here') {
      issues.push('GEMINI_API_KEY 未正确配置');
    }

    // OpenAI密钥是可选的
    if (openaiKey && openaiKey === 'your-openai-api-key-here') {
      issues.push('OPENAI_API_KEY 使用默认值');
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: issues.length === 0 ? 100 : Math.max(0, 100 - issues.length * 40),
      recommendations: [],
    };
  }

  /**
   * 验证CORS配置
   */
  private validateCorsConfiguration(): SecretValidationResult {
    const allowedOrigins = this.config.cors.origins;
    const issues: string[] = [];

    if (this.config.env.isProduction) {
      if (!allowedOrigins || allowedOrigins.length === 0) {
        issues.push('生产环境必须配置 ALLOWED_ORIGINS');
      } else if (allowedOrigins.some((origin) => origin === '*')) {
        issues.push('生产环境不应允许所有域名访问 (*)');
      } else if (allowedOrigins.some((origin) => origin.includes('localhost'))) {
        issues.push('生产环境CORS配置包含localhost域名');
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: issues.length === 0 ? 100 : Math.max(0, 100 - issues.length * 35),
      recommendations: [],
    };
  }

  /**
   * 验证加密配置
   */
  private validateEncryptionKeys(): SecretValidationResult {
    const encryptionKey = this.config.security.encryptionKey;
    const saltRounds = this.config.auth.bcrypt.rounds;
    const issues: string[] = [];

    if (!encryptionKey) {
      issues.push('ENCRYPTION_KEY 未配置');
    } else if (encryptionKey.length < 32) {
      issues.push('ENCRYPTION_KEY 必须至少为32字符长度 (AES-256)');
    }

    if (saltRounds < 12) {
      issues.push(`BCRYPT_SALT_ROUNDS 过低 (${saltRounds})，建议至少12轮`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: issues.length === 0 ? 100 : Math.max(0, 100 - issues.length * 30),
      recommendations: [],
    };
  }

  /**
   * 计算字符串熵值
   */
  private calculateEntropy(str: string): number {
    const freq = new Map<string, number>();

    // 统计字符频率
    for (const char of str) {
      freq.set(char, (freq.get(char) || 0) + 1);
    }

    // 计算熵值
    let entropy = 0;
    const len = str.length;

    for (const count of freq.values()) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  /**
   * 生成安全的随机密钥
   */
  generateSecureKey(length = 32): string {
    return crypto.randomBytes(length).toString('base64').slice(0, length);
  }

  /**
   * 加密敏感数据
   */
  encrypt(text: string): string {
    const encryptionKey = this.config.security.encryptionKey;
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY not configured');
    }

    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipher(algorithm, encryptionKey);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * 解密敏感数据
   */
  decrypt(encryptedText: string): string {
    const encryptionKey = this.config.security.encryptionKey;
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY not configured');
    }

    const [_ivHex, authTagHex, encrypted] = encryptedText.split(':');

    const algorithm = 'aes-256-gcm';
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipher(algorithm, encryptionKey);
    decipher.setAuthTag(Uint8Array.from(authTag));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * 获取密钥轮换建议
   */
  getKeyRotationRecommendations(): string[] {
    const recommendations: string[] = [];

    recommendations.push('建议每90天轮换JWT密钥');
    recommendations.push('建议每30天轮换API密钥');
    recommendations.push('建议每180天轮换数据库密码');
    recommendations.push('建议每年轮换加密密钥');

    return recommendations;
  }
}

/**
 * 使用示例:
 *
 * constructor(private secretsManager: SecretsManagerService) {}
 *
 * // 验证密钥
 * const validation = this.secretsManager.validateAllSecrets();
 *
 * // 加密敏感数据
 * const encrypted = this.secretsManager.encrypt('sensitive data');
 *
 * // 解密数据
 * const decrypted = this.secretsManager.decrypt(encrypted);
 */
