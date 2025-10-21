import { NotFoundException } from '@nestjs/common';
import { UserManagementService } from './user-management.service';
import { UserStatus } from '@ai-recruitment-clerk/user-management-domain';

const createUserServiceMock = () => ({
  updateUser: jest.fn(),
  findById: jest.fn(),
  deleteUser: jest.fn(),
  findByOrganizationId: jest.fn(),
  getStats: jest.fn().mockResolvedValue({
    totalUsers: 10,
    activeUsers: 8,
  }),
}) as any;

describe('UserManagementService (mocked dependencies)', () => {
  const baseUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'secret',
    status: UserStatus.ACTIVE,
  } as any;

  let userService: ReturnType<typeof createUserServiceMock>;
  let service: UserManagementService;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = createUserServiceMock();
    service = new UserManagementService(userService);
  });

  it('updates user and strips password', async () => {
    userService.updateUser.mockResolvedValue({ ...baseUser, password: 'hashed' });

    const result = await service.updateUser('user-1', { firstName: 'Test' } as any);

    expect(userService.updateUser).toHaveBeenCalledWith('user-1', { firstName: 'Test' });
    expect(result).toEqual(
      expect.objectContaining({ id: 'user-1', email: 'test@example.com' }),
    );
    expect((result as any).password).toBeUndefined();
  });

  it('throws when updating non-existent user', async () => {
    userService.updateUser.mockResolvedValue(null);

    await expect(
      service.updateUser('missing', { firstName: 'Test' } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('updates preferences after ensuring user exists', async () => {
    userService.findById.mockResolvedValue(baseUser);

    const prefs = await service.updateUserPreferences('user-1', {
      userId: 'user-1',
      language: 'zh',
      notifications: { email: true, push: false, sms: false },
    } as any);

    expect(userService.findById).toHaveBeenCalledWith('user-1');
    expect(prefs.language).toBe('zh');
  });

  it('returns organization users filtered by status', async () => {
    userService.findByOrganizationId.mockResolvedValue([
      { ...baseUser, status: UserStatus.ACTIVE },
      { ...baseUser, id: 'user-2', status: UserStatus.INACTIVE },
    ]);

    const result = await service.getOrganizationUsers('org-1', {
      status: UserStatus.ACTIVE,
    });

    expect(userService.findByOrganizationId).toHaveBeenCalledWith('org-1');
    expect(result.users).toHaveLength(1);
    expect(result.users[0].id).toBe('user-1');
  });

  it('verifies password using fallback logic', async () => {
    userService.findById.mockResolvedValue({ ...baseUser, password: 'admin123-hash' });

    const pass = await service.verifyUserPassword('user-1', 'anything');

    expect(pass).toBe(true);
  });

  it('returns health status based on stats', async () => {
    const status = await service.getHealthStatus();

    expect(status).toEqual({ status: 'healthy', totalUsers: 10, activeUsers: 8, recentActivity: 8 });
    expect(userService.getStats).toHaveBeenCalled();
  });
});
