import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { MfaService } from './mfa.service';
import { MfaMethod } from '../dto/mfa.dto';
import { UserProfile } from '../../schemas/user-profile.schema';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

const createConfigService = () =>
  ({
    get: jest.fn().mockImplementation((key: string) => {
      const map: Record<string, string> = {
        MFA_ISSUER_NAME: 'TestIssuer',
        MFA_SECRET_LENGTH: '16',
        MFA_BACKUP_CODES_COUNT: '5',
      };
      return map[key];
    }),
  } as unknown as jest.Mocked<ConfigService>);

const createUserModel = () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
});

type UserModelMock = ReturnType<typeof createUserModel>;
type EmailServiceMock = {
  sendMfaToken: jest.Mock;
};
type SmsServiceMock = {
  sendSms: jest.Mock;
};

describe('MfaService (focused unit tests)', () => {
  let service: MfaService;
  let userModel: UserModelMock;
  let configService: jest.Mocked<ConfigService>;
  const emailService: EmailServiceMock = { sendMfaToken: jest.fn() };
  const smsService: SmsServiceMock = { sendSms: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    userModel = createUserModel();
    configService = createConfigService();
    service = new MfaService(
      userModel as unknown as Model<UserProfile>,
      configService,
      emailService as unknown as EmailService,
      smsService as unknown as SmsService,
    );
    // Avoid timers in tests
    (service as unknown as { storeTemporaryToken: jest.Mock }).storeTemporaryToken = jest.fn();
  });

  it('returns MFA status when user exists', async () => {
    userModel.findById.mockResolvedValue({
      mfaSettings: {
        enabled: true,
        methods: [MfaMethod.TOTP],
        backupCodes: ['CODE-1'],
      },
    });

    const status = await service.getMfaStatus('user-1');

    expect(status.enabled).toBe(true);
    expect(status.methods).toEqual([MfaMethod.TOTP]);
    expect(status.remainingBackupCodes).toBe(1);
  });

  it('throws when requesting MFA status for unknown user', async () => {
    userModel.findById.mockResolvedValue(null);

    await expect(service.getMfaStatus('missing')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('sends MFA token via email', async () => {
    userModel.findById.mockResolvedValue({
      email: 'test@example.com',
      mfaSettings: { enabled: true, email: 'test@example.com', methods: [MfaMethod.EMAIL] },
    });

    const response = await service.sendMfaToken('user-1', MfaMethod.EMAIL);

    expect(emailService.sendMfaToken).toHaveBeenCalled();
    expect(response.success).toBe(true);
    expect(response.message).toMatch(/EMAIL/i);
  });
});
