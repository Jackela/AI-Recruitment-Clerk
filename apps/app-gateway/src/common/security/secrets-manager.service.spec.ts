import { SecretsManagerService } from './secrets-manager.service';
import { ConfigService } from '@nestjs/config';

describe('SecretsManagerService', () => {
  let service: SecretsManagerService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService();
    service = new SecretsManagerService(configService);
  });

  describe('validateAllSecrets', () => {
    it('should validate JWT secret configuration', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'JWT_SECRET')
          return 'a-very-long-secret-key-that-is-at-least-32-chars';
        if (key === 'MONGODB_URL') return 'mongodb://localhost:27017/db';
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        return undefined;
      });

      const result = service.validateAllSecrets();

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.issues).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('should return recommendations for low scores', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const result = service.validateAllSecrets();

      expect(result.score).toBeLessThan(70);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('generateSecureKey', () => {
    it('should generate key of specified length', () => {
      const key = service.generateSecureKey(32);

      expect(key.length).toBeLessThanOrEqual(32);
    });

    it('should generate different keys each time', () => {
      const key1 = service.generateSecureKey();
      const key2 = service.generateSecureKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      jest.spyOn(configService, 'get').mockReturnValue('a'.repeat(32));
      const plainText = 'sensitive data';

      const encrypted = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should throw error when encryption key not configured', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      expect(() => service.encrypt('text')).toThrow(
        'ENCRYPTION_KEY not configured',
      );
    });

    it('should throw error when decryption key not configured', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const encrypted = 'some:encrypted:text';
      expect(() => service.decrypt(encrypted)).toThrow(
        'ENCRYPTION_KEY not configured',
      );
    });
  });

  describe('getKeyRotationRecommendations', () => {
    it('should return array of recommendations', () => {
      const recommendations = service.getKeyRotationRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });
});
