import {
  EnvAccess,
  EnvValidator,
  EnvValidationError,
  createSchema,
  createValidator,
  CommonEnvVars,
  ServiceSchemas,
} from './env-validator.util';

describe('EnvAccess', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getString', () => {
    it('should return undefined for unset optional variable', () => {
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [{ name: 'TEST_VAR', required: false }],
      });

      const result = access.getString('TEST_VAR', false);
      expect(result).toBeUndefined();
    });

    it('should throw for unset required variable', () => {
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [{ name: 'TEST_VAR', required: true }],
      });

      expect(() => access.getString('TEST_VAR')).toThrow(
        'Required environment variable "TEST_VAR" is not set',
      );
    });

    it('should return value when set', () => {
      process.env.TEST_VAR = 'test-value';
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [{ name: 'TEST_VAR' }],
      });

      const result = access.getString('TEST_VAR');
      expect(result).toBe('test-value');
    });

    it('should use default value when set and variable is missing', () => {
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [
          { name: 'TEST_VAR', required: false, defaultValue: 'default' },
        ],
      });

      const result = access.getString('TEST_VAR', false);
      expect(result).toBe('default');
    });
  });

  describe('getNumber', () => {
    it('should return default when not set', () => {
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [{ name: 'PORT', required: false }],
      });

      const result = access.getNumber('PORT', 3000);
      expect(result).toBe(3000);
    });

    it('should parse string to number', () => {
      process.env.PORT = '8080';
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [{ name: 'PORT' }],
      });

      const result = access.getNumber('PORT');
      expect(result).toBe(8080);
    });

    it('should throw TypeError for invalid number', () => {
      process.env.PORT = 'not-a-number';
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [{ name: 'PORT' }],
      });

      expect(() => access.getNumber('PORT')).toThrow(
        'Environment variable PORT must be a number',
      );
    });
  });

  describe('getBoolean', () => {
    it('should return default when not set', () => {
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [{ name: 'DEBUG', required: false }],
      });

      const result = access.getBoolean('DEBUG', true);
      expect(result).toBe(true);
    });

    it('should parse true values', () => {
      process.env.DEBUG = 'true';
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [{ name: 'DEBUG' }],
      });

      expect(access.getBoolean('DEBUG')).toBe(true);
    });

    it('should parse 1 as true', () => {
      process.env.DEBUG = '1';
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [{ name: 'DEBUG' }],
      });

      expect(access.getBoolean('DEBUG')).toBe(true);
    });

    it('should parse yes as true', () => {
      process.env.DEBUG = 'yes';
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [{ name: 'DEBUG' }],
      });

      expect(access.getBoolean('DEBUG')).toBe(true);
    });

    it('should parse on as true', () => {
      process.env.DEBUG = 'on';
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [{ name: 'DEBUG' }],
      });

      expect(access.getBoolean('DEBUG')).toBe(true);
    });

    it('should return false for other values', () => {
      process.env.DEBUG = 'false';
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [{ name: 'DEBUG' }],
      });

      expect(access.getBoolean('DEBUG')).toBe(false);
    });
  });

  describe('getArray', () => {
    it('should return default when not set', () => {
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [{ name: 'ITEMS', required: false }],
      });

      const result = access.getArray('ITEMS', ['a', 'b']);
      expect(result).toEqual(['a', 'b']);
    });

    it('should parse comma-separated values', () => {
      process.env.ITEMS = 'a,b,c';
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [{ name: 'ITEMS' }],
      });

      const result = access.getArray('ITEMS');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should trim whitespace', () => {
      process.env.ITEMS = ' a , b , c ';
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [{ name: 'ITEMS' }],
      });

      const result = access.getArray('ITEMS');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should filter empty strings', () => {
      process.env.ITEMS = 'a,,b,';
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [{ name: 'ITEMS' }],
      });

      const result = access.getArray('ITEMS');
      expect(result).toEqual(['a', 'b']);
    });
  });

  describe('getUrl', () => {
    it('should return undefined when not set', () => {
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [{ name: 'URL', required: false }],
      });

      const result = access.getUrl('URL');
      expect(result).toBeUndefined();
    });

    it('should return URL object when valid', () => {
      process.env.URL = 'https://example.com/path';
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [{ name: 'URL' }],
      });

      const result = access.getUrl('URL');
      expect(result).toBeInstanceOf(URL);
      expect(result?.href).toBe('https://example.com/path');
    });

    it('should throw TypeError for invalid URL', () => {
      process.env.URL = 'not-a-url';
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [{ name: 'URL' }],
      });

      expect(() => access.getUrl('URL')).toThrow('must be a valid URL');
    });
  });

  describe('isSet', () => {
    it('should return true when set', () => {
      process.env.TEST_VAR = 'value';
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [],
      });

      expect(access.isSet('TEST_VAR')).toBe(true);
    });

    it('should return false when not set', () => {
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [],
      });

      expect(access.isSet('UNSET_VAR')).toBe(false);
    });

    it('should return false when empty string', () => {
      process.env.TEST_VAR = '';
      const access = new EnvAccess({
        serviceName: 'test',
        variables: [],
      });

      expect(access.isSet('TEST_VAR')).toBe(false);
    });
  });
});

describe('EnvValidator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validate', () => {
    it('should pass when all required vars are set', () => {
      process.env.REQUIRED_VAR = 'value';
      const validator = new EnvValidator({
        serviceName: 'test',
        variables: [{ name: 'REQUIRED_VAR', required: true }],
      });

      expect(() => validator.validate()).not.toThrow();
    });

    it('should pass when optional vars have defaults', () => {
      const validator = new EnvValidator({
        serviceName: 'test',
        variables: [
          { name: 'OPTIONAL_VAR', required: false, defaultValue: 'default' },
        ],
      });

      expect(() => validator.validate()).not.toThrow();
    });

    it('should throw EnvValidationError when required var is missing', () => {
      const validator = new EnvValidator({
        serviceName: 'test',
        variables: [{ name: 'MISSING_VAR', required: true }],
      });

      expect(() => validator.validate()).toThrow(EnvValidationError);
    });

    it('should throw with correct missing vars', () => {
      const validator = new EnvValidator({
        serviceName: 'test-service',
        variables: [
          { name: 'VAR1', required: true },
          { name: 'VAR2', required: true },
        ],
      });

      try {
        validator.validate();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnvValidationError);
        expect((error as EnvValidationError).missingVars).toContain('VAR1');
        expect((error as EnvValidationError).missingVars).toContain('VAR2');
      }
    });

    it('should validate custom validators', () => {
      process.env.PORT = 'not-a-port';
      const validator = new EnvValidator({
        serviceName: 'test',
        variables: [
          {
            name: 'PORT',
            validator: (v) => !isNaN(Number(v)),
            errorMessage: 'PORT must be a number',
          },
        ],
      });

      try {
        validator.validate();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnvValidationError);
        expect((error as EnvValidationError).invalidVars[0].reason).toBe(
          'PORT must be a number',
        );
      }
    });
  });

  describe('getAll', () => {
    it('should return all variable values', () => {
      process.env.VAR1 = 'value1';
      process.env.VAR2 = 'value2';
      const validator = new EnvValidator({
        serviceName: 'test',
        variables: [{ name: 'VAR1' }, { name: 'VAR2' }],
      });

      const result = validator.getAll();
      expect(result.VAR1).toBe('value1');
      expect(result.VAR2).toBe('value2');
    });

    it('should return undefined for unset variables', () => {
      const validator = new EnvValidator({
        serviceName: 'test',
        variables: [{ name: 'UNSET_VAR' }],
      });

      const result = validator.getAll();
      expect(result.UNSET_VAR).toBeUndefined();
    });
  });
});

describe('createSchema', () => {
  it('should create a valid schema', () => {
    const schema = createSchema('test-service', [
      { name: 'VAR1', required: true },
      { name: 'VAR2', required: false, defaultValue: 'default' },
    ]);

    expect(schema.serviceName).toBe('test-service');
    expect(schema.variables).toHaveLength(2);
    expect(schema.variables[0].name).toBe('VAR1');
  });
});

describe('createValidator', () => {
  it('should create validator for known service', () => {
    expect(() => createValidator('appGateway')).not.toThrow();
    expect(() => createValidator('resumeParser')).not.toThrow();
  });

  it('should throw for unknown service', () => {
    expect(() => createValidator('unknown-service')).toThrow('Unknown service');
  });
});

describe('CommonEnvVars', () => {
  describe('nodeEnv', () => {
    it('should have correct configuration', () => {
      const config = CommonEnvVars.nodeEnv();
      expect(config.name).toBe('NODE_ENV');
      expect(config.required).toBe(false);
      expect(config.defaultValue).toBe('development');
    });

    it('should validate development, production, test', () => {
      const config = CommonEnvVars.nodeEnv();
      expect(config.validator!('development')).toBe(true);
      expect(config.validator!('production')).toBe(true);
      expect(config.validator!('test')).toBe(true);
      expect(config.validator!('invalid')).toBe(false);
    });
  });

  describe('port', () => {
    it('should have correct configuration', () => {
      const config = CommonEnvVars.port();
      expect(config.name).toBe('PORT');
      expect(config.defaultValue).toBe('3000');
    });

    it('should validate port numbers', () => {
      const config = CommonEnvVars.port();
      expect(config.validator!('3000')).toBe(true);
      expect(config.validator!('8080')).toBe(true);
      expect(config.validator!('0')).toBe(false);
      expect(config.validator!('65536')).toBe(false);
      expect(config.validator!('-1')).toBe(false);
    });
  });

  describe('jwtSecret', () => {
    it('should require minimum length', () => {
      const config = CommonEnvVars.jwtSecret();
      expect(config.validator!('a'.repeat(32))).toBe(true);
      expect(config.validator!('a'.repeat(31))).toBe(false);
    });
  });

  describe('encryptionKey', () => {
    it('should require 64 characters', () => {
      const config = CommonEnvVars.encryptionKey();
      expect(config.validator!('a'.repeat(64))).toBe(true);
      expect(config.validator!('a'.repeat(63))).toBe(false);
    });
  });
});

describe('ServiceSchemas', () => {
  it('should have appGateway schema', () => {
    const schema = ServiceSchemas.appGateway();
    expect(schema.length).toBeGreaterThan(0);
    expect(schema.some((v) => v.name === 'MONGODB_URL')).toBe(true);
    expect(schema.some((v) => v.name === 'JWT_SECRET')).toBe(true);
  });

  it('should have resumeParser schema', () => {
    const schema = ServiceSchemas.resumeParser();
    expect(schema.some((v) => v.name === 'GEMINI_API_KEY')).toBe(true);
  });
});
