import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRole, UserStatus } from '@ai-recruitment-clerk/user-management-domain';

describe('UserService (in-memory store)', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
  });

  it('creates users and derives names when missing', async () => {
    const user = await service.create({
      email: 'new.user@example.com',
      password: 'hashed',
      role: UserRole.RECRUITER,
    } as any);

    expect(user.id).toMatch(/^user-/);
    expect(user.firstName).toBe('new.user');
    expect(await service.findByEmail('new.user@example.com')).toBeDefined();
  });

  it('updates user metadata and strips password in dto response', async () => {
    const user = await service.create({
      email: 'update@example.com',
      password: 'hashed',
    } as any);

    const updated = await service.updateUser(user.id, {
      status: UserStatus.INACTIVE,
    } as any);

    expect(updated.status).toBe(UserStatus.INACTIVE);
    await expect(service.hasSecurityFlag(user.id, 'tokens_revoked')).resolves.toBe(false);
  });

  it('throws when retrieving missing user activity dependencies', async () => {
    await expect(service.findById('missing')).resolves.toBeNull();
    await expect(service.updateUser('missing', {} as any)).rejects.toThrow(
      NotFoundException,
    );
  });
});
