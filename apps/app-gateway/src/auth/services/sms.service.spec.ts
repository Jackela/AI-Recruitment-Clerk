import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';

const createMock = jest.fn();
const fetchMock = jest.fn();

const messagesFn = Object.assign(
  jest.fn((sid?: string) =>
    sid
      ? {
          fetch: fetchMock,
        }
      : { fetch: fetchMock },
  ),
  { create: createMock },
);

jest.mock('twilio', () => {
  return {
    Twilio: jest.fn().mockImplementation(() => ({
      messages: messagesFn,
    })),
  };
});

describe('SmsService', () => {
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    createMock.mockReset();
    fetchMock.mockReset();
    configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          TWILIO_ACCOUNT_SID: 'sid',
          TWILIO_AUTH_TOKEN: 'token',
          TWILIO_FROM_PHONE: '+10000000000',
          NODE_ENV: 'test',
          MFA_ISSUER_NAME: 'Issuer',
        };
        return map[key];
      }),
    } as unknown as jest.Mocked<ConfigService>;
  });

  it('sends SMS when configured', async () => {
    createMock.mockResolvedValue({ sid: '123' });
    const service = new SmsService(configService);

    await service.sendSms('+1234567890', 'hello');

    expect(createMock).toHaveBeenCalledWith({
      body: 'hello',
      from: '+10000000000',
      to: '+1234567890',
    });
  });

  it('returns not_configured status when Twilio missing', async () => {
    configService.get.mockReturnValue('');
    const service = new SmsService(configService);

    const status = await service.getDeliveryStatus('abc');

    expect(status.status).toBe('not_configured');
  });

  it('maps Twilio error codes to friendly errors', async () => {
    createMock.mockRejectedValue({ code: 21211, message: 'bad phone' });
    const service = new SmsService(configService);

    await expect(
      service.sendSms('+1234567890', 'hello'),
    ).rejects.toThrow('Invalid phone number');
  });

  it('simulates SMS in development when not configured', async () => {
    jest.useFakeTimers();
    configService.get.mockImplementation((key: string) => {
      const map: Record<string, string> = {
        TWILIO_ACCOUNT_SID: '',
        TWILIO_AUTH_TOKEN: '',
        TWILIO_FROM_PHONE: '',
        NODE_ENV: 'development',
        MFA_ISSUER_NAME: 'Issuer',
      };
      return map[key];
    });
    const service = new SmsService(configService);

    const promise = service.sendSms('+1234567890', 'dev message');
    await jest.runOnlyPendingTimersAsync();
    await promise;

    expect(createMock).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('returns error status when fetch fails', async () => {
    fetchMock.mockRejectedValue(new Error('fetch fail'));
    const service = new SmsService(configService);

    const status = await service.getDeliveryStatus('sid-1');

    expect(status.status).toBe('error');
    expect(status.message).toContain('fetch fail');
  });
});
