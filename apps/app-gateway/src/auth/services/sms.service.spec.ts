import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';
import { Twilio } from 'twilio';

// Mock Twilio
jest.mock('twilio');

describe('SmsService', () => {
  let service: SmsService;
  let configServiceMock: jest.Mocked<ConfigService>;
  let twilioClientMock: {
    messages: {
      create: jest.Mock;
    };
    api: {
      accounts: (sid: string) => {
        fetch: jest.Mock;
      };
    };
  };

  beforeEach(async () => {
    twilioClientMock = {
      messages: {
        create: jest.fn().mockResolvedValue({
          sid: 'SM123456789',
          status: 'queued',
          dateCreated: new Date(),
        }),
      },
      api: {
        accounts: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue({
            sid: 'AC123',
            friendlyName: 'Test Account',
            status: 'active',
          }),
        }),
      },
    };

    (Twilio as unknown as jest.Mock).mockImplementation(() => twilioClientMock);

    configServiceMock = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          TWILIO_ACCOUNT_SID: 'AC1234567890abcdef',
          TWILIO_AUTH_TOKEN: 'auth_token_123',
          TWILIO_FROM_PHONE: '+1234567890',
          MFA_ISSUER_NAME: 'AI-Recruitment-Clerk',
          NODE_ENV: 'test',
        };
        return config[key];
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Creation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize Twilio client with correct credentials', () => {
      expect(Twilio).toHaveBeenCalledWith(
        'AC1234567890abcdef',
        'auth_token_123',
      );
    });
  });

  describe('Twilio Configuration', () => {
    it('should not initialize when TWILIO_ACCOUNT_SID is missing', () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'TWILIO_ACCOUNT_SID') return undefined;
        return 'value';
      });

      const newService = new SmsService(configServiceMock);
      expect(newService).toBeDefined();
    });

    it('should not initialize when TWILIO_AUTH_TOKEN is missing', () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'TWILIO_AUTH_TOKEN') return undefined;
        return 'value';
      });

      const newService = new SmsService(configServiceMock);
      expect(newService).toBeDefined();
    });

    it('should not initialize when TWILIO_FROM_PHONE is missing', () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'TWILIO_FROM_PHONE') return undefined;
        return 'value';
      });

      const newService = new SmsService(configServiceMock);
      expect(newService).toBeDefined();
    });

    it('should handle initialization error', () => {
      (Twilio as unknown as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid credentials');
      });

      const newService = new SmsService(configServiceMock);
      expect(newService).toBeDefined();
    });
  });

  describe('sendSms', () => {
    const validPhoneNumber = '+8613800138000';
    const message = 'Your verification code is 123456';

    it('should send SMS successfully', async () => {
      await service.sendSms(validPhoneNumber, message);

      expect(twilioClientMock.messages.create).toHaveBeenCalledWith({
        body: message,
        from: '+1234567890',
        to: validPhoneNumber,
      });
    });

    it('should throw error for invalid phone number', async () => {
      const invalidNumber = '123456'; // Missing country code

      await expect(service.sendSms(invalidNumber, message)).rejects.toThrow(
        'Invalid phone number format',
      );
    });

    it('should throw error for phone number without +', async () => {
      const invalidNumber = '8613800138000';

      await expect(service.sendSms(invalidNumber, message)).rejects.toThrow(
        'Invalid phone number format',
      );
    });

    it('should log SMS in development when Twilio not configured', async () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'TWILIO_ACCOUNT_SID') return undefined;
        if (key === 'NODE_ENV') return 'development';
        return 'value';
      });

      const newService = new SmsService(configServiceMock);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await newService.sendSms(validPhoneNumber, message);

      // Should log the SMS
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle Twilio error code 21211 (invalid number)', async () => {
      const error = { code: 21211, message: 'Invalid phone number' };
      twilioClientMock.messages.create.mockRejectedValue(error);

      await expect(service.sendSms(validPhoneNumber, message)).rejects.toThrow(
        'Invalid phone number',
      );
    });

    it('should handle Twilio error code 21608 (unverified number)', async () => {
      const error = {
        code: 21608,
        message: 'Number is not verified',
      };
      twilioClientMock.messages.create.mockRejectedValue(error);

      await expect(service.sendSms(validPhoneNumber, message)).rejects.toThrow(
        'Phone number is not verified for trial account',
      );
    });

    it('should handle Twilio error code 20003 (authentication failed)', async () => {
      const error = { code: 20003, message: 'Authentication failed' };
      twilioClientMock.messages.create.mockRejectedValue(error);

      await expect(service.sendSms(validPhoneNumber, message)).rejects.toThrow(
        'Authentication failed - check Twilio credentials',
      );
    });

    it('should handle unknown Twilio errors', async () => {
      twilioClientMock.messages.create.mockRejectedValue(
        new Error('Unknown error'),
      );

      await expect(service.sendSms(validPhoneNumber, message)).rejects.toThrow(
        'Failed to send SMS verification code',
      );
    });

    it('should handle non-error exceptions', async () => {
      twilioClientMock.messages.create.mockRejectedValue('String error');

      await expect(service.sendSms(validPhoneNumber, message)).rejects.toThrow(
        'Failed to send SMS verification code',
      );
    });

    it('should simulate SMS delivery in development', async () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'TWILIO_ACCOUNT_SID') return undefined;
        if (key === 'NODE_ENV') return 'development';
        return 'value';
      });

      const newService = new SmsService(configServiceMock);

      // Should complete without error
      await expect(
        newService.sendSms(validPhoneNumber, message),
      ).resolves.not.toThrow();
    });
  });

  describe('sendSecurityAlert', () => {
    const validPhoneNumber = '+8613800138000';
    const event = 'Suspicious Login';
    const details = {
      timestamp: new Date().toISOString(),
    };

    it('should send security alert SMS', async () => {
      await service.sendSecurityAlert(validPhoneNumber, event, details);

      expect(twilioClientMock.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining(event),
          to: validPhoneNumber,
        }),
      );
    });

    it('should include issuer name in message', async () => {
      await service.sendSecurityAlert(validPhoneNumber, event, details);

      expect(twilioClientMock.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('AI-Recruitment-Clerk'),
        }),
      );
    });

    it('should use default issuer when MFA_ISSUER_NAME not set', async () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'MFA_ISSUER_NAME') return undefined;
        if (key === 'TWILIO_ACCOUNT_SID') return 'AC123';
        if (key === 'TWILIO_AUTH_TOKEN') return 'token';
        if (key === 'TWILIO_FROM_PHONE') return '+1234567890';
        return 'value';
      });

      const newService = new SmsService(configServiceMock);
      await newService.sendSecurityAlert(validPhoneNumber, event, details);

      expect(twilioClientMock.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('AI-Recruitment-Clerk'),
        }),
      );
    });

    it('should not throw when sending fails', async () => {
      twilioClientMock.messages.create.mockRejectedValue(
        new Error('SMS error'),
      );

      await expect(
        service.sendSecurityAlert(validPhoneNumber, event, details),
      ).resolves.not.toThrow();
    });

    it('should handle invalid phone number', async () => {
      const invalidNumber = '123456';

      await expect(
        service.sendSecurityAlert(invalidNumber, event, details),
      ).rejects.toThrow('Invalid phone number format');
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should validate correct E.164 format', () => {
      const validNumbers = [
        '+1234567890',
        '+8613800138000',
        '+14155552671',
        '+442071838750',
      ];

      for (const number of validNumbers) {
        expect((service as any).isValidPhoneNumber(number)).toBe(true);
      }
    });

    it('should reject invalid formats', () => {
      const invalidNumbers = [
        '1234567890',
        '+123',
        'phone number',
        '+',
        '+12345678901234567890', // Too long
      ];

      for (const number of invalidNumbers) {
        expect((service as any).isValidPhoneNumber(number)).toBe(false);
      }
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate and format phone number', () => {
      const result = service.validatePhoneNumber('+8613800138000');

      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('+8613800138000');
    });

    it('should reject number without country code', () => {
      const result = service.validatePhoneNumber('13800138000');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('country code');
    });

    it('should reject too short numbers', () => {
      const result = service.validatePhoneNumber('+123');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('length');
    });

    it('should reject too long numbers', () => {
      const result = service.validatePhoneNumber('+12345678901234567');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('length');
    });

    it('should clean number before validation', () => {
      const result = service.validatePhoneNumber('+86 138-0013-8000');

      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('+8613800138000');
    });

    it('should reject invalid format', () => {
      const result = service.validatePhoneNumber('+abcdefghij');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('format');
    });
  });

  describe('getDeliveryStatus', () => {
    const messageSid = 'SM123456789';

    it('should return delivery status when configured', async () => {
      const result = await service.getDeliveryStatus(messageSid);

      expect(result).toEqual(
        expect.objectContaining({
          status: expect.any(String),
          errorCode: expect.anything(),
          errorMessage: expect.anything(),
          dateCreated: expect.any(Date),
          dateSent: expect.anything(),
          dateUpdated: expect.any(Date),
        }),
      );
    });

    it('should return not_configured when Twilio not initialized', async () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'TWILIO_ACCOUNT_SID') return undefined;
        return 'value';
      });

      const newService = new SmsService(configServiceMock);
      const result = await newService.getDeliveryStatus(messageSid);

      expect(result).toEqual({
        status: 'not_configured',
        message: 'Twilio not configured',
      });
    });

    it('should handle fetch errors', async () => {
      twilioClientMock.api.accounts.mockReturnValue({
        fetch: jest.fn().mockRejectedValue(new Error('Fetch failed')),
      });

      const result = await service.getDeliveryStatus(messageSid);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Fetch failed');
    });
  });

  describe('testConnection', () => {
    it('should return success when connected', async () => {
      const result = await service.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Test Account');
    });

    it('should return failure when not configured', async () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'TWILIO_ACCOUNT_SID') return undefined;
        return 'value';
      });

      const newService = new SmsService(configServiceMock);
      const result = await newService.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('not initialized');
    });

    it('should return failure when account SID not set', async () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'TWILIO_ACCOUNT_SID') return undefined;
        return 'value';
      });

      const newService = new SmsService(configServiceMock);
      const result = await newService.testConnection();

      expect(result.success).toBe(false);
    });

    it('should return failure when connection fails', async () => {
      twilioClientMock.api.accounts.mockReturnValue({
        fetch: jest.fn().mockRejectedValue(new Error('Connection refused')),
      });

      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection refused');
    });
  });

  describe('simulateSmsDelivery', () => {
    it('should simulate delivery delay', async () => {
      const start = Date.now();
      await (service as any).simulateSmsDelivery('+1234567890', 'Test message');
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(1000);
    });
  });
});
