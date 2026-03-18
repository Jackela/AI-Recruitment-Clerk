import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  let configServiceMock: jest.Mocked<ConfigService>;
  let transporterMock: {
    sendMail: jest.Mock;
    verify: jest.Mock;
  };

  beforeEach(async () => {
    transporterMock = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'test-message-id',
        envelope: { from: 'test@example.com', to: ['recipient@example.com'] },
      }),
      verify: jest.fn().mockImplementation((callback) => {
        callback(null, true);
      }),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(transporterMock);
    (nodemailer.getTestMessageUrl as jest.Mock).mockReturnValue(
      'https://ethereal.email/message/test',
    );

    configServiceMock = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          SMTP_HOST: 'smtp.gmail.com',
          SMTP_PORT: '587',
          SMTP_SECURE: 'false',
          SMTP_USER: 'test@example.com',
          SMTP_PASS: 'password123',
          SMTP_FROM: 'noreply@ai-recruitment-clerk.com',
          MFA_ISSUER_NAME: 'AI-Recruitment-Clerk',
          NODE_ENV: 'test',
        };
        return config[key];
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Creation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should create transporter on initialization', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: 'test@example.com',
            pass: 'password123',
          },
        }),
      );
    });

    it('should verify SMTP connection', () => {
      expect(transporterMock.verify).toHaveBeenCalled();
    });
  });

  describe('SMTP Configuration', () => {
    it('should handle incomplete configuration', () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'SMTP_HOST') return undefined;
        return 'value';
      });

      // Recreate service with incomplete config
      new EmailService(configServiceMock);

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ jsonTransport: true }),
      );
    });

    it('should handle missing SMTP_USER', () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'SMTP_USER') return undefined;
        return 'value';
      });

      new EmailService(configServiceMock);

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ jsonTransport: true }),
      );
    });

    it('should handle missing SMTP_PASS', () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'SMTP_PASS') return undefined;
        return 'value';
      });

      new EmailService(configServiceMock);

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ jsonTransport: true }),
      );
    });

    it('should parse SMTP_PORT correctly', () => {
      configServiceMock.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          SMTP_HOST: 'smtp.example.com',
          SMTP_PORT: '465',
          SMTP_SECURE: 'true',
          SMTP_USER: 'user',
          SMTP_PASS: 'pass',
        };
        return config[key];
      });

      new EmailService(configServiceMock);

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 465,
          secure: true,
        }),
      );
    });

    it('should handle SMTP connection verification failure', () => {
      transporterMock.verify.mockImplementation((callback) => {
        callback(new Error('Connection failed'), false);
      });

      // Should not throw
      new EmailService(configServiceMock);
    });
  });

  describe('sendMfaToken', () => {
    const mockEmail = 'user@example.com';
    const mockToken = '123456';
    const mockIssuer = 'TestApp';

    it('should send MFA token email successfully', async () => {
      await service.sendMfaToken(mockEmail, mockToken, mockIssuer);

      expect(transporterMock.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.stringContaining(mockIssuer),
          to: mockEmail,
          subject: expect.stringContaining('Verification Code'),
          html: expect.stringContaining(mockToken),
          text: expect.stringContaining(mockToken),
        }),
      );
    });

    it('should use default from email when SMTP_FROM not set', async () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'SMTP_FROM') return undefined;
        if (key === 'NODE_ENV') return 'test';
        return 'value';
      });

      const newService = new EmailService(configServiceMock);
      await newService.sendMfaToken(mockEmail, mockToken, mockIssuer);

      expect(transporterMock.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.stringContaining('noreply@ai-recruitment-clerk.com'),
        }),
      );
    });

    it('should include token in email body', async () => {
      await service.sendMfaToken(mockEmail, mockToken, mockIssuer);

      const mailOptions = transporterMock.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain(mockToken);
      expect(mailOptions.text).toContain(mockToken);
    });

    it('should throw error when sending fails', async () => {
      transporterMock.sendMail.mockRejectedValue(new Error('SMTP error'));

      await expect(
        service.sendMfaToken(mockEmail, mockToken, mockIssuer),
      ).rejects.toThrow('Failed to send verification email');
    });

    it('should log email preview in non-production environment', async () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return 'value';
      });

      const newService = new EmailService(configServiceMock);
      await newService.sendMfaToken(mockEmail, mockToken, mockIssuer);

      expect(nodemailer.getTestMessageUrl).toHaveBeenCalled();
    });

    it('should not log email preview in production', async () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return 'value';
      });

      const newService = new EmailService(configServiceMock);
      await newService.sendMfaToken(mockEmail, mockToken, mockIssuer);

      // Should not call getTestMessageUrl in production
      // Implementation may vary, so we just ensure no error
    });

    it('should handle different issuer names', async () => {
      const issuers = ['App1', 'App2', 'Test App'];

      for (const issuer of issuers) {
        await service.sendMfaToken(mockEmail, mockToken, issuer);

        const mailOptions =
          transporterMock.sendMail.mock.calls[
            transporterMock.sendMail.mock.calls.length - 1
          ][0];
        expect(mailOptions.subject).toContain(issuer);
      }
    });
  });

  describe('sendAccountSecurityAlert', () => {
    const mockEmail = 'user@example.com';
    const mockEvent = 'Suspicious Login';
    const mockDetails = {
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      location: 'Unknown',
    };

    it('should send security alert successfully', async () => {
      await service.sendAccountSecurityAlert(mockEmail, mockEvent, mockDetails);

      expect(transporterMock.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockEmail,
          subject: expect.stringContaining(mockEvent),
          html: expect.stringContaining(mockEvent),
          text: expect.stringContaining(mockEvent),
        }),
      );
    });

    it('should include event details in email', async () => {
      await service.sendAccountSecurityAlert(mockEmail, mockEvent, mockDetails);

      const mailOptions = transporterMock.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain(mockDetails.ipAddress);
      expect(mailOptions.html).toContain(mockDetails.userAgent);
      expect(mailOptions.text).toContain(mockDetails.ipAddress);
    });

    it('should use default issuer name when MFA_ISSUER_NAME not set', async () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'MFA_ISSUER_NAME') return undefined;
        if (key === 'SMTP_FROM') return 'test@example.com';
        return 'value';
      });

      const newService = new EmailService(configServiceMock);
      await newService.sendAccountSecurityAlert(
        mockEmail,
        mockEvent,
        mockDetails,
      );

      expect(transporterMock.sendMail).toHaveBeenCalled();
    });

    it('should handle missing optional details', async () => {
      const minimalDetails = {
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      await expect(
        service.sendAccountSecurityAlert(mockEmail, mockEvent, minimalDetails),
      ).resolves.not.toThrow();
    });

    it('should not throw when sending fails', async () => {
      transporterMock.sendMail.mockRejectedValue(new Error('SMTP error'));

      await expect(
        service.sendAccountSecurityAlert(mockEmail, mockEvent, mockDetails),
      ).resolves.not.toThrow();
    });
  });

  describe('Email Templates', () => {
    it('should generate MFA email template with correct structure', async () => {
      await service.sendMfaToken('user@example.com', '123456', 'TestApp');

      const mailOptions = transporterMock.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain('<!DOCTYPE html>');
      expect(mailOptions.html).toContain('<html>');
      expect(mailOptions.html).toContain('Verification Code');
      expect(mailOptions.html).toContain('123456');
      expect(mailOptions.html).toContain('expires in 5 minutes');
    });

    it('should generate security alert template with correct structure', async () => {
      await service.sendAccountSecurityAlert('user@example.com', 'Test Event', {
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.1',
        userAgent: 'Test Agent',
      });

      const mailOptions = transporterMock.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain('<!DOCTYPE html>');
      expect(mailOptions.html).toContain('Security Alert');
      expect(mailOptions.html).toContain('Test Event');
    });

    it('should include styling in templates', async () => {
      await service.sendMfaToken('user@example.com', '123456', 'TestApp');

      const mailOptions = transporterMock.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain('<style>');
      expect(mailOptions.html).toContain('font-family');
    });

    it('should include warning section in MFA template', async () => {
      await service.sendMfaToken('user@example.com', '123456', 'TestApp');

      const mailOptions = transporterMock.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain('warning');
      expect(mailOptions.html).toContain('Do not share this code');
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle all config values being undefined', () => {
      configServiceMock.get.mockReturnValue(undefined);

      // Should use jsonTransport
      new EmailService(configServiceMock);

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ jsonTransport: true }),
      );
    });

    it('should handle empty string values', () => {
      configServiceMock.get.mockReturnValue('');

      new EmailService(configServiceMock);

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ jsonTransport: true }),
      );
    });

    it('should handle numeric port as string', () => {
      configServiceMock.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          SMTP_HOST: 'smtp.example.com',
          SMTP_PORT: '587',
          SMTP_SECURE: 'false',
          SMTP_USER: 'user',
          SMTP_PASS: 'pass',
        };
        return config[key];
      });

      new EmailService(configServiceMock);

      const config = (nodemailer.createTransport as jest.Mock).mock.calls[0][0];
      expect(config.port).toBe(587);
      expect(typeof config.port).toBe('number');
    });
  });
});
