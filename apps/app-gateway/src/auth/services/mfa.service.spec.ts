import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { MfaService } from './mfa.service';
import { MfaMethod } from '../dto/mfa.dto';

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

describe('MfaService (focused unit tests)', () => {
  let service: MfaService;
  let userModel: ReturnType<typeof createUserModel>;
  let configService: jest.Mocked<ConfigService>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emailService = { sendMfaToken: jest.fn() } as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const smsService = { sendSms: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    userModel = createUserModel();
    configService = createConfigService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new MfaService(userModel as any, configService, emailService, smsService);
    // Avoid timers in tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).storeTemporaryToken = jest.fn();
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
