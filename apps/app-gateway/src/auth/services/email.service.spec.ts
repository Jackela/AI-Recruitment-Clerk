import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';

const sendMailMock = jest.fn();
const verifyMock = jest.fn();
const createTransportMock = jest.fn((_config?: unknown) => ({
  sendMail: sendMailMock,
  verify: verifyMock.mockImplementation((cb: (err: Error | null) => void) =>
    cb(null),
  ),
}));

jest.mock('nodemailer', () => ({
  createTransport: (config?: unknown) => createTransportMock(config),
  getTestMessageUrl: jest.fn(() => 'preview-url'),
}));

describe('EmailService', () => {
  const configService = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        SMTP_HOST: 'smtp.test',
        SMTP_PORT: '587',
        SMTP_SECURE: 'false',
        SMTP_USER: 'user',
        SMTP_PASS: 'pass',
        SMTP_FROM: 'from@test.com',
        NODE_ENV: 'development',
        MFA_ISSUER_NAME: 'Issuer',
      };
      return map[key];
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends MFA email when configuration is present', async () => {
    const service = new EmailService(configService);
    sendMailMock.mockResolvedValue({ messageId: '123' });

    await service.sendMfaToken('to@test.com', '123456', 'Issuer');

    expect(createTransportMock).toHaveBeenCalled();
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'to@test.com',
        subject: expect.stringContaining('Issuer'),
      }),
    );
  });

  it('falls back to json transport when config is incomplete', async () => {
    (configService.get as jest.Mock).mockImplementation((key: string) => {
      const map: Record<string, string> = {
        SMTP_HOST: '',
        SMTP_PORT: '123',
        SMTP_SECURE: 'false',
        SMTP_USER: '',
        SMTP_PASS: '',
      };
      return map[key];
    });

    const service = new EmailService(configService);
    sendMailMock.mockResolvedValue({ messageId: 'test' });

    await service.sendAccountSecurityAlert('to@test.com', 'Login', {});

    expect(createTransportMock).toHaveBeenCalledWith({
      jsonTransport: true,
    });
  });

  it('throws a friendly error when sendMail fails', async () => {
    const service = new EmailService(configService);
    sendMailMock.mockRejectedValue(new Error('smtp down'));

    await expect(
      service.sendMfaToken('fail@test.com', '999999', 'Issuer'),
    ).rejects.toThrow('Failed to send verification email');
  });
});
